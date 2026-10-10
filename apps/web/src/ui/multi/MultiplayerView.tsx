import React, { useCallback, useEffect, useState } from 'react';
import { DEFAULT_AVATAR, isAvatarId, type AvatarId } from '../../lib/avatars';
import { RoomConnection, defaultServerUrl } from '../../net/room';
import { Lobby } from './Lobby';
import { RoomGame } from './RoomGame';

const PROFILE_KEY = '24h_life_mp_profile_v1';
const LITE_KEY = '24h_life_mp_lite_v1';

function loadProfile(): { name: string; avatar: AvatarId } {
  try {
    const p = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? 'null');
    return { name: typeof p?.name === 'string' ? p.name : '', avatar: isAvatarId(p?.avatar) ? p.avatar : DEFAULT_AVATAR };
  } catch {
    return { name: '', avatar: DEFAULT_AVATAR };
  }
}

/** Thông báo lỗi dễ hiểu từ lỗi của Colyseus / mạng */
function explain(err: unknown, url: string, joining: boolean): string {
  const msg = String((err as { message?: string })?.message ?? err ?? '');
  if (/not found|not exist|invalid room|MATCHMAKE_INVALID|no rooms/i.test(msg) || (joining && /4212|404/.test(msg))) return 'Không tìm thấy phòng với mã này (sai mã, phòng đã đóng hoặc đã bắt đầu).';
  if (/full|locked|MATCHMAKE_UNHANDLED|maxClients|4213/i.test(msg)) return 'Phòng đã đầy hoặc đã khóa (ván đã bắt đầu).';
  if (/fetch|network|Failed|ECONNREFUSED|WebSocket|timeout|refused/i.test(msg)) return `Không kết nối được máy chủ (${url}). Server đã chạy chưa? Thử \`npm run dev:all\`.`;
  return msg ? `Không vào được phòng: ${msg}` : 'Không vào được phòng.';
}

export default function MultiplayerView() {
  const url = defaultServerUrl();
  const [conn, setConn] = useState<RoomConnection | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState(loadProfile);
  const [lite, setLite] = useState(() => {
    try {
      return localStorage.getItem(LITE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const remember = (name: string, avatar: AvatarId) => {
    setProfile({ name, avatar });
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify({ name, avatar }));
    } catch {
      /* bỏ qua */
    }
  };

  // Vừa F5 / rớt mạng: thử vào lại phòng cũ
  useEffect(() => {
    let alive = true;
    RoomConnection.resume(url).then((c) => {
      if (alive && c) setConn(c);
      else void c?.leave();
    });
    return () => {
      alive = false;
    };
  }, [url]);

  // Phòng đóng hẳn (server tắt, bị loại): về sảnh
  useEffect(() => {
    if (!conn) return;
    const check = () => {
      if (conn.getStatus() === 'closed') {
        setConn(null);
        setError('Đã rời phòng hoặc mất kết nối với máy chủ.');
      }
    };
    return conn.subscribe(check);
  }, [conn]);

  const run = useCallback(
    async (joining: boolean, fn: () => Promise<RoomConnection>) => {
      setBusy(true);
      setError(null);
      try {
        setConn(await fn());
      } catch (e) {
        setError(explain(e, url, joining));
      } finally {
        setBusy(false);
      }
    },
    [url]
  );

  const leave = useCallback(async () => {
    const c = conn;
    setConn(null);
    await c?.leave();
  }, [conn]);

  if (conn) {
    return (
      <RoomGame
        conn={conn}
        lite={lite}
        onToggleLite={() => {
          setLite((v) => {
            try {
              localStorage.setItem(LITE_KEY, v ? '0' : '1');
            } catch {
              /* bỏ qua */
            }
            return !v;
          });
        }}
        onLeave={leave}
      />
    );
  }

  return (
    <Lobby
      serverUrl={url}
      busy={busy}
      error={error}
      initialName={profile.name}
      initialAvatar={profile.avatar}
      onCreate={(name, avatar) => {
        remember(name, avatar);
        void run(false, () => RoomConnection.create(url, { name, avatar }));
      }}
      onJoin={(code, name, avatar) => {
        remember(name, avatar);
        void run(true, () => RoomConnection.join(url, code, { name, avatar }));
      }}
    />
  );
}
