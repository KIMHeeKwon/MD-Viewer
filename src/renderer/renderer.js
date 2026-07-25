import MarkdownIt from 'markdown-it';
import taskLists from 'markdown-it-task-lists';
import footnote from 'markdown-it-footnote';
import texmath from 'markdown-it-texmath';
import katex from 'katex';
import hljs from 'highlight.js';
import mermaid from 'mermaid';
import * as pdfjsLib from 'pdfjs-dist';

import 'katex/dist/katex.min.css';
import 'highlight.js/styles/tokyo-night-dark.css';
import './styles.css';

/* ---------- 마크다운 파이프라인 ---------- */

// Obsidian [[위키링크]] — [[대상]] 또는 [[대상|표시명]]
function wikilinkPlugin(md) {
  md.inline.ruler.before('link', 'wikilink', (state, silent) => {
    const { src, pos } = state;
    if (src.charCodeAt(pos) !== 0x5b || src.charCodeAt(pos + 1) !== 0x5b) return false;
    const end = src.indexOf(']]', pos + 2);
    if (end < 0) return false;
    const content = src.slice(pos + 2, end);
    if (!content || content.includes('\n') || content.includes('[')) return false;
    if (!silent) {
      const [target, label] = content.split('|');
      const token = state.push('wikilink', '', 0);
      token.meta = { target: target.trim(), label: (label || target).trim() };
    }
    state.pos = end + 2;
    return true;
  });
  md.renderer.rules.wikilink = (tokens, i) => {
    const { target, label } = tokens[i].meta;
    return `<a class="wikilink" data-target="${md.utils.escapeHtml(target)}">${md.utils.escapeHtml(label)}</a>`;
  };
}

// Obsidian 콜아웃 — 블록 인용 첫 줄이 [!type] 이면 콜아웃으로 변환
function calloutPlugin(md) {
  const RE = /^\[!(\w+)\]([+-]?)\s*/;
  md.core.ruler.after('block', 'obsidian-callout', (state) => {
    const tokens = state.tokens;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type !== 'blockquote_open') continue;
      // blockquote_open → paragraph_open → inline 순서를 기대
      const inline = tokens[i + 2];
      if (!inline || inline.type !== 'inline') continue;
      const m = inline.content.match(RE);
      if (!m) continue;
      const type = m[1].toLowerCase();
      tokens[i].attrJoin('class', `callout callout-${type}`);
      tokens[i].meta = { calloutType: type };
      inline.content = inline.content.replace(RE, '');
      if (inline.children && inline.children.length) {
        const first = inline.children.find((c) => c.type === 'text');
        if (first) first.content = first.content.replace(RE, '');
      }
    }
  });
  const defaultOpen = md.renderer.rules.blockquote_open
    || ((tokens, i, opts, _env, self) => self.renderToken(tokens, i, opts));
  md.renderer.rules.blockquote_open = (tokens, i, opts, env, self) => {
    const base = defaultOpen(tokens, i, opts, env, self);
    if (tokens[i].meta && tokens[i].meta.calloutType) {
      return `${base}<div class="callout-title">${tokens[i].meta.calloutType.toUpperCase()}</div>`;
    }
    return base;
  };
}

const md = new MarkdownIt({
  html: false,
  linkify: true,
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try { return hljs.highlight(code, { language: lang }).value; } catch { /* fall through */ }
    }
    return '';
  },
})
  .use(taskLists)
  .use(footnote)
  .use(texmath, { engine: katex, delimiters: 'dollars', katexOptions: { throwOnError: false } })
  .use(wikilinkPlugin)
  .use(calloutPlugin);

/* ---------- 상태 ---------- */

const state = {
  root: null,
  rootName: '',
  tree: [],
  tabs: [],            // { path, name, dir, pane, source }
  active: null,        // path
  theme: 'dark',
  fileIndex: new Map(),// 소문자 파일명(확장자 제외) -> path (위키링크 해석용)
};

const $ = (sel) => document.querySelector(sel);
const treeEl = $('#tree');
const tabbarEl = $('#tabbar');
const docsEl = $('#docs');
const emptyEl = $('#empty-state');

mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'strict' });
let mermaidSeq = 0;

pdfjsLib.GlobalWorkerOptions.workerSrc = '../../renderer-dist/pdf.worker.min.mjs';

