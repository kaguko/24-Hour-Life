import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { JOINT_ACTIONS, LOCATIONS, PLAYABLE_ACTIONS, jointActionDef, locationDef, locationOf, type DayGrade, type NightResultPrimitive } from '@24h/domain';
import type { InviteMessage } from '@24h/protocol';
import { audioAdapter } from '../../adapters/audioAdapter';
import { avatarUrl, type AvatarId } from '../../lib/avatars';
import type { PlayerView, RoomConnection } from '../../net/room';
import { ActionGrid } from '../ActionGrid';
import { MorningModal } from '../MorningModal';
import { useNow, usePrivateState, useRoomSnapshot, useRoomStatus, useToasts } from './hooks';

const CityStage = lazy(() => import('./CityStage').then((m) => ({ default: m.CityStage })));

interface RoomGameProps {
  conn: RoomConnection;
  lite: boolean;
  onToggleLite: () => void;
  onLeave: () => void;
}

const PHASE_LABEL = { planning: '🗓️ Lên kế hoạch', night: '🌙 Đêm', morning: '☀️ Buổi sáng', ended: '🏁 Kết thúc' } as const;
const fmtMoney = (k: number) => (Math.abs(k) >= 1000 ? `${(k / 1000).toFixed(1)}tr` : `${Math.round(k)}k`);

const STAT_CHIPS: Array<{ key: keyof PlayerView['stats']; icon: string; label: string }> = [
  { key: 'energy', icon: '⚡', label: 'Năng lượng' },
  { key: 'mental', icon: '🧠', label: 'Tinh thần' },
  { key: 'willpower', icon: '🛡️', label: 'Ý chí' },
  { key: 'dopamine', icon: '✨', label: 'Dopamine' },
  { key: 'social', icon: '👥', label: 'Kết nối' },
  { key: 'money', icon: '💰', label: 'Tiền' },
];

