import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActionPrimitive,
  LOCATIONS,
  LocationDef,
  LocationId,
  PlanResult,
  clockFromHoursRemaining,
  isLocationOpen,
  locationDef,
  locationOf,
  openHoursLabel,
  planTravel,
} from '@24h/domain';
import { AvatarId, avatarUrl } from '../lib/avatars';
import { tagTone } from '../lib/tagTone';

interface CityMapProps {
  location: LocationId;
  avatarId: AvatarId;
  actions: ActionPrimitive[];
  plans: Record<string, PlanResult>;
  tags?: Record<string, string>;
  hoursRemaining: number;
  onSelectAction: (actionId: string) => void;
  onTravel: (to: LocationId) => void;
}

/**
 * Vị trí (%) của từng địa điểm trên THẾ GIỚI bản đồ. Thế giới lớn hơn khung nhìn: người chơi kéo để xem,
 * camera tự bám theo nhân vật, nút "Toàn cảnh" thu cả thế giới vừa khung.
 */
const POS: Record<LocationId, [number, number]> = {
  home: [50, 50],
  cafe: [44, 26],
  office: [70, 16],
  clinic: [86, 30],
  school: [20, 30],
  temple: [6, 46],
  park: [26, 58],
  market: [38, 74],
  cinema: [84, 52],
  bar: [93, 66],
  night_market: [72, 78],
  gym: [14, 82],
  riverside: [52, 88],
};

/** Khu vực: vùng tô màu nhẹ + nhãn trên thế giới (hình chữ nhật theo %) */
const DISTRICTS: Array<{ name: string; emoji: string; x: number; y: number; w: number; h: number; tint: string }> = [
  { name: 'Khu học đường', emoji: '📚', x: 2, y: 10, w: 28, h: 42, tint: 'rgba(255,236,170,0.30)' },
  { name: 'Khu trung tâm', emoji: '🏙️', x: 36, y: 4, w: 61, h: 32, tint: 'rgba(190,215,255,0.30)' },
  { name: 'Khu dân cư', emoji: '🏘️', x: 16, y: 42, w: 46, h: 40, tint: 'rgba(255,255,255,0.20)' },
  { name: 'Khu giải trí', emoji: '🎪', x: 65, y: 40, w: 33, h: 46, tint: 'rgba(255,190,215,0.28)' },
];

/** Kích thước thế giới theo khung nhìn: rộng hơn khoảng 1/3 (điện thoại thì gấp đôi), cao hơn khung nhìn để có chỗ kéo */
const worldSize = (vw: number, vh: number): [number, number] => {
  const w = Math.max(vw * 1.35, 820);
  return [w, Math.max(w / 1.6, vh * 1.5)];
};

/** Cây trang trí rải đều nhưng tránh các địa điểm (cố định theo hạt giống nên không nhấp nháy mỗi lần vẽ) */
const TREES: Array<[number, number, string]> = (() => {
  let seed = 24;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const out: Array<[number, number, string]> = [];
  const spots = Object.values(POS);
  for (let i = 0; i < 160 && out.length < 46; i++) {
    const x = 2 + rnd() * 96;
    const y = 3 + rnd() * 90;
    if (spots.some(([px, py]) => Math.hypot(px - x, (py - y) * 0.7) < 9)) continue;
    out.push([x, y, rnd() < 0.7 ? '🌳' : '🌲']);
  }
  return out;
})();

/** Mức tối của bản đồ theo giờ (0 = ban ngày, ~0.6 = đêm khuya) */
const nightFactor = (clock: number) => {
  const h = clock % 24;
  if (h >= 8 && h < 17) return 0;
  if (h >= 17 && h < 20) return ((h - 17) / 3) * 0.55;
  if (h >= 20 || h < 5) return 0.6;
  if (h >= 5 && h < 8) return 0.6 - ((h - 5) / 3) * 0.6;
  return 0;
};