/* ---------- PDF 렌더링 (PDF.js — 앱 테마 안에 통합) ---------- */

async function renderPdfInto(pane, path, tab) {
  const scroll = document.createElement('div');
  scroll.className = 'pdf-scroll';
  const loading = document.createElement('div');
  loading.className = 'pdf-loading';
  loading.textContent = 'PDF 여는 중…';
  scroll.append(loading);
  pane.append(scroll);

  const res = await window.api.readFileBinary(path);
  if (res.error) {
    loading.textContent = `열 수 없음: ${res.error}`;
    return;
  }
  try {
    const doc = await pdfjsLib.getDocument({ data: res.data }).promise;
    tab.pdfDoc = doc;
    tab.pdfZoom = 1;
    tab.pdfScroll = scroll;
    loading.remove();

    const bar = document.createElement('div');
    bar.className = 'pdf-toolbar';
    bar.innerHTML = `
      <button data-act="prev" title="이전 페이지">◀</button>
      <span class="pdf-pageinfo">1 / ${doc.numPages}</span>
      <button data-act="next" title="다음 페이지">▶</button>
      <span class="pdf-sep"></span>
      <button data-act="out" title="축소">−</button>
      <span class="pdf-zoominfo">100%</span>
      <button data-act="in" title="확대">＋</button>
      <button data-act="fit" title="폭 맞춤">맞춤</button>`;
    scroll.append(bar);
    bar.addEventListener('click', (e) => {
      const act = e.target.dataset.act;
      if (!act) return;
      if (act === 'prev' || act === 'next') movePdfPage(tab, pane, act === 'next' ? 1 : -1);
      else {
        const prevZoom = tab.pdfZoom;
        if (act === 'in') tab.pdfZoom = Math.min(3, tab.pdfZoom * 1.25);
        if (act === 'out') tab.pdfZoom = Math.max(0.4, tab.pdfZoom / 1.25);
        if (act === 'fit') tab.pdfZoom = 1;
        if (tab.pdfZoom !== prevZoom) rerenderPdf(tab, pane);
      }
    });

    pane.addEventListener('scroll', () => updatePdfPageInfo(tab, pane));
    await renderPdfPages(tab);
  } catch (err) {
    loading.textContent = `PDF 렌더링 실패: ${err.message || err}`;
    if (!loading.isConnected) scroll.prepend(loading);
  }
}

async function renderPdfPages(tab) {
  const { pdfDoc: doc, pdfScroll: scroll } = tab;
  // 진행 중인 이전 렌더링 무효화 (연속 줌 클릭 대응)
  tab.pdfRenderToken = (tab.pdfRenderToken || 0) + 1;
  const token = tab.pdfRenderToken;
  for (const c of scroll.querySelectorAll('canvas.pdf-page')) c.remove();
  const targetW = Math.min(docsEl.clientWidth - 96, 900) * tab.pdfZoom;
  const dpr = window.devicePixelRatio || 1;
  for (let p = 1; p <= doc.numPages; p++) {
    if (token !== tab.pdfRenderToken) return;
    const page = await doc.getPage(p);
    const base = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: (targetW / base.width) * dpr });
    const canvas = document.createElement('canvas');
    canvas.className = 'pdf-page';
    canvas.width = vp.width;
    canvas.height = vp.height;
    canvas.style.width = `${vp.width / dpr}px`;
    canvas.style.height = `${vp.height / dpr}px`;
    scroll.append(canvas);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
  }
  const zoomInfo = scroll.querySelector('.pdf-zoominfo');
  if (zoomInfo) zoomInfo.textContent = `${Math.round(tab.pdfZoom * 100)}%`;
}

async function rerenderPdf(tab, pane) {
  const ratio = pane.scrollHeight > 0 ? pane.scrollTop / pane.scrollHeight : 0;
  await renderPdfPages(tab);
  pane.scrollTop = ratio * pane.scrollHeight;
}

function currentPdfPage(tab, pane) {
  const canvases = [...tab.pdfScroll.querySelectorAll('canvas.pdf-page')];
  const anchor = pane.scrollTop + 80;
  for (let i = 0; i < canvases.length; i++) {
    if (canvases[i].offsetTop + canvases[i].offsetHeight > anchor) return i;
  }
  return Math.max(0, canvases.length - 1);
}

