import React from 'react';

export type DockTab = 'me' | 'joint' | 'solo' | 'room' | 'chat';

interface RoomDockProps {
  /** true: nổi bên phải cảnh 3D ở màn hình rộng (lg+), nằm dưới cảnh ở màn hình hẹp; false: nằm dưới (chế độ nhẹ) */
  overlay: boolean;
  open: boolean;
  onToggle: () => void;
  tab: DockTab;
  onTab: (t: DockTab) => void;
  counts: { solo: number; room: number; chatUnread: number };
  /** Nội dung từng tab. Tất cả luôn được dựng sẵn (chỉ ẩn đi), nên trạng thái ô nhập và danh sách không mất khi đổi tab. */
  panels: Record<DockTab, React.ReactNode>;
}

const TABS: Array<{ id: DockTab; icon: string; label: string; test: string }> = [
  { id: 'me', icon: '🎯', label: 'Tôi', test: 'dock-tab-me' },
  { id: 'joint', icon: '🤝', label: 'Cùng nhau', test: 'dock-tab-joint' },
  { id: 'solo', icon: '📋', label: 'Hành vi', test: 'dock-tab-solo' },
  { id: 'room', icon: '👥', label: 'Phòng', test: 'dock-tab-room' },
  { id: 'chat', icon: '💬', label: 'Chat', test: 'dock-tab-chat' },
];

/**
 * Bảng điều khiển của phòng chơi: gom hoạt động, hành vi, người trong phòng và chat vào MỘT khung có tab
 * thay vì xếp dọc dưới cảnh 3D. Màn hình rộng: nổi bên phải cảnh, thu gọn được. Điện thoại: nằm ngay dưới cảnh,
 * nội dung cuộn bên trong khung nên cả trang vừa một màn hình.
 */
export const RoomDock: React.FC<RoomDockProps> = ({ overlay, open, onToggle, tab, onTab, counts, panels }) => {
  const root = overlay
    ? 'flex-[1_1_56%] min-h-0 lg:flex-none lg:absolute lg:right-3 lg:top-[5.3rem] lg:bottom-3 lg:w-[22rem] lg:z-20 lg:!bg-[#12102b]/85 lg:backdrop-blur-md land:!static land:!w-auto land:!flex-[1_1_42%] land:min-w-0 land:!bg-[#12102b]/90'
    : 'max-h-[34rem]';
  return (
    <>
      {overlay && !open && (
        <button
          type="button"
          onClick={onToggle}
          data-testid="dock-open"
          className="max-lg:!hidden land:!hidden absolute right-3 top-[5.3rem] z-20 btn btn-primary px-3 py-2 text-xs items-center gap-1.5"
          aria-label="Mở bảng hoạt động"
        >
          📋 Mở bảng
          {counts.chatUnread > 0 && <span className="chip !bg-rose-500 !text-white">{counts.chatUnread}</span>}
        </button>
      )}
      <aside className={`glass flex flex-col overflow-hidden ${root} ${open ? '' : 'lg:hidden land:!flex'}`} data-testid="room-dock" aria-label="Bảng hoạt động của phòng">
        <div role="tablist" aria-label="Mục trong bảng" className="flex items-center gap-1 p-1.5 border-b border-white/10 overflow-x-auto scrollbar-thin shrink-0">
          {TABS.map((t) => {
            if (t.id === 'me' && !overlay) return null;
            const active = tab === t.id;
            const badge = t.id === 'solo' ? counts.solo : t.id === 'room' ? counts.room : t.id === 'chat' ? counts.chatUnread : 0;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                data-testid={t.test}
                onClick={() => onTab(t.id)}
                className={`btn px-2.5 py-1.5 text-[11px] whitespace-nowrap shrink-0 ${active ? 'btn-primary' : 'btn-soft'} ${t.id === 'me' ? 'lg:!hidden land:!inline-flex' : ''}`}
              >
                <span aria-hidden>{t.icon}</span>
                <span className={active ? '' : 'hidden sm:inline lg:hidden'}>{t.label}</span>
                {badge > 0 && <span className={`chip ${t.id === 'chat' ? '!bg-rose-500 !text-white' : ''}`}>{badge}</span>}
              </button>
            );
          })}
          {overlay && (
            <button type="button" onClick={onToggle} className="max-lg:!hidden land:!hidden ml-auto btn btn-soft px-2 py-1.5 text-[11px] shrink-0" aria-label="Thu gọn bảng" title="Thu gọn bảng">
              ⮞
            </button>
          )}
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin p-2.5 sm:p-3">
          {TABS.map((t) => (
            <div key={t.id} role="tabpanel" hidden={tab !== t.id} className={t.id === 'me' ? 'lg:hidden land:!block' : ''}>
              {panels[t.id]}
            </div>
          ))}
        </div>
      </aside>
    </>
  );
};