export const CityMap: React.FC<CityMapProps> = ({ location, avatarId, actions, plans, tags = {}, hoursRemaining, onSelectAction, onTravel }) => {
  const [selected, setSelected] = useState<LocationId | null>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<[number, number]>([0, 0]);
  const [overview, setOverview] = useState(false);
  /** Vị trí kéo tay (px); null = camera tự bám theo nhân vật */
  const [pan, setPan] = useState<[number, number] | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const clock = clockFromHoursRemaining(hoursRemaining);
  const dark = nightFactor(clock);
  const here = locationDef(location);
  const [px, py] = POS[location];

  useLayoutEffect(() => {
    const el = viewRef.current;
    if (!el) return;
    const measure = () => setView([el.clientWidth, el.clientHeight]);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Đổi địa điểm thì camera lại bám theo nhân vật
  useEffect(() => setPan(null), [location]);

  const [vw, vh] = view;
  const [worldW, worldH] = useMemo(() => worldSize(vw || 1, vh || 1), [vw, vh]);
  const scale = overview ? Math.min(vw / worldW, vh / worldH) || 1 : 1;
  const W = worldW * scale;
  const H = worldH * scale;
  const clampAxis = (v: number, world: number, viewport: number) => (world <= viewport ? (viewport - world) / 2 : Math.min(0, Math.max(viewport - world, v)));
  const follow: [number, number] = [vw / 2 - (px / 100) * W, vh / 2 - (py / 100) * H];
  const [rawX, rawY] = overview ? [0, 0] : pan ?? follow;
  /** Toàn cảnh trên màn hình hẹp: biểu tượng nhỏ gọn, bỏ dòng thời gian để khỏi đè lên nhau */
  const compact = overview && W < 700;
  const tx = clampAxis(rawX, W, vw);
  const ty = clampAxis(rawY, H, vh);

  /** Đưa một địa điểm vào giữa khung nhìn (dùng khi focus bằng bàn phím) */
  const centerOn = (id: LocationId) => {
    if (overview) return;
    setPan([clampAxis(vw / 2 - (POS[id][0] / 100) * W, W, vw), clampAxis(vh / 2 - (POS[id][1] / 100) * H, H, vh)]);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (overview || (e.pointerType === 'mouse' && e.button !== 0)) return;
    dragRef.current = { x: e.clientX, y: e.clientY, px: tx, py: ty, moved: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) > 6) {
      d.moved = true;
      setDragging(true);
      // Chỉ bắt chuột khi thực sự kéo: bắt ngay lúc nhấn sẽ làm click không tới được nút địa điểm
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (d.moved) setPan([clampAxis(d.px + dx, W, vw), clampAxis(d.py + dy, H, vh)]);
  };
  const endDrag = () => {
    if (dragRef.current?.moved) {
      suppressClick.current = true;
      setTimeout(() => (suppressClick.current = false), 0);
    }
    dragRef.current = null;
    setDragging(false);
  };

  const placeActions = selected ? actions.filter((a) => locationOf(a.id) === selected) : [];
  const selectedDef: LocationDef | null = selected ? locationDef(selected) : null;
  const selectedTravel = selected ? planTravel(location, selected, hoursRemaining) : null;

  /** Bảng địa điểm đang chọn: nằm đè lên bản đồ ở màn hình rộng, nằm bên dưới bản đồ ở điện thoại */
  const panel =
    selected && selectedDef ? (
      <div role="region" aria-label={`Hoạt động ở ${selectedDef.name}`}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-sm font-extrabold text-stone-900">
              {selectedDef.emoji} {selectedDef.name}
            </div>
            <div className="text-[11px] text-stone-500">
              {selectedDef.tagline} · Mở {openHoursLabel(selectedDef.id)}
            </div>
          </div>
          <button onClick={() => setSelected(null)} className="text-stone-400 hover:text-stone-800 text-sm px-2 py-1 -my-1" aria-label="Đóng bảng địa điểm">
            ✕
          </button>
        </div>

        {selected !== location && selectedTravel && (
          <button
            disabled={!selectedTravel.ok}
            onClick={() => {
              onTravel(selected);
              setSelected(null);
            }}
            className="w-full mt-2 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:bg-stone-200 disabled:text-stone-500 text-white text-xs font-bold"
          >
            {selectedTravel.ok ? `🚶 Chỉ đi tới đây (${selectedTravel.travelHours}h)` : selectedTravel.reason}
          </button>
        )}

        {selected === 'home' ? (
          <p className="text-[11px] text-stone-600 mt-2 leading-snug">
            Ở nhà bạn ngủ, nấu ăn, học online, chơi với chú chó và nhiều việc khác. Về nhà rồi mở tab 🏠 Phòng để chọn.
          </p>
        ) : (
          <div className="mt-2 space-y-1.5">
            {placeActions.length === 0 && <p className="text-xs text-stone-500">Chưa có hoạt động nào ở đây.</p>}
            {placeActions.map((a) => {
              const plan = plans[a.id];
              const blocked = plan && !plan.ok;
              const tone = a.dopaminePathway === 'fast' ? 'border-l-pink-400' : a.category === 'work' ? 'border-l-amber-400' : 'border-l-emerald-400';
              return (
                <button
                  key={a.id}
                  disabled={blocked}
                  title={a.description}
                  onClick={() => {
                    onSelectAction(a.id);
                    setSelected(null);
                  }}
                  className={`w-full text-left px-2.5 py-2.5 rounded-lg border-l-4 ${tone} bg-stone-50 hover:bg-stone-100 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-between gap-2`}
                >
                  <span className="min-w-0">
                    <span className="block text-xs font-medium text-stone-800 leading-snug">{a.title}</span>
                    {blocked ? (
                      <span className="block text-[10px] mt-0.5 text-stone-600">🔒 {plan.reason}</span>
                    ) : (
                      tags[a.id] && <span className={`block text-[10px] mt-0.5 ${tagTone(tags[a.id])}`}>{tags[a.id]}</span>
                    )}
                  </span>
                  <span className="text-[11px] font-semibold text-stone-600 tabular-nums shrink-0">{a.hours}h</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    ) : null;

  return (
    <div className="space-y-2">
      <div
        ref={viewRef}
        className={`relative w-full h-[22rem] sm:h-[26rem] lg:h-[32rem] rounded-3xl overflow-hidden border-2 border-white/60 shadow-xl ring-1 ring-black/10 select-none touch-none ${overview ? '' : dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ background: 'linear-gradient(160deg, #bfe9a8 0%, #9ed8a0 40%, #8cc9b0 100%)' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onScroll={(e) => {
          e.currentTarget.scrollLeft = 0;
          e.currentTarget.scrollTop = 0;
        }}
      >
        {/* Thế giới: lớn hơn khung nhìn, dịch chuyển theo camera */}
        <div
          className="absolute left-0 top-0"
          style={{ width: W, height: H, transform: `translate3d(${tx}px, ${ty}px, 0)`, transition: dragging ? 'none' : 'transform 700ms ease-in-out' }}
        >
        {/* Khu vực */}
        {DISTRICTS.map((d) => (
          <div key={d.name} className="absolute rounded-[2.5rem] border border-white/40 pointer-events-none" style={{ left: `${d.x}%`, top: `${d.y}%`, width: `${d.w}%`, height: `${d.h}%`, background: d.tint }}>
            <span className="absolute left-4 top-2 px-2 py-0.5 rounded-md bg-white/55 text-stone-700 text-[10px] sm:text-[11px] font-bold uppercase tracking-wide">
              {d.emoji} {d.name}
            </span>
          </div>
        ))}

        {/* Cây trang trí */}
        {TREES.map(([x, y, e], i) => (
          <span key={i} className="absolute -translate-x-1/2 -translate-y-1/2 text-lg opacity-60 pointer-events-none" style={{ left: `${x}%`, top: `${y}%` }} aria-hidden>
            {e}
          </span>
        ))}

        {/* Đường phố từ nhà + dòng sông */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <path d="M -2 80 C 16 70, 30 98, 52 96 S 88 80, 102 88" fill="none" stroke="#7ec8e8" strokeWidth="34" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity="0.85" />
          <path d="M -2 80 C 16 70, 30 98, 52 96 S 88 80, 102 88" fill="none" stroke="#b9e6f5" strokeWidth="10" strokeLinecap="round" strokeDasharray="2 8" vectorEffect="non-scaling-stroke" opacity="0.7" />
          {LOCATIONS.filter((l) => l.id !== 'home').map((l) => (
            <line key={l.id} x1={POS.home[0]} y1={POS.home[1]} x2={POS[l.id][0]} y2={POS[l.id][1]} stroke="#f8f5e8" strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity="0.9" />
          ))}
          {LOCATIONS.filter((l) => l.id !== 'home').map((l) => (
            <line key={`d${l.id}`} x1={POS.home[0]} y1={POS.home[1]} x2={POS[l.id][0]} y2={POS[l.id][1]} stroke="#8d8d7a" strokeWidth="0.5" strokeDasharray="1.2 1.8" vectorEffect="non-scaling-stroke" opacity="0.6" />
          ))}
        </svg>

        {/* Địa điểm */}
        {LOCATIONS.map((l) => {
          const [x, y] = POS[l.id];
          const open = isLocationOpen(l.id, clock);
          const isHere = l.id === location;
          const isSel = l.id === selected;
          const trip = l.id === location ? 0 : planTravel(location, l.id, 24).travelHours;
          return (
            <button
              key={l.id}
              onFocus={(e) => e.currentTarget.matches(':focus-visible') && centerOn(l.id)}
              onClick={() => {
                if (suppressClick.current) return;
                setSelected((cur) => (cur === l.id ? null : l.id));
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 group"
              style={{ left: `${x}%`, top: `${y}%` }}
              aria-label={`${l.name}${isHere ? ', bạn đang ở đây' : !open ? ', đóng cửa' : `, đi mất ${trip} giờ`}`}
              aria-pressed={isSel}
            >
              <span
                className={`flex items-center justify-center rounded-2xl shadow-lg transition-transform group-hover:scale-110 ${compact ? 'w-8 h-8 text-lg' : 'w-12 h-12 sm:w-14 sm:h-14 text-2xl sm:text-3xl'} ${
                  isSel ? 'ring-4 ring-amber-300 scale-110' : isHere ? 'ring-4 ring-white' : 'ring-2 ring-white/70'
                } ${open ? 'bg-white' : 'bg-stone-300 grayscale'}`}
              >
                {l.emoji}
              </span>
              <span className={`px-1.5 py-0.5 rounded-md bg-black/60 text-white font-semibold whitespace-nowrap ${compact ? 'text-[8px]' : 'text-[10px] sm:text-[11px]'}`}>{l.name}</span>
              {!compact && (
                <span className="text-[10px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] whitespace-nowrap">
                  {isHere ? '📍 Đang ở đây' : !open ? '🔒 Đóng cửa' : `🚶 ${trip}h`}
                </span>
              )}
            </button>
          );
        })}

        {/* Nhân vật */}
        <img
          src={avatarUrl(avatarId)}
          alt=""
          className="absolute w-10 h-10 sm:w-12 sm:h-12 -translate-x-1/2 pointer-events-none drop-shadow-lg transition-all duration-700 ease-in-out animate-bounce motion-reduce:animate-none"
          style={{ left: `${px}%`, top: `calc(${py}% - 4.2rem)`, animationDuration: '1.6s' }}
        />
        </div>

        {/* Ban đêm (phủ cả khung nhìn) */}
        <div className="absolute inset-0 pointer-events-none transition-opacity duration-700" style={{ background: 'linear-gradient(180deg,#0b0b2e,#1a1a4a)', opacity: dark }} />

        {/* Điều khiển camera */}
        <div className="absolute bottom-3 left-3 flex gap-1.5" onPointerDown={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setOverview((v) => !v)}
            className="px-2.5 py-1.5 rounded-lg bg-black/60 hover:bg-black/75 text-white text-[11px] font-semibold backdrop-blur-xs"
            aria-pressed={overview}
          >
            {overview ? '🔎 Phóng to' : '🗺️ Toàn cảnh'}
          </button>
          {!overview && pan && (
            <button type="button" onClick={() => setPan(null)} className="px-2.5 py-1.5 rounded-lg bg-black/60 hover:bg-black/75 text-white text-[11px] font-semibold backdrop-blur-xs">
              📍 Về chỗ tôi
            </button>
          )}
        </div>

        {/* Thanh trạng thái */}
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/55 text-white text-[11px] font-semibold backdrop-blur-xs pointer-events-none">
          {here.emoji} {here.name} · {String(Math.floor(clock) % 24).padStart(2, '0')}:{String(Math.round((clock % 1) * 60)).padStart(2, '0')}
        </span>

        {!selected && (
          <span className="absolute bottom-3 right-3 hidden sm:block px-2.5 py-1 rounded-lg bg-black/55 text-white text-[11px] backdrop-blur-xs pointer-events-none whitespace-nowrap">
            👆 Chạm một địa điểm · kéo để xem thêm · đi đường tốn giờ
          </span>
        )}

        {/* Màn hình rộng: bảng nằm đè lên bản đồ */}
        {panel && (
          <div className="hidden sm:block absolute z-10 right-3 top-3 bottom-3 w-80 rounded-2xl bg-white/95 backdrop-blur-sm shadow-2xl border border-stone-200 p-3 overflow-y-auto">
            {panel}
          </div>
        )}
      </div>

      {/* Điện thoại: bảng nằm dưới bản đồ để bản đồ luôn nhìn thấy */}
      {panel && <div className="sm:hidden rounded-2xl bg-white shadow-md border border-stone-200 p-3">{panel}</div>}
    </div>
  );
};
