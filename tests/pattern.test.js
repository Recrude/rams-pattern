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

test('육각: 꼭짓점까지 영역 안 (맞변 10 → 외접 반지름 10/√3)', () => {
  const one = (D) => gen({ layout: 'grid', pitchX: 100, pitchY: 100, shape: 'hex', hex: 10, diameter: D, panelW: 20, panelH: 20 });
  assert.equal(one(2 * 10 / Math.sqrt(3) + 1e-4).stats.count, 1);
  assert.equal(one(2 * 10 / Math.sqrt(3) - 1e-3).stats.count, 0);
  const res = one(12);
  near(res.stats.open * Math.PI * 36, Math.sqrt(3) / 2 * 100);
  const svg = RP.toSVG(res);
  assert.match(svg, /<polygon points="(\S+,\S+ ){5}\S+,\S+"\/>/);
  // 각도 0: 꼭짓점 하나가 정확히 위(−y)를 향한다
  assert.ok(res.shapes[0].pts.some(([x, y]) => Math.abs(x - 10) < 1e-9 && Math.abs(y - (10 - 10 / Math.sqrt(3))) < 1e-9));
});

test('육각 벌집: 이웃끼리 겹치지 않고 벽 두께 = 간격 − 크기', () => {
  const res = gen(RP.PRESETS.find((p) => p.id === 'hex').params);
  assert.ok(res.stats.count > 200);
  const [a] = res.shapes;
  let nearest = Infinity;
  for (const b of res.shapes) if (b !== a) nearest = Math.min(nearest, Math.hypot(a.x - b.x, a.y - b.y));
  near(nearest, 4, 1e-2);   // 맞변 방향 이웃 거리 = 가로 간격
});

test('가운데 세로 띠: 가운데 열이 빠진다', () => {
  const base = { layout: 'grid', pitchX: 10, pitchY: 10, d: 2, boundary: 'rect', boundW: 42, boundH: 22 };
  assert.equal(gen(base).stats.count, 15);
  const res = gen({ ...base, split: 4 });
  assert.equal(res.stats.count, 12);
  assert.ok(res.shapes.every((e) => Math.abs(e.x - 70) >= 3 - 1e-9));
  assert.equal(gen({ ...base, split: 4, splitDir: 'horizontal' }).stats.count, 10);
});

test('나뉜 슬릿: 줄마다 두 조각, 길이 = (폭 − 띠) / 2', () => {
  const res = gen({ layout: 'grid', pitchY: 10, shape: 'slot', thickness: 2, fit: true,
    boundary: 'rect', boundW: 90, boundH: 30, split: 8 });
  assert.equal(res.stats.count, 6);
  for (const e of res.shapes) near(e.w, 41);
  const xs = [...new Set(res.shapes.map((e) => e.x.toFixed(3)))].sort();
  assert.deepEqual(xs, [(70 - 24.5).toFixed(3), (70 + 24.5).toFixed(3)].sort());
});

test('얇은 띠도 건너뛰지 않는다', () => {
  const res = gen({ layout: 'grid', pitchY: 10, shape: 'slot', thickness: 1, fit: true,
    boundary: 'rect', boundW: 200, boundH: 10, panelW: 220, split: 0.3 });
  assert.equal(res.stats.count, 2);
});

test('띠는 동심원에도 걸린다', () => {
  const res = gen({ split: 6 });
  assert.ok(res.stats.count < 127);
  assert.ok(res.shapes.every((e) => Math.abs(e.x - 70) >= 3 + 1.95 - 1e-9));
});
