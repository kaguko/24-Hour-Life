import React, { useState } from 'react';
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
} from '../domain';
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

/** Vị trí (%) của từng địa điểm trên bản đồ */
const POS: Record<LocationId, [number, number]> = {
  home: [52, 52],
  school: [14, 22],
  cafe: [38, 14],
  office: [84, 20],
  park: [14, 60],
  gym: [32, 86],
  market: [68, 84],
  bar: [88, 58],
};

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
  const clock = clockFromHoursRemaining(hoursRemaining);
  const dark = nightFactor(clock);
  const here = locationDef(location);
  const [px, py] = POS[location];

  const placeActions = selected ? actions.filter((a) => locationOf(a.id) === selected) : [];
  const selectedDef: LocationDef | null = selected ? locationDef(selected) : null;
  const selectedTravel = selected ? planTravel(location, selected, hoursRemaining) : null;

  return (
    <div
      className="relative w-full h-[24rem] sm:h-[26rem] lg:h-[32rem] rounded-3xl overflow-hidden border-2 border-white/60 shadow-xl ring-1 ring-black/10 touch-manipulation select-none"
      style={{ background: 'linear-gradient(160deg, #bfe9a8 0%, #9ed8a0 40%, #8cc9b0 100%)' }}
      aria-label="Bản đồ thành phố: chọn một địa điểm để đi tới"
    >
      {/* Đường phố từ nhà */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        {LOCATIONS.filter((l) => l.id !== 'home').map((l) => (
          <line key={l.id} x1={POS.home[0]} y1={POS.home[1]} x2={POS[l.id][0]} y2={POS[l.id][1]} stroke="#f8f5e8" strokeWidth="1.6" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity="0.9" />
        ))}
        {LOCATIONS.filter((l) => l.id !== 'home').map((l) => (
          <line key={`d${l.id}`} x1={POS.home[0]} y1={POS.home[1]} x2={POS[l.id][0]} y2={POS[l.id][1]} stroke="#8d8d7a" strokeWidth="0.5" strokeDasharray="1.2 1.8" vectorEffect="non-scaling-stroke" opacity="0.6" />
        ))}
      </svg>

      {/* Ban đêm */}
      <div className="absolute inset-0 pointer-events-none transition-opacity duration-700" style={{ background: 'linear-gradient(180deg,#0b0b2e,#1a1a4a)', opacity: dark }} />

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
            onClick={() => setSelected((cur) => (cur === l.id ? null : l.id))}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 group"
            style={{ left: `${x}%`, top: `${y}%` }}
            aria-label={l.name}
          >
            <span
              className={`flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl text-2xl sm:text-3xl shadow-lg transition-transform group-hover:scale-110 ${
                isSel ? 'ring-4 ring-amber-300 scale-110' : isHere ? 'ring-4 ring-white' : 'ring-2 ring-white/70'
              } ${open ? 'bg-white' : 'bg-stone-300 grayscale'}`}
            >
              {l.emoji}
            </span>
            <span className="px-1.5 py-0.5 rounded-md bg-black/55 text-white text-[10px] sm:text-[11px] font-semibold whitespace-nowrap">{l.name}</span>
            <span className="text-[10px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] whitespace-nowrap">
              {isHere ? '📍 Đang ở đây' : !open ? '🔒 Đóng cửa' : `🚶 ${trip}h`}
            </span>
          </button>
        );
      })}

      {/* Nhân vật */}
      <img
        src={avatarUrl(avatarId)}
        alt=""
        className="absolute w-10 h-10 sm:w-12 sm:h-12 -translate-x-1/2 pointer-events-none drop-shadow-lg transition-all duration-700 ease-in-out animate-bounce"
        style={{ left: `${px}%`, top: `calc(${py}% - 4.2rem)`, animationDuration: '1.6s' }}
      />

      {/* Thanh trạng thái */}
      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/45 text-white text-[11px] font-semibold backdrop-blur-xs pointer-events-none">
        {here.emoji} {here.name} · {String(Math.floor(clock) % 24).padStart(2, '0')}:{String(Math.round((clock % 1) * 60)).padStart(2, '0')}
      </span>

      {!selected && (
        <span className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-black/45 text-white text-[11px] backdrop-blur-xs pointer-events-none whitespace-nowrap">
          👆 Chạm một địa điểm để xem việc làm được ở đó
        </span>
      )}

      {/* Bảng địa điểm đang chọn */}
      {selected && selectedDef && (
        <div className="absolute z-10 inset-x-2 bottom-2 sm:inset-x-auto sm:right-3 sm:top-3 sm:bottom-3 sm:w-80 max-h-[75%] sm:max-h-none rounded-2xl bg-white/95 backdrop-blur-sm shadow-2xl border border-stone-200 p-3 overflow-y-auto">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-sm font-extrabold text-stone-900">
                {selectedDef.emoji} {selectedDef.name}
              </div>
              <div className="text-[11px] text-stone-500">
                {selectedDef.tagline} · Mở {openHoursLabel(selectedDef.id)}
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="text-stone-400 hover:text-stone-800 text-sm px-2 py-1 -my-1" aria-label="Đóng">
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
              className="w-full mt-2 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:bg-stone-200 disabled:text-stone-400 text-white text-xs font-bold"
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
                const tone =
                  a.dopaminePathway === 'fast' ? 'border-l-pink-400' : a.category === 'work' ? 'border-l-amber-400' : 'border-l-emerald-400';
                return (
                  <button
                    key={a.id}
                    disabled={blocked}
                    title={a.description}
                    onClick={() => {
                      onSelectAction(a.id);
                      setSelected(null);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg border-l-4 ${tone} bg-stone-50 hover:bg-stone-100 disabled:opacity-45 disabled:cursor-not-allowed flex items-center justify-between gap-2`}
                  >
                    <span className="min-w-0">
                      <span className="block text-xs font-medium text-stone-800 leading-snug">{a.title}</span>
                      {blocked ? (
                        <span className="block text-[10px] mt-0.5 text-stone-500">🔒 {plan.reason}</span>
                      ) : (
                        tags[a.id] && <span className={`block text-[10px] mt-0.5 ${tagTone(tags[a.id])}`}>{tags[a.id]}</span>
                      )}
                    </span>
                    <span className="text-[11px] font-semibold text-stone-500 tabular-nums shrink-0">{a.hours}h</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
