# WORKLOG — MD-Viewer-ALL

## 2026-07-24 (v0.3.1 — Finder .md 더블클릭 연결)

- **목표**: 운영체제 파일 연결로 .md 더블클릭 시 MD Viewer로 열기.
- **산출물**: electron-builder `fileAssociations`(md/markdown/mdown) 등록 + main 프로세스 배관 — macOS `open-file` 이벤트, Windows argv/`second-instance`, `requestSingleInstanceLock`(중복 실행 방지), 창 준비 전 요청은 `pendingOpenPath`로 큐잉 후 did-finish-load에서 flush. 렌더러 `openExternalFile`: 폴더 미오픈 시 파일의 상위 폴더를 트리로 자동 오픈 후 탭 생성.
- **현재 진행도**: 구현·번들·기동 무오류. 
- **남은 미결(정직 보고)**: 파일 연결은 **설치된 빌드에서만** 활성화되어 dev 모드(`npx electron .`)로는 더블클릭 동작 검증 불가. v0.3.1 설치 후 사용자 확인 필요.

## 2026-07-24 (v0.3.0 — 기능 3종 자율 구현)

- **목표**: 추천 우선순위대로 아웃라인 → 세션 복원 → 전체 검색을 사용자 추가 지시 없이 순차 구현 후 v0.3.0 릴리스.
- **산출물**:
  1. **개요(아웃라인) 패널** — 사이드바 하단, 헤딩(h1~h6) 트리·클릭 점프·현재 위치 추적, 접기 가능. 헤딩 id 부여(앵커 겸용).
  2. **세션 복원** — 폴더·열린 탭·활성 탭을 localStorage에 저장, 시작 시 재스캔 복원(folder:openPath IPC). 삭제 파일 건너뜀.
  3. **전체 검색 (⌘⇧F)** — main 프로세스 줄 단위 스캔(상한 300건), 파일별 그룹·줄 번호·하이라이트, 결과 클릭 시 문서 열고 ⌘F 재사용으로 이동. 검색 알고리즘 node 스크립트로 실데이터 검증("CIDOC" 4건 정확).
- **현재 진행도**: 3종 구현·번들·재기동 완료(오류 없음). README(한/영)·DECISIONS 갱신. v0.3.0 태그 예정.
- **남은 미결**: GUI 육안 검증(화면 기록 권한 부재) — 사용자 확인 필요.

## 2026-07-24 (v0.2 착수)

- **목표**: PDF 양방향 지원 (D8).
- **산출물**: ① MD→PDF 내보내기 — 메뉴 "PDF로 내보내기…"(⌘E), `printToPDF` + `@media print` CSS로 활성 문서만 전체 흐름 인쇄. ② PDF 열람 — 트리에 .pdf 표시, 탭에서 Chromium 내장 뷰어(iframe)로 열람. PDF 탭은 감시·내보내기·위키링크 색인에서 제외.
- **현재 진행도**: 구현·번들·재기동 완료. PDF 열람/내보내기 육안 검증 대기 (화면 기록 권한 부재).
- **사용자 피드백 반영 (1차)**: ① 사이드바 드래그 리사이저 추가 (160–480px, localStorage로 폭 기억, 더블클릭 초기화). ② PDF 이질감 해결 — Chromium 내장 뷰어(iframe, 자체 회색 UI 스타일링 불가)를 걷어내고 **PDF.js(pdfjs-dist) 직접 렌더링**으로 교체: 페이지를 canvas로 그려 앱 테마 배경 위에 그림자와 함께 배치. CSP의 frame-src 허용도 원복.
- **사용자 피드백 반영 (2차)**: ① 탭 오버플로 수정 — 최대 폭 190px + 말줄임 + 툴팁, 활성 탭 자동 스크롤, 휠 가로 스크롤. ② PDF 툴바 추가 — 페이지 이전/다음 + 현재 페이지 표시, 확대/축소(40~300%)/폭 맞춤, 스크롤 위치 기반 페이지 추적. ③ 개발 모드에서 앱 이름이 "Electron"으로 보이는 건은 dev 바이너리의 Info.plist 한계로 판정 — 패키징된 릴리스는 "MD Viewer"로 표시됨, app.setName만 보강.
- **v0.2.0 릴리스**: 태그 push → 빌드 성공했으나 releaseType=release로도 경합 재발(TOCTOU, FAILURES.md 개정) → 수동 병합 후 공개. 근본 수정: release.yml에 create-release 선행 잡 추가 (v0.3.0에서 검증).
- **사용자 피드백 반영 (3차)**: PDF 내보내기가 다크 배경 그대로 출력되는 문제 → 내보내기는 화면 테마와 무관하게 **항상 라이트(인쇄) 테마 강제**로 수정. @media print에서 색 토큰 라이트 오버라이드 + 코드 블록 단색화(잉크 친화), Mermaid는 내보내기 직전 라이트 재렌더링 후 복원.
- **v0.2.1 릴리스**: 사용자 검증 후 태그 push → **create-release 선행 잡이 경합을 실제로 차단, 단일 릴리스로 자산 집결 확인** (FAILURES.md 사례 종결). https://github.com/KIMHeeKwon/MD-Viewer/releases/tag/v0.2.1
- **기능 추가: 문서 내 찾기 (⌘F)**: 보기 메뉴 "찾기…"(⌘F). 활성 마크다운 문서에서 대소문자 무시 매치 하이라이트(노랑) + 현재 매치 강조(액센트) + 개수 표시(n/total), Enter/⇧Enter·▲▼로 이전/다음, Esc 닫기. 선택 텍스트를 초기 쿼리로 시드. 탭 전환·파일 변경·테마 전환 시 하이라이트 자동 재적용(refreshFind). KaTeX/Mermaid(SVG) 내부는 하이라이트 제외(레이아웃 보호). PDF 탭은 canvas라 검색 불가 → 입력 비활성 + 안내. 인쇄 CSS에서 findbar·하이라이트 숨김.
- **다음 단계**: 백로그 — 프로젝트 전체(파일 간) 검색, Finder .md 연결, Intel Mac(x64) 빌드, macOS 코드 서명, PDF 텍스트 검색.

