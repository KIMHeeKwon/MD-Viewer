import MarkdownIt from 'markdown-it';
import taskLists from 'markdown-it-task-lists';
import footnote from 'markdown-it-footnote';
import texmath from 'markdown-it-texmath';
import katex from 'katex';
import hljs from 'highlight.js';
import mermaid from 'mermaid';
import * as pdfjsLib from 'pdfjs-dist';
import { createGraphView } from './graph.js';

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

// 그래프 패널을 닫는 훅 — graphView가 만들어진 뒤 실제 구현으로 교체된다
// (activateTab이 graphView보다 먼저 호출될 수 있어 직접 참조하면 초기화 전 접근이 된다)
let closeGraphIfOpen = () => {};

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
  for (const el of scroll.querySelectorAll('.pdf-page-wrap')) el.remove();
  const targetW = Math.min(docsEl.clientWidth - 96, 900) * tab.pdfZoom;
  const dpr = window.devicePixelRatio || 1;
  for (let p = 1; p <= doc.numPages; p++) {
    if (token !== tab.pdfRenderToken) return;
    const page = await doc.getPage(p);
    const base = page.getViewport({ scale: 1 });
    const cssScale = targetW / base.width;
    const vp = page.getViewport({ scale: cssScale * dpr });

    const wrap = document.createElement('div');
    wrap.className = 'pdf-page-wrap';
    wrap.style.width = `${vp.width / dpr}px`;
    wrap.style.height = `${vp.height / dpr}px`;

    const canvas = document.createElement('canvas');
    canvas.className = 'pdf-page';
    canvas.width = vp.width;
    canvas.height = vp.height;
    canvas.style.width = `${vp.width / dpr}px`;
    canvas.style.height = `${vp.height / dpr}px`;
    wrap.append(canvas);
    scroll.append(wrap);

    await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    if (token !== tab.pdfRenderToken) return;

    // 텍스트 레이어 — 캔버스 위에 투명한 실제 텍스트를 얹어 선택·검색(⌘F)을 가능하게 한다
    try {
      const textDiv = document.createElement('div');
      textDiv.className = 'textLayer';
      textDiv.style.setProperty('--total-scale-factor', String(cssScale));
      wrap.append(textDiv);
      const layer = new pdfjsLib.TextLayer({
        textContentSource: await page.getTextContent(),
        container: textDiv,
        viewport: page.getViewport({ scale: cssScale }),
      });
      await layer.render();
    } catch { /* 텍스트가 없는 스캔 PDF 등은 그림만 표시 */ }
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
  const pages = [...tab.pdfScroll.querySelectorAll('.pdf-page-wrap')];
  const anchor = pane.scrollTop + 80;
  for (let i = 0; i < pages.length; i++) {
    if (pages[i].offsetTop + pages[i].offsetHeight > anchor) return i;
  }
  return Math.max(0, pages.length - 1);
}

