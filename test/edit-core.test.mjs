/**
 * 인라인 블록 편집의 저장 계산 검증.
 *
 * 여기가 틀리면 사용자의 문서가 깨진다. 뷰어 버그의 최악은 "안 보임"이지만
 * 편집 버그의 최악은 "문서 손실"이므로, GUI 없이 이 계산만 따로 검증한다.
 *
 *   node --test test/
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import MarkdownIt from 'markdown-it';
import {
  detectEol, normalizeEol, applyEol, trimBlankTail, sliceBlock, replaceBlock,
} from '../src/renderer/edit-core.mjs';

const DOC = [
  '# 제목',            // 0
  '',                  // 1
  '첫 문단이다.',       // 2
  '',                  // 3
  '- 항목 1',          // 4
  '- 항목 2',          // 5
  '',                  // 6
  '마지막 문단',        // 7
].join('\n');

/* ---------- 줄바꿈 방식 ---------- */

test('CRLF 문서를 알아보고 저장할 때 되돌린다', () => {
  const crlf = 'a\r\nb\r\nc';
  assert.equal(detectEol(crlf), '\r\n');
  assert.equal(detectEol('a\nb'), '\n');
  assert.equal(normalizeEol(crlf), 'a\nb\nc');
  assert.equal(applyEol(normalizeEol(crlf), '\r\n'), crlf);
});

test('CRLF 문서를 편집해도 줄바꿈 방식이 유지된다', () => {
  const crlf = '# 제목\r\n\r\n본문\r\n';
  const next = replaceBlock(crlf, 2, 3, '고친 본문');
  assert.equal(applyEol(next, detectEol(crlf)), '# 제목\r\n\r\n고친 본문\r\n');
});

test('LF 문서에 CR이 섞여 들어와도 정규화된다', () => {
  assert.equal(replaceBlock('a\nb', 1, 2, '고침\r\n둘째'), 'a\n고침\n둘째');
});

/* ---------- 범위 잘라내기 ---------- */

test('블록 뒤의 빈 줄은 편집 범위에서 빠진다', () => {
  // 리스트 토큰의 map은 [4,7]이지만 6번 줄은 블록 사이의 빈 줄이다
  assert.deepEqual(trimBlankTail(DOC, 4, 7), [4, 6]);
  assert.equal(sliceBlock(DOC, 4, 6), '- 항목 1\n- 항목 2');
});

test('빈 줄만 있는 범위는 시작점까지만 줄어든다', () => {
  assert.deepEqual(trimBlankTail('a\n\n\n', 1, 4), [1, 1]);
});

/* ---------- 교체 ---------- */

test('줄 수가 같은 교체', () => {
  assert.equal(replaceBlock(DOC, 2, 3, '고친 문단이다.'),
    ['# 제목', '', '고친 문단이다.', '', '- 항목 1', '- 항목 2', '', '마지막 문단'].join('\n'));
});