function movePdfPage(tab, pane, delta) {
  const canvases = [...tab.pdfScroll.querySelectorAll('canvas.pdf-page')];
  if (!canvases.length) return;
  const next = Math.min(canvases.length - 1, Math.max(0, currentPdfPage(tab, pane) + delta));
  pane.scrollTop = canvases[next].offsetTop - 64;
  updatePdfPageInfo(tab, pane);
}

function updatePdfPageInfo(tab, pane) {
  const info = tab.pdfScroll && tab.pdfScroll.querySelector('.pdf-pageinfo');
  if (!info || !tab.pdfDoc) return;
  info.textContent = `${currentPdfPage(tab, pane) + 1} / ${tab.pdfDoc.numPages}`;
}

/* ---------- 렌더링 ---------- */

async function renderInto(pane, source, dir) {
  const body = pane.querySelector('.doc-body');
  body.innerHTML = md.render(source);

  // 이미지 상대 경로를 문서 위치 기준 절대 file:// 로 재작성
  for (const img of body.querySelectorAll('img')) {
    const src = img.getAttribute('src') || '';
    if (src && !/^(https?|file|data):/.test(src)) {
      img.src = `file://${dir}/${src}`;
    }
  }

  // ```mermaid 코드 블록 → 다이어그램
  const mermaidBlocks = body.querySelectorAll('pre code.language-mermaid');
  if (mermaidBlocks.length) {
    for (const block of mermaidBlocks) {
      const div = document.createElement('div');
      div.className = 'mermaid';
      div.id = `mmd-${mermaidSeq++}`;
      div.textContent = block.textContent;
      block.closest('pre').replaceWith(div);
    }
    try { await mermaid.run({ nodes: body.querySelectorAll('.mermaid') }); } catch { /* 문법 오류 시 원문 노출 */ }
  }

  // 위키링크 클릭 → 트리에서 같은 이름의 문서 열기
  for (const a of body.querySelectorAll('a.wikilink')) {
    a.addEventListener('click', () => {
      const target = (a.dataset.target || '').toLowerCase().replace(/\.md$/, '');
      const found = state.fileIndex.get(target);
      if (found) openFile(found);
    });
  }

  // 헤딩에 id 부여 (아웃라인 점프 + 문서 내 앵커 링크용)
  body.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h, i) => {
    if (!h.id) h.id = `hd-${i}-${slugify(h.textContent)}`;
  });
}

/* ---------- 트리 ---------- */

function buildFileIndex(nodes) {
  for (const n of nodes) {
    if (n.type === 'file') {
      // 위키링크 해석 대상은 마크다운만
      if (/\.(md|markdown|mdown)$/i.test(n.name)) {
        state.fileIndex.set(n.name.replace(/\.(md|markdown|mdown)$/i, '').toLowerCase(), n.path);
      }
    } else {
      buildFileIndex(n.children);
    }
  }
}

function renderTree() {
  treeEl.textContent = '';
  const build = (nodes, depth) => {
    const frag = document.createDocumentFragment();
    for (const n of nodes) {
      const item = document.createElement('div');
      item.className = 'tree-item';
      item.style.paddingLeft = `${12 + depth * 14}px`;
      if (n.type === 'dir') {
        item.classList.add('tree-dir');
        const caret = document.createElement('span');
        caret.className = 'tree-caret';
        caret.textContent = '▾';
        item.append(caret, n.name);
        const childrenEl = document.createElement('div');
        childrenEl.className = 'tree-children';
        childrenEl.append(build(n.children, depth + 1));
        item.addEventListener('click', () => {
          const collapsed = childrenEl.classList.toggle('collapsed');
          caret.textContent = collapsed ? '▸' : '▾';
        });
        frag.append(item, childrenEl);
      } else {
        item.dataset.path = n.path;
        item.textContent = n.name;
        item.addEventListener('click', () => openFile(n.path));
        frag.append(item);
      }
    }
    return frag;
  };
  treeEl.append(build(state.tree, 0));
  markActiveInTree();
}

function markActiveInTree() {
  for (const el of treeEl.querySelectorAll('.tree-item[data-path]')) {
    el.classList.toggle('active', el.dataset.path === state.active);
  }
}

