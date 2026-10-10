import type { Server } from '@colyseus/core';
import { ColyseusTestServer } from '@colyseus/testing';

/**
 * Khởi động server trên cổng riêng. `boot(server)` của @colyseus/testing luôn dùng cổng 2568,
 * mà node --test chạy các file song song nên cần cổng khác nhau cho từng file.
 */
export async function bootOn(server: Server, port: number): Promise<ColyseusTestServer> {
  await server.listen(port);
  return new ColyseusTestServer(server);
}