function movePdfPage(tab, pane, delta) {
  const pages = [...tab.pdfScroll.querySelectorAll('.pdf-page-wrap')];
  if (!pages.length) return;
  const next = Math.min(pages.length - 1, Math.max(0, currentPdfPage(tab, pane) + delta));
  pane.scrollTop = pages[next].offsetTop - 64;
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

  // 헤딩에 id 부여 (아웃라인 점프 + 문서 내 앵커 링크용).
  // 문서 내 목차(`](#헤딩)`)가 동작하도록 GitHub식 슬러그를 그대로 id로 쓴다.
  // 같은 제목이 여러 번 나오면 뒤에 -1, -2를 붙여 구분한다.
  const used = new Map();
  body.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
    if (h.id) return;
    const base = slugify(h.textContent);
    const n = used.get(base) || 0;
    used.set(base, n + 1);
    h.id = n ? `${base}-${n}` : base;
  });

  // 앵커 클릭을 가로채 해당 헤딩으로 스크롤한다 (탭 패널이 스크롤 컨테이너라 기본 동작이 불안정)
  for (const a of body.querySelectorAll('a[href^="#"]')) {
    a.addEventListener('click', (e) => {
      const id = decodeURIComponent(a.getAttribute('href').slice(1));
      const target = id && body.querySelector(`[id="${CSS.escape(id)}"]`);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
  }
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
  // 문서를 열면 그래프 패널은 비켜준다 (트리·탭·백링크 등 어느 경로로 열어도)
  closeGraphIfOpen();
  renderTabs();
  markActiveInTree();
  updateStatus();
  refreshFind();
  refreshOutline();
  refreshBacklinks();
  saveSession();
}

function closeTab(path) {
  const idx = state.tabs.findIndex((t) => t.path === path);
  if (idx < 0) return;
  // PDF.js 6에는 PDFDocumentProxy.destroy()가 없다 — loadingTask로 워커까지 해제한다.
  // 해제에 실패하더라도 탭은 반드시 닫혀야 하므로 예외를 삼킨다.
  const closing = state.tabs[idx];
  if (closing.pdfDoc) {
    try { closing.pdfDoc.loadingTask?.destroy(); } catch { /* 해제 실패가 탭 닫기를 막지 않게 */ }
    closing.pdfDoc = null;
  }
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

async function exportHtml() {
  const tab = state.tabs.find((t) => t.path === state.active);
  if (!tab || tab.isPdf) return;
  const base = tab.name.replace(/\.(md|markdown|mdown)$/i, '');

  // 내보낸 문서는 라이트 테마로 보이므로 Mermaid도 라이트로 다시 그린 뒤 복원한다
  const wasDark = state.theme === 'dark';
  const scroll = tab.pane.scrollTop;
  if (wasDark) {
    mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'strict' });
    await renderInto(tab.pane, tab.source, tab.dir);
  }

  const body = tab.pane.querySelector('.doc-body');
  const clone = body.cloneNode(true);
  for (const m of clone.querySelectorAll('mark.find-hl')) { // 검색 하이라이트는 제외
    m.replaceWith(...m.childNodes);
  }
  await window.api.exportHtml({
    suggestedName: `${base}.html`,
    title: base,
    bodyHtml: clone.innerHTML,
  });

  if (wasDark) {
    mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'strict' });
    await renderInto(tab.pane, tab.source, tab.dir);
    tab.pane.scrollTop = scroll;
    refreshFind();
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
  refreshBacklinks();
}

/* ---------- 개요(아웃라인) 패널 ---------- */

const outlineEl = $('#outline');
const outlineHead = $('#outline-head');
const outlineResizer = $('#outline-resizer');
const OUTLINE_MIN = 60;
let outlineHeight = Number(localStorage.getItem('outlineHeight')) || 0;

function applyOutlineHeight(h) {
  outlineHeight = h;
  outlineEl.style.flex = `0 0 ${h}px`;
}

function slugify(s) {
  return s.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\w가-힣-]/g, '').slice(0, 60) || 'h';
}

function refreshOutline() {
  const tab = activeTab();
  const body = tab && !tab.isPdf ? tab.pane.querySelector('.doc-body') : null;
  outlineEl.textContent = '';
  const headings = body ? [...body.querySelectorAll('h1, h2, h3, h4, h5, h6')] : [];
  // 마크다운 문서가 열려 있으면 헤딩이 없어도 패널을 띄운다 (백링크 탭 접근용)
  if (!body) {
    sidebarEl.classList.remove('has-outline');
    return;
  }
  sidebarEl.classList.add('has-outline');
  if (outlineHeight >= OUTLINE_MIN) applyOutlineHeight(outlineHeight); // 저장된 분할 높이 유지
  if (!headings.length) {
    const note = document.createElement('div');
    note.className = 'bl-empty';
    note.textContent = '헤딩이 없는 문서입니다.';
    outlineEl.append(note);
    return;
  }
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

/* ---------- 백링크 패널 ---------- */

const backlinksEl = $('#backlinks');
const blBadge = $('#bl-badge');
const tabOutline = $('#panel-tab-outline');
const tabBacklinks = $('#panel-tab-backlinks');
let panelView = 'outline';

function setPanelView(view) {
  panelView = view;
  const isOutline = view === 'outline';
  tabOutline.classList.toggle('active', isOutline);
  tabBacklinks.classList.toggle('active', !isOutline);
  outlineEl.hidden = !isOutline;
  backlinksEl.hidden = isOutline;
  if (!isOutline) refreshBacklinks();
}

// 탭 클릭은 패널 접기(헤더 클릭)와 겹치지 않게 전파를 막는다
for (const [el, view] of [[tabOutline, 'outline'], [tabBacklinks, 'backlinks']]) {
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    sidebarEl.classList.remove('outline-collapsed');
    outlineHead.querySelector('.outline-caret').textContent = '▾';
    setPanelView(view);
  });
}