/* ---------- 탭 ---------- */

function renderTabs() {
  tabbarEl.textContent = '';
  for (const tab of state.tabs) {
    const el = document.createElement('div');
    el.className = 'tab';
    el.classList.toggle('active', tab.path === state.active);
    el.setAttribute('role', 'tab');
    el.title = tab.name; // 말줄임된 긴 이름은 툴팁으로 확인
    const label = document.createElement('span');
    label.className = 'tab-label';
    label.textContent = tab.name;
    const close = document.createElement('button');
    close.className = 'tab-close';
    close.textContent = '×';
    close.title = '탭 닫기';
    close.addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(tab.path);
    });
    el.append(label, close);
    el.addEventListener('click', () => activateTab(tab.path));
    tabbarEl.append(el);
  }
  const activeEl = tabbarEl.querySelector('.tab.active');
  if (activeEl) activeEl.scrollIntoView({ inline: 'nearest' });
}

// 세로 휠로 탭바 가로 스크롤
tabbarEl.addEventListener('wheel', (e) => {
  if (e.deltaY) {
    tabbarEl.scrollLeft += e.deltaY;
    e.preventDefault();
  }
}, { passive: false });

function activateTab(path) {
  state.active = path;
  for (const tab of state.tabs) {
    tab.pane.classList.toggle('active', tab.path === path);
  }
  emptyEl.style.display = state.tabs.length ? 'none' : '';
  renderTabs();
  markActiveInTree();
  updateStatus();
  refreshFind();
  refreshOutline();
  saveSession();
}

function closeTab(path) {
  const idx = state.tabs.findIndex((t) => t.path === path);
  if (idx < 0) return;
  if (state.tabs[idx].pdfDoc) state.tabs[idx].pdfDoc.destroy();
  state.tabs[idx].pane.remove();
  state.tabs.splice(idx, 1);
  if (state.active === path) {
    const next = state.tabs[idx] || state.tabs[idx - 1];
    state.active = next ? next.path : null;
  }
  activateTab(state.active);
  syncWatch();
}

async function openFile(path) {
  const existing = state.tabs.find((t) => t.path === path);
  if (existing) return activateTab(path);

  const name = path.split('/').pop();
  const dir = path.slice(0, path.length - name.length - 1);
  const isPdf = /\.pdf$/i.test(name);

  const pane = document.createElement('div');
  pane.className = 'doc-pane';

  if (isPdf) {
    docsEl.append(pane);
    const tab = { path, name, dir, pane, source: '', isPdf: true, pdfDoc: null };
    state.tabs.push(tab);
    activateTab(path);
    syncWatch();
    await renderPdfInto(pane, path, tab);
    return;
  } else {
    const res = await window.api.readFile(path);
    if (res.error) return;
    const body = document.createElement('article');
    body.className = 'doc-body';
    pane.append(body);
    docsEl.append(pane);
    const tab = { path, name, dir, pane, source: res.content, isPdf: false };
    state.tabs.push(tab);
    pane.addEventListener('scroll', () => { if (state.active === path) updateOutlineActive(tab); });
    await renderInto(pane, res.content, dir);
  }
  activateTab(path);
  syncWatch();
}

function syncWatch() {
  const watched = state.tabs.filter((t) => !t.isPdf).map((t) => t.path);
  window.api.setWatched(watched);
  $('#st-watch').textContent = `watching: ${watched.length ? 'on' : 'off'}`;
}

async function exportPdf() {
  const tab = state.tabs.find((t) => t.path === state.active);
  if (!tab || tab.isPdf) return;
  const suggested = tab.name.replace(/\.(md|markdown|mdown)$/i, '.pdf');
  // Mermaid는 렌더 시점에 색이 박제되므로, 다크 화면이면 라이트로 재렌더링 후 내보내고 복원
  const wasDark = state.theme === 'dark';
  const scroll = tab.pane.scrollTop;
  if (wasDark) {
    mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'strict' });
    await renderInto(tab.pane, tab.source, tab.dir);
  }
  await window.api.exportPdf(suggested);
  if (wasDark) {
    mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'strict' });
    await renderInto(tab.pane, tab.source, tab.dir);
    tab.pane.scrollTop = scroll;
  }
}

