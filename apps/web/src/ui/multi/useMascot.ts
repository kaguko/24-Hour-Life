import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { QuoteDeck, greeting, readMs, type MascotLine, type MascotStats } from '../../world/mascot';

interface Options {
  enabled: boolean;
  name: string;
  statsRef: MutableRefObject<MascotStats | null>;
  /** Gọi mỗi khi Blob nói câu mới (vd để cảnh 3D hiện bong bóng); `ms` = thời gian hiển thị */
  say?: (line: MascotLine, ms: number) => void;
}

/**
 * Vòng nói của Blob: chào người chơi trước, rồi cứ hết thời gian đọc là nói câu tiếp theo (chọn theo chỉ số yếu nhất của bạn).
 * `next()` nói ngay câu mới (bấm vào Blob) và đặt lại đồng hồ.
 */
export function useMascotTalk({ enabled, name, statsRef, say }: Options): { line: MascotLine | null; next: () => void } {
  const deck = useRef<QuoteDeck | null>(null);
  deck.current ??= new QuoteDeck(Math.random);
  const [line, setLine] = useState<MascotLine | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const first = useRef(true);
  const sayRef = useRef(say);
  sayRef.current = say;

  const talk = useCallback(() => {
    window.clearTimeout(timer.current);
    const l = first.current ? greeting(name) : deck.current!.next(statsRef.current);
    first.current = false;
    const ms = readMs(l);
    setLine(l);
    sayRef.current?.(l, ms);
    timer.current = window.setTimeout(talk, ms);
  }, [name, statsRef]);

  useEffect(() => {
    if (!enabled) return;
    talk();
    return () => window.clearTimeout(timer.current);
  }, [enabled, talk]);

  return { line, next: talk };
}
