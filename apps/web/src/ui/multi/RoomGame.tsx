import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { JOINT_ACTIONS, LOCATIONS, PLAYABLE_ACTIONS, jointActionDef, locationDef, locationOf, type DayGrade, type NightResultPrimitive } from '@24h/domain';
import type { InviteMessage } from '@24h/protocol';
import { audioAdapter } from '../../adapters/audioAdapter';
import { avatarUrl, type AvatarId } from '../../lib/avatars';
import type { PlayerView, RoomConnection } from '../../net/room';
import { ActionGrid } from '../ActionGrid';
import { MorningModal } from '../MorningModal';
import { useNow, usePrivateState, useRoomSnapshot, useRoomStatus, useToasts } from './hooks';
import { Notices, QuestRail, QuestStrip, RoomTopBar, StatRail, StatStrip, fmtMoney } from './RoomHud';
import { RoomDock, type DockTab } from './RoomDock';
import { MascotCard } from './MascotCard';

const CityStage = lazy(() => import('./CityStage').then((m) => ({ default: m.CityStage })));

interface RoomGameProps {
  conn: RoomConnection;
  lite: boolean;
  onToggleLite: () => void;
  onLeave: () => void;
}

export const RoomGame: React.FC<RoomGameProps> = ({ conn, lite, onToggleLite, onLeave }) => {
  const snap = useRoomSnapshot(conn);
  const status = useRoomStatus(conn);
  const priv = usePrivateState(conn);
  const now = useNow(500);
  const { toasts, push } = useToasts();
  const [tab, setTab] = useState<DockTab>('joint');
  const [dockOpen, setDockOpen] = useState(true);
  /** Số tin chat đã đọc (để báo tin mới khi đang ở tab khác) */
  const [chatSeen, setChatSeen] = useState(0);
  const [report, setReport] = useState<{ report: NightResultPrimitive; friends: string[] } | null>(null);
  const [invites, setInvites] = useState<InviteMessage[]>([]);
  const [focusLocation, setFocusLocation] = useState<string | null>(null);
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
  const goals = priv?.goals ?? [];
  const npcQuest = priv?.npcQuest ?? null;
  const groupQuest = priv?.groupQuest ?? null;
  // Dấu 🎯 trên toà nhà: chỉ nhiệm vụ còn đang làm dở và có nơi gợi ý
  const questMarkers = useMemo(
    () => [
      ...goals.filter((g) => g.state === 'progress').flatMap((g) => g.places.map((p) => ({ locationId: p, text: `${g.emoji} ${g.label}` }))),
      ...(npcQuest ? npcQuest.places.map((p) => ({ locationId: p, text: `${npcQuest.giverEmoji} ${npcQuest.title}` })) : []),
      ...(groupQuest && !groupQuest.done ? groupQuest.places.map((p) => ({ locationId: p, text: `👥 ${groupQuest.label}` })) : []),
    ],
    [JSON.stringify(goals.map((g) => [g.id, g.state, g.label])), npcQuest?.id, npcQuest?.status, groupQuest?.id, groupQuest?.label, groupQuest?.done]
  );
  const others = snap.players.filter((p) => p.id !== snap.sessionId);
  const nameOf = (id: string) => snap.players.find((p) => p.id === id)?.name ?? 'Ai đó';

  // Message từ server -> thông báo / báo cáo / lời mời
  useEffect(() => {
    const offs = [
      conn.on('group_quest_done', (m) => push(`${m.emoji} ${m.title} hoàn thành! ${m.line} (${m.reward})`, 'good')),
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

  // Bấm toà nhà trong thành phố: mở ngay tab hành vi của nơi đó
  useEffect(() => {
    if (focusLocation) {
      setTab('solo');
      setDockOpen(true);
    }
  }, [focusLocation]);
  // Đang xem chat thì coi như đã đọc hết
  useEffect(() => {
    if (tab === 'chat' && dockOpen) setChatSeen(snap.chat.length);
  }, [tab, dockOpen, snap.chat.length]);

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
    return (
      <div className="glass p-10 text-center text-sm text-[var(--ink-dim)] flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-amber-300/30 border-t-amber-300 animate-spin" />
        Đang vào phòng…
      </div>
    );
  }

  const copyCode = () => navigator.clipboard?.writeText(snap.code).then(() => push('Đã chép mã phòng', 'info'));
  const topBar = (
    <RoomTopBar
      snap={snap}
      me={me}
      remaining={remaining}
      status={status}
      readyLabel={readyLabel}
      waiting={waiting}
      lite={lite}
      onCopyCode={copyCode}
      onReady={() => conn.setReady(!me.ready)}
      onToggleLite={onToggleLite}
      onLeave={onLeave}
    />
  );
  const notices = <Notices toasts={toasts} invites={invites} onJoin={conn.joinOffer} onDismiss={(id) => setInvites((l) => l.filter((x) => x.offerId !== id))} />;

  // ── Nội dung từng tab của bảng hoạt động ──
  const jointPanel = (
    <section className="space-y-3 anim-rise">
      <div>
        <h3 className="text-sm font-extrabold text-white">Rủ bạn làm cùng nhau</h3>
        <p className="text-[11px] text-[var(--ink-dim)]">Làm chung thì Kết nối tăng, nhưng rủ nhau buông thả cũng sụp nhanh hơn.</p>
      </div>
      {snap.offers.length > 0 && (
        <ul className="space-y-1.5" data-testid="offers">
          {snap.offers.map((o) => {
            const def = jointActionDef(o.actionId);
            const mine = o.members.includes(me.id);
            const isHost = o.hostId === me.id;
            return (
              <li key={o.id} className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-xl bg-indigo-400/15 border border-indigo-300/40 text-xs text-white anim-pop">
                <span className="flex-1 min-w-[10rem]">
                  <b>{def?.title ?? o.actionId}</b> · {nameOf(o.hostId)} rủ · {o.members.length}/{o.maxPlayers} người (cần {o.minPlayers}): {o.members.map(nameOf).join(', ')}
                </span>
                {!mine && snap.phase === 'planning' && (
                  <button type="button" onClick={() => conn.joinOffer(o.id)} className="btn btn-primary px-3 py-1">Vào</button>
                )}
                {isHost && (
                  <button type="button" disabled={o.members.length < o.minPlayers} onClick={() => conn.startOffer()} data-testid="start-offer" className="btn btn-good px-3 py-1">
                    Bắt đầu
                  </button>
                )}
                {mine && (
                  <button type="button" onClick={() => conn.leaveOffer()} className="btn btn-soft px-2.5 py-1">{isHost ? 'Hủy' : 'Rời'}</button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <div className="grid min-[420px]:grid-cols-2 lg:grid-cols-1 gap-2.5">
        {JOINT_ACTIONS.map((a) => {
          const lock = lockReasons[a.id];
          const loc = locationDef(locationOf(a.id));
          return (
            <div
              key={a.id}
              className={`p-3 rounded-2xl border text-xs flex flex-col gap-1 transition-all ${
                a.isTemptation ? 'bg-gradient-to-br from-fuchsia-500/20 to-transparent border-fuchsia-400/50' : 'bg-white/[0.06] border-white/12 hover:border-amber-300/50'
              } ${lock ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl" aria-hidden>{loc.emoji}</span>
                <div className="min-w-0">
                  <div className="font-extrabold text-white text-[13px] leading-tight">{a.title}</div>
                  <div className="text-[11px] text-[var(--ink-dim)]">
                    {a.joint!.minPlayers}–{a.joint!.maxPlayers} người · {loc.name}
                  </div>
                </div>
              </div>
              <button
                type="button"
                disabled={!!lock}
                onClick={() => conn.offerJoint(a.id)}
                data-testid={`offer-${a.id}`}
                title={lock}
                className={`btn mt-1 w-full py-1.5 ${a.isTemptation ? '!bg-gradient-to-r !from-fuchsia-500 !to-pink-500 !text-white' : 'btn-primary'}`}
              >
                {lock ? lock : a.isTemptation ? 'Rủ bạn bè 😈' : 'Rủ bạn bè'}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );

  const soloPanel = (
    <section className="space-y-2.5 anim-rise">
      {focusLocation && (
        <button type="button" onClick={() => setFocusLocation(null)} className="chip !bg-indigo-400/20 !border-indigo-300/40 hover:!bg-indigo-400/30">
          {locationDef(focusLocation as never).emoji} {locationDef(focusLocation as never).name} ✕
        </button>
      )}
      {/* 55 thẻ hành vi nặng: chỉ dựng khi đang xem tab này (nếu không sẽ vẽ lại mỗi lần ai đó di chuyển) */}
      {tab === 'solo' && <ActionGrid compact actions={visibleActions} currentStats={me.stats} hoursRemaining={hoursRemaining} onSelectAction={conn.sendAction} lockReasons={lockReasons} />}
    </section>
  );

  const roomPanel = (
    <section className="space-y-2.5">
      <h3 className="text-sm font-extrabold text-white flex items-center justify-between">
        <span>👥 Trong phòng</span>
        <span className="chip">{snap.players.length}</span>
      </h3>
      <ul className="space-y-1.5" data-testid="players">
        {snap.players.map((p) => (
          <li key={p.id} className={`flex items-center gap-2.5 text-xs px-2 py-1.5 rounded-xl ${p.id === me.id ? 'bg-amber-300/10 border border-amber-300/30' : 'bg-white/[0.04]'}`}>
            <span className="relative shrink-0">
              <img src={avatarUrl(p.avatar as AvatarId)} alt="" className="w-9 h-9 rounded-xl bg-white/10 p-0.5" />
              {p.ready && <span className="absolute -bottom-1 -right-1 text-[11px]" title="Sẵn sàng">✅</span>}
            </span>
            <span className="flex-1 min-w-0">
              <b className="text-white">{p.name}</b>
              {p.id === me.id && <span className="text-amber-200"> (bạn)</span>}
              <span className="block text-[10px] text-[var(--ink-dim)] truncate">
                {locationDef(p.location as never).emoji} {locationDef(p.location as never).name} · Kết nối {Math.round(p.stats.social)}
                {p.finished ? ' · đã xong ván' : ''}
              </span>
            </span>
            {p.bot && <span title="Bot Balanced đang chơi thay">🤖</span>}
            {!p.connected && !p.bot && <span title="Mất kết nối">📴</span>}
            {p.id !== me.id && !p.finished && (
              <button type="button" onClick={() => conn.nudge(p.id)} title="Gửi lời động viên (hồi chút ý chí)" className="btn btn-soft w-8 h-8 text-sm">
                💪
              </button>
            )}
          </li>
        ))}
        {others.length === 0 && (
          <li className="text-[11px] text-[var(--ink-dim)] px-1">
            Chia sẻ mã <b className="text-amber-200 font-mono tracking-widest">{snap.code}</b> cho bạn bè để họ vào cùng.
          </li>
        )}
      </ul>
    </section>
  );

  const chatPanel = (
    <section className="space-y-2.5">
      <h3 className="text-sm font-extrabold text-white">💬 Trò chuyện</h3>
      <ul className="max-h-64 lg:max-h-[calc(100dvh-24rem)] overflow-y-auto scrollbar-thin space-y-1.5 text-xs" data-testid="chat-log">
        {snap.chat.slice(-30).map((c, i) => (
          <li key={`${c.at}-${i}`} className={`px-2.5 py-1.5 rounded-xl w-fit max-w-full ${c.playerId === snap.sessionId ? 'ml-auto bg-amber-300/20 text-amber-50' : 'bg-white/[0.08] text-white'}`}>
            <b className="text-[10px] block opacity-70">{c.name}</b>
            {c.text}
          </li>
        ))}
        {snap.chat.length === 0 && <li className="text-[var(--ink-faint)]">Chưa có tin nhắn.</li>}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendChat();
        }}
        className="flex gap-1.5"
      >
        <input value={chatText} onChange={(e) => setChatText(e.target.value)} maxLength={200} placeholder="Nhắn gì đó…" data-testid="chat-input" className="input-dark flex-1 min-w-0 px-3 py-2 text-xs" />
        <button type="submit" className="btn btn-primary px-3.5 text-xs">Gửi</button>
      </form>
    </section>
  );

  // Điện thoại: chỉ số và nhiệm vụ nằm trong tab "Tôi" (màn hình rộng đã có cột bên trái cảnh)
  const mePanel = (
    <div className="space-y-2">
      <StatStrip stats={me.stats} />
      <QuestStrip goals={goals} npcQuest={npcQuest} groupQuest={groupQuest} />
    </div>
  );

  const dock = (
    <RoomDock
      overlay={!lite}
      open={dockOpen || lite}
      onToggle={() => setDockOpen((v) => !v)}
      tab={tab}
      onTab={setTab}
      counts={{ solo: visibleActions.length, room: snap.players.length, chatUnread: tab === 'chat' && dockOpen ? 0 : Math.max(0, snap.chat.length - chatSeen) }}
      panels={{ me: mePanel, joint: jointPanel, solo: soloPanel, room: roomPanel, chat: chatPanel }}
    />
  );

  return (
    <div className="space-y-4" data-testid="room-game">
      {lite ? (
        <>
          <section className="glass p-3 sm:p-4 space-y-3 anim-rise">
            {topBar}
            {notices}
            <div data-testid="my-stats">
              <StatStrip stats={me.stats} />
            </div>
            <MascotCard name={me.name} stats={me.stats} />
            <p className="text-sm text-[var(--ink-dim)]">
              <b className="text-white">Chế độ nhẹ:</b> không dựng cảnh 3D. Dùng bảng bên dưới; mọi người trong phòng vẫn thấy bạn như bình thường.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {LOCATIONS.map((l) => (
                <div key={l.id} className="px-2.5 py-2 rounded-xl bg-white/[0.06] border border-white/10 text-xs text-white">
                  {l.emoji} {l.name}
                  <div className="text-[10px] text-[var(--ink-dim)]">{snap.players.filter((p) => p.location === l.id).map((p) => p.name).join(', ') || '—'}</div>
                </div>
              ))}
            </div>
          </section>
          {dock}
        </>
      ) : (
        // Một khung duy nhất vừa màn hình: cảnh 3D ở trên, bảng hoạt động có tab ở dưới (điện thoại) hoặc nổi bên phải (máy tính)
        <div
          className="relative flex flex-col gap-2 h-[calc(100dvh-10rem)] min-h-[36rem] lg:block lg:h-[calc(100dvh-7.5rem)] lg:min-h-[38rem]"
          data-testid="room-layout"
        >
          <Suspense fallback={<div className="flex-[1_1_44%] min-h-[15rem] lg:h-full rounded-3xl skeleton" />}>
            <CityStage
              conn={conn}
              snapshot={snap}
              quality="high"
              className="flex-[1_1_44%] min-h-[15rem] lg:h-full lg:flex-none"
              rightInset={dockOpen}
              onVisitLocation={setFocusLocation}
              questMarkers={questMarkers}
              hud={{
                top: topBar,
                center: notices,
                left: (
                  <>
                    <StatRail stats={me.stats} />
                    <QuestRail goals={goals} npcQuest={npcQuest} groupQuest={groupQuest} />
                  </>
                ),
              }}
            />
          </Suspense>
          {dock}
        </div>
      )}

      {/* Đêm */}
      {snap.phase === 'night' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-indigo-950/70 backdrop-blur-sm pointer-events-none anim-pop" role="status">
          <div className="text-center text-white">
            <div className="text-6xl mb-3 animate-bounce">💤</div>
            <div className="text-2xl font-extrabold">Ngày {snap.day} khép lại</div>
            <div className="text-sm text-indigo-100 mt-1">Cơ thể và tâm trí mỗi người đang “tính sổ” qua đêm…</div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" role="dialog" aria-label="Kết thúc ván">
          <div className="glass-solid max-w-sm w-full p-6 text-center space-y-3 anim-pop">
            <div className="text-5xl">🏁</div>
            <h3 className="text-xl font-extrabold text-white">Tuần này kết thúc</h3>
            <ul className="text-sm text-white space-y-1.5 text-left">
              {snap.players.map((p) => (
                <li key={p.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/[0.06]">
                  <img src={avatarUrl(p.avatar as AvatarId)} alt="" className="w-7 h-7" />
                  <b>{p.name}</b>
                  <span className="ml-auto text-xs text-[var(--ink-dim)]">Kết nối {Math.round(p.stats.social)} · {fmtMoney(p.stats.money)}</span>
                </li>
              ))}
            </ul>
            <button type="button" onClick={onLeave} className="btn btn-primary w-full py-2.5">Về sảnh</button>
          </div>
        </div>
      )}
    </div>
  );
};