/* ---------- 상태 바 ---------- */

function updateStatus() {
  const tab = state.tabs.find((t) => t.path === state.active);
  if (!tab) {
    $('#st-path').textContent = state.rootName || '—';
    $('#st-words').textContent = '0 words';
    return;
  }
  const rel = state.root && tab.path.startsWith(state.root)
    ? tab.path.slice(state.root.length + 1)
    : tab.path;
  $('#st-path').textContent = `${state.rootName} · ${rel}`;
  if (tab.isPdf) {
    $('#st-words').textContent = 'PDF';
  } else {
    const words = tab.source.trim().split(/\s+/).filter(Boolean).length;
    $('#st-words').textContent = `${words.toLocaleString()} words`;
  }
}

/* ---------- 테마 ---------- */

async function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = state.theme;
  $('#btn-theme').textContent = state.theme === 'dark' ? '☾' : '☀';
  mermaid.initialize({ startOnLoad: false, theme: state.theme === 'dark' ? 'dark' : 'default', securityLevel: 'strict' });
  // Mermaid 테마 반영을 위해 열린 마크다운 탭 전체 재렌더링 (스크롤 유지)
  for (const tab of state.tabs) {
    if (tab.isPdf) continue;
    const scroll = tab.pane.scrollTop;
    await renderInto(tab.pane, tab.source, tab.dir);
    tab.pane.scrollTop = scroll;
  }
  refreshFind();
  refreshOutline();
}

/* ---------- 개요(아웃라인) 패널 ---------- */

const outlineEl = $('#outline');
const outlineHead = $('#outline-head');

function slugify(s) {
  return s.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w가-힣-]/g, '').slice(0, 60) || 'h';
}

function refreshOutline() {
  const tab = activeTab();
  const body = tab && !tab.isPdf ? tab.pane.querySelector('.doc-body') : null;
  outlineEl.textContent = '';
  const headings = body ? [...body.querySelectorAll('h1, h2, h3, h4, h5, h6')] : [];
  if (!headings.length) {
    sidebarEl.classList.remove('has-outline');
    return;
  }
  sidebarEl.classList.add('has-outline');
  const frag = document.createDocumentFragment();
  for (const h of headings) {
    const level = Number(h.tagName[1]);
    const item = document.createElement('div');
    item.className = 'outline-item';
    item.style.paddingLeft = `${12 + (level - 1) * 12}px`;
    item.textContent = h.textContent;
    item.title = h.textContent;
    item.addEventListener('click', () => h.scrollIntoView({ block: 'start', behavior: 'smooth' }));
    frag.append(item);
  }
  outlineEl.append(frag);
  updateOutlineActive(tab);
}

function updateOutlineActive(tab) {
  if (!tab || tab.isPdf) return;
  const body = tab.pane.querySelector('.doc-body');
  if (!body) return;
  const headings = [...body.querySelectorAll('h1, h2, h3, h4, h5, h6')];
  const items = outlineEl.querySelectorAll('.outline-item');
  if (headings.length !== items.length) return;
  const threshold = tab.pane.scrollTop + 16;
  let activeIdx = 0;
  for (let i = 0; i < headings.length; i++) {
    if (topInPane(headings[i], tab.pane) <= threshold) activeIdx = i;
    else break;
  }
  items.forEach((it, i) => it.classList.toggle('active', i === activeIdx));
  if (items[activeIdx]) items[activeIdx].scrollIntoView({ block: 'nearest' });
}

outlineHead.addEventListener('click', () => {
  sidebarEl.classList.toggle('outline-collapsed');
  outlineHead.querySelector('.outline-caret').textContent =
    sidebarEl.classList.contains('outline-collapsed') ? '▸' : '▾';
});

/* ---------- 문서 내 찾기 (⌘F) ---------- */

const findbar = $('#findbar');
const findInput = $('#find-input');
const findCount = $('#find-count');
const findState = { matches: [], current: -1 };

function activeTab() {
  return state.tabs.find((t) => t.path === state.active) || null;
}

function activeBody() {
  const tab = activeTab();
  return tab && !tab.isPdf ? tab.pane.querySelector('.doc-body') : null;
}

function topInPane(el, pane) {
  return el.getBoundingClientRect().top - pane.getBoundingClientRect().top + pane.scrollTop;
}

