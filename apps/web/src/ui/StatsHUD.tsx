import React from 'react';
import { PlayerStatsPrimitive, StatusResultPrimitive } from '@24h/domain';
import { Zap, Brain, Users, Wallet, ShieldAlert, Sparkles } from 'lucide-react';

interface StatsHUDProps {
  stats: PlayerStatsPrimitive;
  lifeStatus: StatusResultPrimitive;
  sleepDebt: number;
  /** Hôm nay dồn nhiều dopamine nhanh: nguy cơ sụp vào sáng mai */
  crashRisk: boolean;
}

export const StatsHUD: React.FC<StatsHUDProps> = ({ stats, lifeStatus, sleepDebt, crashRisk }) => {
  const statItems = [
    {
      key: 'energy',
      label: 'Năng Lượng',
      value: stats.energy,
      max: 100,
      unit: '%',
      icon: Zap,
      color: 'bg-amber-500',
      textColor: 'text-amber-700',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      warning: stats.energy <= 20 ? 'Sắp kiệt sức!' : undefined,
    },
    {
      key: 'mental',
      label: 'Tinh Thần',
      value: stats.mental,
      max: 100,
      unit: '%',
      icon: Brain,
      color: 'bg-sky-500',
      textColor: 'text-sky-700',
      bgColor: 'bg-sky-50',
      borderColor: 'border-sky-200',
      warning: stats.mental <= 25 ? 'Căng thẳng trầm trọng!' : undefined,
    },
    {
      key: 'willpower',
      label: 'Ý Chí',
      value: stats.willpower,
      max: 100,
      unit: '%',
      icon: ShieldAlert,
      color: stats.willpower < 35 ? 'bg-rose-500 animate-pulse' : 'bg-indigo-500',
      textColor: stats.willpower < 35 ? 'text-rose-700' : 'text-indigo-700',
      bgColor: stats.willpower < 35 ? 'bg-rose-50' : 'bg-indigo-50',
      borderColor: stats.willpower < 35 ? 'border-rose-300 ring-1 ring-rose-200' : 'border-indigo-200',
      highlightBadge: stats.willpower < 35 ? 'Cám dỗ phóng đại!' : undefined,
    },
    {
      key: 'dopamine',
      label: 'Dopamine',
      value: stats.dopamine,
      max: 100,
      unit: '%',
      icon: Sparkles,
      color: crashRisk ? 'bg-fuchsia-500' : 'bg-pink-500',
      textColor: crashRisk ? 'text-fuchsia-700' : 'text-pink-700',
      bgColor: crashRisk ? 'bg-fuchsia-50' : 'bg-pink-50',
      borderColor: 'border-pink-200',
      warning: crashRisk ? 'Nguy cơ sụp đổ ngày mai' : undefined,
    },
    {
      key: 'social',
      label: 'Kết Nối',
      value: stats.social,
      max: 100,
      unit: '%',
      icon: Users,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-700',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      warning: stats.social <= 20 ? 'Cô lập xã hội' : undefined,
    },
    {
      key: 'money',
      label: 'Tài Chính',
      value: stats.money,
      formatValue: `${(stats.money / 1000).toFixed(1)} triệu`,
      unit: '',
      icon: Wallet,
      color: stats.money < 0 ? 'bg-red-600' : 'bg-teal-500',
      textColor: stats.money < 0 ? 'text-red-700 font-bold' : 'text-teal-700',
      bgColor: stats.money < 0 ? 'bg-red-50' : 'bg-teal-50',
      borderColor: stats.money < 0 ? 'border-red-300' : 'border-teal-200',
      warning: stats.money < 0 ? 'Âm tiền sinh hoạt!' : undefined,
    },
  ];

  return (
    <div className="space-y-3">
      {/* Trạng thái tổng quát */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white rounded-xl border border-stone-200">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-stone-700">Hiện trạng:</span>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded ${
              lifeStatus.status === 'thriving'
                ? 'bg-emerald-100 text-emerald-800'
                : lifeStatus.status === 'stable'
                ? 'bg-stone-100 text-stone-800'
                : lifeStatus.status === 'stressed'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-rose-100 text-rose-800'
            }`}
          >
            {lifeStatus.label}
          </span>
          <span className="text-xs text-stone-500 hidden sm:inline">· {lifeStatus.description}</span>
        </div>

        {sleepDebt > 0 && (
          <div className="text-xs text-amber-700 font-medium">
            Nợ ngủ tích lũy: <span className="font-semibold tabular-nums">{sleepDebt.toFixed(1)}h</span>
          </div>
        )}
      </div>

      {/* Grid 6 chỉ số */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {statItems.map((item) => {
          const IconComponent = item.icon;
          const displayVal = item.formatValue ?? `${item.value}${item.unit}`;
          const percent = item.max ? Math.min(100, Math.max(0, (item.value / item.max) * 100)) : 100;

          return (
            <div
              key={item.key}
              className={`p-3 rounded-xl border transition-all ${item.borderColor} ${item.bgColor}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <IconComponent className={`w-4 h-4 ${item.textColor}`} />
                  <span className="text-xs font-medium text-stone-700">{item.label}</span>
                </div>
                {item.highlightBadge && (
                  <span className="text-[10px] font-semibold text-rose-600 bg-rose-100 px-1 py-0.2 rounded">
                    !
                  </span>
                )}
              </div>

              <div className="flex items-baseline justify-between mb-1.5">
                <span className={`text-base font-bold tabular-nums tracking-tight ${item.textColor}`}>
                  {displayVal}
                </span>
                {item.warning && (
                  <span className="text-[10px] text-rose-600 font-medium truncate max-w-[80px]">
                    {item.warning}
                  </span>
                )}
              </div>

              {item.max && (
                <div className="w-full h-1.5 bg-stone-200/80 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${item.color}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