async function refreshBacklinks() {
  const tab = activeTab();
  blBadge.textContent = '';
  if (panelView !== 'backlinks') return;
  backlinksEl.textContent = '';
  if (!tab || tab.isPdf || !state.root) {
    const note = document.createElement('div');
    note.className = 'bl-empty';
    note.textContent = tab && tab.isPdf ? 'PDF는 백링크를 지원하지 않습니다.' : '마크다운 문서를 여세요.';
    backlinksEl.append(note);
    return;
  }
  const loading = document.createElement('div');
  loading.className = 'bl-empty';
  loading.textContent = '찾는 중…';
  backlinksEl.append(loading);

  const targetPath = tab.path;
  const { results } = await window.api.getBacklinks(state.root, targetPath);
  if (state.active !== targetPath || panelView !== 'backlinks') return; // 그 사이 탭이 바뀌면 폐기

  backlinksEl.textContent = '';
  const total = results.reduce((n, r) => n + r.matches.length, 0);
  blBadge.textContent = total ? ` ${total}` : '';
  if (!total) {
    const note = document.createElement('div');
    note.className = 'bl-empty';
    note.textContent = `이 문서를 [[${tab.name.replace(/\.(md|markdown|mdown)$/i, '')}]]로 참조하는 문서가 없습니다.`;
    backlinksEl.append(note);
    return;
  }
  const frag = document.createDocumentFragment();
  for (const r of results) {
    const head = document.createElement('div');
    head.className = 'bl-file';
    head.textContent = r.name;
    head.title = r.path;
    head.addEventListener('click', () => openFile(r.path));
    frag.append(head);
    for (const m of r.matches) {
      const line = document.createElement('div');
      line.className = 'bl-line';
      line.textContent = m.text;
      line.title = `${r.name}:${m.line}`;
      line.addEventListener('click', () => openFile(r.path));
      frag.append(line);
    }
  }
  backlinksEl.append(frag);
}

// 트리 ↔ 개요 세로 분할 리사이저
outlineResizer.addEventListener('mousedown', (e) => {
  e.preventDefault();
  outlineResizer.classList.add('dragging');
  document.body.classList.add('resizing-v');
  const headH = outlineHead.offsetHeight;
  const onMove = (ev) => {
    const rect = sidebarEl.getBoundingClientRect();
    const maxH = sidebarEl.clientHeight - 160; // 트리 최소 높이 확보
    let h = rect.bottom - ev.clientY - headH;
    h = Math.max(OUTLINE_MIN, Math.min(Math.max(OUTLINE_MIN, maxH), h));
    applyOutlineHeight(h);
  };
  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    outlineResizer.classList.remove('dragging');
    document.body.classList.remove('resizing-v');
    localStorage.setItem('outlineHeight', String(Math.round(outlineHeight)));
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
});

/* ---------- 문서 내 찾기 (⌘F) ---------- */

const findbar = $('#findbar');
const findInput = $('#find-input');
const findCount = $('#find-count');
const findState = { matches: [], current: -1 };
const findOpts = {
  regex: localStorage.getItem('findRegex') === '1',
  caseSensitive: localStorage.getItem('findCase') === '1',
};

function activeTab() {
  return state.tabs.find((t) => t.path === state.active) || null;
}

// 검색 대상 루트 — 마크다운은 본문, PDF는 텍스트 레이어가 얹힌 페이지 영역
function searchRootOf(tab) {
  if (!tab) return null;
  return tab.pane.querySelector(tab.isPdf ? '.pdf-scroll' : '.doc-body');
}