// 이전 하이라이트를 걷어내고 텍스트 노드를 원상 복구
function clearHighlights(body) {
  if (!body) return;
  const marks = body.querySelectorAll('mark.find-hl');
  const parents = new Set();
  for (const m of marks) {
    const parent = m.parentNode;
    while (m.firstChild) parent.insertBefore(m.firstChild, m);
    parent.removeChild(m);
    parents.add(parent);
  }
  for (const p of parents) p.normalize(); // 인접 텍스트 노드 병합 (반복 검색 시 매치 유지)
}

function highlightInNode(textNode, lowerQuery) {
  const text = textNode.nodeValue;
  const low = text.toLowerCase();
  const frag = document.createDocumentFragment();
  let from = 0;
  let idx;
  while ((idx = low.indexOf(lowerQuery, from)) !== -1) {
    if (idx > from) frag.appendChild(document.createTextNode(text.slice(from, idx)));
    const mark = document.createElement('mark');
    mark.className = 'find-hl';
    mark.textContent = text.slice(idx, idx + lowerQuery.length);
    frag.appendChild(mark);
    from = idx + lowerQuery.length;
  }
  if (from < text.length) frag.appendChild(document.createTextNode(text.slice(from)));
  textNode.parentNode.replaceChild(frag, textNode);
}

function runFind() {
  const body = activeBody();
  clearHighlights(body);
  findState.matches = [];
  findState.current = -1;

  const tab = activeTab();
  if (tab && tab.isPdf) {
    findInput.disabled = true;
    findInput.placeholder = 'PDF는 검색을 지원하지 않습니다';
    findCount.textContent = '—';
    return;
  }
  findInput.disabled = false;
  findInput.placeholder = '찾기';

  const query = findInput.value;
  if (!body || !query) { updateFindCount(); return; }

  const lower = query.toLowerCase();
  const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      // KaTeX/Mermaid(SVG) 내부는 하이라이트가 레이아웃을 깨므로 제외
      if (node.parentElement.closest('.katex, .mermaid, svg')) return NodeFilter.FILTER_REJECT;
      return node.nodeValue.toLowerCase().includes(lower)
        ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const targets = [];
  let n;
  while ((n = walker.nextNode())) targets.push(n); // DOM 수정 전에 대상 노드를 모두 수집
  for (const t of targets) highlightInNode(t, lower);

  findState.matches = [...body.querySelectorAll('mark.find-hl')];
  if (findState.matches.length) {
    const pane = tab.pane;
    const paneTop = pane.scrollTop;
    let start = findState.matches.findIndex((m) => topInPane(m, pane) >= paneTop);
    if (start < 0) start = 0;
    setCurrentMatch(start);
  } else {
    updateFindCount();
  }
}

function setCurrentMatch(i) {
  const marks = findState.matches;
  if (!marks.length) { findState.current = -1; updateFindCount(); return; }
  if (findState.current >= 0 && marks[findState.current]) {
    marks[findState.current].classList.remove('find-hl-active');
  }
  findState.current = (i + marks.length) % marks.length;
  const cur = marks[findState.current];
  cur.classList.add('find-hl-active');
  cur.scrollIntoView({ block: 'center' });
  updateFindCount();
}

function updateFindCount() {
  const total = findState.matches.length;
  findCount.textContent = total ? `${findState.current + 1}/${total}` : '0/0';
}

function clearAllHighlights() {
  for (const t of state.tabs) {
    if (!t.isPdf) clearHighlights(t.pane.querySelector('.doc-body'));
  }
}

// 활성 문서가 다시 그려지거나 탭이 바뀌면 하이라이트를 다시 맞춘다
function refreshFind() {
  if (findbar.hidden) return;
  clearAllHighlights();
  runFind();
}

function openFind(preset) {
  findbar.hidden = false;
  const tab = activeTab();
  if (!(tab && tab.isPdf)) {
    if (typeof preset === 'string' && preset) {
      findInput.value = preset;
    } else {
      const sel = String(window.getSelection() || '').trim();
      if (sel && sel.length <= 80) findInput.value = sel;
    }
  }
  runFind();
  if (!findInput.disabled) { findInput.focus(); findInput.select(); }
}

