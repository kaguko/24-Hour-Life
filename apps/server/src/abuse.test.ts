import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { ColyseusTestServer } from '@colyseus/testing';
import { createServer } from './server.js';
import { bootOn } from './test-utils.js';
import { ROOM_NAME } from './protocol.js';

let colyseus: ColyseusTestServer;
before(async () => {
  colyseus = await bootOn(createServer({ limits: { maxRooms: 2, joinsPerMinute: 4 } }), 2575);
});
after(async () => {
  await colyseus.shutdown();
});

test('giới hạn lượt vào phòng theo IP: vượt thì bị từ chối với lời nhắn rõ ràng', { timeout: 20000 }, async () => {
  const room = await colyseus.createRoom(ROOM_NAME);
  const ok: any[] = [];
  for (let i = 0; i < 4; i++) ok.push(await colyseus.sdk.joinById(room.roomId, { name: `P${i}` }));
  await assert.rejects(colyseus.sdk.joinById(room.roomId, { name: 'quá nhanh' }), /quá nhanh|thử lại|429/i);
  await Promise.all(ok.map((c) => c.leave()));
});
