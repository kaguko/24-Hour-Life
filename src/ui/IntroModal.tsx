import React from 'react';
import { Clock, Zap, Sprout, Moon, ShieldAlert, Target } from 'lucide-react';
import { AVATAR_IDS, AvatarId, avatarUrl } from '../lib/avatars';

interface IntroModalProps {
  avatarId: AvatarId;
  onSelectAvatar: (id: AvatarId) => void;
  onStart: () => void;
}

const POINTS: Array<{ icon: React.ElementType; tone: string; body: React.ReactNode }> = [
  {
    icon: Clock,
    tone: 'text-sky-300',
    body: (
      <>
        <b>Chọn cách dùng 24 giờ.</b> Mỗi việc tốn thời gian. Ra ngoài còn mất thêm giờ đi đường, và nơi nào cũng có giờ mở cửa.
      </>
    ),
  },
  {
    icon: Zap,
    tone: 'text-pink-300',
    body: (
      <>
        <b>Dopamine nhanh</b> (lướt mạng, game, nhậu) sướng ngay, nhưng trả giá vào <b>sáng hôm sau</b>.
      </>
    ),
  },
  {
    icon: Sprout,
    tone: 'text-emerald-300',
    body: (
      <>
        <b>Dopamine chậm</b> (chạy bộ, học, trò chuyện) tốn công hơn, nhưng nuôi lớn ý chí và kỹ năng của bạn.
      </>
    ),
  },
  {
    icon: ShieldAlert,
    tone: 'text-rose-300',
    body: (
      <>
        <b>Ý chí cạn thì cám dỗ tự tìm đến bạn</b>, và càng chiều theo thì càng khó dừng.
      </>
    ),
  },
  {
    icon: Target,
    tone: 'text-amber-300',
    body: (
      <>
        Mỗi ván có <b>2 nhiệm vụ</b> và một <b>sự kiện lớn vào Thứ Bảy 14:00</b>. Độ khó thật bị giấu, hãy chuẩn bị từ sớm.
      </>
    ),
  },
  {
    icon: Moon,
    tone: 'text-indigo-300',
    body: (
      <>
        Cuối ván bạn nhận một <b>kết cục</b> riêng. Bạn là kiểu người nào?
      </>
    ),
  },
];

export const IntroModal: React.FC<IntroModalProps> = ({ avatarId, onSelectAvatar, onStart }) => (
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
        <div className="text-5xl" aria-hidden>
          ⏳
        </div>
        <h2 className="font-display text-2xl font-extrabold tracking-tight">Cuộc Sống 24 Giờ</h2>
        <p className="text-sm text-[#d8c3ad]">Bạn có 7 ngày. Mỗi ngày đúng 24 giờ. Hãy sống sót.</p>
      </div>

      <ul className="space-y-2.5 text-[13px] leading-snug">
        {POINTS.map(({ icon: Icon, tone, body }, i) => (
          <li key={i} className="flex gap-3">
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${tone}`} aria-hidden />
            <span className="text-[#e6defd]/90">{body}</span>
          </li>
        ))}
      </ul>

      <div>
        <p className="font-label text-[11px] font-semibold tracking-wider uppercase text-[#d8c3ad] mb-2 text-center">Chọn nhân vật của bạn</p>
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
      <p className="text-center text-[11px] text-[#d8c3ad]/80">Không quảng cáo · Không đăng nhập · Lưu ngay trên máy bạn</p>
    </div>
  </div>
);
