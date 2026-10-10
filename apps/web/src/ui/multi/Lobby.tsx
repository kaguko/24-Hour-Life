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

/** Sảnh: tên, nhân vật, tạo phòng mới hoặc vào bằng mã 4 ký tự */
export const Lobby: React.FC<LobbyProps> = ({ serverUrl, busy, error, initialName, initialAvatar, onCreate, onJoin }) => {
  const [name, setName] = useState(initialName);
  const [avatar, setAvatar] = useState<AvatarId>(initialAvatar);
  const [code, setCode] = useState('');
  const cleanName = name.trim().slice(0, 24);
  const codeOk = code.trim().length === ROOM_CODE_LENGTH;

  return (
    <div className="max-w-xl mx-auto space-y-5" data-testid="lobby">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-extrabold tracking-tight text-stone-900">🏙️ Phòng chung</h2>
        <p className="text-sm text-stone-600">
          2–8 người cùng sống một tuần trong một thành phố. Mỗi người tự lo 24 giờ của mình; rủ nhau làm điều gì đó thì Kết nối tăng,
          nhưng rủ nhau buông thả thì cũng sụp nhanh hơn.
        </p>
      </div>

      <section className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-3">
        <label className="block text-xs font-bold text-stone-700">
          Tên hiển thị
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            placeholder="Tên của bạn"
            data-testid="lobby-name"
            className="mt-1 w-full px-3 py-2 rounded-xl border border-stone-300 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </label>
        <div>
          <div className="text-xs font-bold text-stone-700 mb-1.5">Nhân vật</div>
          <div className="grid grid-cols-6 gap-1.5">
            {AVATAR_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setAvatar(id)}
                aria-label={`Chọn nhân vật ${id}`}
                aria-pressed={avatar === id}
                className={`rounded-xl p-1 border-2 transition-colors ${avatar === id ? 'border-indigo-500 bg-indigo-50' : 'border-transparent bg-stone-50 hover:bg-stone-100'}`}
              >
                <img src={avatarUrl(id)} alt="" className="w-full aspect-square object-contain" draggable={false} />
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="grid sm:grid-cols-2 gap-3">
        <section className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-2">
          <h3 className="text-sm font-bold text-stone-900">Tạo phòng mới</h3>
          <p className="text-xs text-stone-600">Bạn nhận mã 4 ký tự để gửi cho bạn bè.</p>
          <button
            type="button"
            disabled={busy || !cleanName}
            onClick={() => onCreate(cleanName, avatar)}
            data-testid="lobby-create"
            className="w-full px-3 py-2 rounded-xl bg-stone-900 text-white text-sm font-bold disabled:opacity-40 hover:bg-stone-800"
          >
            {busy ? 'Đang kết nối…' : 'Tạo phòng'}
          </button>
        </section>

        <section className="p-4 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-2">
          <h3 className="text-sm font-bold text-stone-900">Vào bằng mã</h3>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, ROOM_CODE_LENGTH))}
            placeholder="ABCD"
            inputMode="text"
            autoCapitalize="characters"
            data-testid="lobby-code"
            className="w-full px-3 py-2 rounded-xl border border-stone-300 text-center text-lg font-mono font-extrabold tracking-[0.35em] focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            type="button"
            disabled={busy || !cleanName || !codeOk}
            onClick={() => onJoin(code, cleanName, avatar)}
            data-testid="lobby-join"
            className="w-full px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold disabled:opacity-40 hover:bg-indigo-700"
          >
            Vào phòng
          </button>
        </section>
      </div>

      {error && (
        <div role="alert" data-testid="lobby-error" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-sm">
          {error}
        </div>
      )}
      <p className="text-[11px] text-stone-400 text-center">Máy chủ: {serverUrl}. Chỉ lưu tên hiển thị trong phiên chơi, không lưu dữ liệu cá nhân.</p>
    </div>
  );
};
