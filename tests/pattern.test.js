// node --test 04_Rams-pattern/tests
const test = require('node:test');
const assert = require('node:assert/strict');
const RP = require('../pattern.js');

const gen = (over) => RP.generate({ ...RP.DEFAULTS, ...over });
const near = (a, b, tol = 1e-3) => assert.ok(Math.abs(a - b) <= tol, `${a} ≠ ${b}`);
const ringOf = (res, e) => Math.round(Math.hypot(e.x - res.boundary.cx, e.y - res.boundary.cy) * 1000) / 1000;

test('T 3 기본값: 가운데 1 + 6·12·…·36, 고리 6개, 구멍 127개', () => {
  const res = gen({});
  assert.equal(res.stats.rings, 6);
  assert.equal(res.stats.count, 127);
  const byR = {};
  for (const e of res.shapes) byR[ringOf(res, e)] = (byR[ringOf(res, e)] || 0) + 1;
  assert.deepEqual(Object.values(byR).sort((a, b) => a - b), [1, 6, 12, 18, 24, 30, 36]);
  assert.equal(byR[0], 1);
  // 정렬 위상: 모든 고리가 12시에 구멍을 하나씩 갖는다 (바큇살)
  const top = res.shapes.filter((e) => Math.abs(e.x - 70) < 1e-9 && e.y < 70);
  assert.equal(top.length, 6);
});

test('등간격: 구멍 수 = round(2πr / 호 간격)', () => {
  const res = gen({ count: 'equal', arc: 5, pitch: 8, firstRing: 8, centerHole: false });
  const byR = {};
  for (const e of res.shapes) byR[ringOf(res, e)] = (byR[ringOf(res, e)] || 0) + 1;
  for (const [r, n] of Object.entries(byR)) assert.equal(n, Math.round(2 * Math.PI * Number(r) / 5));
});

test('엇갈림 위상: 짝수 고리는 반 칸 돈다', () => {
  const res = gen({ phase: 'stagger' });
  const ring2 = res.shapes.filter((e) => Math.abs(ringOf(res, e) - 16) < 1e-6);
  assert.equal(ring2.length, 12);
  const angles = ring2.map((e) => Math.atan2(e.y - 70, e.x - 70));
  const top = -Math.PI / 2 + Math.PI / 12;
  assert.ok(angles.some((a) => Math.abs(a - top) < 1e-9));
  assert.ok(!angles.some((a) => Math.abs(a + Math.PI / 2) < 1e-9));
});

test('가운데 구멍 끄기', () => {
  assert.equal(gen({ centerHole: false }).stats.count, 126);
});

test('원 안 정사각 격자 = 가우스 원 문제 (반지름 2칸 → 13)', () => {
  const res = gen({ layout: 'grid', pitchX: 10, pitchY: 10, d: 2, diameter: 42 });
  assert.equal(res.stats.count, 13);
  const between = gen({ layout: 'grid', pitchX: 10, pitchY: 10, d: 2, diameter: 42, origin: 'between' });
  assert.equal(between.stats.count, 12);     // (±5, ±5)·(±15, ±5)·(±5, ±15): 4 + 8
});

test('엇갈림 격자는 좌우 대칭', () => {
  const res = gen({ layout: 'grid', pitchX: 4, pitchY: 4 * Math.sqrt(3) / 2, stagger: 0.5, d: 2.6 });
  const key = (x, y) => `${x.toFixed(6)},${y.toFixed(6)}`;
  const set = new Set(res.shapes.map((e) => key(e.x, e.y)));
  for (const e of res.shapes) assert.ok(set.has(key(140 - e.x, e.y)));
});

test('사각 영역: 가장자리에 딱 닿는 구멍은 들어간다', () => {
  const base = { layout: 'grid', pitchX: 10, pitchY: 10, d: 2, boundary: 'rect', boundH: 22 };
  assert.equal(gen({ ...base, boundW: 20 }).stats.count, 3);    // 가로 ±10 은 1mm 넘친다 → 세로 줄만
  assert.equal(gen({ ...base, boundW: 22 }).stats.count, 9);
});

test('둥근 사각 영역: 모서리 구멍만 빠진다', () => {
  const res = gen({ layout: 'grid', pitchX: 10, pitchY: 10, d: 2, boundary: 'rect', boundW: 22, boundH: 22, boundR: 5 });
  assert.equal(res.stats.count, 5);
});

test('여백은 영역을 그만큼 줄인다', () => {
  const base = { layout: 'grid', pitchX: 10, pitchY: 10, d: 2, boundary: 'rect', boundW: 24, boundH: 24 };
  assert.equal(gen({ ...base, margin: 1 }).stats.count, 9);
  assert.equal(gen({ ...base, margin: 1.01 }).stats.count, 1);
});

