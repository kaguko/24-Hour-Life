import React, { useMemo, useState } from 'react';
import {
  ActionPrimitive,
  Advice,
  PlayerStatsPrimitive,
  ReactionKind,
  STAT_EMOJI,
  memeAction,
  pickFeedChoices,
  sleepCutHours,
  isNightSleepId,
} from '@24h/domain';
import { ActionCard } from './ActionCard';
import { Sticker } from './Sticker';

interface FeedPanelProps {
  day: number;
  hoursUsed: number;
  hoursRemaining: number;
  stats: PlayerStatsPrimitive;
  actions: ActionPrimitive[];
  lastActionId: string | null;
  lastActionN: number;
  lockReasons: Record<string, string>;
  habitTags: Record<string, string>;
  onSelectAction: (id: string) => void;
  onShowAll: () => void;
  /** Lời khuyên của huấn luyện viên: nên làm gì bây giờ */
  advice: Advice;
  /** Hành vi giúp chuẩn bị Boss cuối tuần */
  bossPrepIds: Set<string>;
  onGoToBed: () => void;
  todayIds: string[];
}

// Tên + ngưỡng nguy hiểm: `lose` = chạm là thua, `warn` = bắt đầu đỏ
const HUD: Array<{ key: keyof typeof STAT_EMOJI; name: string; bar: string; warn: number; lose?: number }> = [
  { key: 'energy', name: 'Năng lượng', bar: '#f59e0b', warn: 30, lose: 10 },
  { key: 'mental', name: 'Tinh thần', bar: '#818cf8', warn: 35, lose: 15 },
  { key: 'willpower', name: 'Ý chí', bar: '#38bdf8', warn: 35 },
  { key: 'dopamine', name: 'Hưng phấn', bar: '#ec4899', warn: 20 },
  { key: 'social', name: 'Kết nối', bar: '#10b981', warn: 30 },
];

const ADVICE_TONE: Record<Advice['tone'], string> = {
  danger: 'bg-rose-500/15 border-rose-400/60 text-rose-50',
  warn: 'bg-amber-400/10 border-amber-300/50 text-amber-50',
  goal: 'bg-violet-500/15 border-violet-300/50 text-violet-50',
  calm: 'bg-emerald-400/10 border-emerald-300/40 text-emerald-50',
};

