import React, { useEffect, useRef, useState } from 'react';
import { locationOf } from '@24h/domain';
import { ANIMAL_REACH, EMOTE_REACH, RESIDENTS, RESIDENT_REACH, TARGETED_EMOTES, animForAction, type AnimalOp, type EmoteKind, type ResidentOp } from '@24h/protocol';
import type { RoomConnection, RoomSnapshot } from '../../net/room';
import { audioAdapter } from '../../adapters/audioAdapter';
import { avatarUrl, type AvatarId } from '../../lib/avatars';
import { CityRenderer } from '../../world/CityRenderer';
import { EMOTE_EMOJI } from '../../world/animMap';

const EMOTE_LABEL: Record<EmoteKind, string> = { wave: 'Vẫy', highfive: 'Đập tay', hug: 'Ôm', dance: 'Nhảy', cheer: 'Hò reo' };
const EMOTE_VERB: Record<EmoteKind, string> = { wave: 'vẫy tay chào', highfive: 'đập tay với', hug: 'ôm', dance: 'nhảy cùng', cheer: 'hò reo cùng' };
const ANIMAL_EMOJI: Record<string, string> = { cat: '🐱', capybara: '🦫', duck: '🦆', shiba: '🐕', frog: '🐸' };
const LEVEL_NAME = ['Người lạ', 'Quen mặt', 'Bạn bè'] as const;
const RESIDENT_VERB: Record<ResidentOp, string> = { talk: 'trò chuyện với', help: 'giúp đỡ', treat: 'mời quà' };

interface FeedItem {
  id: number;
  text: string;
}

interface CityStageProps {
  conn: RoomConnection;
  snapshot: RoomSnapshot;
  quality: 'high' | 'low';
  /** Người chơi bấm vào một toà nhà: nhân vật đi tới cửa; khi tới nơi gọi lại với LocationId */
  onVisitLocation?: (locationId: string) => void;
  /** Lớp HUD phủ lên cảnh: thanh trên, thông báo ở giữa, cột chỉ số bên trái (máy tính) */
  hud?: { top?: React.ReactNode; center?: React.ReactNode; left?: React.ReactNode };
}

