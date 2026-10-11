import React from 'react';
import { traitById } from '@24h/domain';

interface TraitsPanelProps {
  traitIds: string[];
  /** Tên các thú vui đang "réo gọi" hôm nay (thói quen xấu đã thành nếp, chưa làm) */
  cravings: string[];
}

/** Tính cách của ván này (mặt lợi / mặt hại) và cơn thèm đang đòi, cùng phong cách tối với mục tiêu. */
export const TraitsPanel: React.FC<TraitsPanelProps> = ({ traitIds, cravings }) => {
  const traits = traitIds.map(traitById).filter((t): t is NonNullable<typeof t> => !!t);
  if (traits.length === 0 && cravings.length === 0) return null;
  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-3 ring-1 ring-white/10 shadow-md">
      {traits.length > 0 && (
        <>
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300 mb-1.5">Tính cách của bạn</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {traits.map((t) => (
              <div key={t.id} className="flex items-start gap-2.5 rounded-xl bg-white/5 p-2">
                <span className="text-2xl leading-none shrink-0" aria-hidden>{t.emoji}</span>
                <div className="min-w-0 text-xs leading-snug">
                  <div className="text-sm font-bold">{t.name}</div>
                  <div className="text-emerald-300">+ {t.upside}</div>
                  <div className="text-rose-300">− {t.downside}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {cravings.length > 0 && (
        <div className={`${traits.length > 0 ? 'mt-2 ' : ''}text-xs text-rose-200`}>
          <span className="font-bold">🔥 Cơn thèm:</span> {cravings.join(', ')} đang réo gọi. Thói quen này dễ kéo bạn quay lại.
        </div>
      )}
    </div>
  );
};
