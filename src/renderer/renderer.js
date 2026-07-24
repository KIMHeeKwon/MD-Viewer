import MarkdownIt from 'markdown-it';
import taskLists from 'markdown-it-task-lists';
import footnote from 'markdown-it-footnote';
import texmath from 'markdown-it-texmath';
import katex from 'katex';
import hljs from 'highlight.js';
import mermaid from 'mermaid';

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
}

/* ---------- 트리 ---------- */

function buildFileIndex(nodes) {
  for (const n of nodes) {
    if (n.type === 'file') {
      state.fileIndex.set(n.name.replace(/\.(md|markdown|mdown)$/i, '').toLowerCase(), n.path);
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
    const label = document.createElement('span');
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
}

function activateTab(path) {
  state.active = path;
  for (const tab of state.tabs) {
    tab.pane.classList.toggle('active', tab.path === path);
  }
  emptyEl.style.display = state.tabs.length ? 'none' : '';
  renderTabs();
  markActiveInTree();
  updateStatus();
}

function closeTab(path) {
  const idx = state.tabs.findIndex((t) => t.path === path);
  if (idx < 0) return;
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

  const res = await window.api.readFile(path);
  if (res.error) return;

  const pane = document.createElement('div');
  pane.className = 'doc-pane';
  const body = document.createElement('article');
  body.className = 'doc-body';
  pane.append(body);
  docsEl.append(pane);

  const name = path.split('/').pop();
  const dir = path.slice(0, path.length - name.length - 1);
  const tab = { path, name, dir, pane, source: res.content };
  state.tabs.push(tab);
  await renderInto(pane, res.content, dir);
  activateTab(path);
  syncWatch();
}

function syncWatch() {
  window.api.setWatched(state.tabs.map((t) => t.path));
  $('#st-watch').textContent = `watching: ${state.tabs.length ? 'on' : 'off'}`;
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
  const words = tab.source.trim().split(/\s+/).filter(Boolean).length;
  $('#st-words').textContent = `${words.toLocaleString()} words`;
}

/* ---------- 테마 ---------- */

async function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = state.theme;
  $('#btn-theme').textContent = state.theme === 'dark' ? '☾' : '☀';
  mermaid.initialize({ startOnLoad: false, theme: state.theme === 'dark' ? 'dark' : 'default', securityLevel: 'strict' });
  // Mermaid 테마 반영을 위해 열린 탭 전체 재렌더링 (스크롤 유지)
  for (const tab of state.tabs) {
    const scroll = tab.pane.scrollTop;
    await renderInto(tab.pane, tab.source, tab.dir);
    tab.pane.scrollTop = scroll;
  }
}

/* ---------- 폴더 열기 / 파일 감시 ---------- */

async function openFolder() {
  const res = await window.api.openFolder();
  if (!res) return;
  state.root = res.root;
  state.rootName = res.name;
  state.tree = res.tree;
  state.fileIndex.clear();
  buildFileIndex(state.tree);
  $('#root-name').textContent = res.name;
  renderTree();
  updateStatus();
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
  if (tab.path === state.active) updateStatus();
});

/* ---------- 이벤트 결선 ---------- */

$('#btn-open').addEventListener('click', openFolder);
$('#btn-theme').addEventListener('click', toggleTheme);
window.api.onMenu('menu:open-folder', openFolder);
window.api.onMenu('menu:toggle-theme', toggleTheme);
