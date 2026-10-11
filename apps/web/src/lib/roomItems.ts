/**
 * Trình bày của đồ nội thất mua được (xem domain/shop.ts): mô hình nào, đặt ở đâu trong phòng 3D.
 * Chỉ là dữ liệu hiển thị. Toạ độ theo mét thế giới của phòng; `scale` nhân thêm lên tỉ lệ đồ Kenney (0.75).
 */

export interface RoomItemPart {
  /** Tên file trong public/models/furniture (không đuôi), hoặc 'generated/<tên>' */
  model: string;
  x: number;
  z: number;
  /** Độ cao đáy món đồ (mặt bàn = 0.285) */
  y?: number;
  rotY?: number;
  scale?: number;
}

export const ROOM_ITEMS: Record<string, RoomItemPart[]> = {
  pillow: [{ model: 'pillowBlue', x: 0.72, z: 1.55, y: 0.36, rotY: Math.PI / 2, scale: 1.2 }],
  desk_lamp: [{ model: 'lampSquareTable', x: -0.88, z: 1.5, y: 0.285, scale: 0.9 }],
  bookcase: [{ model: 'bookcaseOpenLow', x: 2.3, z: 1.9, rotY: -Math.PI / 2 }],
  tv: [
    { model: 'cabinetTelevision', x: 0.25, z: 0.85, rotY: -Math.PI / 2 },
    { model: 'televisionModern', x: 0.25, z: 0.85, y: 0.23, rotY: -Math.PI / 2, scale: 0.9 },
  ],
  small_plant: [{ model: 'plantSmall1', x: -0.28, z: 1.5, y: 0.285 }],
  small_fridge: [{ model: 'kitchenFridgeSmall', x: 2.3, z: -1.55, rotY: -Math.PI / 2 }],
  coffee_table: [{ model: 'tableCoffee', x: -0.58, z: 0.75, rotY: Math.PI / 2 }],
};
