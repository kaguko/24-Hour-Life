import React, { useEffect, useRef, useState } from 'react';
import type { InviteMessage } from '@24h/protocol';
import { jointActionDef } from '@24h/domain';
import type { PlayerView, RoomSnapshot } from '../../net/room';
import type { Toast } from './hooks';

export const STAT_META: Array<{ key: keyof PlayerView['stats']; icon: string; label: string; color: string }> = [
  { key: 'energy', icon: '⚡', label: 'Năng lượng', color: '#f59e0b' },
  { key: 'mental', icon: '🧠', label: 'Tinh thần', color: '#38bdf8' },
  { key: 'willpower', icon: '🛡️', label: 'Ý chí', color: '#818cf8' },
  { key: 'dopamine', icon: '✨', label: 'Dopamine', color: '#f472b6' },
  { key: 'social', icon: '👥', label: 'Kết nối', color: '#34d399' },
  { key: 'money', icon: '💰', label: 'Tiền', color: '#eab308' },
];

export const fmtMoney = (k: number) => (Math.abs(k) >= 1000 ? `${(k / 1000).toFixed(1)}tr` : `${Math.round(k)}k`);

const PHASE_LABEL = { planning: '🗓️ Lên kế hoạch', night: '🌙 Đêm', morning: '☀️ Buổi sáng', ended: '🏁 Kết thúc' } as const;

/** Giờ trong ngày của mình: 07:00 + số giờ đã dùng */
const clockText = (hoursUsed: number) => {
  const total = 7 * 60 + Math.round(hoursUsed * 60);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return { text: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`, night: h >= 19 || h < 6 };
};

/** Phát hiện chỉ số đổi để nháy thanh và bay số +/− lên */
function useDelta(value: number): { delta: number; tick: number } {
  const prev = useRef(value);
  const [state, setState] = useState({ delta: 0, tick: 0 });
  useEffect(() => {
    const d = Math.round((value - prev.current) * 10) / 10;
    prev.current = value;
    if (d === 0) return;
    setState((s) => ({ delta: d, tick: s.tick + 1 }));
    const t = setTimeout(() => setState((s) => ({ ...s, delta: 0 })), 1600);
    return () => clearTimeout(t);
  }, [value]);
  return state;
}

const StatRow: React.FC<{ meta: (typeof STAT_META)[number]; value: number; compact?: boolean }> = ({ meta, value, compact }) => {
  const { delta, tick } = useDelta(value);
  const isMoney = meta.key === 'money';
  const low = !isMoney && value < 25;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={`relative flex items-center gap-2 ${compact ? 'px-2 py-1.5 rounded-xl bg-white/[0.07] border border-white/10' : 'px-2.5 py-1.5'} ${low ? 'ring-1 ring-rose-400/70 rounded-xl' : ''}`}
      title={`${meta.label}: ${isMoney ? fmtMoney(value) : Math.round(value)}`}
    >
      <span className="text-base leading-none drop-shadow">{meta.icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-1">
          <span className="text-[10px] font-semibold text-[var(--ink-dim)] truncate">{meta.label}</span>
          <span className="text-xs font-extrabold tabular-nums text-white">{isMoney ? fmtMoney(value) : Math.round(value)}</span>
        </div>
        {!isMoney && (
          <div className="mt-0.5 h-1.5 rounded-full bg-black/35 overflow-hidden">
            <div
              key={tick}
              className={`h-full rounded-full transition-[width] duration-700 ease-out ${low ? 'animate-pulse' : ''}`}
              style={{
                width: `${pct}%`,
                background: low ? 'linear-gradient(90deg,#fb7185,#f43f5e)' : `linear-gradient(90deg, ${meta.color}, ${meta.color}cc)`,
                animation: delta !== 0 ? 'bar-flash-up .9s ease-out' : undefined,
                boxShadow: `0 0 10px -1px ${meta.color}99`,
              }}
            />
          </div>
        )}
      </div>
      {delta !== 0 && (
        <span key={`d${tick}`} className={`pointer-events-none absolute -top-1 right-1 text-xs font-extrabold animate-float-up ${delta > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
          {delta > 0 ? '+' : ''}
          {isMoney ? fmtMoney(delta) : delta}
        </span>
      )}
    </div>
  );
};

