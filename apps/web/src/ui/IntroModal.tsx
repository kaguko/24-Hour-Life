import React from 'react';
import { Sticker } from './Sticker';
import { AVATAR_IDS, AvatarId, avatarUrl } from '../lib/avatars';
import { BigEventId, BOSS_NEED, LOSE_AT, bigEventDef } from '@24h/domain';

interface IntroModalProps {
  avatarId: AvatarId;
  onSelectAvatar: (id: AvatarId) => void;
  onStart: () => void;
  /** Boss của ván này (Thứ Bảy 14:00) */
  bossId: BigEventId;
}

/** Ba câu trả lời người chơi mới cần: chơi để làm gì, chơi thế nào, thua khi nào */
const Section: React.FC<{ tag: string; tone: string; children: React.ReactNode }> = ({ tag, tone, children }) => (
  <div className="bg-[#211c33] rounded-xl px-3 py-2.5">
    <div className={`font-label text-[10.5px] font-bold uppercase tracking-wider mb-1 ${tone}`}>{tag}</div>
    <div className="text-[13px] leading-snug text-[#e6defd]/90 space-y-1">{children}</div>
  </div>
);

export const IntroModal: React.FC<IntroModalProps> = ({ avatarId, onSelectAvatar, onStart, bossId }) => {
  const boss = bigEventDef(bossId);
  return (
  <div
    role="dialog"
    aria-modal="true"
    aria-label="Giới thiệu trò chơi"
    className="fixed inset-0 z-[60] bg-[#0b0817]/90 backdrop-blur-md flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto font-nocturne"
  >
    <div
      className="my-auto bg-[#18132f] text-[#e6defd] rounded-[1.75rem] border border-amber-200/20 max-w-md w-full p-5 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200"
      style={{ boxShadow: '0 0 40px -6px rgba(245,158,11,0.28), 0 24px 60px -12px rgba(0,0,0,0.7)' }}
    >
      <div className="text-center space-y-1">
        <Sticker kind="lockedin" size={96} caption={false} />
        <h2 className="font-display text-2xl font-extrabold tracking-tight">Cuộc Sống 24 Giờ</h2>
        <p className="text-sm text-[#d8c3ad]">24 giờ mỗi ngày. Não bạn thì chỉ muốn lướt TikTok.</p>
      </div>

      <div className="space-y-2">
        <Section tag="🎯 Mục tiêu" tone="text-amber-300">
          <p>Sống qua <b>7 ngày</b> và thắng <b>Boss Thứ Bảy 14:00</b>:</p>
          <p className="font-bold text-white">{boss.emoji} {boss.title}</p>
          <p className="text-[12px] text-[#d8c3ad]">Cần: {BOSS_NEED[bossId]}</p>
        </Section>
        <Section tag="🎮 Cách chơi" tone="text-emerald-300">
          <p>Mỗi ngày có <b>24 giờ</b>. Bấm <b>Làm!</b> trên một lá để tiêu giờ. Nhớ chừa <b>8 tiếng ngủ</b>, hết giờ là qua đêm.</p>
          <p>Không biết làm gì? Đọc khung gợi ý và chọn lá <b>👍</b>. Lá <b>⚡ Cám dỗ</b> sướng liền nhưng sáng mai trả giá.</p>
        </Section>
        <Section tag="☠️ Thua nếu sáng thức dậy mà" tone="text-rose-300">
          <p>⚡ Năng lượng ≤ {LOSE_AT.energy} · 🧠 Tinh thần ≤ {LOSE_AT.mental} · 💰 Tiền âm (trọ −120k mỗi đêm)</p>
        </Section>
      </div>

      <div>
        <p className="font-label text-[11px] font-semibold tracking-wider uppercase text-[#d8c3ad] mb-2 text-center">Chọn nhân vật</p>
        <div className="grid grid-cols-6 gap-1.5" role="radiogroup" aria-label="Chọn nhân vật">
          {AVATAR_IDS.map((id) => (
            <button
              key={id}
              role="radio"
              aria-checked={avatarId === id}
              aria-label={`Nhân vật ${id}`}
              onClick={() => onSelectAvatar(id)}
              className={`rounded-xl p-0.5 border-2 transition-all bg-[#211c33] ${
                avatarId === id ? 'border-amber-400 bg-amber-400/10 scale-105' : 'border-transparent hover:border-white/20'
              }`}
            >
              <img src={avatarUrl(id)} alt="" width={48} height={48} className="w-full h-auto" draggable={false} />
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onStart}
        className="w-full py-3 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-[#120e24] font-label text-sm font-bold active:translate-y-px transition-all"
        style={{ boxShadow: '0 0 16px rgba(245,158,11,0.4)' }}
      >
        Bắt đầu ngày 1
      </button>
      <p className="text-center text-[11px] text-[#d8c3ad]/80">Không quảng cáo · Không đăng nhập</p>
    </div>
  </div>
  );
};