function activeBody() {
  return searchRootOf(activeTab());
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

// 검색 옵션(정규식·대소문자)에 따라 텍스트에서 매치 구간을 찾아주는 함수를 만든다.
// 잘못된 정규식이면 null을 반환한다.
function makeMatcher(query) {
  if (!query) return null;
  if (findOpts.regex) {
    let re;
    try {
      re = new RegExp(query, findOpts.caseSensitive ? 'g' : 'gi');
    } catch {
      return null;
    }
    return (text) => {
      const out = [];
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text)) !== null) {
        if (m[0].length === 0) { re.lastIndex++; continue; } // 빈 매치 무한루프 방지
        out.push([m.index, m.index + m[0].length]);
      }
      return out;
    };
  }
  const needle = findOpts.caseSensitive ? query : query.toLowerCase();
  return (text) => {
    const hay = findOpts.caseSensitive ? text : text.toLowerCase();
    const out = [];
    let from = 0;
    let idx;
    while ((idx = hay.indexOf(needle, from)) !== -1) {
      out.push([idx, idx + needle.length]);
      from = idx + needle.length;
    }
    return out;
  };
}

function highlightInNode(textNode, matcher) {
  const text = textNode.nodeValue;
  const ranges = matcher(text);
  if (!ranges.length) return;
  const frag = document.createDocumentFragment();
  let from = 0;
  for (const [s, e] of ranges) {
    if (s > from) frag.appendChild(document.createTextNode(text.slice(from, s)));
    const mark = document.createElement('mark');
    mark.className = 'find-hl';
    mark.textContent = text.slice(s, e);
    frag.appendChild(mark);
    from = e;
  }
  if (from < text.length) frag.appendChild(document.createTextNode(text.slice(from)));
  textNode.parentNode.replaceChild(frag, textNode);
}

function runFind() {
  const body = activeBody();
  clearHighlights(body);
  findState.matches = [];
  findState.current = -1;
  findInput.classList.remove('invalid');

  const tab = activeTab();
  const query = findInput.value;
  if (!body || !query) { updateFindCount(); return; }

  const matcher = makeMatcher(query);
  if (!matcher) { // 정규식 문법 오류
    findInput.classList.add('invalid');
    findCount.textContent = '오류';
    return;
  }

  const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      // KaTeX/Mermaid(SVG)·PDF 툴바 내부는 하이라이트가 레이아웃을 깨므로 제외
      if (node.parentElement.closest('.katex, .mermaid, svg, .pdf-toolbar')) return NodeFilter.FILTER_REJECT;
      return matcher(node.nodeValue).length ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const targets = [];
  let n;
  while ((n = walker.nextNode())) targets.push(n); // DOM 수정 전에 대상 노드를 모두 수집
  for (const t of targets) highlightInNode(t, matcher);

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
  for (const t of state.tabs) clearHighlights(searchRootOf(t));
}

// 활성 문서가 다시 그려지거나 탭이 바뀌면 하이라이트를 다시 맞춘다
function refreshFind() {
  if (findbar.hidden) return;
  clearAllHighlights();
  runFind();
}