function closeFind() {
  clearAllHighlights();
  findState.matches = [];
  findState.current = -1;
  findbar.hidden = true;
}

findInput.addEventListener('input', runFind);
findInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); setCurrentMatch(findState.current + (e.shiftKey ? -1 : 1)); }
  else if (e.key === 'Escape') { e.preventDefault(); closeFind(); }
});
$('#find-next').addEventListener('click', () => setCurrentMatch(findState.current + 1));
$('#find-prev').addEventListener('click', () => setCurrentMatch(findState.current - 1));
$('#find-close').addEventListener('click', closeFind);

/* ---------- 전체 검색 (⌘⇧F) ---------- */

const searchPanel = $('#searchpanel');
const spInput = $('#sp-input');
const spSummary = $('#sp-summary');
const spResults = $('#sp-results');
let searchTimer = null;

// text 안의 매치를 <mark>로 감싼 프래그먼트 (XSS 없이 DOM으로 구성)
function highlightFragment(text, lowerQuery) {
  const frag = document.createDocumentFragment();
  const low = text.toLowerCase();
  let from = 0;
  let idx;
  while ((idx = low.indexOf(lowerQuery, from)) !== -1) {
    if (idx > from) frag.append(text.slice(from, idx));
    const mark = document.createElement('mark');
    mark.textContent = text.slice(idx, idx + lowerQuery.length);
    frag.append(mark);
    from = idx + lowerQuery.length;
  }
  if (from < text.length) frag.append(text.slice(from));
  return frag;
}

function renderSearchResults(results, query, capped) {
  spResults.textContent = '';
  const lower = query.toLowerCase();
  const fileCount = results.length;
  const matchCount = results.reduce((n, r) => n + r.matches.length, 0);
  spSummary.textContent = matchCount
    ? `${matchCount}건 · ${fileCount}개 파일${capped ? ' (상한 도달)' : ''}`
    : '결과 없음';
  if (!matchCount) {
    const empty = document.createElement('div');
    empty.className = 'sp-empty';
    empty.textContent = `"${query}"에 대한 결과가 없습니다.`;
    spResults.append(empty);
    return;
  }
  const frag = document.createDocumentFragment();
  for (const r of results) {
    const head = document.createElement('div');
    head.className = 'sp-file';
    const rel = state.root && r.path.startsWith(state.root) ? r.path.slice(state.root.length + 1) : r.path;
    const dir = rel.slice(0, rel.length - r.name.length).replace(/\/$/, '');
    head.innerHTML = `<span class="sp-name"></span><span class="sp-path"></span><span class="sp-count"></span>`;
    head.querySelector('.sp-name').textContent = r.name;
    head.querySelector('.sp-path').textContent = dir;
    head.querySelector('.sp-count').textContent = `${r.matches.length}`;
    frag.append(head);
    for (const m of r.matches) {
      const line = document.createElement('div');
      line.className = 'sp-line';
      const no = document.createElement('span');
      no.className = 'sp-lineno';
      no.textContent = m.line;
      const txt = document.createElement('span');
      txt.className = 'sp-linetext';
      txt.append(highlightFragment(m.text, lower));
      line.append(no, txt);
      line.addEventListener('click', async () => {
        closeSearch();
        await openFile(r.path);
        openFind(query); // 열린 문서에서 같은 검색어를 하이라이트하고 첫 매치로 이동
      });
      frag.append(line);
    }
  }
  spResults.append(frag);
}

async function runSearch() {
  const q = spInput.value.trim();
  spResults.textContent = '';
  if (!state.root) { spSummary.textContent = '폴더를 먼저 여세요'; return; }
  if (q.length < 2) { spSummary.textContent = '두 글자 이상 입력'; return; }
  spSummary.textContent = '검색 중…';
  const { results, capped } = await window.api.searchProject(state.root, q);
  if (q !== spInput.value.trim()) return; // 입력이 바뀌었으면 이 결과는 버림
  renderSearchResults(results, q, capped);
}

function openSearch() {
  searchPanel.hidden = false;
  const sel = String(window.getSelection() || '').trim();
  if (sel && sel.length <= 80) spInput.value = sel;
  spInput.focus();
  spInput.select();
  if (spInput.value.trim().length >= 2) runSearch();
  else spSummary.textContent = state.root ? '두 글자 이상 입력' : '폴더를 먼저 여세요';
}

