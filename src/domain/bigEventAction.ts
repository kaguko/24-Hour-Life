import { ActionPrimitive } from './types';

export const BIG_EVENT_ACTION_ID = 'big_event';
/** Sự kiện lớn tốn đúng chừng này giờ (thi, phỏng vấn, họp chốt, tiệc...) */
export const BIG_EVENT_HOURS = 3;

/** Hành vi giả để thời gian của sự kiện lớn hiện trên thanh thời gian; không có trong danh sách người chơi chọn */
export const BIG_EVENT_ACTION: ActionPrimitive = {
  id: BIG_EVENT_ACTION_ID,
  title: 'Sự kiện lớn của tuần',
  category: 'social',
  dopaminePathway: 'none',
  hours: BIG_EVENT_HOURS,
  description: 'Khoảnh khắc cả tuần chuẩn bị.',
  willpowerCost: 0,
  isTemptation: false,
};
