import React, { useRef } from 'react';
import { MOOD_TAG, type MascotStats } from '../../world/mascot';
import { useMascotTalk } from './useMascot';

/** Blob dạng thẻ (chế độ nhẹ, không có cảnh 3D): cùng linh vật, cùng kho câu nói. Bấm vào để nghe câu khác. */
export const MascotCard: React.FC<{ name: string; stats: MascotStats | null }> = ({ name, stats }) => {
  const statsRef = useRef<MascotStats | null>(stats);
  statsRef.current = stats;
  const { line, next } = useMascotTalk({ enabled: true, name, statsRef });
  if (!line) return null;
  const tag = MOOD_TAG[line.mood];
  return (
    <button type="button" onClick={next} data-testid="mascot-card" className="w-full text-left flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-violet-500/20 to-amber-400/10 border border-white/15 hover:border-amber-300/50 transition-colors">
      <img key={line.mood} src={`/stickers/${line.mood}.png`} alt="" width={72} height={72} className="w-[4.5rem] h-[4.5rem] shrink-0 drop-shadow-[0_6px_10px_rgba(0,0,0,.5)] anim-pop" draggable={false} />
      <span className="min-w-0 flex-1">
        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider ${tag.css}`}>
          {tag.emoji} {tag.label}
        </span>
        <span className="block mt-1 text-[13px] leading-snug font-semibold text-white">“{line.quote}”</span>
        <span className="block mt-1 text-[11px] font-bold text-amber-200">— {line.author}</span>
      </span>
    </button>
  );
};