const fmtClock = (hoursUsed: number) => {
  const h = (7 + Math.floor(hoursUsed)) % 24;
  const m = Math.round((hoursUsed % 1) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/** Phản ứng sau hành vi vừa làm: nhanh = cooked, chậm = locked in, nghỉ = ngủ, còn lại = W */
function reactionOf(a: ActionPrimitive | undefined): ReactionKind {
  if (!a) return 'lockedin';
  if (a.dopaminePathway === 'fast') return 'cooked';
  if (a.category === 'rest') return 'sleep';
  if (a.dopaminePathway === 'slow') return 'lockedin';
  return 'W';
}

export const FeedPanel: React.FC<FeedPanelProps> = ({
  day,
  hoursUsed,
  hoursRemaining,
  stats,
  actions,
  lastActionId,
  lastActionN,
  lockReasons,
  habitTags,
  onSelectAction,
  onShowAll,
  advice,
  bossPrepIds,
  onGoToBed,
  todayIds,
}) => {
  const slept = todayIds.some(isNightSleepId);
  const sleepHours = Math.min(8, Math.floor(hoursRemaining));
  const [shuffle, setShuffle] = useState(0);
  // Bài đổi sau mỗi hành vi (lastActionN) hoặc khi bấm "Đổi bài"
  const seed = day * 1000 + lastActionN * 17 + shuffle * 131;
  const isOk = (id: string) => !lockReasons[id] && hoursRemaining >= (actions.find((a) => a.id === id)?.hours ?? 99);
  // Hành vi được gợi ý: cái đầu tiên trong danh sách của huấn luyện viên mà đang làm được
  const suggestedId = advice.actionIds.find(isOk) ?? null;
  const ids = useMemo(() => {
    const picked = pickFeedChoices(actions, isOk, stats, seed);
    // Lá gợi ý luôn có mặt và đứng đầu
    if (!suggestedId) return picked;
    return [suggestedId, ...picked.filter((id) => id !== suggestedId)].slice(0, 4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions, lockReasons, hoursRemaining, stats, seed, suggestedId]);
  const last = lastActionId ? actions.find((a) => a.id === lastActionId) : undefined;
  const lastMeme = last ? memeAction(last.id, last.title) : null;

  return (
    <div className="rounded-3xl bg-[#18132f] text-[#e6defd] border border-amber-200/15 p-3 sm:p-4 space-y-3 font-nocturne land:max-h-[calc(100dvh-6.5rem)] land:overflow-y-auto land:overscroll-contain scrollbar-thin">
      {/* Chỉ số: tên rõ ràng, đỏ khi gần ngưỡng, vạch đỏ = chạm là thua */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5" aria-label="Chỉ số">
        {HUD.map(({ key, name, bar, warn, lose }) => {
          const v = Math.round(stats[key]);
          const low = v <= warn;
          return (
            <div
              key={key}
              title={lose ? `${name}: chạm ${lose} là thua` : name}
              className={`rounded-xl py-1.5 px-1.5 sm:px-2 ${low ? 'bg-rose-500/15 ring-1 ring-rose-400/60' : 'bg-[#0f0b21]/70'} ${lose && v <= warn ? 'animate-pulse' : ''}`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-label text-[10px] sm:text-[10.5px] font-semibold text-[#d8c3ad] whitespace-nowrap overflow-hidden">
                  <span aria-hidden>{STAT_EMOJI[key]}</span> {name}
                </span>
                <span className={`font-label text-xs font-bold tabular-nums ${low ? 'text-rose-200' : ''}`}>{v}</span>
              </div>
              <div className="relative h-1.5 rounded-full bg-[#363249] overflow-hidden mt-1">
                <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(100, v))}%`, background: low ? '#f43f5e' : bar }} />
                {lose && <div aria-hidden className="absolute top-0 bottom-0 w-0.5 bg-rose-500" style={{ left: `${lose}%` }} />}
              </div>
            </div>
          );
        })}
        <div
          title="Tiền âm là thua. Mỗi đêm trừ tiền trọ."
          className={`rounded-xl py-1.5 px-2 ${stats.money < 500 ? 'bg-rose-500/15 ring-1 ring-rose-400/60 animate-pulse' : 'bg-[#0f0b21]/70'}`}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="font-label text-[10.5px] font-semibold text-[#d8c3ad]"><span aria-hidden>💰</span> Tiền</span>
            <span className="font-label text-xs font-bold tabular-nums">{stats.money}k</span>
          </div>
          <div className="text-[10px] text-[#d8c3ad]/70 mt-0.5">trọ −120k/đêm</div>
        </div>
      </div>

      {/* Màn giữa: phản ứng sau hành vi vừa làm */}
      <div className="text-center py-1" key={lastActionN}>
        <div className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-amber-300">
          Ngày {day} · {fmtClock(hoursUsed)} · còn {hoursRemaining}h trước khi qua đêm
        </div>
        {lastMeme ? (
          <>
            <Sticker kind={reactionOf(last)} seed={lastActionN} size={88} />
            <div className="font-display text-base font-extrabold">
              {lastMeme.e} {lastMeme.line}
            </div>
          </>
        ) : (
          <Sticker kind="lockedin" size={88} caption={false} />
        )}
      </div>

      {/* Huấn luyện viên: một việc nên làm ngay, kèm lý do */}
      <div role="status" aria-live="polite" className={`rounded-2xl border px-3 py-2.5 flex items-start gap-2.5 ${ADVICE_TONE[advice.tone]}`}>
        <span className="text-2xl leading-none shrink-0" aria-hidden>{advice.emoji}</span>
        <div className="min-w-0">
          <div className="font-display text-sm font-extrabold leading-snug">{advice.title}</div>
          <div className="text-xs opacity-85 leading-snug">{advice.why}{suggestedId && ' Lá có dấu 👍 là gợi ý.'}</div>
        </div>
      </div>

      {/* 4 lá bài */}
      <div className="grid grid-cols-2 gap-2.5">
        {ids.map((id) => {
          const a = actions.find((x) => x.id === id);
          return a ? (
            <ActionCard
              key={id}
              action={a}
              currentStats={stats}
              hoursRemaining={hoursRemaining}
              onSelect={onSelectAction}
              lockReason={lockReasons[id] ?? null}
              habitTag={habitTags[id] ?? null}
              suggested={id === suggestedId}
              bossPrep={bossPrepIds.has(id)}
              sleepCut={sleepCutHours(hoursUsed, a.hours, todayIds)}
            />
          ) : null;
        })}
      </div>

      {/* Đi ngủ: luôn có sẵn, sáng lên khi huấn luyện viên nhắc */}
      {!slept && hoursUsed >= 10 && (
        <button
          onClick={onGoToBed}
          className={`w-full py-3 rounded-2xl font-label text-sm font-extrabold transition-all active:scale-[.98] ${
            advice.bedtime
              ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white ring-2 ring-indigo-200/70 shadow-[0_0_24px_-4px_rgba(129,140,248,.9)] animate-pulse'
              : 'bg-indigo-500/20 text-indigo-100 hover:bg-indigo-500/30'
          }`}
        >
          😴 Đi ngủ · ngủ {sleepHours} tiếng{sleepHours < 8 ? ` (thiếu ${8 - sleepHours}h)` : ''} rồi sang ngày mới
        </button>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setShuffle((n) => n + 1)} className="py-2.5 rounded-full bg-white/10 hover:bg-white/15 font-label text-sm font-bold">
          🔄 Đổi bài
        </button>
        <button onClick={onShowAll} className="py-2.5 rounded-full bg-white/10 hover:bg-white/15 font-label text-sm font-bold">
          📋 Xem tất cả
        </button>
      </div>
    </div>
  );
};