function closeSearch() {
  searchPanel.hidden = true;
}

spInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(runSearch, 250);
});
spInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { clearTimeout(searchTimer); runSearch(); }
  else if (e.key === 'Escape') { e.preventDefault(); closeSearch(); }
});
$('#sp-close').addEventListener('click', closeSearch);

/* ---------- 폴더 열기 / 파일 감시 ---------- */

function loadFolder(res) {
  state.root = res.root;
  state.rootName = res.name;
  state.tree = res.tree;
  state.fileIndex.clear();
  buildFileIndex(state.tree);
  $('#root-name').textContent = res.name;
  renderTree();
  updateStatus();
}

async function openFolder() {
  const res = await window.api.openFolder();
  if (!res) return;
  loadFolder(res);
  saveSession();
}

/* ---------- 세션 저장 / 복원 ---------- */

function saveSession() {
  localStorage.setItem('session', JSON.stringify({
    root: state.root,
    tabs: state.tabs.map((t) => t.path),
    active: state.active,
  }));
}

function collectFiles(nodes, set) {
  for (const n of nodes) {
    if (n.type === 'file') set.add(n.path);
    else collectFiles(n.children, set);
  }
}

async function restoreSession() {
  let s;
  try { s = JSON.parse(localStorage.getItem('session') || 'null'); } catch { s = null; }
  if (!s || !s.root) return;
  const res = await window.api.openFolderPath(s.root);
  if (!res || res.error) return; // 폴더가 사라졌으면 조용히 건너뜀
  loadFolder(res);
  const existing = new Set();
  collectFiles(state.tree, existing);
  for (const p of s.tabs || []) {
    if (existing.has(p)) await openFile(p); // 삭제된 파일은 복원하지 않음
  }
  if (s.active && state.tabs.some((t) => t.path === s.active)) activateTab(s.active);
}

window.api.onFileChanged(async (path) => {
  const tab = state.tabs.find((t) => t.path === path);
  if (!tab) return;
  const res = await window.api.readFile(path);
  if (res.error) return;
  tab.source = res.content;
  const scroll = tab.pane.scrollTop;
  await renderInto(tab.pane, tab.source, tab.dir);
  tab.pane.scrollTop = scroll;
  if (tab.path === state.active) { updateStatus(); refreshFind(); refreshOutline(); }
});

/* ---------- 이벤트 결선 ---------- */

/* ---------- 사이드바 리사이저 ---------- */

const sidebarEl = $('#sidebar');
const resizerEl = $('#resizer');
const SIDEBAR_MIN = 160;
const SIDEBAR_MAX = 480;
const SIDEBAR_DEFAULT = 240;

const savedWidth = Number(localStorage.getItem('sidebarWidth'));
if (savedWidth >= SIDEBAR_MIN && savedWidth <= SIDEBAR_MAX) {
  sidebarEl.style.width = `${savedWidth}px`;
}

resizerEl.addEventListener('mousedown', (e) => {
  e.preventDefault();
  resizerEl.classList.add('dragging');
  document.body.classList.add('resizing');
  const onMove = (ev) => {
    const w = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, ev.clientX));
    sidebarEl.style.width = `${w}px`;
  };
  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    resizerEl.classList.remove('dragging');
    document.body.classList.remove('resizing');
    localStorage.setItem('sidebarWidth', String(sidebarEl.offsetWidth));
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
});

resizerEl.addEventListener('dblclick', () => {
  sidebarEl.style.width = `${SIDEBAR_DEFAULT}px`;
  localStorage.setItem('sidebarWidth', String(SIDEBAR_DEFAULT));
});

/* ---------- 이벤트 결선 ---------- */

$('#btn-open').addEventListener('click', openFolder);
$('#btn-theme').addEventListener('click', toggleTheme);
window.api.onMenu('menu:open-folder', openFolder);
window.api.onMenu('menu:toggle-theme', toggleTheme);
window.api.onMenu('menu:export-pdf', exportPdf);
window.api.onMenu('menu:find', openFind);
window.api.onMenu('menu:search-project', openSearch);

// 마지막 세션(폴더 + 열린 탭) 복원
restoreSession();