function openFind(preset) {
  findbar.hidden = false;
  if (typeof preset === 'string' && preset) {
    findInput.value = preset;
  } else {
    const sel = String(window.getSelection() || '').trim();
    if (sel && sel.length <= 80) findInput.value = sel;
  }
  runFind();
  findInput.focus();
  findInput.select();
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
// 찾기 옵션 토글 (대소문자 구분 · 정규식)
const findCaseBtn = $('#find-case');
const findRegexBtn = $('#find-regex');

function syncFindOptButtons() {
  findCaseBtn.classList.toggle('on', findOpts.caseSensitive);
  findRegexBtn.classList.toggle('on', findOpts.regex);
  findInput.placeholder = findOpts.regex ? '찾기 (정규식)' : '찾기';
}
syncFindOptButtons();

findCaseBtn.addEventListener('click', () => {
  findOpts.caseSensitive = !findOpts.caseSensitive;
  localStorage.setItem('findCase', findOpts.caseSensitive ? '1' : '0');
  syncFindOptButtons();
  runFind();
  findInput.focus();
});
findRegexBtn.addEventListener('click', () => {
  findOpts.regex = !findOpts.regex;
  localStorage.setItem('findRegex', findOpts.regex ? '1' : '0');
  syncFindOptButtons();
  runFind();
  findInput.focus();
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

// 파일 단위로 열기 — 여러 개를 고르면 모두 탭으로 열고 마지막 것을 활성화한다.
// 폴더가 이미 열려 있으면 트리는 그대로 두고 탭만 추가한다.
async function openFilesDialog() {
  const res = await window.api.openFiles();
  if (!res || !res.paths) return;
  for (const p of res.paths) await openExternalFile(p);
}

async function openFolder() {
  const res = await window.api.openFolder();
  if (!res) return;
  loadFolder(res);
  saveSession();
}

// Finder/탐색기에서 더블클릭으로 열린 파일 — 폴더가 없으면 상위 폴더를 트리로 열고 탭 생성
async function openExternalFile(p) {
  if (!p) return;
  if (!state.root) {
    const dir = p.slice(0, p.lastIndexOf('/'));
    if (dir) {
      const res = await window.api.openFolderPath(dir);
      if (res && !res.error) loadFolder(res);
    }
  }
  await openFile(p);
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
  if (tab.path === state.active) { updateStatus(); refreshFind(); refreshOutline(); refreshBacklinks(); }
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
$('#es-file').addEventListener('click', openFilesDialog);
$('#es-folder').addEventListener('click', openFolder);
$('#btn-theme').addEventListener('click', toggleTheme);
window.api.onMenu('menu:open-folder', openFolder);
window.api.onMenu('menu:open-files', openFilesDialog);
window.api.onMenu('menu:toggle-theme', toggleTheme);
window.api.onMenu('menu:export-pdf', exportPdf);
window.api.onMenu('menu:export-html', exportHtml);
window.api.onMenu('menu:find', openFind);
window.api.onMenu('menu:search-project', openSearch);

/* ---------- 연결 그래프 (⌘⇧G) ---------- */

const graphView = createGraphView({
  api: window.api,
  getRoot: () => state.root,
  getActivePath: () => state.active,
  openFile,
});
closeGraphIfOpen = () => { if (graphView.isOpen()) graphView.close(); };
window.api.onMenu('menu:graph', () => graphView.open());
$('#btn-graph').addEventListener('click', () => graphView.open());

/* ---------- 읽기 폭 ---------- */

// 0이면 창 전체 폭을 쓴다
function applyReadWidth(px) {
  document.documentElement.style.setProperty('--read-width', px ? `${px}px` : 'none');
  localStorage.setItem('readWidth', String(px));
}
applyReadWidth(Number(localStorage.getItem('readWidth') ?? 860));
window.api.onMenu('menu:read-width', applyReadWidth);

/* ---------- 본문 글자 크기 ---------- */

const FONT_MIN = 11;
const FONT_MAX = 26;
let docFontSize = Number(localStorage.getItem('docFontSize')) || 15;

// 숫자면 그 크기로, '+'/'-'면 한 단계(1px) 증감
function applyFontSize(v) {
  const next = v === '+' ? docFontSize + 1 : v === '-' ? docFontSize - 1 : Number(v);
  docFontSize = Math.max(FONT_MIN, Math.min(FONT_MAX, next || 15));
  document.documentElement.style.setProperty('--doc-font-size', `${docFontSize}px`);
  localStorage.setItem('docFontSize', String(docFontSize));
  $('#st-font').textContent = `${docFontSize}px`;
}
applyFontSize(docFontSize);
window.api.onMenu('menu:font-size', applyFontSize);

// 상태 바 버튼 — 클릭하면 미리 정한 크기를 순환
const FONT_STEPS = [13, 15, 17, 20];
$('#st-font').addEventListener('click', () => {
  const i = FONT_STEPS.indexOf(docFontSize);
  applyFontSize(FONT_STEPS[(i + 1) % FONT_STEPS.length]);
});

window.api.onOpenFile(openExternalFile);

/* ---------- 업데이트 확인 ----------
 * 새 버전 확인은 시작 후 한 번만 조회한다. 원하지 않으면 끌 수 있고, 끄면 조회하지 않는다.
 * (문서 렌더링 자산은 전부 번들이므로 이 기능과 무관하게 오프라인에서도 문서는 정상 표시된다.)
 */

const updateBar = $('#update-bar');
const ubMsg = $('#ub-msg');
const ubAction = $('#ub-action');

function showUpdateBar(msg, actionLabel, onAction, { mutable = true } = {}) {
  ubMsg.textContent = msg;
  ubAction.hidden = !actionLabel;
  ubAction.textContent = actionLabel || '';
  ubAction.onclick = onAction || null;
  $('#ub-mute').hidden = !mutable;
  updateBar.hidden = false;
}

async function runUpdateCheck({ manual = false } = {}) {
  if (manual) showUpdateBar('새 버전을 확인하는 중…', '', null, { mutable: false });
  const r = await window.api.checkUpdate();
  if (!r) return;
  if (r.status === 'notify') {
    // macOS(서명 없음)·deb 설치본 — 내려받기 안내만 한다
    showUpdateBar(`새 버전 v${r.version}이 있습니다 (현재 v${r.current})`,
      '다운로드 페이지 열기', () => window.api.openReleasePage());
  } else if (r.status === 'downloading') {
    showUpdateBar(`새 버전 v${r.version} 내려받는 중…`, '', null);
  } else if (r.status === 'downloaded') {
    showUpdateBar(`새 버전 v${r.version} 준비 완료`, '재시작하여 설치', () => window.api.installUpdate());
  } else if (manual) {
    if (r.status === 'latest') showUpdateBar(`최신 버전입니다 (v${r.current})`, '', null, { mutable: false });
    else if (r.status === 'dev') showUpdateBar('개발 모드에서는 업데이트를 확인하지 않습니다', '', null, { mutable: false });
    else showUpdateBar(`확인 실패: ${r.message || '네트워크 오류'}`, '', null, { mutable: false });
  }
}

// 내려받기가 끝나면 main이 알려준다 (Windows·Linux AppImage)
window.api.onUpdateState((s) => {
  if (s.status === 'downloaded') {
    showUpdateBar(`새 버전 v${s.version} 준비 완료`, '재시작하여 설치', () => window.api.installUpdate());
  }
});

$('#ub-close').addEventListener('click', () => { updateBar.hidden = true; });
$('#ub-mute').addEventListener('click', () => {
  localStorage.setItem('autoUpdateCheck', '0');
  showUpdateBar('자동 확인을 껐습니다. 도움말 › 새 버전 확인에서 직접 확인할 수 있습니다.', '', null, { mutable: false });
});
window.api.onMenu('menu:check-update', () => runUpdateCheck({ manual: true }));

// 시작 시 자동 확인 (기본 켜짐). 설정이 꺼져 있으면 네트워크를 건드리지 않는다.
if (localStorage.getItem('autoUpdateCheck') !== '0') {
  setTimeout(() => runUpdateCheck(), 2500);
}

/* ---------- 드래그앤드롭으로 열기 ---------- */

const dropOverlay = $('#drop-overlay');
let dragDepth = 0; // 자식 요소를 지날 때 발생하는 dragleave로 오버레이가 깜빡이지 않게 카운트

function hasFiles(e) {
  return [...(e.dataTransfer?.types || [])].includes('Files');
}

window.addEventListener('dragenter', (e) => {
  if (!hasFiles(e)) return;
  e.preventDefault();
  dragDepth++;
  dropOverlay.hidden = false;
});
window.addEventListener('dragover', (e) => {
  if (!hasFiles(e)) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
});
window.addEventListener('dragleave', (e) => {
  if (!hasFiles(e)) return;
  dragDepth = Math.max(0, dragDepth - 1);
  if (!dragDepth) dropOverlay.hidden = true;
});
window.addEventListener('drop', async (e) => {
  if (!hasFiles(e)) return;
  e.preventDefault();
  dragDepth = 0;
  dropOverlay.hidden = true;

  const paths = [...e.dataTransfer.files].map((f) => window.api.pathForFile(f)).filter(Boolean);
  for (const p of paths) {
    if (/\.(md|markdown|mdown|pdf)$/i.test(p)) {
      await openExternalFile(p);
    } else {
      // 확장자가 없으면 폴더로 간주하고 열어본다
      const res = await window.api.openFolderPath(p);
      if (res && !res.error) { loadFolder(res); saveSession(); }
    }
  }
});

// 마지막 세션(폴더 + 열린 탭) 복원
restoreSession();
