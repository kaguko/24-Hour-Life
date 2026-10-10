import { Server, createEndpoint, createRouter, defineRoom, defineServer } from '@colyseus/core';
import { LifeRoom } from './LifeRoom.js';
import { ROOM_NAME } from './protocol.js';

const health = createEndpoint('/health', { method: 'GET' }, async () => {
  return new Response(JSON.stringify({ status: 'ok', uptimeSec: Math.round(process.uptime()) }), {
    headers: { 'content-type': 'application/json' },
  });
});

export function createServer(): Server {
  return defineServer({
    rooms: { [ROOM_NAME]: defineRoom(LifeRoom) },
    routes: createRouter({ health }),
  });
}