/** Cột chỉ số bên trái cảnh (máy tính) */
export const StatRail: React.FC<{ stats: PlayerView['stats'] }> = ({ stats }) => (
  <div className="hud-glass rounded-2xl py-1 w-[10.5rem] anim-rise" data-testid="my-stats">
    {STAT_META.map((m) => (
      <StatRow key={m.key} meta={m} value={stats[m.key]} />
    ))}
  </div>
);

/** Dải chỉ số dưới cảnh (điện thoại) */
export const StatStrip: React.FC<{ stats: PlayerView['stats'] }> = ({ stats }) => (
  <div className="grid grid-cols-2 min-[420px]:grid-cols-3 gap-1.5">
    {STAT_META.map((m) => (
      <StatRow key={m.key} meta={m} value={stats[m.key]} compact />
    ))}
  </div>
);

interface TopBarProps {
  snap: RoomSnapshot;
  me: PlayerView;
  remaining: number | null;
  status: string;
  readyLabel: string;
  waiting: PlayerView[];
  lite: boolean;
  onCopyCode: () => void;
  onReady: () => void;
  onToggleLite: () => void;
  onLeave: () => void;
}

/** Thanh trên của cảnh: mã phòng, giai đoạn + đếm ngược, giờ của mình, nút sẵn sàng */
export const RoomTopBar: React.FC<TopBarProps> = ({ snap, me, remaining, status, readyLabel, waiting, lite, onCopyCode, onReady, onToggleLite, onLeave }) => {
  // tổng thời lượng pha = số giây còn lại lần đầu thấy của pha này (server không gửi tổng)
  const total = useRef({ key: 0, secs: 1 });
  if (remaining !== null && total.current.key !== snap.phaseEndsAt) total.current = { key: snap.phaseEndsAt, secs: Math.max(1, remaining) };
  const pct = remaining === null ? 0 : Math.max(0, Math.min(100, (remaining / total.current.secs) * 100));
  const urgent = remaining !== null && remaining <= 15 && snap.phase === 'planning';
  const clock = clockText(me.hoursUsed);
  const myTurn = snap.phase === 'planning' && !me.ready && !me.finished;

  return (
    <div className="flex items-start justify-between gap-2">
      <div className="flex flex-col gap-1.5 min-w-0 pointer-events-auto">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onCopyCode}
            title="Chép mã phòng"
            data-testid="room-code"
            className="btn hud-glass h-9 px-2.5 sm:px-3 font-mono font-extrabold tracking-[0.2em] sm:tracking-[0.28em] text-sm sm:text-base text-white hover:brightness-125"
          >
            {snap.code}
          </button>
          <div className="hud-glass rounded-xl px-2.5 sm:px-3 py-1.5 sm:min-w-[9.5rem]" data-testid="phase">
            <div className="flex items-center justify-between gap-3 text-xs font-bold text-white">
              <span>
                <span className="hidden sm:inline">{PHASE_LABEL[snap.phase]} · </span>
                <span className="sm:hidden">{PHASE_LABEL[snap.phase].split(' ')[0]} </span>
                Ngày {snap.day}/7
              </span>
              {remaining !== null && snap.phase !== 'ended' && <span className={`font-mono tabular-nums ${urgent ? 'text-rose-300 animate-pulse' : 'text-amber-200'}`}>{remaining}s</span>}
            </div>
            {remaining !== null && snap.phase !== 'ended' && (
              <div className="mt-1 h-1 rounded-full bg-black/40 overflow-hidden">
                <div className={`h-full rounded-full transition-[width] duration-500 ease-linear ${urgent ? 'bg-rose-400' : 'bg-gradient-to-r from-amber-300 to-orange-500'}`} style={{ width: `${pct}%` }} />
              </div>
            )}
          </div>
          {status !== 'connected' && <span className="chip !bg-amber-400/20 !text-amber-200 !border-amber-300/40">{status === 'reconnecting' ? 'Đang nối lại…' : 'Mất kết nối'}</span>}
        </div>
        <div className="hud-glass rounded-xl px-2.5 py-1 flex items-center gap-2 w-fit text-[11px] font-semibold text-[var(--ink-dim)]">
          <span>{clock.night ? '🌙' : '🌤️'}</span>
          <span className="font-mono text-white text-xs font-bold">{clock.text}</span>
          <span className="h-1 w-16 rounded-full bg-black/40 overflow-hidden">
            <span className="block h-full bg-gradient-to-r from-sky-300 via-amber-300 to-indigo-400" style={{ width: `${Math.min(100, (me.hoursUsed / 24) * 100)}%` }} />
          </span>
          <span className="hidden min-[400px]:inline">đã dùng {me.hoursUsed}h/24h</span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1.5 pointer-events-auto">
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={onToggleLite} title={lite ? 'Bật cảnh 3D' : 'Chế độ nhẹ (tắt 3D)'} aria-label={lite ? 'Bật cảnh 3D' : 'Chế độ nhẹ'} className="btn hud-glass w-9 h-9 hidden sm:inline-flex hover:brightness-125">
            {lite ? '🎮' : '🪶'}
          </button>
          <button type="button" onClick={onLeave} title="Rời phòng" aria-label="Rời phòng" className="btn btn-danger-soft w-9 h-9 backdrop-blur !bg-rose-950/60">
            🚪
          </button>
          {readyLabel && !me.finished && (
            <button
              type="button"
              onClick={onReady}
              data-testid="ready-btn"
              className={`btn h-9 px-3 sm:px-3.5 text-xs ${me.ready ? 'hud-glass text-white' : `btn-good ${myTurn ? 'anim-glow' : ''}`}`}
            >
              <span className="sm:hidden">{readyLabel.replace(' qua đêm', '')}</span>
              <span className="hidden sm:inline">{readyLabel}</span>
            </button>
          )}
        </div>
        {me.ready && waiting.length > 0 && snap.phase !== 'night' && (
          <span className="chip hud-glass anim-pop">⏳ Đang chờ: {waiting.map((p) => p.name).join(', ')}</span>
        )}
      </div>
    </div>
  );
};

