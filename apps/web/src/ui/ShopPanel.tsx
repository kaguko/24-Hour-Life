import React from 'react';
import { SHOP_ITEMS, SHOP_RESERVE, itemBuyBlock } from '@24h/domain';

interface ShopPanelProps {
  money: number;
  ownedIds: string[];
  onBuy: (itemId: string) => void;
}

const formatMoney = (k: number) => (Math.abs(k) >= 1000 ? `${(k / 1000).toFixed(1)}tr` : `${Math.round(k)}k`);

/** Cửa hàng nội thất: mua đồ để đổi cách chỉ số vận hành; đồ mua xong hiện ngay trong phòng 3D. */
export const ShopPanel: React.FC<ShopPanelProps> = ({ money, ownedIds, onBuy }) => (
  <div className="paper p-3 sm:p-4 space-y-3 anim-rise">
    <div className="flex items-baseline justify-between gap-2">
      <h3 className="font-bold text-sm">🛒 Cửa hàng nội thất</h3>
      <span className="text-xs text-stone-500">Ví: {formatMoney(money)} · luôn giữ lại ≥{SHOP_RESERVE}k cho tiền trọ</span>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {SHOP_ITEMS.map((item) => {
        const block = itemBuyBlock(item.id, ownedIds, money);
        const owned = block === 'owned';
        return (
          <div key={item.id} className={`rounded-xl border p-2.5 flex gap-2.5 ${owned ? 'bg-emerald-50 border-emerald-200' : 'bg-stone-50 border-stone-200'}`}>
            <span className="text-2xl leading-none shrink-0" aria-hidden>{item.emoji}</span>
            <div className="min-w-0 flex-1 text-xs leading-snug">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold">{item.name}</span>
                <span className="font-semibold tabular-nums text-stone-600">{formatMoney(item.cost)}</span>
              </div>
              <div className="text-stone-500">{item.blurb}</div>
              <div className="text-emerald-700">+ {item.upside}</div>
              {item.downside && <div className="text-rose-700">− {item.downside}</div>}
              <button
                type="button"
                disabled={block !== null}
                onClick={() => onBuy(item.id)}
                className={`mt-1.5 w-full py-1.5 rounded-lg text-xs font-semibold ${block === null ? 'btn btn-primary' : 'bg-stone-200 text-stone-500 cursor-not-allowed'}`}
              >
                {owned ? '✓ Đã có trong phòng' : block === 'poor' ? 'Chưa đủ tiền' : `Mua ${formatMoney(item.cost)}`}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
