/** Màu các nhóm thời gian trong biểu đồ hành trình (dùng chung UI và ảnh chia sẻ). */
export const JOURNEY_SERIES = [
  { key: 'fast', label: 'Dopamine nhanh', color: '#ec4899' },
  { key: 'slow', label: 'Dopamine chậm', color: '#34d399' },
  { key: 'work', label: 'Công việc', color: '#fbbf24' },
  { key: 'rest', label: 'Nghỉ ngơi', color: '#60a5fa' },
  { key: 'other', label: 'Khác', color: '#94a3b8' },
] as const;

export type JourneySeriesKey = (typeof JOURNEY_SERIES)[number]['key'];

export const WEEKDAY_SHORT = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
