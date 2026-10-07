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

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 p-5 text-white">
          <div className="flex items-center gap-1.5 text-amber-100 text-xs font-semibold uppercase tracking-wider mb-1">
            <AlertCircle className="w-4 h-4" />
            <span>Sự Kiện Bất Ngờ Trong Cuộc Sống</span>
          </div>
          <h3 className="text-lg font-bold tracking-tight">{event.title}</h3>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-sm text-stone-700 leading-relaxed">
            {event.description}
          </p>

          {!selectedFeedback ? (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
                Lựa chọn phản ứng của bạn:
              </span>
              {event.choices.map((choice) => (
                <button
                  key={choice.id}
                  onClick={() => handleSelect(choice.id, choice.feedback)}
                  className="w-full text-left p-3.5 rounded-xl border border-stone-200 hover:border-stone-400 bg-stone-50 hover:bg-white transition-all group flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-stone-900 group-hover:text-amber-700">
                    <span>{choice.label}</span>
                    {choice.timeHours > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-stone-500 font-normal">
                        <Clock className="w-3 h-3" />
                        <span>{choice.timeHours}h</span>
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-3">
              <p className="text-sm text-amber-900 leading-relaxed font-medium">
                {selectedFeedback}
              </p>
              <button
                onClick={handleFinish}
                className="w-full py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <span>Tiếp tục ngày mới</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