test('슬롯은 양 끝 반원까지 영역 안이어야 한다', () => {
  const B = RP.boundaryOf(RP.normalize({ ...RP.DEFAULTS, diameter: 10 }));
  const slot = { kind: 'rect', x: B.cx, y: B.cy, w: 10, h: 2, rx: 1, a: 0 };
  assert.ok(RP.fits(B, slot));
  assert.ok(RP.fits(B, { ...slot, a: 37 }));
  assert.ok(!RP.fits({ ...B, R: 4.99 }, slot));
});

test('길이 맞춤 슬릿: 원의 현 길이', () => {
  const res = gen({ layout: 'grid', pitchY: 30, shape: 'slot', thickness: 2, fit: true, diameter: 100 });
  const mid = res.shapes.find((e) => Math.abs(e.y - 70) < 1e-9);
  near(mid.w, 100);
  const row = res.shapes.find((e) => Math.abs(e.y - 100) < 1e-9);
  near(row.w, 2 * Math.sqrt(49 * 49 - 30 * 30) + 2);
  near(row.x, 70);
});

test('길이 맞춤 슬릿: 사각 영역은 모두 같은 길이', () => {
  const res = gen({ layout: 'grid', pitchY: 4, shape: 'slot', thickness: 1.8, fit: true,
    boundary: 'rect', boundW: 90, boundH: 110 });
  assert.ok(res.stats.count > 20);
  for (const e of res.shapes) near(e.w, 90);
});

test('방사 슬롯: 긴 축이 반지름 방향', () => {
  const res = gen({ shape: 'slot', orient: 'radial', length: 6, thickness: 1.6, centerHole: false });
  for (const e of res.shapes) {
    const t = Math.atan2(e.y - 70, e.x - 70) / (Math.PI / 180);
    const diff = ((e.a - t) % 180 + 180) % 180;
    assert.ok(diff < 1e-6 || 180 - diff < 1e-6);
  }
});

test('SVG: 크기 mm, 도형 수, NaN·-0 없음', () => {
  const res = gen({});
  const svg = RP.toSVG(res);
  assert.match(svg, /width="140mm" height="140mm" viewBox="0 0 140 140"/);
  assert.equal((svg.match(/<circle /g) || []).length, 127);
  assert.ok(!/NaN|"-0"|Infinity/.test(svg));
  const prev = RP.toSVG(res, { preview: true });
  assert.ok(!/mm"/.test(prev));
});

test('SVG: 90° 슬롯은 transform 없이 가로세로를 바꾼다', () => {
  const res = gen({ layout: 'grid', rotation: 90, shape: 'slot', length: 6, thickness: 2, pitchX: 8, pitchY: 8 });
  const svg = RP.toSVG(res);
  assert.ok(!/transform/.test(svg));
  assert.match(svg, /width="2" height="6" rx="1"/);
  const tilted = RP.toSVG(gen({ layout: 'grid', rotation: 30, shape: 'slot' }));
  assert.match(tilted, /transform="rotate\(30 /);
});

test('선 모드와 바탕 끄기', () => {
  const svg = RP.toSVG(gen({ stroke: true, background: false }));
  assert.match(svg, /<g fill="none" stroke="#141414" stroke-width="0.1">/);
  assert.ok(!/<rect width=/.test(svg));
});

test('normalize: 잘못된 값은 기본값, 범위 밖은 자른다', () => {
  const p = RP.normalize({ layout: 'foo', pitch: 'abc', pitchX: -3, stagger: 4, bg: 'red', hole: '#ABCDEF', fit: 'yes', d: '2.5' });
  assert.equal(p.layout, 'rings');
  assert.equal(p.pitch, RP.DEFAULTS.pitch);
  assert.equal(p.pitchX, 0.5);
  assert.equal(p.stagger, 1);
  assert.equal(p.bg, RP.DEFAULTS.bg);
  assert.equal(p.hole, '#abcdef');
  assert.equal(p.fit, false);
  assert.equal(p.d, 2.5);
});

test('상한: 촘촘하면 멈추고 표시한다', () => {
  const res = gen({ layout: 'grid', pitchX: 0.5, pitchY: 0.5, d: 0.2, panelW: 400, panelH: 400, diameter: 400 });
  assert.equal(res.stats.count, RP.MAX_SHAPES);
  assert.ok(res.stats.capped);
});

test('아무것도 안 들어가도 금방 끝난다', () => {
  const t0 = Date.now();
  const res = gen({ multiple: 60, pitch: 0.5, firstRing: 0.5, d: 200, diameter: 150, panelW: 1000, panelH: 1000 });
  assert.equal(res.stats.count, 0);
  assert.ok(Date.now() - t0 < 2000, `${Date.now() - t0}ms`);
});

test('프리셋 모두 구멍을 만든다', () => {
  for (const pr of RP.PRESETS) {
    const res = gen(pr.params);
    assert.ok(res.stats.count > 0, pr.id);
    assert.ok(!res.stats.capped, pr.id);
  }
});
