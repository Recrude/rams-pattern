/* Rams Pattern — 조작 화면. 상태는 p 하나, 주소의 #(기본값과 다른 값만)에 남긴다. */
(function () {
  'use strict';

  const RP = window.RamsPattern;
  const D = RP.DEFAULTS;

  // 바탕·구멍 견본: 검정, 판 흰색, 그리고 DR05 팔레트 다섯 색
  const SWATCHES = ['#141414', '#e8e6df', '#af2e1b', '#cc6324', '#3b4b59', '#bfa07a', '#d9c3b0'];

  // 프리셋을 바꿔도 색과 내보내기 설정은 그대로 둔다
  const KEEP = ['bg', 'hole', 'background', 'stroke'];

  const rings = (p) => p.layout === 'rings';
  const grid = (p) => p.layout === 'grid';
  const fitOn = (p) => grid(p) && p.shape === 'slot' && p.fit;

  const MM = 'mm';
  const SECTIONS = [
    { title: '판', fields: [
      { key: 'panelW', label: '가로', min: 10, max: 400, step: 1, unit: MM },
      { key: 'panelH', label: '세로', min: 10, max: 400, step: 1, unit: MM },
      { key: 'bg', label: '바탕', type: 'color' },
    ] },
    { title: '영역', fields: [
      { key: 'boundary', label: '모양', type: 'seg', options: [['circle', '원'], ['rect', '사각']] },
      { key: 'diameter', label: '지름', min: 5, max: 400, step: 0.5, unit: MM, show: (p) => p.boundary === 'circle' },
      { key: 'boundW', label: '가로', min: 5, max: 400, step: 0.5, unit: MM, show: (p) => p.boundary === 'rect' },
      { key: 'boundH', label: '세로', min: 5, max: 400, step: 0.5, unit: MM, show: (p) => p.boundary === 'rect' },
      { key: 'boundR', label: '모서리', min: 0, max: 100, step: 0.5, unit: MM, show: (p) => p.boundary === 'rect' },
      { key: 'margin', label: '여백', min: 0, max: 20, step: 0.1, unit: MM },
      { key: 'split', label: '가운데 띠', min: 0, max: 40, step: 0.5, unit: MM },
      { key: 'splitDir', label: '띠 방향', type: 'seg', options: [['vertical', '세로'], ['horizontal', '가로']], show: (p) => p.split > 0 },
      { key: 'outline', label: '윤곽', type: 'check', text: '영역 선 그리기' },
    ] },
    { title: '배열', fields: [
      { key: 'layout', label: '방식', type: 'seg', options: [['rings', '동심원'], ['grid', '격자']] },
      { key: 'pitch', label: '고리 간격', min: 0.5, max: 40, step: 0.1, unit: MM, show: rings },
      { key: 'firstRing', label: '첫 고리', min: 0, max: 60, step: 0.1, unit: MM, show: rings },
      { key: 'count', label: '고리당', type: 'seg', options: [['multiple', '배수'], ['equal', '등간격']], show: rings },
      { key: 'multiple', label: '배수', min: 1, max: 24, step: 1, unit: '×', show: (p) => rings(p) && p.count === 'multiple' },
      { key: 'arc', label: '호 간격', min: 0.5, max: 40, step: 0.1, unit: MM, show: (p) => rings(p) && p.count === 'equal' },
      { key: 'phase', label: '위상', type: 'seg', options: [['align', '정렬'], ['stagger', '엇갈림'], ['twist', '비틀기']], show: rings },
      { key: 'twist', label: '비틀기', min: -30, max: 30, step: 0.5, unit: '°', show: (p) => rings(p) && p.phase === 'twist' },
      { key: 'centerHole', label: '가운데', type: 'check', text: '가운데 구멍', show: rings },
      { key: 'pitchX', label: '가로 간격', min: 0.5, max: 40, step: 0.1, unit: MM, show: (p) => grid(p) && !fitOn(p) },
      { key: 'pitchY', label: '세로 간격', min: 0.5, max: 40, step: 0.1, unit: MM, show: grid },
      { key: 'stagger', label: '엇갈림', min: 0, max: 1, step: 0.05, unit: '칸', show: (p) => grid(p) && !fitOn(p) },
      { key: 'origin', label: '가운데', type: 'seg', options: [['hole', '구멍'], ['between', '사이']], show: grid },
      { key: 'rotation', label: '회전', min: -180, max: 180, step: 1, unit: '°' },
    ] },
    { title: '구멍', fields: [
      { key: 'shape', label: '모양', type: 'seg', options: [['circle', '원'], ['slot', '슬롯'], ['square', '사각'], ['hex', '육각']] },
      { key: 'd', label: '지름', min: 0.2, max: 40, step: 0.1, unit: MM, show: (p) => p.shape === 'circle' },
      { key: 'length', label: '길이', min: 0.2, max: 100, step: 0.1, unit: MM, show: (p) => p.shape === 'slot' && !fitOn(p) },
      { key: 'thickness', label: '두께', min: 0.2, max: 20, step: 0.1, unit: MM, show: (p) => p.shape === 'slot' },
      { key: 'fit', label: '길이', type: 'check', text: '영역 폭에 맞춰 늘이기', show: (p) => grid(p) && p.shape === 'slot' },
      { key: 's', label: '크기', min: 0.2, max: 40, step: 0.1, unit: MM, show: (p) => p.shape === 'square' },
      { key: 'corner', label: '모서리', min: 0, max: 20, step: 0.1, unit: MM, show: (p) => p.shape === 'square' },
      { key: 'hex', label: '맞변', min: 0.2, max: 40, step: 0.1, unit: MM, show: (p) => p.shape === 'hex' },
      { key: 'orient', label: '방향', type: 'seg', options: [['tangent', '접선'], ['radial', '방사']], show: (p) => rings(p) && p.shape !== 'circle' },
      { key: 'hole', label: '색', type: 'color' },
    ] },
    { title: '내보내기', fields: [
      { key: 'background', label: '바탕', type: 'check', text: '바탕 사각형 포함' },
      { key: 'stroke', label: '선', type: 'check', text: '면 대신 0.1mm 선 (절삭용)' },
    ] },
  ];

  // ── 상태 ─────────────────────────────────────────────
  function applyPreset(pr, from) {
    const next = { ...D, ...pr.params };
    if (from) for (const k of KEEP) next[k] = from[k];
    return RP.normalize(next);
  }

  function matchPreset(p) {
    return RP.PRESETS.find((pr) => {
      const t = applyPreset(pr, p);
      return Object.keys(D).every((k) => t[k] === p[k]);
    }) || null;
  }

  function readHash() {
    if (location.hash.length < 2) return null;
    try {
      const o = JSON.parse(decodeURIComponent(location.hash.slice(1)));
      return o && typeof o === 'object' ? o : null;
    } catch (e) {
      return null;
    }
  }

  let saveTimer = 0;
  function writeHash() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const diff = {};
      for (const k of Object.keys(D)) if (p[k] !== D[k]) diff[k] = p[k];
      const h = Object.keys(diff).length ? '#' + encodeURIComponent(JSON.stringify(diff)) : location.pathname + location.search;
      history.replaceState(null, '', h);
    }, 200);
  }

  const fromHash = readHash();
  let p = fromHash ? RP.normalize({ ...D, ...fromHash }) : applyPreset(RP.PRESETS[0]);

  // ── 화면 만들기 ──────────────────────────────────────
  const el = (tag, attrs, kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === 'text') n.textContent = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    for (const c of kids || []) n.append(c);
    return n;
  };

  const controls = document.getElementById('controls');
  const views = [];   // { field, row, sync() }

  function set(key, value) {
    p = RP.normalize({ ...p, [key]: value });
    sync();
  }

  const presetRow = el('div', { class: 'presets' });
  const presetButtons = RP.PRESETS.map((pr, i) => {
    const b = el('button', { type: 'button', onclick: () => { p = applyPreset(pr, p); sync(); } }, [
      el('span', { text: String(i + 1).padStart(2, '0') }),
      el('span', { text: pr.name }),
      el('span', { text: pr.ref }),
    ]);
    presetRow.append(b);
    return b;
  });
  controls.append(el('section', {}, [el('h2', { text: '버전' }), presetRow]));

  for (const sec of SECTIONS) {
    const s = el('section', {}, [el('h2', { text: sec.title })]);
    for (const f of sec.fields) s.append(makeRow(f));
    controls.append(s);
  }

  function makeRow(f) {
    const row = el('div', { class: 'row' });
    const id = 'f-' + f.key;
    const type = f.type || 'num';
    let sync;

    if (type === 'num') {
      const range = el('input', { type: 'range', min: f.min, max: f.max, step: f.step, 'aria-label': f.label,
        oninput: () => set(f.key, Number(range.value)) });
      const num = el('input', { type: 'number', id, step: f.step, min: RP.LIMITS[f.key] ? RP.LIMITS[f.key][0] : '',
        oninput: () => { if (num.value !== '' && Number.isFinite(Number(num.value))) set(f.key, Number(num.value)); },
        onchange: () => { num.value = fmtNum(p[f.key], f.step); } });
      row.append(el('label', { for: id, text: f.label }), range, num, el('span', { text: f.unit || '' }));
      sync = () => {
        range.value = p[f.key];
        if (document.activeElement !== num) num.value = fmtNum(p[f.key], f.step);
      };
    } else if (type === 'seg') {
      const box = el('div', { class: 'seg', role: 'group', 'aria-label': f.label });
      const bs = f.options.map(([v, t]) => {
        const b = el('button', { type: 'button', text: t, onclick: () => set(f.key, v) });
        box.append(b);
        return [v, b];
      });
      row.append(el('span', { text: f.label }), el('div', { class: 'wide' }, [box]));
      sync = () => bs.forEach(([v, b]) => {
        b.classList.toggle('on', p[f.key] === v);
        b.setAttribute('aria-pressed', p[f.key] === v);
      });
    } else if (type === 'check') {
      const cb = el('input', { type: 'checkbox', id, onchange: () => set(f.key, cb.checked) });
      row.append(el('span', { text: f.label }),
        el('div', { class: 'wide' }, [el('label', { class: 'check', for: id }, [cb, f.text])]));
      sync = () => { cb.checked = p[f.key]; };
    } else if (type === 'color') {
      const input = el('input', { type: 'color', id, oninput: () => set(f.key, input.value) });
      const sw = el('div', { class: 'swatches' });
      const bs = SWATCHES.map((c) => {
        const b = el('button', { type: 'button', title: c, 'aria-label': c, style: `background:${c}`, onclick: () => set(f.key, c) });
        sw.append(b);
        return [c, b];
      });
      row.append(el('label', { for: id, text: f.label }), el('div', { class: 'wide' }, [input, sw]));
      sync = () => {
        input.value = p[f.key];
        bs.forEach(([c, b]) => b.classList.toggle('on', p[f.key] === c));
      };
    }
    views.push({ f, row, sync });
    return row;
  }

  function fmtNum(v, step) {
    const dec = String(step).includes('.') ? String(step).split('.')[1].length : 0;
    return String(Number(v.toFixed(Math.max(dec, 2))));
  }

  // ── 그리기 ──────────────────────────────────────────
  const preview = document.getElementById('preview');
  const stats = document.getElementById('stats');
  let last = null;
  let frame = 0;

  function sync() {
    for (const v of views) {
      v.row.hidden = v.f.show ? !v.f.show(p) : false;
      v.sync();
    }
    const m = matchPreset(p);
    presetButtons.forEach((b, i) => {
      b.classList.toggle('on', RP.PRESETS[i] === m);
      b.setAttribute('aria-pressed', RP.PRESETS[i] === m);
    });
    writeHash();
    if (!frame) frame = requestAnimationFrame(render);
  }

  function render() {
    frame = 0;
    last = RP.generate(p);
    preview.innerHTML = RP.toSVG(last, { preview: true });
    const s = last.stats;
    const parts = [`구멍 ${s.count}`];
    if (p.layout === 'rings') parts.push(`고리 ${s.rings}`);
    parts.push(`개구율 ${(s.open * 100).toFixed(1)}%`, `${fmtNum(p.panelW, 1)} × ${fmtNum(p.panelH, 1)} mm`);
    if (s.capped) parts.push(`상한 ${RP.MAX_SHAPES}개에서 멈춤`);
    stats.replaceChildren(...parts.map((t) => el('span', { text: t })));
  }

  // ── 내보내기 ────────────────────────────────────────
  function exportSVG() {
    const res = last || RP.generate(p);
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + RP.toSVG(res) + '\n';
  }

  function fileName() {
    const m = matchPreset(p);
    return `rams-${m ? m.id : p.layout}-${(last || RP.generate(p)).stats.count}.svg`;
  }

  function flash(btn, text) {
    const old = btn.dataset.text || btn.textContent;
    btn.dataset.text = old;
    btn.textContent = text;
    setTimeout(() => { btn.textContent = old; }, 1200);
  }

  document.getElementById('save').addEventListener('click', (ev) => {
    const url = URL.createObjectURL(new Blob([exportSVG()], { type: 'image/svg+xml' }));
    const a = el('a', { href: url, download: fileName() });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    flash(ev.currentTarget, '저장함');
  });

  document.getElementById('copy').addEventListener('click', async (ev) => {
    const btn = ev.currentTarget;
    const text = exportSVG();
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = el('textarea', {});
      ta.value = text;
      document.body.append(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    flash(btn, '복사함');
  });

  sync();
})();