/** Cảnh thành phố 3D: dựng người chơi từ snapshot, đi bộ theo lưới, phát hoạt hình theo hành vi server xác nhận. */
export const CityStage: React.FC<CityStageProps> = ({ conn, snapshot, quality, onVisitLocation, hud }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<CityRenderer | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const seenChatRef = useRef(0);
  const placedRef = useRef(false);
  const visitRef = useRef(onVisitLocation);
  visitRef.current = onVisitLocation;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeAnimalId, setActiveAnimalId] = useState<string | null>(null);
  const [activeResidentId, setActiveResidentId] = useState<string | null>(null);
  /** Mức thân quen của mình với từng cư dân (server trả về sau mỗi lần tương tác) */
  const [levels, setLevels] = useState<Record<string, number>>({});
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [hintVisible, setHintVisible] = useState(true);
  useEffect(() => {
    const t = window.setTimeout(() => setHintVisible(false), 16000);
    return () => window.clearTimeout(t);
  }, []);
  const feedId = useRef(0);
  const snapRef = useRef(snapshot);
  snapRef.current = snapshot;
  const selectedRef = useRef<string | null>(null);

  const pushFeed = (text: string) => {
    const id = ++feedId.current;
    setFeed((f) => [...f.slice(-3), { id, text }]);
    window.setTimeout(() => setFeed((f) => f.filter((x) => x.id !== id)), 6000);
  };

  // Khởi tạo renderer một lần cho mỗi kết nối
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    let renderer: CityRenderer | null = null;
    try {
      renderer = new CityRenderer(container, {
        quality,
        onGround: (x, z) => {
          setActiveAnimalId(null); // đi chỗ khác thì đóng bảng con vật / cư dân
          setActiveResidentId(null);
          renderer?.walkLocalTo(x, z);
        },
        onResident: (residentId) => {
          const r = renderer;
          const pos = r?.residentPosition(residentId);
          const me = r?.localPosition();
          if (!r || !pos || !me) return;
          setSelectedId(null);
          selectedRef.current = null;
          r.setSelectedPlayer(null);
          setActiveAnimalId(null);
          const d = Math.hypot(pos.x - me.x, pos.z - me.z);
          if (d <= RESIDENT_REACH - 1) {
            setActiveResidentId(residentId);
            return;
          }
          // Đi tới gần (cách ~1.6m về phía mình) rồi mới hiện nút trò chuyện
          const k = 1.6 / d;
          r.walkLocalTo(pos.x + (me.x - pos.x) * k, pos.z + (me.z - pos.z) * k, () => setActiveResidentId(residentId));
        },
        onAnimal: (animalId) => {
          const r = renderer;
          const pos = r?.animalPosition(animalId);
          const me = r?.localPosition();
          if (!r || !pos || !me) return;
          setSelectedId(null);
          selectedRef.current = null;
          r.setSelectedPlayer(null);
          setActiveResidentId(null);
          const d = Math.hypot(pos.x - me.x, pos.z - me.z);
          if (d <= ANIMAL_REACH - 0.5) {
            setActiveAnimalId(animalId);
            return;
          }
          // Đi tới gần (cách ~1.8m về phía mình) rồi mới hiện nút vuốt ve / chọc
          const k = 1.8 / d;
          r.walkLocalTo(pos.x + (me.x - pos.x) * k, pos.z + (me.z - pos.z) * k, () => setActiveAnimalId(animalId));
        },
        onPlayer: (playerId) => {
          const next = selectedRef.current === playerId ? null : playerId;
          selectedRef.current = next;
          setSelectedId(next);
          renderer?.setSelectedPlayer(next);
        },
        onBuilding: (doorKey) => {
          setActiveAnimalId(null);
          setActiveResidentId(null);
          const nav = renderer?.getNav();
          const loc = nav ? Object.entries(nav.data.locations).find(([, key]) => key === doorKey)?.[0] : undefined;
          renderer?.walkLocalToDoor(doorKey, () => {
            if (loc) visitRef.current?.(loc);
          });
        },
        onLocalMove: (x, z) => conn.sendMove(x, z),
        onStep: () => audioAdapter.playRoomSfx(`step${1 + Math.floor(Math.random() * 3)}`, 0.2),
      });
    } catch {
      setState('error'); // không tạo được WebGL
      return;
    }
    rendererRef.current = renderer;
    if (import.meta.env.DEV) (window as unknown as { __city?: CityRenderer }).__city = renderer; // chỉ để gỡ lỗi khi dev
    renderer.setLocalPlayer(conn.sessionId);
    renderer
      .init()
      .then(() => {
        if (!cancelled) setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });

    // Hành vi server đã chấp nhận: nhân vật đi tới địa điểm rồi làm
    const toLocation = (actionId: string) => {
      const r = rendererRef.current;
      if (!r) return;
      const nav = r.getNav();
      const doorKey = nav.data.locations[locationOf(actionId)] ?? 'home';
      const anim = animForAction(actionId);
      const go = () => {
        audioAdapter.playRoomSfx('door-open', 0.3);
        r.playLocalAnim(anim);
      };
      if (!r.walkLocalToDoor(doorKey, go)) go();
    };
    const offAction = conn.on('action_result', (m) => {
      if (m.ok && m.actionId) toLocation(m.actionId);
    });
    const offJoint = conn.on('joint_result', (m) => {
      if (m.ok && m.withNames && m.actionId) toLocation(m.actionId);
    });

    const offEmote = conn.on('emote', (m) => {
      rendererRef.current?.playEmote(m.fromId, m.kind, m.targetId);
      if (m.targetName && TARGETED_EMOTES.includes(m.kind)) pushFeed(`${EMOTE_EMOJI[m.kind]} ${m.fromName} ${EMOTE_VERB[m.kind]} ${m.targetName}`);
    });
    const offEmoteResult = conn.on('emote_result', (m) => {
      if (!m.ok && m.reason) pushFeed(`⚠️ ${m.reason}`);
      else if (m.gained) pushFeed(`✨ ${m.gained}`);
    });
    const offAnimal = conn.on('animal_event', (m) => {
      rendererRef.current?.showAnimalBubble(m.animalId, m.line);
      const kind = snapRef.current.animals.find((a) => a.id === m.animalId)?.kind ?? '';
      pushFeed(`${ANIMAL_EMOJI[kind] ?? '🐾'} ${m.byName} ${m.op === 'pet' ? 'vuốt ve' : 'chọc'} ${m.animalName}: ${m.line}`);
    });
    const offAnimalResult = conn.on('animal_result', (m) => {
      if (!m.ok && m.reason) pushFeed(`⚠️ ${m.reason}`);
      else if (m.gained) pushFeed(`✨ ${m.gained}`);
    });

    const offResident = conn.on('resident_event', (m) => {
      rendererRef.current?.residentReact(m.residentId, m.op, m.line, m.byId);
      if (m.byId === conn.sessionId && m.op !== 'treat') rendererRef.current?.playLocalAnim(m.op === 'help' ? 'wave' : 'idle', 2);
      const def = RESIDENTS.find((r) => r.id === m.residentId);
      pushFeed(`${def?.emoji ?? '🧑'} ${m.byName} ${RESIDENT_VERB[m.op]} ${m.residentName}`);
    });
    const offResidentResult = conn.on('resident_result', (m) => {
      if (!m.ok && m.reason) pushFeed(`⚠️ ${m.reason}`);
      else if (m.gained) pushFeed(`✨ ${m.gained}`);
      if (m.ok && typeof m.level === 'number') {
        const lv = m.level;
        setLevels((l) => ({ ...l, [m.residentId]: lv }));
      }
    });

    return () => {
      cancelled = true;
      offResident();
      offResidentResult();
      offEmote();
      offEmoteResult();
      offAnimal();
      offAnimalResult();
      offAction();
      offJoint();
      renderer?.dispose();
      rendererRef.current = null;
      placedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conn, quality]);

  // Snapshot -> người chơi trong cảnh
  useEffect(() => {
    const r = rendererRef.current;
    if (!r || state !== 'ready') return;
    r.setLocalPlayer(snapshot.sessionId);
    r.syncPlayers(
      snapshot.players.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar, x: p.x, z: p.z, anim: p.anim, bot: p.bot, connected: p.connected }))
    );
    if (!placedRef.current && snapshot.me) {
      placedRef.current = true;
      r.teleportLocal(snapshot.me.x, snapshot.me.z);
    }
    r.syncAnimals(snapshot.animals);
    r.syncResidents(
      snapshot.residents.flatMap((rv) => {
        const def = RESIDENTS.find((d) => d.id === rv.id);
        return def ? [{ id: rv.id, name: rv.name || def.name, avatar: def.avatar, emoji: def.emoji, x: rv.x, z: rv.z, state: rv.state }] : [];
      })
    );
    // Giờ trong ngày: 07:00 + số giờ đã dùng của chính mình
    if (snapshot.me) r.setClock(7 + snapshot.me.hoursUsed);
    // Bong bóng chat cho tin mới
    const fresh = snapshot.chat.filter((c) => c.at > seenChatRef.current);
    for (const c of fresh) r.showBubble(c.playerId, c.text);
    if (fresh.length > 0) seenChatRef.current = Math.max(...fresh.map((c) => c.at));
  }, [snapshot, state]);

  /** Người nhận biểu cảm: người đang chọn, hoặc người gần nhất trong tầm */
  const resolveTarget = (): string | undefined => {
    if (selectedRef.current) return selectedRef.current;
    const me = rendererRef.current?.localPosition() ?? snapRef.current.me;
    if (!me) return undefined;
    let bestId: string | undefined;
    let bestD = Infinity;
    for (const p of snapRef.current.players) {
      if (p.id === snapRef.current.sessionId || !p.connected) continue;
      const d = Math.hypot(p.x - me.x, p.z - me.z);
      if (d <= EMOTE_REACH && d < bestD) {
        bestD = d;
        bestId = p.id;
      }
    }
    return bestId;
  };
  const doEmote = (kind: EmoteKind) => conn.emote(kind, TARGETED_EMOTES.includes(kind) ? resolveTarget() : undefined);
  const doAnimal = (op: AnimalOp) => {
    if (activeAnimalId) conn.interactAnimal(activeAnimalId, op);
  };
  const selected = snapshot.players.find((p) => p.id === selectedId);
  const activeAnimal = snapshot.animals.find((a) => a.id === activeAnimalId);
  const doResident = (op: ResidentOp) => {
    if (activeResidentId) conn.interactResident(activeResidentId, op);
  };
  const activeResidentDef = RESIDENTS.find((r) => r.id === activeResidentId);
  const activeLevel = activeResidentId ? levels[activeResidentId] ?? 0 : 0;

  return (
    <div className="relative w-full h-[29rem] sm:h-[31rem] lg:h-[38rem] rounded-3xl overflow-hidden bg-[#0b0a1f] ring-1 ring-white/15 shadow-[0_30px_80px_-30px_rgba(139,92,246,.55)]" data-testid="city-stage">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#0b0a1f]/75 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0b0a1f]/60 to-transparent" />

      {state === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-sm font-semibold text-white bg-[#0b0a1f]/70 backdrop-blur-sm">
          <div className="w-11 h-11 rounded-full border-2 border-amber-300/25 border-t-amber-300 animate-spin" />
          Đang dựng thành phố…
        </div>
      )}
      {state === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-[var(--ink-dim)] bg-[#0b0a1f]">
          Không dựng được cảnh 3D (thiếu WebGL hoặc tải mô hình lỗi). Bạn vẫn chơi được bằng danh sách hành vi bên dưới, hoặc bật “Chế độ nhẹ”.
        </div>
      )}

      {/* HUD của phòng: thanh trên, thông báo, cột chỉ số */}
      {hud?.top && <div className="absolute inset-x-0 top-0 p-2 sm:p-3 pointer-events-none">{hud.top}</div>}
      {hud?.center && <div className="absolute inset-x-0 top-[5.4rem] sm:top-[5.1rem] px-2 flex justify-center pointer-events-none">{hud.center}</div>}
      {hud?.left && (
        <div className="absolute left-2 sm:left-3 top-[5.6rem] hidden sm:block pointer-events-none">
          <div className="pointer-events-auto">{hud.left}</div>
        </div>
      )}

      {/* Dòng sự kiện nhanh (ai vừa làm gì) */}
      <div className="absolute right-2 sm:right-3 top-[6.6rem] sm:top-[5.6rem] flex flex-col items-end gap-1 max-w-[52%] pointer-events-none" aria-live="polite">
        {feed.map((f) => (
          <div key={f.id} className="px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-md border border-white/15 text-[11px] font-semibold text-white shadow-lg anim-rise">
            {f.text}
          </div>
        ))}
      </div>

      {activeAnimal && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-14 sm:bottom-16 flex items-center gap-2 px-3 py-2 glass-solid anim-pop" data-testid="animal-panel">
          <span className="text-2xl" aria-hidden>{ANIMAL_EMOJI[activeAnimal.kind] ?? '🐾'}</span>
          <span className="text-sm font-extrabold text-white pr-1">{activeAnimal.name}</span>
          <button type="button" onClick={() => doAnimal('pet')} className="btn btn-good px-2.5 py-1.5 text-xs">
            🤚 Vuốt ve
          </button>
          <button type="button" onClick={() => doAnimal('poke')} className="btn btn-danger-soft px-2.5 py-1.5 text-xs">
            👆 Chọc
          </button>
          <button type="button" onClick={() => setActiveAnimalId(null)} aria-label="Đóng" className="px-1.5 text-white/60 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {activeResidentDef && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-14 sm:bottom-16 w-[min(94%,28rem)] p-3 glass-solid anim-pop" data-testid="resident-panel">
          <div className="flex items-center gap-3 mb-2.5">
            <span className="relative shrink-0">
              <img src={avatarUrl(activeResidentDef.avatar as AvatarId)} alt="" className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400/25 to-sky-400/20 ring-2 ring-emerald-300/50 p-0.5" />
              <span className="absolute -bottom-1 -right-1 text-base drop-shadow">{activeResidentDef.emoji}</span>
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-extrabold text-white truncate">{activeResidentDef.name}</div>
              <div className="text-[11px] text-[var(--ink-dim)] truncate">{activeResidentDef.role}</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-bold text-emerald-300">
                <span aria-hidden className="tracking-tight">{[0, 1, 2].map((i) => (i <= activeLevel ? '❤️' : '🤍')).join('')}</span>
                {LEVEL_NAME[activeLevel] ?? LEVEL_NAME[0]}
              </div>
            </div>
            <button type="button" onClick={() => setActiveResidentId(null)} aria-label="Đóng" className="self-start px-1.5 text-white/60 hover:text-white">
              ✕
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => doResident('talk')} className="btn btn-soft px-3 py-1.5 text-xs">
              💬 Trò chuyện
            </button>
            <button type="button" onClick={() => doResident('help')} className="btn btn-good px-3 py-1.5 text-xs">
              🤝 {activeResidentDef.helpLabel}
            </button>
            {activeResidentDef.treatLabel && (
              <button type="button" onClick={() => doResident('treat')} className="btn btn-primary px-3 py-1.5 text-xs">
                🎁 {activeResidentDef.treatLabel} (−{activeResidentDef.treatCost}k)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Biểu cảm: dock kính ở góc phải dưới */}
      <div className="absolute right-2 sm:right-3 bottom-2 sm:bottom-3 flex flex-wrap justify-end items-center gap-1 max-w-[80%] px-1.5 py-1 rounded-2xl hud-glass" data-testid="emote-bar">
        {selected && <span className="chip !bg-amber-300/20 !border-amber-300/40 !text-amber-100">→ {selected.name}</span>}
        {(['wave', 'highfive', 'hug', 'dance', 'cheer'] as const).map((k) => (
          <button key={k} type="button" onClick={() => doEmote(k)} title={EMOTE_LABEL[k]} className="btn btn-soft h-8 px-2 text-xs !rounded-xl hover:!bg-amber-300/25">
            <span className="text-base leading-none">{EMOTE_EMOJI[k]}</span>
            <span className="hidden md:inline">{EMOTE_LABEL[k]}</span>
          </button>
        ))}
      </div>

      {hintVisible && (
        <div className="hidden sm:block absolute left-3 bottom-3 px-2.5 py-1.5 rounded-xl hud-glass text-[11px] text-[var(--ink-dim)] pointer-events-none max-w-[42%] anim-rise">
          Bấm đường để đi · bấm toà nhà, cư dân hay thú cưng để tương tác · kéo để xoay
        </div>
      )}
    </div>
  );
};
