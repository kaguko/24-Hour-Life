import React, { useMemo, useState } from 'react';
import {
  ActionPrimitive,
  PlayerStatsPrimitive,
  ReactionKind,
  STAT_EMOJI,
  memeAction,
  pickFeedChoices,
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
}

const HUD: Array<{ key: keyof typeof STAT_EMOJI; bar: string }> = [
  { key: 'energy', bar: '#f59e0b' },
  { key: 'mental', bar: '#818cf8' },
  { key: 'willpower', bar: '#38bdf8' },
  { key: 'dopamine', bar: '#ec4899' },
  { key: 'social', bar: '#10b981' },
];

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
}) => {
  const [shuffle, setShuffle] = useState(0);
  // Bài đổi sau mỗi hành vi (lastActionN) hoặc khi bấm "Đổi bài"
  const seed = day * 1000 + lastActionN * 17 + shuffle * 131;
  const ids = useMemo(
    () => pickFeedChoices(actions, (id) => !lockReasons[id] && hoursRemaining >= (actions.find((a) => a.id === id)?.hours ?? 99), stats, seed),
    [actions, lockReasons, hoursRemaining, stats, seed]
  );
  const last = lastActionId ? actions.find((a) => a.id === lastActionId) : undefined;
  const lastMeme = last ? memeAction(last.id, last.title) : null;

  return (
    <div className="rounded-3xl bg-[#18132f] text-[#e6defd] border border-amber-200/15 p-3 sm:p-4 space-y-3 font-nocturne">
      {/* HUD icon */}
      <div className="grid grid-cols-5 gap-1.5" aria-label="Chỉ số">
        {HUD.map(({ key, bar }) => (
          <div key={key} className="bg-[#0f0b21]/70 rounded-xl py-1.5 px-1 text-center">
            <div className="text-base leading-none" aria-hidden>{STAT_EMOJI[key]}</div>
            <div className="font-label text-xs font-bold tabular-nums">{Math.round(stats[key])}</div>
            <div className="h-1 rounded-full bg-[#363249] overflow-hidden mt-0.5">
              <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, stats[key]))}%`, background: bar }} />
            </div>
          </div>
        ))}
      </div>

      {/* Màn giữa: phản ứng sau hành vi vừa làm */}
      <div className="text-center py-1" key={lastActionN}>
        <div className="font-label text-[11px] font-bold uppercase tracking-[0.14em] text-amber-300">
          Ngày {day} · {fmtClock(hoursUsed)} · còn {hoursRemaining}h · 💰 {stats.money}k
        </div>
        {lastMeme ? (
          <>
            <Sticker kind={reactionOf(last)} seed={lastActionN} size={104} />
            <div className="font-display text-base font-extrabold">
              {lastMeme.e} {lastMeme.line}
            </div>
          </>
        ) : (
          <>
            <Sticker kind="lockedin" size={104} caption={false} />
            <div className="font-display text-lg font-extrabold">Làm gì giờ nè? 👇</div>
          </>
        )}
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
            />
          ) : null;
        })}
      </div>

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
