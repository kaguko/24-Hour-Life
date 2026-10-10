import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from './server.js';
import { bootOn } from './test-utils.js';
import { ROOM_NAME } from './protocol.js';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function waitUntil(pred: () => boolean, ms: number, what: string): Promise<void> {
  const start = Date.now();
  while (!pred()) {
    if (Date.now() - start > ms) throw new Error(`hết thời gian chờ ${what}`);
    await sleep(15);
  }
}

test('chơi trọn ván: ready liên tục qua các ngày rồi phase ended', { timeout: 60000 }, async () => {
  const quick = await bootOn(createServer({ timing: { planningMs: 20000, nightMs: 30, morningMs: 20000, reconnectMs: 500 } }), 2572);
  try {
    const room = await quick.createRoom(ROOM_NAME);
    const a = await quick.sdk.joinById(room.roomId, { name: 'An' });
    await waitUntil(() => room.state.players.size === 1, 3000, 'vào phòng');
    const player = room.state.players.get(a.sessionId)!;

    // mỗi lần vào planning / morning của một ngày mới thì ready ngay
    let lastKey = '';
    await waitUntil(
      () => {
        const key = `${room.state.phase}:${room.state.day}`;
        if (key !== lastKey && (room.state.phase === 'planning' || room.state.phase === 'morning') && !player.finished) {
          lastKey = key;
          a.send('ready');
        }
        return room.state.phase === 'ended';
      },
      40000,
      'kết thúc ván'
    );
    assert.ok(player.finished);
    assert.ok(room.state.day <= 7);
  } finally {
    await quick.shutdown();
  }
});
