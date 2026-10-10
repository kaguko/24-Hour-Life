import { Server, createEndpoint, createRouter, defineRoom, defineServer } from '@colyseus/core';
import { createLifeRoom } from './LifeRoom.js';
import type { Limits } from './limits.js';
import { ROOM_NAME, type Timing } from './protocol.js';

const health = createEndpoint('/health', { method: 'GET' }, async () => {
  return new Response(JSON.stringify({ status: 'ok', uptimeSec: Math.round(process.uptime()) }), {
    headers: { 'content-type': 'application/json' },
  });
});

export function createServer(options: { timing?: Partial<Timing>; limits?: Partial<Limits> } = {}): Server {
  return defineServer({
    rooms: { [ROOM_NAME]: defineRoom(createLifeRoom(options.timing, options.limits)) },
    routes: createRouter({ health }),
  });
}