## 2026-07-24

- **목표**: 마크다운 뷰어 신규 프로젝트 착수 (L2). G1 블라인드 스팟 진단 → G2 인터뷰 → G3 시각 방향 브레인스톰.
- **결정사항**: P0 4건 확정 — macOS+Windows / Electron / GFM+KaTeX+Mermaid+Obsidian 확장 / 폴더 트리+탭. `DECISIONS.md` 기록 완료.
- **산출물**:
  - `DECISIONS.md` (G2 산출물)
  - G3 목업 Artifact — 시각 방향 4안 (A GitHub 표준 / B 서재 / C IDE 다크 / D 젠 미니멀): https://claude.ai/code/artifact/8528a973-87e1-4704-bb1e-29d19b20a23a
- **현재 진행도**: G3 반응 대기 (방향 선택 전). 코드 미착수.
- **남은 미결**: 시각 방향 선택, 파일 감시(자동 갱신) 포함 여부.
- **다음 단계**: 방향 확정 → `DESIGN.md` 토큰 고정 → G4.5 구현 계획 (Electron 스캐폴드, markdown-it 파이프라인, 보안 설정 포함).
- **저장소**: https://github.com/KIMHeeKwon/MD-Viewer 개설·초기 push 완료 (계정 KIMHeeKwon, 로컬 user.email=hkkim79@gmail.com 설정).
- **G3 수렴·G5 구현 (같은 날 후속)**: 시각 방향 **C(IDE 다크)** + 파일 감시 포함 확정 → `DESIGN.md` 토큰 고정 → Electron 스캐폴드 v0.1 구현 완료. 구성: main(창·트리 스캔·chokidar 감시·IPC), preload(contextBridge 5 API), renderer(markdown-it + KaTeX/texmath + Mermaid + hljs + 커스텀 위키링크·콜아웃 플러그인, 트리/탭/테마/상태바 UI), samples/데모.md. esbuild 번들 성공, 앱 기동 확인(오류 출력 없음). 화면 기록 권한 부재로 스크린샷 자체 검증은 못 함 — 사용자 육안 확인 필요.
- **v0.1.0 릴리스**: 태그 push → macOS(dmg/zip)·Windows(exe) 빌드 성공. 드래프트 분열 경합 발생(FAILURES.md 기록) → 자산 수동 병합 후 공개: https://github.com/KIMHeeKwon/MD-Viewer/releases/tag/v0.1.0. 재발 방지로 `releaseType: release` 설정 추가.
- **CI/CD**: GitHub Actions 2종 추가 — `ci.yml`(push/PR 시, package.json 생기기 전에는 자동 skip), `release.yml`(v* 태그 시 electron-builder로 macOS+Windows 패키징 후 Release 업로드). 스캐폴드 생성 시 npm 스크립트명(build/dist)과 정합 확인 필요.
