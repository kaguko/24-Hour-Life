import React from 'react';
import { BigEventState, BigEventTier, TIER_LABEL, bigEventDef, BIG_EVENT_DAY, BIG_EVENT_AFTER_HOURS } from '../domain';

interface BigEventPanelProps {
  state: BigEventState;
  day: number;
  hoursUsed: number;
  prep: { fill: number; label: string };
  rumor: string;
}

const TIER_TONE: Record<BigEventTier, string> = {
  great: 'text-amber-300',
  pass: 'text-emerald-300',
  close: 'text-orange-300',
  fail: 'text-rose-300',
};

/** Sự kiện lớn của tuần: đếm ngược, thanh chuẩn bị không lộ con số, tin đồn về độ khó. */
export const BigEventPanel: React.FC<BigEventPanelProps> = ({ state, day, hoursUsed, prep, rumor }) => {
  const def = bigEventDef(state.id);
  const done = !!state.result;
  const when = done
    ? `Đã diễn ra: ${TIER_LABEL[state.result!.tier]} · ${state.result!.score}/100`
    : day < BIG_EVENT_DAY
    ? `Thứ Bảy 14:00 · còn ${BIG_EVENT_DAY - day} ngày`
    : hoursUsed < BIG_EVENT_AFTER_HOURS
    ? `HÔM NAY 14:00 · còn ${Math.max(0, BIG_EVENT_AFTER_HOURS - hoursUsed)}h`
    : 'Đang diễn ra';
  const urgent = !done && day >= BIG_EVENT_DAY - 1;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#2a1a05] via-[#1d1236] to-[#18132f] text-white p-3.5 ring-1 shadow-lg ${
        done ? 'ring-white/15' : urgent ? 'ring-amber-300/70' : 'ring-amber-300/30'
      }`}
    >
      <div aria-hidden className="pointer-events-none absolute -top-10 -right-10 w-32 h-32 rounded-full bg-amber-400/15 blur-2xl" />
      <div className="flex items-start gap-3">
        <span className="text-3xl leading-none shrink-0" aria-hidden>
          {def.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Sự kiện lớn của tuần</span>
            <span className={`text-[11px] font-bold tabular-nums ${done ? (TIER_TONE[state.result!.tier]) : urgent ? 'text-amber-200 animate-pulse' : 'text-indigo-200'}`}>{when}</span>
          </div>
          <div className="text-sm font-extrabold leading-snug">{def.title}</div>
          <p className="text-[11px] text-indigo-200/90 leading-snug mt-0.5 line-clamp-2">{def.description}</p>
        </div>
      </div>
      {!done && (
        <div className="mt-2.5">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-indigo-200">Chuẩn bị: <strong className="text-white">{prep.label}</strong></span>
            <span className="text-indigo-300/80 italic">{rumor}</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-orange-500 transition-[width] duration-500" style={{ width: `${Math.max(3, Math.round(prep.fill * 100))}%` }} />
          </div>
        </div>
      )}
    </div>
  );
};
