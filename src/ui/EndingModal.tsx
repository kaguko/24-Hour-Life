import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { EndingPrimitive, JourneyPrimitive, PlayerStatsPrimitive, GoalResultPrimitive } from '../domain';
import { stationOf } from '../lib/roomStations';
import type { EndingStageHandle } from './EndingStage';
import { JOURNEY_SERIES, WEEKDAY_SHORT } from '../lib/journeyColors';
import { ENDING_PALETTES } from '../lib/endingPalette';
import { AvatarId, avatarUrl } from '../lib/avatars';
import { Share2, RotateCcw, Check, Copy } from 'lucide-react';
import confetti from 'canvas-confetti';

interface EndingModalProps {
  ending: EndingPrimitive;
  journey: JourneyPrimitive;
  goals?: GoalResultPrimitive[];
  stats: PlayerStatsPrimitive;
  avatarId: AvatarId;
  onRestart: () => void;
  /** heroImage: ảnh chụp sân khấu 3D (data URL) để đưa vào ảnh chia sẻ */
  onShare: (heroImage?: string) => Promise<'shared' | 'downloaded' | 'copied' | 'cancelled' | 'failed'>;
  onCopy: () => Promise<boolean>;
}

// Sân khấu 3D tải lười, giống phòng 3D
const EndingStage = lazy(() => import('./EndingStage'));

const OUTCOME_LABEL: Record<EndingPrimitive['outcome'], string> = {
  survived: 'Sống sót trọn 7 ngày',
  bankrupt: 'Gục ngã vì khủng hoảng tiền bạc',
  burnout: 'Gục ngã vì kiệt quệ',
};

export const EndingModal: React.FC<EndingModalProps> = ({ ending, journey, goals = [], stats, avatarId, onRestart, onShare, onCopy }) => {
  const pal = ENDING_PALETTES[ending.palette];
  const [reflection, setReflection] = useState<'less' | 'same' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const stageRef = useRef<EndingStageHandle>(null);
  const [stageFailed, setStageFailed] = useState(false);
  // Món đồ trên sân khấu: hành vi người chơi làm nhiều nhất
  const topStation = journey.topActions[0] ? stationOf(journey.topActions[0].id) : null;

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
    const r = await onShare(stageFailed ? undefined : stageRef.current?.snapshot() ?? undefined);
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
          <div className={`relative mx-auto my-2 ${stageFailed ? 'w-36 h-36' : 'w-60 h-48'}`}>
            {stageFailed ? (
              <img src={avatarUrl(avatarId)} alt="Nhân vật của bạn" className="w-full h-full drop-shadow-lg" draggable={false} />
            ) : (
              <Suspense fallback={<img src={avatarUrl(avatarId)} alt="" className="w-36 h-36 mx-auto drop-shadow-lg" draggable={false} />}>
                <EndingStage ref={stageRef} ending={ending} avatarId={avatarId} station={topStation} onFailed={() => setStageFailed(true)} />
              </Suspense>
            )}
            <span
              className="absolute -right-1 bottom-0 text-3xl leading-none bg-black/30 rounded-full w-11 h-11 flex items-center justify-center"
              aria-hidden
            >
              {ending.emoji}
            </span>
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

          {/* Hành trình 7 ngày: dữ liệu thật của chính người chơi */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-stone-900">Hành trình của bạn</p>
            <div className="flex items-end gap-1.5 h-24" role="img" aria-label="Biểu đồ cách bạn dùng thời gian mỗi ngày">
              {journey.days.map((d) => {
                const total = 24;
                return (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    {ending.outcome !== 'survived' && d.day === journey.days.length && (
                      <span className="text-[10px] leading-none text-rose-600" title="Ngày bạn gục ngã">
                        ✕
                      </span>
                    )}
                    <div className="w-full flex flex-col-reverse rounded-md overflow-hidden bg-stone-100" style={{ height: '100%' }}>
                      {JOURNEY_SERIES.map((s) => {
                        const h = d[s.key];
                        return h > 0 ? (
                          <div key={s.key} style={{ height: `${(h / total) * 100}%`, background: s.color }} title={`${s.label}: ${h}h`} />
                        ) : null;
                      })}
                    </div>
                    <span className="text-[10px] text-stone-500 leading-none">{WEEKDAY_SHORT[(d.day - 1) % 7]}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {JOURNEY_SERIES.filter((s) => s.key !== 'other').map((s) => (
                <span key={s.key} className="inline-flex items-center gap-1 text-[10px] text-stone-600">
                  <span className="w-2 h-2 rounded-sm" style={{ background: s.color }} />
                  {s.label}
                </span>
              ))}
            </div>
            {journey.topActions.length > 0 && (
              <p className="text-xs text-stone-700">
                Bạn làm nhiều nhất:{' '}
                {journey.topActions.map((a, i) => (
                  <span key={a.id}>
                    {i > 0 && ', '}
                    <b>{a.title}</b> ×{a.count}
                  </span>
                ))}
              </p>
            )}
            {goals.length > 0 && (
              <div className="rounded-xl border border-stone-200 bg-white p-3 space-y-1.5">
                <div className="text-xs font-bold text-stone-900">
                  🎯 Mục tiêu tuần: {goals.filter((g) => g.state === 'done').length}/{goals.length}
                  {goals.every((g) => g.state === 'done') && <span className="text-emerald-700"> · Hoàn thành tất cả!</span>}
                </div>
                {goals.map((g) => (
                  <div key={g.id} className="flex items-start justify-between gap-2 text-xs">
                    <span className={g.state === 'done' ? 'text-emerald-800 font-medium' : 'text-stone-500'}>
                      {g.state === 'done' ? '✅' : '❌'} {g.emoji} {g.title}
                    </span>
                    <span className="text-stone-400 tabular-nums shrink-0">{g.label}</span>
                  </div>
                ))}
              </div>
            )}
            {journey.insights.map((t) => (
              <p key={t} className="text-[11px] text-stone-600 bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5">
                {t}
              </p>
            ))}
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
