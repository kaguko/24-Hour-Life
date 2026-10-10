import React from 'react';
import { ReactionKind, pickReaction } from '../domain';

// Sticker đã có ảnh; loại nào chưa có thì dùng emoji lớn thay thế
const FILE: Partial<Record<ReactionKind, string>> = {
  W: 'win',
  L: 'loss',
  cooked: 'cooked',
  lockedin: 'lockedin',
  aura_up: 'rizz',
};
const FALLBACK_EMOJI: Record<ReactionKind, string> = {
  W: '🏆',
  L: '💀',
  cooked: '🔥',
  lockedin: '🧠',
  aura_up: '😎',
  aura_down: '😬',
  broke: '💸',
  sleep: '😴',
};

interface StickerProps {
  kind: ReactionKind;
  /** Đổi seed để đổi câu chú thích */
  seed?: number;
  size?: number;
  caption?: boolean;
}

export const Sticker: React.FC<StickerProps> = ({ kind, seed = 0, size = 120, caption = true }) => {
  const file = FILE[kind];
  return (
    <div className="inline-flex flex-col items-center gap-1 animate-in zoom-in-50 duration-300" role="img" aria-label={pickReaction(kind, seed)}>
      {file ? (
        <img
          src={`${import.meta.env.BASE_URL}stickers/${file}.png`}
          alt=""
          width={size}
          height={size}
          draggable={false}
          style={{ width: size, height: size, filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.35))' }}
        />
      ) : (
        <div style={{ fontSize: size * 0.7, lineHeight: 1 }} aria-hidden>
          {FALLBACK_EMOJI[kind]}
        </div>
      )}
      {caption && <span className="font-display text-sm font-extrabold tracking-tight text-amber-200">{pickReaction(kind, seed)}</span>}
    </div>
  );
};
