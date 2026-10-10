import { useEffect, useState, useSyncExternalStore } from 'react';
import type { PrivateStateMessage } from '@24h/protocol';
import type { ConnectionStatus, RoomConnection, RoomSnapshot } from '../../net/room';

export const useRoomSnapshot = (conn: RoomConnection): RoomSnapshot => useSyncExternalStore(conn.subscribe, conn.getSnapshot);
export const useRoomStatus = (conn: RoomConnection): ConnectionStatus => useSyncExternalStore(conn.subscribe, conn.getStatus);
export const usePrivateState = (conn: RoomConnection): PrivateStateMessage | null => useSyncExternalStore(conn.subscribe, conn.getPrivate);

/** Đồng hồ nhịp `ms` mili giây (để hiển thị đếm ngược) */
export function useNow(ms = 500): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

/** Thông báo ngắn tự tắt */
export interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'good' | 'bad';
}

let toastSeq = 0;
export function useToasts(ttlMs = 5000) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = (text: string, tone: Toast['tone'] = 'info') => {
    const id = ++toastSeq;
    setToasts((t) => [...t.slice(-3), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ttlMs);
  };
  return { toasts, push, dismiss: (id: number) => setToasts((t) => t.filter((x) => x.id !== id)) };
}
