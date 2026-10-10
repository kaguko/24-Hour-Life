import React, { useState } from 'react';
import { AVATAR_IDS, ROOM_CODE_LENGTH } from '@24h/protocol';
import { avatarUrl, type AvatarId } from '../../lib/avatars';

interface LobbyProps {
  serverUrl: string;
  busy: boolean;
  error: string | null;
  initialName: string;
  initialAvatar: AvatarId;
  onCreate: (name: string, avatar: AvatarId) => void;
  onJoin: (code: string, name: string, avatar: AvatarId) => void;
}

const PERKS: Array<[string, string]> = [
  ['👥', '2–8 người, một thành phố'],
  ['🤝', 'Rủ nhau làm việc chung'],
  ['🧑‍🤝‍🧑', 'Cư dân & thú cưng để kết bạn'],
  ['🌙', 'Mỗi tuần 7 ngày, 24 giờ/ngày'],
];

/** Sảnh: tên, nhân vật, tạo phòng mới hoặc vào bằng mã 4 ký tự */
export const Lobby: React.FC<LobbyProps> = ({ serverUrl, busy, error, initialName, initialAvatar, onCreate, onJoin }) => {
  const [name, setName] = useState(initialName);
  const [avatar, setAvatar] = useState<AvatarId>(initialAvatar);
  const [code, setCode] = useState('');
  const cleanName = name.trim().slice(0, 24);
  const codeOk = code.trim().length === ROOM_CODE_LENGTH;

  return (
    <div className="max-w-3xl mx-auto space-y-5" data-testid="lobby">
      {/* Hero */}
      <section className="relative overflow-hidden glass-solid px-5 py-6 sm:px-8 sm:py-8 text-center anim-rise">
        <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[28rem] h-[18rem] rounded-full bg-violet-500/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-10 w-[16rem] h-[12rem] rounded-full bg-amber-400/20 blur-3xl" />
        <div className="relative">
          <div className="mx-auto w-28 h-28 sm:w-32 sm:h-32 rounded-[2rem] bg-gradient-to-br from-violet-500/35 to-pink-500/25 ring-2 ring-white/25 flex items-center justify-center shadow-[0_0_50px_-8px_rgba(139,92,246,.9)]">
            <img key={avatar} src={avatarUrl(avatar)} alt="" className="w-24 h-24 sm:w-28 sm:h-28 object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,.5)] anim-pop" draggable={false} />
          </div>
          <h2 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight bg-gradient-to-r from-amber-200 via-white to-pink-200 bg-clip-text text-transparent">Phòng chung</h2>
          <p className="mt-1.5 text-sm text-[var(--ink-dim)] max-w-xl mx-auto">
            Cùng bạn bè sống một tuần trong một thành phố. Mỗi người tự lo 24 giờ của mình — rủ nhau làm điều tốt thì Kết nối tăng, nhưng rủ nhau buông thả thì cũng sụp nhanh hơn.
          </p>
          <ul className="mt-4 flex flex-wrap justify-center gap-1.5">
            {PERKS.map(([icon, text]) => (
              <li key={text} className="chip">
                <span aria-hidden>{icon}</span> {text}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Hồ sơ */}
      <section className="glass p-4 sm:p-5 space-y-4 anim-rise" style={{ animationDelay: '80ms' }}>
        <label className="block text-xs font-bold text-[var(--ink-dim)] uppercase tracking-wider">
          Tên hiển thị
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            placeholder="Bạn tên là gì?"
            data-testid="lobby-name"
            className="input-dark mt-1.5 w-full px-4 py-3 text-base font-semibold normal-case tracking-normal"
          />
        </label>
        <div>
          <div className="text-xs font-bold text-[var(--ink-dim)] uppercase tracking-wider mb-2">Chọn nhân vật</div>
          <div className="grid grid-cols-6 gap-2">
            {AVATAR_IDS.map((id) => {
              const on = avatar === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setAvatar(id)}
                  aria-label={`Chọn nhân vật ${id}`}
                  aria-pressed={on}
                  className={`rounded-2xl p-1 border-2 transition-all ${
                    on ? 'border-amber-300 bg-amber-300/15 scale-105 shadow-[0_0_22px_-4px_rgba(251,191,36,.8)]' : 'border-transparent bg-white/[0.06] hover:bg-white/[0.14] hover:-translate-y-0.5'
                  }`}
                >
                  <img src={avatarUrl(id)} alt="" className="w-full aspect-square object-contain" draggable={false} />
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Tạo / vào phòng */}
      <div className="grid sm:grid-cols-2 gap-4">
        <section className="relative overflow-hidden glass p-5 space-y-3 flex flex-col anim-rise" style={{ animationDelay: '140ms' }}>
          <div aria-hidden className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full bg-amber-400/20 blur-2xl" />
          <div className="relative">
            <h3 className="text-lg font-extrabold text-white">✨ Tạo phòng mới</h3>
            <p className="text-xs text-[var(--ink-dim)] mt-0.5">Bạn nhận mã 4 ký tự để gửi cho bạn bè.</p>
          </div>
          <button type="button" disabled={busy || !cleanName} onClick={() => onCreate(cleanName, avatar)} data-testid="lobby-create" className="btn btn-primary relative mt-auto w-full py-3 text-base">
            {busy ? 'Đang kết nối…' : 'Tạo phòng'}
          </button>
        </section>

        <section className="glass p-5 space-y-3 flex flex-col anim-rise" style={{ animationDelay: '200ms' }}>
          <div>
            <h3 className="text-lg font-extrabold text-white">🔑 Vào bằng mã</h3>
            <p className="text-xs text-[var(--ink-dim)] mt-0.5">Nhập mã bạn bè gửi.</p>
          </div>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, ROOM_CODE_LENGTH))}
            placeholder="ABCD"
            inputMode="text"
            autoCapitalize="characters"
            data-testid="lobby-code"
            className="input-dark w-full px-3 py-2.5 text-center text-2xl font-mono font-black tracking-[0.45em]"
          />
          <button
            type="button"
            disabled={busy || !cleanName || !codeOk}
            onClick={() => onJoin(code, cleanName, avatar)}
            data-testid="lobby-join"
            className="btn btn-soft w-full py-3 text-base !bg-violet-500/30 !border-violet-300/50 hover:!bg-violet-500/45"
          >
            Vào phòng
          </button>
        </section>
      </div>

      {error && (
        <div role="alert" data-testid="lobby-error" className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-300/50 text-rose-100 text-sm anim-pop">
          ⚠️ {error}
        </div>
      )}
      <p className="text-[11px] text-[var(--ink-faint)] text-center">Máy chủ: {serverUrl}. Chỉ lưu tên hiển thị trong phiên chơi, không lưu dữ liệu cá nhân.</p>
    </div>
  );
};
