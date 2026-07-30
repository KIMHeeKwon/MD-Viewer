// 문서 간 위키링크 연결을 캔버스에 힘-지향(force-directed) 그래프로 그린다.
// 외부 라이브러리 없이 구현한다 — 오프라인 동작과 번들 크기 요건 때문 (CLAUDE.md §2).

const SPRING = 0.02;      // 간선의 탄성
const GRAVITY = 0.012;    // 무게중심으로 모으는 힘
const DAMPING = 0.82;     // 속도 감쇠
const MIN_R = 4;          // 노드 최소 반지름
const MAX_LABEL = 22;     // 라벨 표시 최대 글자 수

const radiusOf = (n) => MIN_R + Math.min(9, n.deg * 1.6);

// 힘은 문서 수에 맞춰 조정한다. 고정값을 쓰면 문서가 늘어날수록 스프링이 반발력을
// 압도해 중앙으로 뭉치고 라벨이 겹쳐 읽을 수 없게 된다.
function forceParams(n) {
  return {
    repulsion: 6000 + 420 * n,
    linkDist: Math.min(240, 70 + 9 * Math.sqrt(n)),
  };
}

export function createGraphView({ api, getRoot, getActivePath, openFile }) {
  const panel = document.querySelector('#graphpanel');
  const canvas = document.querySelector('#graph-canvas');
  const info = document.querySelector('#gp-info');
  const btnScope = document.querySelector('#gp-scope');
  const btnRelayout = document.querySelector('#gp-relayout');
  const btnClose = document.querySelector('#gp-close');
  const ctx = canvas.getContext('2d');

  let nodes = [];           // { path, name, dir, x, y, vx, vy, deg, pinned }
  let edges = [];           // { a: node, b: node }
  let byPath = new Map();
  let scope = 'all';        // 'all' | 'local' (현재 문서와 직접 연결된 것만)
  let view = { x: 0, y: 0, k: 1 };
  let hover = null;
  let dragNode = null;
  let panning = false;
  let last = { x: 0, y: 0 };
  let raf = 0;
  let unresolved = 0;
  let ticks = 0;
  let fitAt = [];     // 자동 맞춤을 실행할 틱 시점들 (배치가 흐른 뒤 한 번 더 잡는다)
  let alpha = 1;      // 냉각 계수 — 0으로 수렴하며 배치가 멈춘다
  let settled = false;// 배치 완료. 이후에는 물리 계산을 하지 않고 그림만 그린다

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(r.width * dpr));
    canvas.height = Math.max(1, Math.round(r.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function theme() {
    const s = getComputedStyle(document.documentElement);
    return {
      fg: s.getPropertyValue('--fg').trim(),
      dim: s.getPropertyValue('--dim').trim(),
      accent: s.getPropertyValue('--accent').trim(),
      line: s.getPropertyValue('--soft').trim(),
      bg: s.getPropertyValue('--bg').trim(),
    };
  }

  // 표시 대상 계산 — 'local'이면 현재 문서와 그 이웃만
  function visibleSet() {
    if (scope === 'all') return null;
    const cur = byPath.get(getActivePath());
    if (!cur) return null;
    const keep = new Set([cur]);
    for (const e of edges) {
      if (e.a === cur) keep.add(e.b);
      if (e.b === cur) keep.add(e.a);
    }
    return keep;
  }

  function tick() {
    const vis = visibleSet();
    const act = vis ? nodes.filter((n) => vis.has(n)) : nodes;
    const { repulsion, linkDist } = forceParams(act.length);

    for (let i = 0; i < act.length; i++) {
      const a = act[i];
      for (let j = i + 1; j < act.length; j++) {
        const b = act[j];
        let dx = a.x - b.x, dy = a.y - b.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1) { d2 = 1; dx = (Math.random() - 0.5); dy = (Math.random() - 0.5); }
        const f = repulsion / d2;
        const d = Math.sqrt(d2);
        const fx = (dx / d) * f, fy = (dy / d) * f;
        a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
        // 원이 시각적으로 겹치면 추가로 밀어낸다 (반발력만으로는 붙어 있는 쌍이 남는다)
        const minGap = radiusOf(a) + radiusOf(b) + 8;
        if (d < minGap) {
          const push = (minGap - d) * 0.5;
          a.vx += (dx / d) * push; a.vy += (dy / d) * push;
          b.vx -= (dx / d) * push; b.vy -= (dy / d) * push;
        }
      }
    }
    for (const e of edges) {
      if (vis && (!vis.has(e.a) || !vis.has(e.b))) continue;
      const dx = e.b.x - e.a.x, dy = e.b.y - e.a.y;
      const d = Math.max(1, Math.hypot(dx, dy));
      const f = (d - linkDist) * SPRING;
      const fx = (dx / d) * f, fy = (dy / d) * f;
      // 연결이 많은 노드는 간선 힘을 그만큼 나눠 받는다 — 그러지 않으면 허브가
      // 모든 스프링에 끌려 중앙에 박히고 주변이 그 위로 겹친다.
      const wa = 1 / Math.sqrt(1 + e.a.deg), wb = 1 / Math.sqrt(1 + e.b.deg);
      e.a.vx += fx * wa; e.a.vy += fy * wa;
      e.b.vx -= fx * wb; e.b.vy -= fy * wb;
    }
    // 중력은 클러스터 자신의 무게중심을 향한다 — 캔버스 중심을 쓰면 자동 맞춤(fit)으로
    // 화면 배율·위치가 바뀐 뒤 노드가 계속 흘러 프레이밍이 어긋난다.
    let cx = 0, cy = 0;
    for (const n of act) { cx += n.x; cy += n.y; }
    if (act.length) { cx /= act.length; cy /= act.length; }
    for (const n of act) {
      n.vx += (cx - n.x) * GRAVITY;
      n.vy += (cy - n.y) * GRAVITY;
    }

    // 간선 힘을 차수로 나누면 작용·반작용이 깨져 전체에 운동량이 남고 그래프가 한쪽으로
    // 계속 흐른다. 평균 속도를 빼서 그 표류만 제거한다 (내부 상대 운동은 그대로).
    const movable = act.filter((n) => n !== dragNode && !n.pinned);
    if (movable.length) {
      let mx = 0, my = 0;
      for (const n of movable) { mx += n.vx; my += n.vy; }
      mx /= movable.length; my /= movable.length;
      for (const n of movable) { n.vx -= mx; n.vy -= my; }
    }

    for (const n of act) {
      if (n === dragNode || n.pinned) { n.vx = 0; n.vy = 0; continue; }
      n.vx *= DAMPING; n.vy *= DAMPING;
      // 냉각 계수를 곱해 시간이 지나면 움직임이 멎는다
      n.x += n.vx * alpha; n.y += n.vy * alpha;
    }
  }

  function draw() {
    const t = theme();
    const vis = visibleSet();
    const cur = byPath.get(getActivePath());
    const w = canvas.clientWidth, h = canvas.clientHeight;
    // 배경을 캔버스에 직접 칠한다 — 이미지로 내보내도 투명해지지 않게
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.translate(view.x, view.y);
    ctx.scale(view.k, view.k);

    const nbr = new Set();
    if (hover) {
      nbr.add(hover);
      for (const e of edges) {
        if (e.a === hover) nbr.add(e.b);
        if (e.b === hover) nbr.add(e.a);
      }
    }

    // 간선 — 수가 많으면 흐리게 그린다. 진하게 두면 배경을 뒤덮어 구조가 안 보인다.
    const shown = vis ? edges.filter((e) => vis.has(e.a) && vis.has(e.b)) : edges;
    const edgeAlpha = Math.max(0.14, Math.min(0.5, 80 / Math.max(1, shown.length)));
    ctx.lineWidth = 1 / view.k;
    for (const e of shown) {
      const on = hover && (e.a === hover || e.b === hover);
      ctx.strokeStyle = on ? t.accent : t.line;
      ctx.globalAlpha = hover ? (on ? 0.95 : edgeAlpha * 0.4) : edgeAlpha;
      ctx.beginPath();
      ctx.moveTo(e.a.x, e.a.y);
      ctx.lineTo(e.b.x, e.b.y);
      ctx.stroke();
    }

    // 노드
    ctx.globalAlpha = 1;
    const drawn = vis ? nodes.filter((n) => vis.has(n)) : nodes;
    for (const n of drawn) {
      const dimmed = hover && !nbr.has(n);
      const r = radiusOf(n);
      ctx.globalAlpha = dimmed ? 0.2 : 1;
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = n === cur ? t.accent : (n.deg ? t.fg : t.dim);
      ctx.fill();
      if (n === hover) {
        ctx.strokeStyle = t.accent;
        ctx.lineWidth = 2 / view.k;
        ctx.stroke();
      }
    }

    // 라벨 — 겹치면 생략한다. 연결이 많은 문서부터 자리를 잡고,
    // 현재 문서와 마우스가 올라간 문서는 항상 표시한다.
    const fontPx = 12 / view.k;
    ctx.font = `${fontPx}px -apple-system, "Segoe UI", "Apple SD Gothic Neo", sans-serif`;
    ctx.textAlign = 'center';
    // 노드 원을 먼저 점유 영역으로 넣어 라벨이 다른 노드를 덮지 않게 한다
    const boxes = drawn.map((n) => {
      const r = radiusOf(n);
      return { x0: n.x - r, y0: n.y - r, x1: n.x + r, y1: n.y + r };
    });
    const order = [...drawn].sort((a, b) => {
      const pri = (n) => (n === hover ? 3 : n === cur ? 2 : 0);
      return (pri(b) - pri(a)) || (b.deg - a.deg);
    });
    for (const n of order) {
      const must = n === hover || n === cur;
      const label = n.name.length > MAX_LABEL ? `${n.name.slice(0, MAX_LABEL - 1)}…` : n.name;
      const w = ctx.measureText(label).width;
      const r = radiusOf(n);
      const cx0 = n.x - w / 2, cy0 = n.y - r - 4 / view.k - fontPx;
      const box = { x0: cx0, y0: cy0, x1: cx0 + w, y1: cy0 + fontPx * 1.2 };
      const hit = boxes.some((b) => !(box.x1 < b.x0 || box.x0 > b.x1 || box.y1 < b.y0 || box.y0 > b.y1));
      if (hit && !must) continue;
      boxes.push(box);
      ctx.globalAlpha = (hover && !nbr.has(n)) ? 0.25 : 1;
      ctx.fillStyle = n === cur ? t.accent : t.fg;
      ctx.fillText(label, n.x, n.y - r - 4 / view.k);
    }
    ctx.restore();
  }

  // 배치가 안정된 뒤 내용이 화면을 알맞게 채우도록 확대/이동을 맞춘다
  function fitToView() {
    const vis = visibleSet();
    const act = (vis ? nodes.filter((n) => vis.has(n)) : nodes).filter(Boolean);
    if (!act.length) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of act) {
      minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y);
    }
    const pad = 96;   // 라벨이 노드 위에 그려지므로 여유를 둔다
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const bw = Math.max(1, maxX - minX), bh = Math.max(1, maxY - minY);
    const k = Math.max(0.3, Math.min(1.5, Math.min((w - pad * 2) / bw, (h - pad * 2) / bh)));
    view.k = k;
    view.x = w / 2 - ((minX + maxX) / 2) * k;
    view.y = h / 2 - ((minY + maxY) / 2) * k;
  }

  function loop() {
    if (!settled) {
      tick();
      ticks++;
      alpha *= 0.977;                 // 약 300틱에 걸쳐 0으로 수렴
      if (fitAt.length && ticks >= fitAt[0]) { fitAt.shift(); fitToView(); }
      if (alpha < 0.002 && !fitAt.length) { settled = true; alpha = 0; }
    }
    draw();
    raf = requestAnimationFrame(loop);
  }

  // 드래그·재배치처럼 배치를 다시 흔들어야 할 때 물리 계산을 되살린다
  function reheat(strength = 1) {
    alpha = strength;
    settled = false;
  }

  function toWorld(ev) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - r.left - view.x) / view.k,
      y: (ev.clientY - r.top - view.y) / view.k,
    };
  }

  function hitTest(p) {
    const vis = visibleSet();
    let best = null, bestD = 14 / view.k;
    for (const n of nodes) {
      if (vis && !vis.has(n)) continue;
      const d = Math.hypot(n.x - p.x, n.y - p.y);
      if (d < bestD) { bestD = d; best = n; }
    }
    return best;
  }

  function updateInfo() {
    const vis = visibleSet();
    const shown = vis ? vis.size : nodes.length;
    // 표시 범위에 맞춰 간선·고립 수를 센다
    const shownEdges = vis ? edges.filter((e) => vis.has(e.a) && vis.has(e.b)).length : edges.length;
    const iso = vis ? 0 : nodes.filter((n) => !n.deg).length;
    info.textContent = `문서 ${shown}${vis ? `/${nodes.length}` : ''} · 연결 ${shownEdges}`
      + (iso ? ` · 고립 ${iso}` : '')
      + (unresolved ? ` · 미해결 링크 ${unresolved}` : '');
  }

  function relayout() {
    const w = canvas.clientWidth || 800, h = canvas.clientHeight || 600;
    const R = Math.min(w, h) * 0.35;
    nodes.forEach((n, i) => {
      const a = (i / Math.max(1, nodes.length)) * Math.PI * 2;
      n.x = w / 2 + Math.cos(a) * R * (0.6 + Math.random() * 0.6);
      n.y = h / 2 + Math.sin(a) * R * (0.6 + Math.random() * 0.6);
      n.vx = 0; n.vy = 0; n.pinned = false;
    });
    view = { x: 0, y: 0, k: 1 };
    ticks = 0;
    fitAt = [140, 340];
    reheat(1);
  }

  async function open() {
    const root = getRoot();
    panel.hidden = false;
    resize();
    if (!root) {
      info.textContent = '폴더를 먼저 여세요';
      draw();
      return;
    }
    info.textContent = '연결 관계를 읽는 중…';
    const g = await api.buildGraph(root);
    unresolved = g.unresolved || 0;
    byPath = new Map();
    nodes = g.nodes.map((n) => ({ ...n, x: 0, y: 0, vx: 0, vy: 0, deg: 0, pinned: false }));
    for (const n of nodes) byPath.set(n.path, n);
    edges = [];
    for (const e of g.edges) {
      const a = byPath.get(e.from), b = byPath.get(e.to);
      if (!a || !b) continue;
      a.deg++; b.deg++;
      edges.push({ a, b });
    }
    relayout();
    updateInfo();
    if (!raf) loop();
  }

  function close() {
    panel.hidden = true;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    hover = null; dragNode = null; panning = false;
  }

  /* ---------- 이벤트 ---------- */

  canvas.addEventListener('mousedown', (ev) => {
    const p = toWorld(ev);
    const n = hitTest(p);
    if (n) { dragNode = n; n.pinned = true; reheat(0.35); }
    else { panning = true; }
    last = { x: ev.clientX, y: ev.clientY };
  });
  canvas.addEventListener('mousemove', (ev) => {
    if (dragNode) {
      const p = toWorld(ev);
      dragNode.x = p.x; dragNode.y = p.y;
    } else if (panning) {
      view.x += ev.clientX - last.x;
      view.y += ev.clientY - last.y;
      last = { x: ev.clientX, y: ev.clientY };
    } else {
      const h = hitTest(toWorld(ev));
      if (h !== hover) { hover = h; canvas.style.cursor = h ? 'pointer' : 'grab'; }
    }
  });
  window.addEventListener('mouseup', () => { dragNode = null; panning = false; });
  canvas.addEventListener('dblclick', (ev) => {
    const n = hitTest(toWorld(ev));
    if (n) { close(); openFile(n.path); }
  });
  canvas.addEventListener('click', (ev) => {
    // 단일 클릭으로도 열되, 드래그 직후에는 열지 않는다
    if (dragNode) return;
    const n = hitTest(toWorld(ev));
    if (n && !panning) { close(); openFile(n.path); }
  });
  canvas.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const r = canvas.getBoundingClientRect();
    const mx = ev.clientX - r.left, my = ev.clientY - r.top;
    const factor = ev.deltaY < 0 ? 1.12 : 1 / 1.12;
    const k = Math.max(0.2, Math.min(4, view.k * factor));
    // 커서 위치를 기준으로 확대/축소
    view.x = mx - (mx - view.x) * (k / view.k);
    view.y = my - (my - view.y) * (k / view.k);
    view.k = k;
  }, { passive: false });

  btnScope.addEventListener('click', () => {
    scope = scope === 'all' ? 'local' : 'all';
    ticks = 0; fitAt = [90, 260]; reheat(1); // 범위가 바뀌면 다시 안정화 후 맞춤
    btnScope.textContent = scope === 'all' ? '전체' : '현재 문서 주변';
    btnScope.classList.toggle('on', scope === 'local');
    updateInfo();
  });
  btnRelayout.addEventListener('click', () => { relayout(); updateInfo(); });
  btnClose.addEventListener('click', close);
  window.addEventListener('resize', () => { if (!panel.hidden) resize(); });
  window.addEventListener('keydown', (ev) => {
    if (!panel.hidden && ev.key === 'Escape') { ev.preventDefault(); close(); }
  });

  return { open, close, isOpen: () => !panel.hidden };
}
