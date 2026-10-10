import React, { useEffect, useRef, useState } from 'react';
import { locationOf } from '@24h/domain';
import { ANIMAL_REACH, EMOTE_REACH, TARGETED_EMOTES, animForAction, type AnimalOp, type EmoteKind } from '@24h/protocol';
import type { RoomConnection, RoomSnapshot } from '../../net/room';
import { audioAdapter } from '../../adapters/audioAdapter';
import { CityRenderer } from '../../world/CityRenderer';
import { EMOTE_EMOJI } from '../../world/animMap';

const EMOTE_LABEL: Record<EmoteKind, string> = { wave: 'Vẫy', highfive: 'Đập tay', hug: 'Ôm', dance: 'Nhảy', cheer: 'Hò reo' };
const EMOTE_VERB: Record<EmoteKind, string> = { wave: 'vẫy tay chào', highfive: 'đập tay với', hug: 'ôm', dance: 'nhảy cùng', cheer: 'hò reo cùng' };
const ANIMAL_EMOJI: Record<string, string> = { cat: '🐱', capybara: '🦫', duck: '🦆', shiba: '🐕', frog: '🐸' };

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
}

/** Cảnh thành phố 3D: dựng người chơi từ snapshot, đi bộ theo lưới, phát hoạt hình theo hành vi server xác nhận. */
export const CityStage: React.FC<CityStageProps> = ({ conn, snapshot, quality, onVisitLocation }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<CityRenderer | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const seenChatRef = useRef(0);
  const placedRef = useRef(false);
  const visitRef = useRef(onVisitLocation);
  visitRef.current = onVisitLocation;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeAnimalId, setActiveAnimalId] = useState<string | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
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
          setActiveAnimalId(null); // đi chỗ khác thì đóng bảng con vật
          renderer?.walkLocalTo(x, z);
        },
        onAnimal: (animalId) => {
          const r = renderer;
          const pos = r?.animalPosition(animalId);
          const me = r?.localPosition();
          if (!r || !pos || !me) return;
          setSelectedId(null);
          selectedRef.current = null;
          r.setSelectedPlayer(null);
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

    return () => {
      cancelled = true;
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

  return (
    <div className="relative w-full h-[22rem] sm:h-[28rem] lg:h-[34rem] rounded-2xl overflow-hidden bg-sky-100 border border-stone-200" data-testid="city-stage">
      <div ref={containerRef} className="absolute inset-0" />
      {state === 'loading' && <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-stone-600 animate-pulse">Đang dựng thành phố…</div>}
      {state === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-stone-700 bg-stone-100">
          Không dựng được cảnh 3D (thiếu WebGL hoặc tải mô hình lỗi). Bạn vẫn chơi được bằng danh sách hành vi bên dưới, hoặc bật “Chế độ nhẹ”.
        </div>
      )}
      <div className="absolute left-2 top-2 flex flex-col gap-1 max-w-[70%] pointer-events-none" aria-live="polite">
        {feed.map((f) => (
          <div key={f.id} className="px-2.5 py-1 rounded-lg bg-white/90 text-[11px] text-stone-700 shadow-sm border border-stone-200">
            {f.text}
          </div>
        ))}
      </div>
      {activeAnimal && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-12 flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/95 shadow-lg border border-amber-200" data-testid="animal-panel">
          <span className="text-sm font-bold text-stone-800">
            {ANIMAL_EMOJI[activeAnimal.kind] ?? '🐾'} {activeAnimal.name}
          </span>
          <button type="button" onClick={() => doAnimal('pet')} className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-900 hover:bg-emerald-100">
            🤚 Vuốt ve
          </button>
          <button type="button" onClick={() => doAnimal('poke')} className="px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-900 hover:bg-rose-100">
            👆 Chọc
          </button>
          <button type="button" onClick={() => setActiveAnimalId(null)} aria-label="Đóng" className="px-1.5 text-stone-500 hover:text-stone-800">
            ✕
          </button>
        </div>
      )}
      <div className="absolute right-2 bottom-2 flex flex-wrap justify-end items-center gap-1 max-w-[75%]" data-testid="emote-bar">
        {selected && <span className="px-2 py-1 rounded-lg bg-amber-100 text-[11px] font-semibold text-amber-900">→ {selected.name}</span>}
        {(['wave', 'highfive', 'hug', 'dance', 'cheer'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => doEmote(k)}
            title={EMOTE_LABEL[k]}
            className="px-2 py-1 rounded-lg bg-white/90 border border-stone-200 text-xs font-semibold text-stone-700 shadow-sm hover:bg-indigo-50"
          >
            {EMOTE_EMOJI[k]} <span className="hidden sm:inline">{EMOTE_LABEL[k]}</span>
          </button>
        ))}
      </div>
      <div className="absolute left-2 bottom-2 px-2 py-1 rounded-lg bg-white/80 text-[11px] text-stone-600 pointer-events-none max-w-[40%]">
        Bấm đường để đi · toà nhà để tới cửa · bạn bè để chọn · con vật để vuốt ve hoặc chọc · kéo để xoay
      </div>
    </div>
  );
};
