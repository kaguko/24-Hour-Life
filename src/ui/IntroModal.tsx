import React from 'react';
import { Clock, Zap, Sprout, Moon } from 'lucide-react';
import { AVATAR_IDS, AvatarId, avatarUrl } from '../lib/avatars';

interface IntroModalProps {
  avatarId: AvatarId;
  onSelectAvatar: (id: AvatarId) => void;
  onStart: () => void;
}

export const IntroModal: React.FC<IntroModalProps> = ({ avatarId, onSelectAvatar, onStart }) => (
  <div className="fixed inset-0 z-[60] bg-stone-900/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
      <div className="text-center space-y-1">
        <div className="text-5xl" aria-hidden>
          ⏳
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight text-stone-900">Cuộc Sống 24 Giờ</h2>
        <p className="text-sm text-stone-600">Bạn có 7 ngày. Mỗi ngày đúng 24 giờ. Hãy sống sót.</p>
      </div>

      <ul className="space-y-3 text-sm text-stone-800">
        <li className="flex gap-3">
          <Clock className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <span>
            <b>Chọn cách dùng 24 giờ.</b> Mỗi hành vi tốn thời gian và thay đổi năng lượng, tinh thần, ý chí, tiền bạc.
          </span>
        </li>
        <li className="flex gap-3">
          <Zap className="w-5 h-5 text-fuchsia-600 shrink-0 mt-0.5" />
          <span>
            <b>Dopamine nhanh</b> (lướt mạng, game, nhậu) sướng ngay - nhưng cái giá đến vào <b>sáng hôm sau</b>.
          </span>
        </li>
        <li className="flex gap-3">
          <Sprout className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            <b>Dopamine chậm</b> (chạy bộ, học, trò chuyện) tốn công hơn, nhưng nuôi lớn ý chí của bạn.
          </span>
        </li>
        <li className="flex gap-3">
          <Moon className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
          <span>
            Cuối ván, bạn nhận một <b>kết cục</b> riêng - bạn là kiểu người nào?
          </span>
        </li>
      </ul>

      <div>
        <p className="text-xs font-semibold text-stone-700 mb-2 text-center">Chọn nhân vật của bạn</p>
        <div className="grid grid-cols-6 gap-1.5" role="radiogroup" aria-label="Chọn nhân vật">
          {AVATAR_IDS.map((id) => (
            <button
              key={id}
              role="radio"
              aria-checked={avatarId === id}
              aria-label={`Nhân vật ${id}`}
              onClick={() => onSelectAvatar(id)}
              className={`rounded-xl p-0.5 border-2 transition-all bg-stone-100 ${
                avatarId === id ? 'border-indigo-600 bg-indigo-50 scale-105' : 'border-transparent hover:border-stone-300'
              }`}
            >
              <img src={avatarUrl(id)} alt="" width={48} height={48} className="w-full h-auto" draggable={false} />
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onStart}
        className="w-full py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-bold transition-colors"
      >
        Bắt đầu ngày 1
      </button>
      <p className="text-center text-[11px] text-stone-500">Không quảng cáo · Không đăng nhập · Lưu ngay trên máy bạn</p>
    </div>
  </div>
);
