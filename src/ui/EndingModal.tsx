import React, { useEffect, useState } from 'react';
import { EndingPrimitive, PlayerStatsPrimitive } from '../domain';
import { ENDING_PALETTES } from '../lib/endingPalette';
import { Share2, RotateCcw, Check, Copy } from 'lucide-react';
import confetti from 'canvas-confetti';

interface EndingModalProps {
  ending: EndingPrimitive;
  stats: PlayerStatsPrimitive;
  onRestart: () => void;
  onShare: () => Promise<'shared' | 'downloaded' | 'copied' | 'cancelled' | 'failed'>;
  onCopy: () => Promise<boolean>;
}

const OUTCOME_LABEL: Record<EndingPrimitive['outcome'], string> = {
  survived: 'Sống sót trọn 7 ngày',
  bankrupt: 'Gục ngã vì khủng hoảng tiền bạc',
  burnout: 'Gục ngã vì kiệt quệ',
};

export const EndingModal: React.FC<EndingModalProps> = ({ ending, stats, onRestart, onShare, onCopy }) => {
  const pal = ENDING_PALETTES[ending.palette];
  const [reflection, setReflection] = useState<'less' | 'same' | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (ending.outcome !== 'survived') return;
    try {
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.55 } });
    } catch {
      // ignore
    }
  }, [ending.outcome]);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  };

  const handleShare = async () => {
    const r = await onShare();
    if (r === 'downloaded') flash('Đã tải ảnh về máy và chép nội dung chia sẻ. Dán vào bài đăng của bạn!');
    else if (r === 'copied') flash('Đã chép nội dung chia sẻ.');
    else if (r === 'failed') flash('Không chia sẻ được. Hãy thử nút "Chép nội dung".');
  };

  const handleCopy = async () => {
    flash((await onCopy()) ? 'Đã chép nội dung chia sẻ.' : 'Trình duyệt không cho phép chép.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/70 backdrop-blur-xs flex items-start sm:items-center justify-center p-3 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Thẻ kết cục - giống ảnh chia sẻ */}
        <div
          className="px-6 pt-7 pb-6 text-white text-center"
          style={{ background: `linear-gradient(145deg, ${pal.from}, ${pal.to})` }}
        >
          <p className="text-[11px] font-semibold tracking-[0.2em] text-white/70">CUỘC SỐNG 24 GIỜ</p>
          <div className="text-7xl my-3 leading-none" aria-hidden>
            {ending.emoji}
          </div>
          <p className="text-xs font-semibold tracking-widest" style={{ color: pal.accent }}>
            BẠN LÀ
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight mt-1">{ending.title}</h2>
          <p className="italic text-white/90 text-sm mt-2">&ldquo;{ending.tagline}&rdquo;</p>

          <div className="mt-5 grid grid-cols-2 gap-3 bg-black/25 rounded-2xl p-3">
            <div>
              <div className="text-4xl font-extrabold tabular-nums">{ending.score}</div>
              <div className="text-[10px] font-semibold tracking-wider" style={{ color: pal.accent }}>
                ĐIỂM / 100
              </div>
            </div>
            <div>
              <div className="text-4xl font-extrabold tabular-nums">
                {ending.outcome === 'survived' ? 7 : ending.daysSurvived}
              </div>
              <div className="text-[10px] font-semibold tracking-wider" style={{ color: pal.accent }}>
                {ending.outcome === 'survived' ? 'NGÀY SỐNG SÓT' : 'NGÀY TRƯỚC KHI GỤC'}
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-1.5 text-left">
            {(
              [
                ['Năng lượng', stats.energy],
                ['Tinh thần', stats.mental],
                ['Ý chí', stats.willpower],
                ['Kết nối', stats.social],
              ] as const
            ).map(([label, v]) => (
              <div key={label} className="flex items-center gap-2 text-[11px]">
                <span className="w-16 text-white/80">{label}</span>
                <div className="flex-1 h-2 rounded-full bg-white/20 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${v}%`, background: pal.accent }} />
                </div>
                <span className="w-8 text-right tabular-nums text-white/80">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Giải thích & bài học */}
        <div className="p-5 space-y-4">
          <div>
            <p className="text-[11px] font-semibold text-stone-500 mb-1">{OUTCOME_LABEL[ending.outcome]}</p>
            <p className="text-sm text-stone-800 leading-relaxed">{ending.description}</p>
            <p className="text-xs italic text-stone-600 mt-2 pl-2 border-l-2 border-stone-300">{ending.lesson}</p>
          </div>

          {/* Câu hỏi phản tư */}
          <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
            <p className="text-xs font-semibold text-stone-900">
              Sau ván này, bạn muốn lướt mạng xã hội nhiều hơn hay ít hơn?
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ['less', 'Ít hơn'],
                  ['same', 'Như cũ'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setReflection(key)}
                  className={`py-2 rounded-lg text-xs font-semibold border transition-colors ${
                    reflection === key
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {reflection === 'less' && (
              <p className="text-[11px] text-emerald-800 bg-emerald-50 rounded-lg p-2">
                Đúng thông điệp của game: dopamine rẻ tiền vay khoái cảm của ngày mai với lãi suất cao.
              </p>
            )}
          </div>

          {/* Hành động */}
          <div className="space-y-2">
            <button
              onClick={handleShare}
              className="w-full py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 shadow-xs transition-opacity hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${pal.from}, ${pal.to})` }}
            >
              <Share2 className="w-4 h-4" />
              Chia sẻ kết quả của bạn
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleCopy}
                className="py-2.5 rounded-xl text-xs font-semibold border border-stone-200 text-stone-700 hover:bg-stone-50 flex items-center justify-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                Chép nội dung
              </button>
              <button
                onClick={onRestart}
                className="py-2.5 rounded-xl text-xs font-semibold bg-stone-900 text-white hover:bg-stone-800 flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Thử cách khác
              </button>
            </div>
          </div>
          {toast && (
            <p
              role="status"
              className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2 flex items-start gap-1.5"
            >
              <Check className="w-3.5 h-3.5 shrink-0 mt-px" />
              {toast}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
