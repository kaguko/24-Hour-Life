import React, { useState } from 'react';
import { EventPrimitive, EventChoicePrimitive, PlayerStatsPrimitive, ReactionKind, memeEvent, STAT_EMOJI } from '@24h/domain';
import { Sticker } from './Sticker';
import { Clock, ArrowRight } from 'lucide-react';

interface EventModalProps {
  event: EventPrimitive;
  onResolveChoice: (choiceId: string) => void;
}

/** Chọn sticker theo tác động tổng thể của lựa chọn (tiền chia 20 để cùng thang với các chỉ số) */
function reactionFor(c: EventChoicePrimitive): ReactionKind {
  const d = c.deltas;
  const score = (d.energy ?? 0) + (d.mental ?? 0) + (d.social ?? 0) + (d.willpower ?? 0) + (d.dopamine ?? 0) * 0.3 + (d.money ?? 0) / 20;
  if ((d.money ?? 0) <= -300) return 'broke';
  return score >= 12 ? 'W' : score <= -12 ? 'cooked' : score < 0 ? 'L' : 'lockedin';
}

export const EventModal: React.FC<EventModalProps> = ({ event, onResolveChoice }) => {
  const [selectedFeedback, setSelectedFeedback] = useState<string | null>(null);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [showDesc, setShowDesc] = useState(false);

  const handleSelect = (choiceId: string, feedback: string) => {
    setSelectedFeedback(feedback);
    setSelectedChoiceId(choiceId);
  };

  const handleFinish = () => {
    if (selectedChoiceId) {
      onResolveChoice(selectedChoiceId);
    }
  };

  // Sự kiện gắn với địa điểm / trên đường có nhãn riêng
  const place = event.places?.[0];
  const kicker = place === 'road' ? 'Trên đường' : place ? 'Tại đây' : 'Bất ngờ!';
  const meme = memeEvent(event.id, event.title);
  const chosen = event.choices.find((c) => c.id === selectedChoiceId) ?? null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-title"
      className="fixed inset-0 z-50 bg-[#0b0817]/85 backdrop-blur-md flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto font-nocturne"
    >
      <div
        className="my-auto bg-[#18132f] rounded-[1.75rem] border border-amber-200/20 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        style={{ boxShadow: '0 0 40px -6px rgba(245,158,11,0.25), 0 24px 60px -12px rgba(0,0,0,0.7)' }}
      >
        <div className="relative p-5 border-b border-white/10 bg-gradient-to-r from-amber-500/15 to-transparent text-center">
          <div className="font-label text-amber-300 text-[11px] font-bold uppercase tracking-[0.14em] mb-1">{kicker}</div>
          <div className="text-6xl leading-none my-1" aria-hidden>{meme.e}</div>
          <h3 id="event-title" className="font-display text-xl font-extrabold tracking-tight text-[#e6defd]">
            {meme.line}
          </h3>
          <button
            type="button"
            onClick={() => setShowDesc((v) => !v)}
            aria-expanded={showDesc}
            className="mt-1 text-[11px] font-bold text-[#d8c3ad] hover:text-amber-200"
          >
            ⓘ {showDesc ? 'Ẩn' : 'Chuyện gì vậy?'}
          </button>
        </div>

        <div className="p-5 space-y-4">
          {showDesc && (
            <div className="text-sm text-[#d8c3ad] leading-relaxed bg-[#211c33] rounded-2xl p-3">
              <b className="text-[#e6defd]">{event.title}</b>
              <p className="mt-0.5">{event.description}</p>
            </div>
          )}

          {!selectedFeedback ? (
            <div className="space-y-2 pt-1">
              <span className="font-label text-[11px] font-bold text-[#d8c3ad]/80 uppercase tracking-wider block text-center">Chọn đi 👇</span>
              {event.choices.map((choice) => (
                <button
                  key={choice.id}
                  onClick={() => handleSelect(choice.id, choice.feedback)}
                  className="w-full text-left p-3.5 rounded-2xl border border-white/10 hover:border-amber-300/50 bg-[#211c33] hover:bg-[#2b273e] transition-all group"
                >
                  <div className="flex items-center justify-between gap-3 text-sm font-semibold text-[#e6defd] group-hover:text-amber-200">
                    <span>{choice.label}</span>
                    {choice.timeHours > 0 && (
                      <span className="inline-flex items-center gap-1 font-label text-[11px] text-[#d8c3ad] font-normal shrink-0">
                        <Clock className="w-3 h-3" aria-hidden />
                        <span>{choice.timeHours}h</span>
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-amber-400/10 rounded-2xl border border-amber-300/25 space-y-3 text-center">
              {chosen && (
                <>
                  <Sticker kind={reactionFor(chosen)} seed={event.id.length + chosen.id.length} size={110} />
                  <div className="flex flex-wrap justify-center gap-1.5 text-xs font-bold tabular-nums">
                    {(Object.keys(chosen.deltas) as Array<keyof PlayerStatsPrimitive>).map((k) => {
                      const v = chosen.deltas[k] ?? 0;
                      return v ? (
                        <span key={k} className={`px-2 py-0.5 rounded-full ${v > 0 ? 'bg-emerald-400/20 text-emerald-200' : 'bg-rose-400/20 text-rose-200'}`}>
                          {STAT_EMOJI[k]} {v > 0 ? '+' : ''}{v}{k === 'money' ? 'k' : ''}
                        </span>
                      ) : null;
                    })}
                  </div>
                </>
              )}
              <p className="text-xs text-amber-100/80 leading-relaxed">{selectedFeedback}</p>
              <button
                onClick={handleFinish}
                className="w-full py-3 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-[#120e24] font-label text-sm font-bold flex items-center justify-center gap-2 active:translate-y-px transition-all"
              >
                <span>Tiếp!</span>
                <ArrowRight className="w-4 h-4" aria-hidden />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
