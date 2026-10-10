import React, { useEffect, useRef, useState } from 'react';
import { locationOf } from '@24h/domain';
import { animForAction } from '@24h/protocol';
import type { RoomConnection, RoomSnapshot } from '../../net/room';
import { CityRenderer } from '../../world/CityRenderer';

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

  // Khởi tạo renderer một lần cho mỗi kết nối
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    let renderer: CityRenderer | null = null;
    try {
      renderer = new CityRenderer(container, {
        quality,
        onGround: (x, z) => renderer?.walkLocalTo(x, z),
        onBuilding: (doorKey) => {
          const nav = renderer?.getNav();
          const loc = nav ? Object.entries(nav.data.locations).find(([, key]) => key === doorKey)?.[0] : undefined;
          renderer?.walkLocalToDoor(doorKey, () => {
            if (loc) visitRef.current?.(loc);
          });
        },
        onLocalMove: (x, z) => conn.sendMove(x, z),
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
      const go = () => r.playLocalAnim(anim);
      if (!r.walkLocalToDoor(doorKey, go)) go();
    };
    const offAction = conn.on('action_result', (m) => {
      if (m.ok && m.actionId) toLocation(m.actionId);
    });
    const offJoint = conn.on('joint_result', (m) => {
      if (m.ok && m.withNames && m.actionId) toLocation(m.actionId);
    });

    return () => {
      cancelled = true;
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
    // Giờ trong ngày: 07:00 + số giờ đã dùng của chính mình
    if (snapshot.me) r.setClock(7 + snapshot.me.hoursUsed);
    // Bong bóng chat cho tin mới
    const fresh = snapshot.chat.filter((c) => c.at > seenChatRef.current);
    for (const c of fresh) r.showBubble(c.playerId, c.text);
    if (fresh.length > 0) seenChatRef.current = Math.max(...fresh.map((c) => c.at));
  }, [snapshot, state]);

  return (
    <div className="relative w-full h-[22rem] sm:h-[28rem] lg:h-[34rem] rounded-2xl overflow-hidden bg-sky-100 border border-stone-200" data-testid="city-stage">
      <div ref={containerRef} className="absolute inset-0" />
      {state === 'loading' && <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-stone-600 animate-pulse">Đang dựng thành phố…</div>}
      {state === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-stone-700 bg-stone-100">
          Không dựng được cảnh 3D (thiếu WebGL hoặc tải mô hình lỗi). Bạn vẫn chơi được bằng danh sách hành vi bên dưới, hoặc bật “Chế độ nhẹ”.
        </div>
      )}
      <div className="absolute left-2 bottom-2 px-2 py-1 rounded-lg bg-white/80 text-[11px] text-stone-600 pointer-events-none">
        Bấm vào đường để đi · bấm vào toà nhà để tới cửa · kéo để xoay · cuộn để thu phóng
      </div>
    </div>
  );
};
