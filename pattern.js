/* Rams Pattern — 구멍 패턴 기하와 SVG 출력.
   단위는 mm. 브라우저에서는 window.RamsPattern, Node에서는 require로 쓴다. */
(function (root) {
  'use strict';

  const DEG = Math.PI / 180;
  const EPS = 1e-6;
  const MAX_SHAPES = 20000;      // 미리보기가 버티는 도형 수
  const MAX_STEPS = 3e6;         // 배치 시도 상한 (구멍이 영역보다 커서 아무것도 안 들어갈 때도 멈추게)

  // 기본값 = 01 동심원 배수(T 3). 프리셋은 이 위에 덮어쓴다.
  const DEFAULTS = Object.freeze({
    panelW: 140, panelH: 140, bg: '#e8e6df', hole: '#141414',
    boundary: 'circle', diameter: 110, boundW: 100, boundH: 100, boundR: 0, margin: 0, outline: false,
    split: 0, splitDir: 'vertical',
    layout: 'rings',
    pitch: 8, firstRing: 8, count: 'multiple', multiple: 6, arc: 8, phase: 'align', twist: 3, centerHole: true,
    pitchX: 7, pitchY: 7, stagger: 0, origin: 'hole',
    rotation: 0,
    shape: 'circle', d: 3.9, length: 6, thickness: 1.6, fit: false, s: 3, corner: 0.5, hex: 3.4, orient: 'tangent',
    background: true, stroke: false,
  });

  const ENUMS = {
    boundary: ['circle', 'rect'],
    layout: ['rings', 'grid'],
    count: ['multiple', 'equal'],
    phase: ['align', 'stagger', 'twist'],
    origin: ['hole', 'between'],
    shape: ['circle', 'slot', 'square', 'hex'],
    splitDir: ['vertical', 'horizontal'],
    orient: ['tangent', 'radial'],
  };

  // 0·음수 간격은 무한 반복을, 지나치게 큰 판은 멈춤을 만든다.
  const LIMITS = {
    panelW: [1, 1000], panelH: [1, 1000], diameter: [0.1, 1000], boundW: [0.1, 1000], boundH: [0.1, 1000],
    boundR: [0, 500], margin: [0, 100], pitch: [0.5, 200], firstRing: [0, 500], multiple: [1, 60],
    arc: [0.5, 200], pitchX: [0.5, 200], pitchY: [0.5, 200], stagger: [0, 1], d: [0.05, 200],
    length: [0.05, 1000], thickness: [0.05, 200], s: [0.05, 200], corner: [0, 100], hex: [0.05, 200], split: [0, 500],
    rotation: [-360, 360], twist: [-180, 180],
  };

  const H = Math.sqrt(3) / 2;
  // 참고 제품은 자료로 그릴 종류까지 확인한 것만 적는다 (README 출처).
  const PRESETS = [
    { id: 't3', name: '동심원 배수', ref: 'T 3', params: {} },
    { id: 'rings-stagger', name: '동심원 엇갈림', ref: '', params: {
      pitch: 7, firstRing: 7, count: 'equal', arc: 7, phase: 'stagger', d: 3.6 } },
    { id: 'round-grid', name: '원형 격자', ref: '', params: {
      layout: 'grid', pitchX: 6.5, pitchY: 6.5, d: 3.4 } },
    { id: 'perforated', name: '엇갈림 타공', ref: 'T 1000 · LE 1', params: {
      panelW: 110, panelH: 150, boundary: 'rect', boundW: 100, boundH: 140,
      layout: 'grid', pitchX: 4, pitchY: +(4 * H).toFixed(3), stagger: 0.5, d: 2.6 } },
    { id: 'square-perf', name: '정사각 타공', ref: 'SK 1 · ABR 21', params: {
      panelW: 110, panelH: 110, boundary: 'rect', boundW: 100, boundH: 100, boundR: 8,
      layout: 'grid', pitchX: 3.5, pitchY: 3.5, d: 2 } },
    { id: 'hex', name: '육각 구멍', ref: 'Sixtant', params: {
      panelW: 120, panelH: 80, boundary: 'rect', boundW: 110, boundH: 70, boundR: 35,
      layout: 'grid', pitchX: 4, pitchY: +(4 * H).toFixed(3), stagger: 0.5, shape: 'hex', hex: 3.4 } },
    { id: 'slits', name: '가로 슬릿', ref: 'SK 4', params: {
      panelW: 110, panelH: 130, boundary: 'rect', boundW: 90, boundH: 110,
      layout: 'grid', pitchY: 4, shape: 'slot', thickness: 1.8, fit: true } },
    { id: 'split-slits', name: '나뉜 슬릿', ref: 'HLD 4', params: {
      panelW: 110, panelH: 110, boundary: 'rect', boundW: 90, boundH: 90, split: 8,
      layout: 'grid', pitchY: 4.5, shape: 'slot', thickness: 2, fit: true } },
    { id: 'round-slits', name: '원형 슬릿', ref: 'RT 20', params: {
      layout: 'grid', pitchY: 5, shape: 'slot', thickness: 2.2, fit: true } },
    { id: 'radial', name: '방사 슬롯', ref: '', params: {
      diameter: 120, pitch: 10, firstRing: 12, count: 'equal', arc: 4.5, phase: 'stagger',
      centerHole: false, shape: 'slot', length: 7, thickness: 1.8, orient: 'radial' } },
  ];

  function normalize(input) {
    const src = input || {};
    const p = {};
    for (const k of Object.keys(DEFAULTS)) {
      const def = DEFAULTS[k];
      const v = src[k];
      if (typeof def === 'number') {
        const ok = typeof v === 'number' || (typeof v === 'string' && v.trim() !== '');
        let n = ok ? Number(v) : NaN;
        if (!Number.isFinite(n)) n = def;
        const lim = LIMITS[k];
        p[k] = lim ? Math.min(lim[1], Math.max(lim[0], n)) : n;
      } else if (typeof def === 'boolean') {
        p[k] = typeof v === 'boolean' ? v : def;
      } else if (ENUMS[k]) {
        p[k] = ENUMS[k].includes(v) ? v : def;
      } else {
        p[k] = typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : def;
      }
    }
    return p;
  }

  // ── 영역 ──────────────────────────────────────────────
  function boundaryOf(p) {
    const cx = p.panelW / 2, cy = p.panelH / 2;
    // 가운데 띠: 회전한 격자의 세로축(세로 띠) 또는 가로축(가로 띠)을 따라 폭 split만큼 비운다
    const t = p.rotation * DEG;
    const band = p.split > 0
      ? { h: p.split / 2, nx: p.splitDir === 'vertical' ? Math.cos(t) : -Math.sin(t), ny: p.splitDir === 'vertical' ? Math.sin(t) : Math.cos(t) }
      : null;
    if (p.boundary === 'circle') return { kind: 'circle', cx, cy, R: p.diameter / 2, m: p.margin, band };
    const a = p.boundW / 2, b = p.boundH / 2;
    return { kind: 'rect', cx, cy, a, b, r: Math.min(p.boundR, a, b), m: p.margin, band };
  }

  // 원판이 띠의 어느 쪽에 있는가: +1 · −1, 띠에 걸치면 0. 띠가 없으면 언제나 +1.
  function bandSide(B, x, y, r) {
    if (!B.band) return 1;
    const d = (x - B.cx) * B.band.nx + (y - B.cy) * B.band.ny;
    if (d - r >= B.band.h - EPS) return 1;
    if (d + r <= -B.band.h + EPS) return -1;
    return 0;
  }

  // 반지름 r 원판이 (여백을 뺀) 영역 안에 통째로 들어가는가.
  // 둥근 사각을 r만큼 안으로 줄이면 모서리 반지름이 max(R−r, 0)인 둥근 사각이 된다.
  function inside(B, x, y, r) {
    const rr = r + B.m;
    const dx = Math.abs(x - B.cx), dy = Math.abs(y - B.cy);
    if (B.kind === 'circle') return Math.hypot(dx, dy) + rr <= B.R + EPS;
    const a = B.a - rr, b = B.b - rr;
    if (dx > a + EPS || dy > b + EPS) return false;
    const rc = Math.max(B.r - rr, 0);
    const qx = dx - (a - rc), qy = dy - (b - rc);
    return qx <= 0 || qy <= 0 || Math.hypot(qx, qy) <= rc + EPS;
  }

  function extentOf(B) {
    return B.kind === 'circle' ? B.R : Math.hypot(B.a, B.b);
  }

  function boundaryArea(B) {
    return B.kind === 'circle' ? Math.PI * B.R * B.R : 4 * B.a * B.b - (4 - Math.PI) * B.r * B.r;
  }

  // ── 구멍 ──────────────────────────────────────────────
  // 원은 circle, 슬롯과 사각은 둥근 rect(중심·크기·각도), 육각은 꼭짓점 목록 poly로 둔다.
  // 육각 크기는 맞변 거리. 각도 0에서 꼭짓점이 위를 향해 가로줄 엇갈림 격자와 벌집으로 맞물린다.
  function makeElement(p, x, y, deg, len) {
    if (p.shape === 'circle') return { kind: 'circle', x, y, r: p.d / 2 };
    if (p.shape === 'hex') {
      const R = p.hex / Math.sqrt(3);
      const pts = [];
      for (let k = 0; k < 6; k++) {
        const a = (deg + 30 + 60 * k) * DEG;
        pts.push([x + R * Math.cos(a), y + R * Math.sin(a)]);
      }
      return { kind: 'poly', x, y, pts, area: (Math.sqrt(3) / 2) * p.hex * p.hex };
    }
    if (p.shape === 'slot') {
      const t = p.thickness;
      return { kind: 'rect', x, y, w: Math.max(len === undefined ? p.length : len, t), h: t, rx: t / 2, a: deg };
    }
    return { kind: 'rect', x, y, w: p.s, h: p.s, rx: Math.min(p.corner, p.s / 2), a: deg };
  }

  function elementRadius(p) {
    if (p.shape === 'circle') return p.d / 2;
    if (p.shape === 'slot') return Math.max(p.length, p.thickness) / 2;
    if (p.shape === 'hex') return p.hex / Math.sqrt(3);
    return p.s * Math.SQRT1_2;
  }

  // 모든 구멍은 원판 몇 개의 볼록 껍질이다: 원 1, 둥근 rect 4(모서리), 육각 6(꼭짓점, 반지름 0).
  function discsOf(e) {
    if (e.kind === 'circle') return [[e.x, e.y, e.r]];
    if (e.kind === 'poly') return e.pts.map(([x, y]) => [x, y, 0]);
    const ax = e.w / 2 - e.rx, ay = e.h / 2 - e.rx;
    const c = Math.cos(e.a * DEG), s = Math.sin(e.a * DEG);
    return [[ax, ay], [-ax, ay], [ax, -ay], [-ax, -ay]].map(([u, v]) => [e.x + u * c - v * s, e.y + u * s + v * c, e.rx]);
  }

  // 영역은 볼록이고 띠 양쪽도 각각 볼록이다 → 원판이 모두 영역 안이고 모두 띠의 같은 쪽이면 통째로 들어간다.
  function fits(B, e) {
    let side = null;
    for (const [x, y, r] of discsOf(e)) {
      if (!inside(B, x, y, r)) return false;
      const sd = bandSide(B, x, y, r);
      if (sd === 0 || (side !== null && sd !== side)) return false;
      side = sd;
    }
    return true;
  }

  function areaOf(e) {
    if (e.kind === 'circle') return Math.PI * e.r * e.r;
    if (e.kind === 'poly') return e.area;
    return e.w * e.h - (4 - Math.PI) * e.rx * e.rx;
  }

  function collector(p, B) {
    const shapes = [];
    let steps = 0;
    const col = {
      shapes,
      capped: false,
      done() { return col.capped; },
      push(x, y, deg, len) {
        if (++steps > MAX_STEPS) { col.capped = true; return false; }
        const e = makeElement(p, x, y, deg, len);
        if (!fits(B, e)) return false;
        if (shapes.length >= MAX_SHAPES) { col.capped = true; return false; }
        shapes.push(e);
        return true;
      },
    };
    return col;
  }

  // ── 배열: 동심원 ───────────────────────────────────────
  // 고리 k의 반지름 r = 첫 고리 + (k−1)·간격.
  // 배수: 구멍 수 = round(배수 · r / 간격) → 첫 고리가 간격과 같으면 6, 12, 18 … (T 3 그릴의 육각 바큇살).
  // 등간격: 구멍 수 = round(2πr / 호 간격).
  function layRings(p, B, col) {
    const base = (p.rotation - 90) * DEG;   // 0°는 12시 방향
    const turn = p.orient === 'radial' ? 0 : 90;
    if (p.centerHole) col.push(B.cx, B.cy, p.rotation + turn - 90);
    const limit = extentOf(B) + elementRadius(p);
    let rings = 0;
    for (let k = 1; !col.done(); k++) {
      const r = p.firstRing + (k - 1) * p.pitch;
      if (r > limit) break;
      if (r < EPS) continue;
      const n = Math.max(1, Math.round(p.count === 'equal' ? 2 * Math.PI * r / p.arc : p.multiple * r / p.pitch));
      let phi = 0;
      if (p.phase === 'stagger' && k % 2 === 0) phi = Math.PI / n;
      else if (p.phase === 'twist') phi = k * p.twist * DEG;
      let any = false;
      for (let i = 0; i < n && !col.done(); i++) {
        const t = base + phi + 2 * Math.PI * i / n;
        if (col.push(B.cx + r * Math.cos(t), B.cy + r * Math.sin(t), t / DEG + turn)) any = true;
      }
      if (any) rings++;
    }
    return rings;
  }

  // ── 배열: 격자 ─────────────────────────────────────────
  // 격자 좌표 (lx, ly)를 회전해 놓는다. 홀수 줄은 엇갈림 × 가로 간격만큼 민다.
  function layGrid(p, B, col) {
    const th = p.rotation * DEG, c = Math.cos(th), s = Math.sin(th);
    const px = p.pitchX, py = p.pitchY;
    const ox = p.origin === 'between' ? px / 2 : 0;
    const oy = p.origin === 'between' ? py / 2 : 0;
    const E = extentOf(B) + elementRadius(p);
    const wx = (lx, ly) => B.cx + lx * c - ly * s;
    const wy = (lx, ly) => B.cy + lx * s + ly * c;
    const J = Math.ceil(E / py) + 1;
    const fit = p.shape === 'slot' && p.fit;

    for (let j = -J; j <= J && !col.done(); j++) {
      const ly = j * py + oy;
      if (Math.abs(ly) > E) continue;
      if (fit) { fitRow(p, B, col, ly, E, wx, wy); continue; }
      const shift = (((j % 2) + 2) % 2 === 1 ? p.stagger * px : 0) + ox;
      const half = Math.sqrt(Math.max(E * E - ly * ly, 0));
      const i0 = Math.floor((-half - shift) / px), i1 = Math.ceil((half - shift) / px);
      for (let i = i0; i <= i1 && !col.done(); i++) {
        const lx = i * px + shift;
        col.push(wx(lx, ly), wy(lx, ly), p.rotation);
      }
    }
  }

  // 줄 하나를 영역 폭만큼 늘인 슬릿. 볼록 영역과 직선의 교집합은 구간이고, 가운데 띠가 있으면 두 구간이 된다.
  // 촘촘히 훑어 구간들을 찾고 끝을 이분법으로 다듬는다. 띠를 건너뛰지 않게 훑는 간격을 띠 폭의 1/4 이하로 둔다.
  function fitRow(p, B, col, ly, E, wx, wy) {
    const r = p.thickness / 2;
    const ok = (lx) => {
      const x = wx(lx, ly), y = wy(lx, ly);
      return inside(B, x, y, r) && bandSide(B, x, y, r) !== 0;
    };
    const N = Math.min(20000, Math.max(600, B.band ? Math.ceil(8 * E / p.split) : 0));
    const step = 2 * E / N;
    const runs = [];
    let first = null, last = null;
    for (let q = 0; q <= N; q++) {
      const lx = -E + q * step;
      if (ok(lx)) {
        if (first === null) first = lx;
        last = lx;
      } else if (first !== null) {
        runs.push([first, last]);
        first = null;
      }
    }
    if (first !== null) runs.push([first, last]);
    const edge = (inn, out) => {
      for (let it = 0; it < 40; it++) {
        const m = (inn + out) / 2;
        if (ok(m)) inn = m; else out = m;
      }
      return inn;
    };
    // 끝은 판정 허용치(EPS)까지 밀려 있다 → 슬롯 판정에서 다시 계산할 때 넘치지 않게 조금 물린다
    for (const [a, b] of runs) {
      const lo = edge(a, a - step) + 1e-5, hi = edge(b, b + step) - 1e-5;
      if (hi - lo < p.thickness) continue;     // 점에 가까운 짧은 조각은 버린다
      const mid = (lo + hi) / 2;
      col.push(wx(mid, ly), wy(mid, ly), p.rotation, hi - lo + p.thickness);
    }
  }

  function generate(input) {
    const p = normalize(input);
    const B = boundaryOf(p);
    const col = collector(p, B);
    const rings = p.layout === 'rings' ? layRings(p, B, col) : 0;
    if (p.layout === 'grid') layGrid(p, B, col);
    let open = 0;
    for (const e of col.shapes) open += areaOf(e);
    return {
      p, boundary: B, shapes: col.shapes,
      stats: { count: col.shapes.length, rings, open: open / boundaryArea(B), capped: col.capped },
    };
  }

  // ── SVG ───────────────────────────────────────────────
  function fmt(v) {
    const r = Math.round(v * 1000) / 1000;
    return String(Object.is(r, -0) ? 0 : r);
  }

  function shapeSVG(e) {
    if (e.kind === 'circle') return `<circle cx="${fmt(e.x)}" cy="${fmt(e.y)}" r="${fmt(e.r)}"/>`;
    if (e.kind === 'poly') return `<polygon points="${e.pts.map(([x, y]) => `${fmt(x)},${fmt(y)}`).join(' ')}"/>`;
    let w = e.w, h = e.h;
    const period = Math.abs(w - h) < EPS ? 90 : 180;   // 대칭이라 이 주기로 돌리면 같은 모양
    let a = ((e.a % period) + period) % period;
    if (period - a < 1e-6) a = 0;
    let tf = '';
    if (a < 1e-6) {
      // 회전 없음
    } else if (period === 180 && Math.abs(a - 90) < 1e-6) {
      w = e.h; h = e.w;                                 // 90°는 가로세로를 바꿔 transform 없이 쓴다
    } else {
      tf = ` transform="rotate(${fmt(a)} ${fmt(e.x)} ${fmt(e.y)})"`;
    }
    const rx = e.rx > 0 ? ` rx="${fmt(e.rx)}"` : '';
    return `<rect x="${fmt(e.x - w / 2)}" y="${fmt(e.y - h / 2)}" width="${fmt(w)}" height="${fmt(h)}"${rx}${tf}/>`;
  }

  function outlineSVG(B) {
    if (B.kind === 'circle') return `<circle cx="${fmt(B.cx)}" cy="${fmt(B.cy)}" r="${fmt(B.R)}"/>`;
    const rx = B.r > 0 ? ` rx="${fmt(B.r)}"` : '';
    return `<rect x="${fmt(B.cx - B.a)}" y="${fmt(B.cy - B.b)}" width="${fmt(2 * B.a)}" height="${fmt(2 * B.b)}"${rx}/>`;
  }

  // preview: 크기(mm)를 빼서 상자에 맞춰 늘어나게 하고, 바탕은 언제나 그린다.
  function toSVG(res, opt) {
    const o = opt || {};
    const p = res.p, W = fmt(p.panelW), Hh = fmt(p.panelH);
    const size = o.preview ? '' : ` width="${W}mm" height="${Hh}mm"`;
    const out = [`<svg xmlns="http://www.w3.org/2000/svg"${size} viewBox="0 0 ${W} ${Hh}">`];
    if (p.background || o.preview) out.push(`<rect width="${W}" height="${Hh}" fill="${p.bg}"/>`);
    const paint = p.stroke ? `fill="none" stroke="${p.hole}" stroke-width="0.1"` : `fill="${p.hole}"`;
    out.push(`<g ${paint}>`);
    for (const e of res.shapes) out.push(shapeSVG(e));
    out.push('</g>');
    if (p.outline) out.push(`<g fill="none" stroke="${p.hole}" stroke-width="0.1">${outlineSVG(res.boundary)}</g>`);
    out.push('</svg>');
    return out.join('\n');
  }

  const api = { DEFAULTS, ENUMS, LIMITS, PRESETS, MAX_SHAPES, normalize, generate, toSVG, inside, fits, boundaryOf };
  root.RamsPattern = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
