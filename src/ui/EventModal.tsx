import React, { useState } from 'react';
import { EventPrimitive } from '../domain';
import { AlertCircle, Clock, ArrowRight } from 'lucide-react';

interface EventModalProps {
  event: EventPrimitive;
  onResolveChoice: (choiceId: string) => void;
}

export const EventModal: React.FC<EventModalProps> = ({ event, onResolveChoice }) => {
  const [selectedFeedback, setSelectedFeedback] = useState<string | null>(null);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);

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
  const kicker = place === 'road' ? 'Chuyện trên đường' : place ? 'Chuyện tại đây' : 'Sự kiện bất ngờ';

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
        <div className="relative p-5 border-b border-white/10 bg-gradient-to-r from-amber-500/15 to-transparent">
          <div className="flex items-center gap-1.5 font-label text-amber-300 text-[11px] font-bold uppercase tracking-[0.14em] mb-1">
            <AlertCircle className="w-4 h-4" aria-hidden />
            <span>{kicker}</span>
          </div>
          <h3 id="event-title" className="font-display text-xl font-extrabold tracking-tight text-[#e6defd]">
            {event.title}
          </h3>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-[#d8c3ad] leading-relaxed">{event.description}</p>

          {!selectedFeedback ? (
            <div className="space-y-2 pt-1">
              <span className="font-label text-[11px] font-bold text-[#d8c3ad]/80 uppercase tracking-wider block">Bạn sẽ làm gì?</span>
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
            <div className="p-4 bg-amber-400/10 rounded-2xl border border-amber-300/25 space-y-3">
              <p className="text-sm text-amber-100 leading-relaxed">{selectedFeedback}</p>
              <button
                onClick={handleFinish}
                className="w-full py-3 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-[#120e24] font-label text-sm font-bold flex items-center justify-center gap-2 active:translate-y-px transition-all"
              >
                <span>Tiếp tục</span>
                <ArrowRight className="w-4 h-4" aria-hidden />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
