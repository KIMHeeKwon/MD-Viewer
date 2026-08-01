/**
 * 원문(마크다운 텍스트)을 줄 단위로 다루는 순수 함수들.
 *
 * 인라인 블록 편집은 "화면의 이 블록 = 원문의 몇 번째 줄들"이라는 매핑 위에서 돈다.
 * 그 매핑을 실제 문자열로 옮기는 계산이 여기 모여 있고, 이 계산이 틀리면 문서가 깨진다.
 * 그래서 DOM·Electron에 의존하지 않게 떼어 두고 Node에서 단독 검증한다 (test/edit-core.test.mjs).
 *
 * markdown-it은 파싱 전에 CRLF를 LF로 바꾼 뒤 그 기준으로 토큰의 줄 번호를 매긴다.
 * 여기서도 LF로 정규화한 텍스트를 기준 삼고, 파일의 원래 줄바꿈 방식은 따로 기억했다가
 * 저장할 때 되돌린다 — 오타 하나 고쳤다고 파일 전체의 줄바꿈이 바뀌면 안 되기 때문이다.
 */

export function detectEol(text) {
  return /\r\n/.test(text) ? '\r\n' : '\n';
}

export function normalizeEol(text) {
  return text.replace(/\r\n?/g, '\n');
}

export function applyEol(text, eol) {
  return eol === '\r\n' ? text.replace(/\n/g, '\r\n') : text;
}

/**
 * 블록의 줄 범위 [start, end) 에서 뒤쪽 빈 줄을 잘라낸다.
 * markdown-it의 리스트 토큰 등은 블록을 끝내는 빈 줄까지 범위에 넣는데,
 * 그 빈 줄은 블록 사이의 간격이므로 편집 대상에서 빼야 문단 구분이 보존된다.
 */
export function trimBlankTail(source, start, end) {
  const lines = normalizeEol(source).split('\n');
  let e = Math.min(end, lines.length);
  while (e > start && lines[e - 1].trim() === '') e -= 1;
  return [start, e];
}

/** 줄 범위 [start, end) 의 원문을 그대로 꺼낸다. */
export function sliceBlock(source, start, end) {
  return normalizeEol(source).split('\n').slice(start, end).join('\n');
}

/**
 * 줄 범위 [start, end) 를 replacement 로 갈아끼운 새 원문을 만든다.
 * replacement 가 빈 문자열이면 그 블록을 지운다.
 */
export function replaceBlock(source, start, end, replacement) {
  const lines = normalizeEol(source).split('\n');
  const from = Math.max(0, Math.min(start, lines.length));
  const to = Math.max(from, Math.min(end, lines.length));
  const middle = replacement === '' ? [] : normalizeEol(replacement).split('\n');
  return [...lines.slice(0, from), ...middle, ...lines.slice(to)].join('\n');
}
