import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { NavGrid, pathLength, type NavData } from './nav.ts';

const toy = (rows: string[]): NavGrid =>
  new NavGrid({
    version: 1,
    cell: 1,
    origin: [0, 0],
    width: rows[0].length,
    height: rows.length,
    walk: rows,
    doors: {},
    locations: {},
    spawn: { x: 0.5, z: 0.5 },
  });

test('đường thẳng khi không có vật cản', () => {
  const nav = toy(['11111', '11111', '11111']);
  const p = nav.findPath({ x: 0.5, z: 0.5 }, { x: 4.5, z: 2.5 })!;
  assert.deepEqual(p, [{ x: 4.5, z: 2.5 }]);
});

test('đi vòng qua tường và không cắt góc chéo', () => {
  const nav = toy(['11111', '11011', '11011', '11111']);
  const p = nav.findPath({ x: 0.5, z: 0.5 }, { x: 4.5, z: 0.5 })!;
  assert.ok(p.length >= 1);
  let prev = { x: 0.5, z: 0.5 };
  for (const w of p) {
    assert.ok(nav.isWalkableAt(w.x, w.z), 'waypoint đi được');
    assert.ok(nav.lineClear(prev, w), 'đoạn giữa hai waypoint không xuyên tường');
    prev = w;
  }
  assert.deepEqual(p[p.length - 1], { x: 4.5, z: 0.5 });
});

test('đích bị chặn thì dời tới ô đi được gần nhất; không có đường thì null', () => {
  const nav = toy(['10111', '10111', '10111']);
  assert.equal(nav.findPath({ x: 0.5, z: 1.5 }, { x: 3.5, z: 1.5 }), null, 'bị tường ngăn hoàn toàn');
  const open = toy(['11111', '11011', '11111']);
  const p = open.findPath({ x: 0.5, z: 0.5 }, { x: 2.5, z: 1.5 })!;
  assert.ok(open.isWalkableAt(p[p.length - 1].x, p[p.length - 1].z), 'đích đã được dời ra ô đi được');
});

test('thành phố thật: từ nhà tới mọi cửa đều có đường, không đi xuyên toà nhà', () => {
  const file = fileURLToPath(new URL('../../public/models/city_nav.json', import.meta.url));
  const data = JSON.parse(readFileSync(file, 'utf-8')) as NavData;
  const nav = new NavGrid(data);
  assert.equal(data.width, 60);
  assert.ok(Object.keys(data.doors).length >= 9);
  const home = data.doors[data.locations.home];
  for (const [name, door] of Object.entries(data.doors)) {
    const path = nav.findPath({ x: home.x, z: home.z }, { x: door.x, z: door.z });
    assert.ok(path, `có đường tới ${name}`);
    let prev = { x: home.x, z: home.z };
    for (const w of path!) {
      assert.ok(nav.isWalkableAt(w.x, w.z), `${name}: waypoint (${w.x.toFixed(1)}, ${w.z.toFixed(1)}) đi được`);
      assert.ok(nav.lineClear(prev, w), `${name}: đoạn thẳng không xuyên vật cản`);
      prev = w;
    }
    // đường không dài hơn ~2x khoảng cách chim bay + đi vòng khối nhà
    const straight = Math.hypot(door.x - home.x, door.z - home.z);
    assert.ok(pathLength({ x: home.x, z: home.z }, path!) < straight * 2.2 + 12, `${name}: đường đi hợp lý`);
  }
});