export const RoomGame: React.FC<RoomGameProps> = ({ conn, lite, onToggleLite, onLeave }) => {
  const snap = useRoomSnapshot(conn);
  const status = useRoomStatus(conn);
  const priv = usePrivateState(conn);
  const now = useNow(500);
  const { toasts, push } = useToasts();
  const [report, setReport] = useState<{ report: NightResultPrimitive; friends: string[] } | null>(null);
  const [invites, setInvites] = useState<InviteMessage[]>([]);
  const [focusLocation, setFocusLocation] = useState<string | null>(null);
  const [showCards, setShowCards] = useState(false);
  const [chatText, setChatText] = useState('');

  // Nhạc nền: trình duyệt chỉ cho phát sau thao tác đầu tiên; đổi sắc thái theo giờ trong game
  useEffect(() => {
    const start = () => {
      if (audioAdapter.enabled) audioAdapter.startMusic();
    };
    window.addEventListener('pointerdown', start, { once: true });
    return () => {
      window.removeEventListener('pointerdown', start);
      audioAdapter.stopMusic();
    };
  }, []);
  const clockHour = 7 + (snap.me?.hoursUsed ?? 0);
  useEffect(() => {
    const h = clockHour % 24;
    audioAdapter.setMusicNight(h >= 19 || h < 6);
  }, [clockHour]);

  const me = snap.me;
  const others = snap.players.filter((p) => p.id !== snap.sessionId);
  const nameOf = (id: string) => snap.players.find((p) => p.id === id)?.name ?? 'Ai đó';

  // Message từ server -> thông báo / báo cáo / lời mời
  useEffect(() => {
    const offs = [
      conn.on('action_result', (m) => {
        if (!m.ok) {
          push(m.reason ?? 'Không làm được.', 'bad');
          audioAdapter.playCue('neutral');
        } else if (m.notice) push(m.notice.split(/(?<=[.!?…])\s/)[0], 'good');
      }),
      conn.on('joint_result', (m) => {
        if (!m.ok) push(m.reason ?? 'Không thành.', 'bad');
        else if (m.withNames) {
          push(`${m.notice ?? 'Xong!'}${m.fellForPressure ? ' (bạn bị kéo ở lại thêm)' : ''}`, m.fellForPressure ? 'bad' : 'good');
          audioAdapter.playCue(jointActionDef(m.actionId)?.isTemptation ? 'temptation' : 'healthy');
        }
        else if (m.notice) push(m.notice, 'info');
      }),
      conn.on('nudge_result', (m) => {
        if (!m.ok) push(m.reason ?? 'Không gửi được.', 'bad');
        else push('Đã gửi lời động viên 💪', 'good');
      }),
      conn.on('nudged', (m) => {
        push(`${m.fromName} vừa động viên bạn: hồi chút ý chí 💪`, 'good');
        audioAdapter.playCue('healthy');
      }),
      conn.on('invite', (m) => {
        setInvites((list) => [...list.filter((i) => i.offerId !== m.offerId), m]);
        audioAdapter.playCue('event');
      }),
      conn.on('morning', (m) => {
        setReport({ report: m.report, friends: m.friends });
        audioAdapter.playCue('night');
      }),
    ];
    return () => offs.forEach((off) => off());
  }, [conn, push]);

  // Lời mời hết hiệu lực khi lời rủ biến mất
  useEffect(() => {
    setInvites((list) => list.filter((i) => snap.offers.some((o) => o.id === i.offerId)));
  }, [snap.offers]);

  const remaining = snap.phaseEndsAt > 0 ? Math.max(0, Math.ceil((snap.phaseEndsAt - now) / 1000)) : null;
  const myOffer = me ? snap.offers.find((o) => o.members.includes(me.id)) : undefined;
  const hoursRemaining = me ? Math.max(0, 24 - me.hoursUsed) : 24;

  // Khóa hành vi: lý do từ server + các khóa theo pha / trạng thái sẵn sàng
  const lockReasons = useMemo(() => {
    const out: Record<string, string> = { ...(priv?.locks ?? {}) };
    const blanket = snap.phase !== 'planning' ? 'Chỉ làm được lúc lên kế hoạch' : me?.ready ? 'Bạn đã sẵn sàng (bấm hủy để làm tiếp)' : myOffer ? 'Đang chờ nhóm' : null;
    if (blanket) for (const a of [...PLAYABLE_ACTIONS, ...JOINT_ACTIONS]) out[a.id] ??= blanket;
    return out;
  }, [priv, snap.phase, me?.ready, myOffer]);

  const visibleActions = useMemo(
    () => (focusLocation ? PLAYABLE_ACTIONS.filter((a) => locationOf(a.id) === focusLocation) : PLAYABLE_ACTIONS),
    [focusLocation]
  );

  const sendChat = () => {
    const t = chatText.trim();
    if (!t) return;
    conn.sendChat(t);
    setChatText('');
  };

  const waiting = snap.players.filter((p) => p.connected && !p.bot && !p.ready && !p.finished);
  const readyLabel =
    snap.phase === 'planning' ? (me?.ready ? 'Hủy sẵn sàng' : '✅ Sẵn sàng qua đêm') : snap.phase === 'morning' ? (me?.ready ? 'Đang chờ mọi người' : '☀️ Sang ngày mới') : '';

  if (!me) {
    return <div className="p-8 text-center text-sm text-stone-600">Đang vào phòng…</div>;
  }

  return (
    <div className="space-y-4" data-testid="room-game">
      {/* Thanh trạng thái phòng */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-white rounded-2xl border border-stone-200 shadow-xs">
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(snap.code).then(() => push('Đã chép mã phòng', 'info'))}
          title="Chép mã phòng"
          data-testid="room-code"
          className="px-3 py-1.5 rounded-xl bg-stone-900 text-white font-mono font-extrabold tracking-[0.3em] text-lg"
        >
          {snap.code}
        </button>
        <div className="text-sm font-bold text-stone-800" data-testid="phase">
          {PHASE_LABEL[snap.phase]} · Ngày {snap.day}/7
          {remaining !== null && snap.phase !== 'ended' && <span className="ml-2 font-mono text-stone-500">{remaining}s</span>}
        </div>
        {status !== 'connected' && <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-lg">{status === 'reconnecting' ? 'Đang nối lại…' : 'Mất kết nối'}</span>}
        <div className="ml-auto flex items-center gap-2">
          {readyLabel && !me.finished && (
            <button
              type="button"
              onClick={() => conn.setReady(!me.ready)}
              data-testid="ready-btn"
              className={`px-3 py-1.5 rounded-xl text-xs font-bold ${me.ready ? 'bg-stone-200 text-stone-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
            >
              {readyLabel}
            </button>
          )}
          <button type="button" onClick={onToggleLite} className="px-3 py-1.5 rounded-xl bg-white border border-stone-200 text-xs font-semibold text-stone-700 hover:bg-stone-50">
            {lite ? '🎮 Bật 3D' : '🪶 Chế độ nhẹ'}
          </button>
          <button type="button" onClick={onLeave} className="px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-xs font-semibold text-rose-700 hover:bg-rose-50">
            Rời phòng
          </button>
        </div>
        {waiting.length > 0 && snap.phase !== 'night' && (
          <div className="basis-full text-[11px] text-stone-500">Đang chờ: {waiting.map((p) => p.name).join(', ')}</div>
        )}
      </div>

      {/* Thông báo + lời mời */}
      <div className="space-y-2" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`px-3 py-2 rounded-xl text-xs border ${t.tone === 'bad' ? 'bg-rose-50 border-rose-200 text-rose-900' : t.tone === 'good' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
            {t.text}
          </div>
        ))}
        {invites.map((i) => {
          const def = jointActionDef(i.actionId);
          const tempting = !!def?.joint?.peerPressure;
          return (
            <div key={i.offerId} data-testid="invite" className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border ${tempting ? 'bg-fuchsia-50 border-fuchsia-200' : 'bg-indigo-50 border-indigo-200'}`}>
              <span className="flex-1">
                <b>{i.hostName}</b> rủ bạn: {def?.title ?? i.actionId}
                {i.pressure < 0 && <span className="ml-1 text-xs text-fuchsia-700">(bạn thấy hơi bị cuốn: {i.pressure} ý chí)</span>}
              </span>
              <button type="button" onClick={() => conn.joinOffer(i.offerId)} className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700">
                Vào
              </button>
              <button type="button" onClick={() => setInvites((l) => l.filter((x) => x.offerId !== i.offerId))} className="px-2 py-1 text-xs text-stone-500 hover:text-stone-800">
                Bỏ qua
              </button>
            </div>
          );
        })}
      </div>

      {/* Cảnh thành phố */}
      {lite ? (
        <div className="p-6 rounded-2xl bg-white border border-stone-200 text-sm text-stone-600">
          <b className="text-stone-900">Chế độ nhẹ:</b> không dựng cảnh 3D. Dùng danh sách hành vi bên dưới; mọi người trong phòng vẫn thấy bạn như bình thường.
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {LOCATIONS.map((l) => (
              <div key={l.id} className="px-2 py-1.5 rounded-lg bg-stone-50 border border-stone-200 text-xs">
                {l.emoji} {l.name}
                <div className="text-[10px] text-stone-500">{snap.players.filter((p) => p.location === l.id).map((p) => p.name).join(', ') || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <Suspense fallback={<div className="h-[22rem] rounded-2xl bg-sky-100 animate-pulse" />}>
          <CityStage conn={conn} snapshot={snap} quality="high" onVisitLocation={setFocusLocation} />
        </Suspense>
      )}

      {/* Chỉ số của mình */}
      <section className="p-3 bg-white rounded-2xl border border-stone-200 shadow-xs">
        <div className="flex items-center gap-2 mb-2 text-xs text-stone-600">
          <img src={avatarUrl(me.avatar as AvatarId)} alt="" className="w-7 h-7" />
          <b className="text-stone-900">{me.name}</b>
          <span>
            📍 {locationDef(me.location as never).emoji} {locationDef(me.location as never).name} · đã dùng {me.hoursUsed}h/24h
          </span>
          <div className="ml-auto h-2 w-32 bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-400" style={{ width: `${Math.min(100, (me.hoursUsed / 24) * 100)}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2" data-testid="my-stats">
          {STAT_CHIPS.map((c) => (
            <div key={c.key} className="px-2 py-1.5 rounded-lg bg-stone-50 border border-stone-200 text-center">
              <div className="text-[10px] text-stone-500">{c.icon} {c.label}</div>
              <div className="text-sm font-extrabold text-stone-900">{c.key === 'money' ? fmtMoney(me.stats.money) : Math.round(me.stats[c.key])}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {/* Hành vi chung */}
          <section className="p-3 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-2">
            <h3 className="text-sm font-bold text-stone-900">🤝 Làm cùng nhau</h3>
            {snap.offers.length > 0 && (
              <ul className="space-y-1.5" data-testid="offers">
                {snap.offers.map((o) => {
                  const def = jointActionDef(o.actionId);
                  const mine = o.members.includes(me.id);
                  const isHost = o.hostId === me.id;
                  return (
                    <li key={o.id} className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-indigo-50 border border-indigo-200 text-xs">
                      <span className="flex-1">
                        <b>{def?.title ?? o.actionId}</b> · {nameOf(o.hostId)} rủ · {o.members.length}/{o.maxPlayers} người (cần {o.minPlayers}): {o.members.map(nameOf).join(', ')}
                      </span>
                      {!mine && snap.phase === 'planning' && (
                        <button type="button" onClick={() => conn.joinOffer(o.id)} className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-bold">Vào</button>
                      )}
                      {isHost && (
                        <button type="button" disabled={o.members.length < o.minPlayers} onClick={() => conn.startOffer()} data-testid="start-offer" className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold disabled:opacity-40">
                          Bắt đầu
                        </button>
                      )}
                      {mine && (
                        <button type="button" onClick={() => conn.leaveOffer()} className="px-2 py-1 rounded-lg bg-white border border-stone-300 text-stone-700">{isHost ? 'Hủy' : 'Rời'}</button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="grid sm:grid-cols-2 gap-2">
              {JOINT_ACTIONS.map((a) => {
                const lock = lockReasons[a.id];
                return (
                  <div key={a.id} className={`p-2 rounded-xl border text-xs ${a.isTemptation ? 'bg-fuchsia-50/60 border-fuchsia-200' : 'bg-white border-stone-200'}`}>
                    <div className="font-bold text-stone-900">{a.title}</div>
                    <div className="text-stone-500">
                      {a.joint!.minPlayers}–{a.joint!.maxPlayers} người · {locationDef(locationOf(a.id)).emoji} {locationDef(locationOf(a.id)).name}
                    </div>
                    <button
                      type="button"
                      disabled={!!lock}
                      onClick={() => conn.offerJoint(a.id)}
                      data-testid={`offer-${a.id}`}
                      title={lock}
                      className="mt-1.5 w-full px-2 py-1 rounded-lg bg-stone-900 text-white font-bold disabled:opacity-35"
                    >
                      {lock ? lock : 'Rủ bạn bè'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Hành vi một mình */}
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setShowCards((v) => !v)} className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${showCards ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-700 border-stone-200'}`}>
                📋 Hành vi ({visibleActions.length})
              </button>
              {focusLocation && (
                <button type="button" onClick={() => setFocusLocation(null)} className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-xs text-indigo-900">
                  {locationDef(focusLocation as never).emoji} {locationDef(focusLocation as never).name} ✕
                </button>
              )}
            </div>
            {(showCards || focusLocation) && (
              <ActionGrid actions={visibleActions} currentStats={me.stats} hoursRemaining={hoursRemaining} onSelectAction={conn.sendAction} lockReasons={lockReasons} />
            )}
          </section>
        </div>

        <aside className="space-y-4">
          {/* Người trong phòng */}
          <section className="p-3 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-2">
            <h3 className="text-sm font-bold text-stone-900">👥 Trong phòng ({snap.players.length})</h3>
            <ul className="space-y-1.5" data-testid="players">
              {snap.players.map((p) => (
                <li key={p.id} className="flex items-center gap-2 text-xs">
                  <img src={avatarUrl(p.avatar as AvatarId)} alt="" className="w-7 h-7 shrink-0" />
                  <span className="flex-1 min-w-0">
                    <b className="text-stone-900">{p.name}</b>
                    {p.id === me.id && ' (bạn)'}
                    <span className="block text-[10px] text-stone-500 truncate">
                      {locationDef(p.location as never).emoji} {locationDef(p.location as never).name} · Kết nối {Math.round(p.stats.social)}
                      {p.finished ? ' · đã xong ván' : ''}
                    </span>
                  </span>
                  {p.bot && <span title="Bot Balanced đang chơi thay">🤖</span>}
                  {!p.connected && !p.bot && <span title="Mất kết nối">📴</span>}
                  {p.ready && <span title="Sẵn sàng">✅</span>}
                  {p.id !== me.id && !p.finished && (
                    <button type="button" onClick={() => conn.nudge(p.id)} title="Gửi lời động viên (hồi chút ý chí)" className="px-1.5 py-0.5 rounded-md bg-stone-100 hover:bg-stone-200">
                      💪
                    </button>
                  )}
                </li>
              ))}
              {others.length === 0 && <li className="text-[11px] text-stone-500">Chia sẻ mã <b>{snap.code}</b> cho bạn bè để họ vào cùng.</li>}
            </ul>
          </section>

          {/* Chat */}
          <section className="p-3 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-2">
            <h3 className="text-sm font-bold text-stone-900">💬 Trò chuyện</h3>
            <ul className="max-h-40 overflow-y-auto space-y-1 text-xs" data-testid="chat-log">
              {snap.chat.slice(-30).map((c, i) => (
                <li key={`${c.at}-${i}`}>
                  <b className="text-stone-900">{c.name}:</b> <span className="text-stone-700">{c.text}</span>
                </li>
              ))}
              {snap.chat.length === 0 && <li className="text-stone-400">Chưa có tin nhắn.</li>}
            </ul>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendChat();
              }}
              className="flex gap-1.5"
            >
              <input value={chatText} onChange={(e) => setChatText(e.target.value)} maxLength={200} placeholder="Nhắn gì đó…" data-testid="chat-input" className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-stone-300 text-xs" />
              <button type="submit" className="px-3 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-bold">Gửi</button>
            </form>
          </section>
        </aside>
      </div>

      {/* Đêm */}
      {snap.phase === 'night' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-indigo-950/60 pointer-events-none" role="status">
          <div className="text-center text-white">
            <div className="text-5xl mb-2">💤</div>
            <div className="text-2xl font-extrabold">Ngày {snap.day} khép lại</div>
            <div className="text-sm text-indigo-100">Cơ thể và tâm trí mỗi người đang “tính sổ” qua đêm…</div>
          </div>
        </div>
      )}

      {/* Báo cáo sáng riêng của mình */}
      {report && (
        <MorningModal
          report={report.report}
          friendNotes={report.friends}
          dayGrades={(priv?.dayGrades ?? []) as DayGrade[]}
          onContinue={() => {
            setReport(null);
            if (snap.phase === 'morning') conn.setReady(true);
          }}
        />
      )}

      {/* Hết ván */}
      {snap.phase === 'ended' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/70 p-4" role="dialog" aria-label="Kết thúc ván">
          <div className="max-w-sm w-full p-6 rounded-3xl bg-white text-center space-y-3">
            <div className="text-5xl">🏁</div>
            <h3 className="text-xl font-extrabold text-stone-900">Tuần này kết thúc</h3>
            <ul className="text-sm text-stone-700 space-y-1 text-left">
              {snap.players.map((p) => (
                <li key={p.id} className="flex items-center gap-2">
                  <img src={avatarUrl(p.avatar as AvatarId)} alt="" className="w-6 h-6" />
                  <b>{p.name}</b>
                  <span className="ml-auto text-xs text-stone-500">Kết nối {Math.round(p.stats.social)} · {fmtMoney(p.stats.money)}</span>
                </li>
              ))}
            </ul>
            <button type="button" onClick={onLeave} className="w-full px-4 py-2 rounded-xl bg-stone-900 text-white font-bold">Về sảnh</button>
          </div>
        </div>
      )}
    </div>
  );
};