interface NoticesProps {
  toasts: Toast[];
  invites: InviteMessage[];
  onJoin: (offerId: string) => void;
  onDismiss: (offerId: string) => void;
}

/** Thông báo ngắn + lời mời, nổi giữa phía trên cảnh */
export const Notices: React.FC<NoticesProps> = ({ toasts, invites, onJoin, onDismiss }) => (
  <div className="flex flex-col items-center gap-1.5 w-full" aria-live="polite">
    {toasts.map((t) => (
      <div
        key={t.id}
        className={`pointer-events-auto max-w-[92%] px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-md anim-pop shadow-lg ${
          t.tone === 'bad' ? 'bg-rose-500/25 border-rose-300/50 text-rose-100' : t.tone === 'good' ? 'bg-emerald-500/25 border-emerald-300/50 text-emerald-100' : 'bg-black/55 border-white/20 text-white'
        }`}
      >
        {t.text}
      </div>
    ))}
    {invites.map((i) => {
      const def = jointActionDef(i.actionId);
      const tempting = !!def?.joint?.peerPressure;
      return (
        <div
          key={i.offerId}
          data-testid="invite"
          className={`pointer-events-auto flex items-center gap-2 max-w-[96%] px-3 py-2 rounded-2xl text-sm border backdrop-blur-md anim-pop shadow-xl ${
            tempting ? 'bg-fuchsia-500/25 border-fuchsia-300/60' : 'bg-indigo-500/30 border-indigo-300/60'
          }`}
        >
          <span aria-hidden className="text-lg">{tempting ? '😈' : '🤝'}</span>
          <span className="flex-1 text-white leading-snug">
            <b>{i.hostName}</b> rủ bạn: {def?.title ?? i.actionId}
            {i.pressure < 0 && <span className="ml-1 text-xs text-fuchsia-200">(hơi bị cuốn: {i.pressure} ý chí)</span>}
          </span>
          <button type="button" onClick={() => onJoin(i.offerId)} className="btn btn-primary px-3 py-1 text-xs">
            Vào
          </button>
          <button type="button" onClick={() => onDismiss(i.offerId)} className="px-1.5 text-xs text-white/70 hover:text-white">
            Bỏ qua
          </button>
        </div>
      );
    })}
  </div>
);
