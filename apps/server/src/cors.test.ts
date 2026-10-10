import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { ColyseusTestServer } from '@colyseus/testing';
import { readConfig } from './config.js';
import { installCors } from './cors.js';
import { createServer } from './server.js';
import { bootOn } from './test-utils.js';

const ALLOWED = ['https://24-hour-life.vercel.app', 'http://localhost:3000'];
let colyseus: ColyseusTestServer;

before(async () => {
  installCors(ALLOWED);
  colyseus = await bootOn(createServer(), 2574);
});
after(async () => {
  await colyseus.shutdown();
});

const originOf = async (origin: string) => {
  const res = await colyseus.http.get('/health', { headers: { Origin: origin } });
  return res.headers['access-control-allow-origin'];
};

test('CORS: origin được phép được phản chiếu lại', async () => {
  assert.equal(await originOf('https://24-hour-life.vercel.app'), 'https://24-hour-life.vercel.app');
  assert.equal(await originOf('http://localhost:3000'), 'http://localhost:3000');
});

test('CORS: origin lạ không được phản chiếu (trình duyệt sẽ chặn)', async () => {
  const got = await originOf('https://evil.example');
  assert.notEqual(got, 'https://evil.example');
  assert.notEqual(got, '*');
});

test('readConfig: CORS_ORIGINS tách dấu phẩy, bỏ / cuối, "*" = mở hết, sai định dạng thì báo lỗi', () => {
  assert.deepEqual(readConfig({ CORS_ORIGINS: 'https://a.app/, https://b.app' }).corsOrigins, ['https://a.app', 'https://b.app']);
  assert.deepEqual(readConfig({}).corsOrigins, []);
  assert.deepEqual(readConfig({ CORS_ORIGINS: '*' }).corsOrigins, []);
  assert.throws(() => readConfig({ CORS_ORIGINS: 'a.app' }));
  assert.throws(() => readConfig({ CORS_ORIGINS: 'https://a.app/path' }));
});
