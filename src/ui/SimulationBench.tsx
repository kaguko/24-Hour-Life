import React, { useState } from 'react';
import {
  DOMAIN_STRATEGIES,
  runDomainSimulation,
  SimulationResultPrimitive,
} from '../domain';
import { Play, Activity, ShieldCheck, TrendingDown } from 'lucide-react';

export const SimulationBench: React.FC = () => {
  const [runsCount, setRunsCount] = useState<number>(500);
  const [daysCount, setDaysCount] = useState<number>(7);
  const [results, setResults] = useState<SimulationResultPrimitive[] | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('all');

  const handleRunSimulation = () => {
    setIsRunning(true);
    setTimeout(() => {
      if (selectedStrategyId === 'all') {
        const batchResults = DOMAIN_STRATEGIES.map((strat) =>
          runDomainSimulation(strat.id, runsCount, daysCount)
        );
        setResults(batchResults);
      } else {
        setResults([runDomainSimulation(selectedStrategyId, runsCount, daysCount)]);
      }
      setIsRunning(false);
    }, 100);
  };

  React.useEffect(() => {
    handleRunSimulation();
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Introduction Card */}
      <div className="p-5 bg-white rounded-2xl border border-stone-200 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-stone-900">
          <Activity className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg font-bold">
            Phòng Thí Nghiệm & Mô Phỏng Chiến Lược (Clean Architecture)
          </h2>
        </div>
        <p className="text-xs text-stone-600 leading-relaxed max-w-3xl">
          Công cụ kiểm chứng game bằng thuật toán: Chạy mô phỏng thuần logic (Headless Domain Logic)
          với hàng trăm ván chơi tự động để nghiệm thu tính cân bằng xác suất.
        </p>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-stone-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-stone-700">Chiến lược:</span>
            <select
              value={selectedStrategyId}
              onChange={(e) => setSelectedStrategyId(e.target.value)}
              className="text-xs p-2 rounded-lg border border-stone-200 bg-stone-50 font-medium text-stone-800"
            >
              <option value="all">Tất cả 5 chiến lược (So sánh trực diện)</option>
              {DOMAIN_STRATEGIES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-stone-700">Số lần chạy:</span>
            <div className="flex gap-1">
              {[100, 500, 1000].map((count) => (
                <button
                  key={count}
                  onClick={() => setRunsCount(count)}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                    runsCount === count
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-stone-700">Số ngày/ván:</span>
            <div className="flex gap-1">
              {[7, 14].map((d) => (
                <button
                  key={d}
                  onClick={() => setDaysCount(d)}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                    daysCount === d
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {d} ngày
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleRunSimulation}
            disabled={isRunning}
            className="ml-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isRunning ? 'Đang mô phỏng...' : 'Chạy kiểm chứng ngay'}</span>
          </button>
        </div>
      </div>

      {/* Results Table */}
      {results && results.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-stone-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-900">
              Kết Quả Mô Phỏng ({results[0].runs} ván / {results[0].daysPerRun} ngày)
            </h3>
            <span className="text-xs text-stone-500">
              Tiêu chuẩn: Không chiến lược đơn giản nào được thắng áp đảo
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-50 text-stone-600 uppercase font-semibold border-b border-stone-200/80">
                <tr>
                  <th className="p-3">Chiến lược</th>
                  <th className="p-3 text-center">Tỷ lệ sống sót</th>
                  <th className="p-3 text-center">Kiệt quệ (Burnout)</th>
                  <th className="p-3 text-center">Phá sản</th>
                  <th className="p-3 text-center">Ý chí TB</th>
                  <th className="p-3 text-center">Năng lượng TB</th>
                  <th className="p-3 text-center">Tinh thần TB</th>
                  <th className="p-3 text-center">Tiền cuối kỳ</th>
                  <th className="p-3 text-center">Ngày sống TB</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {results.map((res) => {
                  const isSurvivalHigh = res.survivalRate >= 60;
                  const isDopamineTrap = res.strategyId === 'dopamine_chaser';

                  return (
                    <tr
                      key={res.strategyId}
                      className={`hover:bg-stone-50/60 transition-colors ${
                        isDopamineTrap ? 'bg-fuchsia-50/20' : ''
                      }`}
                    >
                      <td className="p-3 font-semibold text-stone-900">
                        <div>{res.strategyName}</div>
                        <div className="text-[11px] text-stone-500 font-normal mt-0.5">
                          {DOMAIN_STRATEGIES.find((s) => s.id === res.strategyId)?.description}
                        </div>
                      </td>
                      <td className="p-3 text-center font-bold">
                        <span
                          className={`inline-block px-2 py-0.5 rounded tabular-nums ${
                            isSurvivalHigh
                              ? 'bg-emerald-100 text-emerald-800'
                              : res.survivalRate === 0
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {res.survivalRate}%
                        </span>
                      </td>
                      <td className="p-3 text-center tabular-nums text-rose-700 font-medium">
                        {res.burnoutRate}%
                      </td>
                      <td className="p-3 text-center tabular-nums text-stone-700 font-medium">
                        {res.bankruptRate}%
                      </td>
                      <td className="p-3 text-center tabular-nums font-semibold text-indigo-700">
                        {res.avgFinalWillpower}%
                      </td>
                      <td className="p-3 text-center tabular-nums font-medium text-amber-700">
                        {res.avgFinalEnergy}%
                      </td>
                      <td className="p-3 text-center tabular-nums font-medium text-sky-700">
                        {res.avgFinalMental}%
                      </td>
                      <td className="p-3 text-center tabular-nums font-medium text-teal-700">
                        {(res.avgFinalMoney / 1000).toFixed(1)}tr
                      </td>
                      <td className="p-3 text-center tabular-nums font-bold text-stone-900">
                        {res.avgSurvivalDays} ngày
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Phân tích Clean Architecture */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Nghiệm thu: Clean Architecture Lite</span>
          </div>
          <ul className="text-xs text-emerald-800 space-y-1.5 list-disc list-inside">
            <li>
              <strong>Độc lập hoàn toàn:</strong> Động cơ mô phỏng chạy hoàn toàn trên `src/domain/`,
              không đụng chạm tới React DOM, state hay localStorage.
            </li>
            <li>
              <strong>Độ trễ bằng 0:</strong> 1000 lần tính toán xác suất hoàn tất trong chưa đầy 100ms.
            </li>
          </ul>
        </div>

        <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
            <TrendingDown className="w-4 h-4 text-stone-600" />
            <span>Quan sát toán học hành vi</span>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            Các con số sống sót trong bảng hoàn toàn khách quan. Khi tham số được tinh chỉnh ở Domain,
            bảng này lập tức phản ánh sự thay đổi mà không cần sửa giao diện.
          </p>
        </div>
      </div>
    </div>
  );
};