test('줄 수가 늘어나는 교체', () => {
  const next = replaceBlock(DOC, 2, 3, '첫 줄\n둘째 줄\n셋째 줄');
  assert.equal(next.split('\n').length, DOC.split('\n').length + 2);
  assert.match(next, /^# 제목\n\n첫 줄\n둘째 줄\n셋째 줄\n\n- 항목 1/);
});

test('줄 수가 줄어드는 교체', () => {
  assert.equal(replaceBlock(DOC, 4, 6, '- 하나뿐'),
    ['# 제목', '', '첫 문단이다.', '', '- 하나뿐', '', '마지막 문단'].join('\n'));
});

test('빈 문자열은 블록을 지운다', () => {
  assert.equal(replaceBlock(DOC, 2, 3, ''),
    ['# 제목', '', '', '- 항목 1', '- 항목 2', '', '마지막 문단'].join('\n'));
});

test('문서의 첫 블록', () => {
  assert.match(replaceBlock(DOC, 0, 1, '# 바뀐 제목'), /^# 바뀐 제목\n\n첫 문단/);
});

test('문서의 마지막 블록', () => {
  assert.match(replaceBlock(DOC, 7, 8, '바뀐 마지막'), /\n바뀐 마지막$/);
});

test('파일 끝 개행이 보존된다', () => {
  const withNl = '문단 하나\n';                 // 줄 배열은 ['문단 하나', '']
  assert.equal(replaceBlock(withNl, 0, 1, '고침'), '고침\n');
});

test('파일 끝 개행이 없어도 늘어나지 않는다', () => {
  assert.equal(replaceBlock('문단 하나', 0, 1, '고침'), '고침');
});

test('범위가 파일 길이를 넘어가도 잘려서 처리된다', () => {
  assert.equal(replaceBlock('a\nb', 1, 999, '고침'), 'a\n고침');
  assert.equal(replaceBlock('a\nb', 999, 999, '추가'), 'a\nb\n추가');
});

test('연속 편집이 누적된다', () => {
  let s = DOC;
  s = replaceBlock(s, 0, 1, '# 1차');
  s = replaceBlock(s, 2, 3, '2차 문단');
  assert.match(s, /^# 1차\n\n2차 문단\n/);
});

/* ---------- markdown-it 토큰과의 왕복 ---------- */

test('실제 토큰 범위로 잘라낸 원문을 그대로 되돌려 쓰면 문서가 변하지 않는다', () => {
  const src = [
    '# 제목', '', '문단.', '', '- 하나', '- 둘', '',
    '| a | b |', '|---|---|', '| 1 | 2 |', '',
    '```js', 'x = 1;', '```', '', '> [!note]', '> 메모', '', '끝.',
  ].join('\n');
  const md = new MarkdownIt();
  const blocks = md.parse(src, {})
    .filter((t) => t.level === 0 && t.nesting >= 0 && t.map)
    .map((t) => trimBlankTail(src, t.map[0], t.map[1]));

  assert.ok(blocks.length >= 6, '최상위 블록이 잡혀야 한다');
  for (const [s, e] of blocks) {
    assert.equal(replaceBlock(src, s, e, sliceBlock(src, s, e)), src);
  }
});

/* ---------- 메모 콜아웃 삽입 (v0.13.0) ---------- */

// 렌더러의 insertMemo가 쓰는 계산을 그대로 재현한다:
//   블록을 "본문 + 빈 줄 + 메모"로 교체하고, 메모의 시작 줄을 start + 본문줄수 + 1로 잡는다.
const MEMO = '> [!note]\n> ';
function insertMemoAt(source, start, end, text) {
  return {
    next: replaceBlock(source, start, end, `${text}\n\n${MEMO}`),
    memoStart: start + text.split('\n').length + 1,
  };
}

test('메모는 삽입 전용 함수 없이 replaceBlock만으로 끼워 넣어진다', () => {
  const md = new MarkdownIt();
  const [s, e] = trimBlankTail(DOC, 2, 3);                 // 첫 문단
  const { next, memoStart } = insertMemoAt(DOC, s, e, sliceBlock(DOC, s, e));

  // 계산한 줄 번호에 실제로 콜아웃이 있는가 — 파서에게 되묻는다
  const quote = md.parse(next, {}).find((t) => t.type === 'blockquote_open');
  assert.equal(quote.map[0], memoStart, '메모 블록의 시작 줄이 계산과 일치해야 한다');
  assert.equal(sliceBlock(next, memoStart, memoStart + 1), '> [!note]');

  // 원문은 하나도 잃지 않는다
  assert.match(next, /^# 제목\n\n첫 문단이다\.\n\n> \[!note\]/);
  assert.match(next, /- 항목 1\n- 항목 2/);
  assert.match(next, /마지막 문단$/);
});

test('여러 줄 블록에 메모를 달아도 줄 번호가 맞는다', () => {
  const md = new MarkdownIt();
  const [s, e] = trimBlankTail(DOC, 4, 7);                 // 리스트(2줄)
  const { next, memoStart } = insertMemoAt(DOC, s, e, sliceBlock(DOC, s, e));

  const quote = md.parse(next, {}).find((t) => t.type === 'blockquote_open');
  assert.equal(quote.map[0], memoStart);
  assert.match(next, /- 항목 1\n- 항목 2\n\n> \[!note\]\n> \n\n마지막 문단/);
});

test('문서 마지막 블록에 메모를 달 수 있다', () => {
  const [s, e] = trimBlankTail(DOC, 7, 8);
  const { next, memoStart } = insertMemoAt(DOC, s, e, sliceBlock(DOC, s, e));
  assert.equal(sliceBlock(next, memoStart, memoStart + 1), '> [!note]');
  assert.match(next, /마지막 문단\n\n> \[!note\]\n> $/);
});

test('한 블록만 고치면 나머지 블록은 글자 하나도 바뀌지 않는다', () => {
  const md = new MarkdownIt();
  const blocks = md.parse(DOC, {})
    .filter((t) => t.level === 0 && t.nesting >= 0 && t.map)
    .map((t) => trimBlankTail(DOC, t.map[0], t.map[1]));
  const [s, e] = blocks[1];                       // 첫 문단
  const next = replaceBlock(DOC, s, e, '바뀐 문단');

  assert.equal(sliceBlock(next, 0, 1), '# 제목');
  assert.match(next, /- 항목 1\n- 항목 2/);
  assert.match(next, /마지막 문단$/);
});
