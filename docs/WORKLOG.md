# WORKLOG — MD-Viewer-ALL

## 2026-07-26 (v0.6.0 — HTML 내보내기)

- **목표**: 백로그 "HTML 내보내기". 요건은 **자체 완결(self-contained)** — 인터넷·주변 파일 없이 어느 브라우저에서나 동일하게 열릴 것.
- **산출물**: 파일 메뉴 › HTML로 내보내기…(⌘⇧E).
  - main `html:export` 핸들러가 번들된 `renderer-dist/renderer.css`를 읽어 인라인하고, `@font-face`의 `src`를 **내장 woff2 data URI 하나로 치환**(수식이 없으면 @font-face 자체를 제거, ttf/woff 대체본이 깨진 참조로 남지 않게 정리).
  - 문서 이미지(`file://`)도 data URI로 내장(파일당 5MB 상한).
  - 렌더러는 본문을 복제해 검색 하이라이트(`mark.find-hl`)를 제거한 뒤 전달. PDF 내보내기와 동일하게 **Mermaid를 라이트로 재렌더링 후 복원**.
- **검증**: 변환 로직을 실자산으로 실행 → 폰트 20개·이미지 1개 내장, **남은 외부 참조 0 / file:// 참조 0**. 결과 HTML을 브라우저로 열어 렌더링 확인(콜아웃·표·KaTeX 수식 폰트·코드 하이라이트·이미지·작업목록 정상, 실패한 리소스 요청 0건). 개발 인스턴스 기동 무오류.
- **비고**: 수식 포함 문서는 KaTeX 폰트 내장으로 ~1.3MB, 수식이 없으면 ~45KB + 본문.

## 2026-07-26 (v0.5.0 — PDF 텍스트 검색 · 읽기 폭 · 찾기 정규식)

- **목표**: 백로그 3종. 요청("PDF 텍스트 검색 + 읽기 폭관련 정규식 옵션")을 백로그의 "읽기 폭 조절"과 "찾기 정규식 옵션" 두 항목으로 해석해 함께 구현.
- **산출물**:
  1. **PDF 텍스트 검색** — 각 페이지를 `.pdf-page-wrap`으로 감싸고 캔버스 위에 PDF.js `TextLayer`(투명 텍스트)를 얹음. 이로써 기존 DOM 기반 ⌘F가 PDF에도 그대로 동작하고, **텍스트 선택·복사**도 가능해짐. 검색 루트를 마크다운=`.doc-body`, PDF=`.pdf-scroll`로 일반화(`searchRootOf`). 페이지 이동 로직도 wrap 기준으로 갱신. 텍스트 없는 스캔 PDF는 조용히 그림만 표시.
  2. **찾기 정규식·대소문자 옵션** — findbar에 `Aa`/`.*` 토글(설정 유지). 매칭을 `makeMatcher`로 일반화, 잘못된 정규식은 입력창 빨간 테두리 + "오류" 표시, 빈 매치(`a*`) 무한루프 방지.
  3. **읽기 폭** — 보기 메뉴 › 읽기 폭 (좁게 720 / 보통 860 / 넓게 1080 / 창 전체). `--read-width` CSS 변수 + localStorage. onMenu가 인자를 전달하도록 preload 확장.
- **검증**: 매처 6케이스 단위 테스트(대소문자 무시/구분, 정규식, 정규식+대소문자, 잘못된 정규식→null, 빈 매치 종료) 전부 통과. 번들 빌드 성공. 설치본이 단일 인스턴스 잠금을 쥐고 있어, `--user-data-dir`로 프로필을 격리해 개발 인스턴스를 별도 기동 → 오류 없이 동작 확인(설치본 무중단).
- **남은 미결**: PDF 텍스트 레이어의 캔버스 정렬은 시각적 속성이라 사용자 육안 확인 필요.

## 2026-07-25 (v0.4.0 — 백링크 패널 + 드래그앤드롭)

- **목표**: 백로그 2종 구현.
- **산출물**:
  1. **백링크 패널** — 사이드바 하단을 "개요 / 백링크" 탭으로 전환(기존 리사이저·접기 재사용). main에 `links:backlinks` 핸들러 추가: 폴더 내 .md를 스캔해 현재 문서를 `[[위키링크]]`로 참조하는 문서·줄을 수집(파일당 10건). 자기 참조 제외, `[[x.md]]`·`[[x|별칭]]` 형태 모두 인식. 탭 헤더에 건수 배지, 결과 클릭 시 해당 문서 열기.
  2. **드래그앤드롭** — 창에 파일/폴더를 놓으면 열림. 오버레이 표시(dragenter/leave 깊이 카운트로 깜빡임 방지). Electron 32+에서 제거된 `File.path` 대신 `webUtils.getPathForFile`을 preload에서 노출. 확장자 있으면 파일, 없으면 폴더로 처리.
- **검증**: ① 백링크 스캔 로직을 픽스처로 검증 — 일반/확장자 포함/별칭 링크 모두 탐지, 자기 참조 제외 확인. ② `webUtils`가 샌드박스 preload에서 쓸 수 있는지 Electron 43 바이너리에 내장된 sandboxed_renderer 모듈 목록에서 확인(ipcRenderer·contextBridge와 함께 등록됨). ③ 번들 빌드 성공, 참조 DOM ID 전수 확인.
- **남은 미결**: 설치본이 단일 인스턴스 잠금을 쥐고 있어 개발 인스턴스 기동 불가 → GUI 육안 검증은 사용자 확인 필요.


## 2026-07-25 (v0.3.3 — 설치본 렌더러 누락 긴급 수정 + 앱 아이콘)

- **긴급 버그**: 설치본 실행 시 GUI·기능 전무(뼈대 HTML만). 진단 결과 app.asar(199KB)에 renderer-dist 누락 → index.html의 renderer.{js,css} 404.
  - 원인: release.yml이 electron-builder 전에 `npm run bundle`을 실행하지 않음. renderer-dist는 gitignore라 CI에 미존재 → 패키지에서 통째 누락. v0.1.0~v0.3.2 전부 동일 결함(dev 실행에만 의존해 6개 릴리스 동안 미발견).
  - 조치: release.yml에 "Build renderer" 단계 추가. 로컬 `npm run dist`로 asar 8.3MB·renderer-dist 64항목 포함 검증. FAILURES.md Active Rule 2 승격.
- **앱 아이콘**: 사용자 제공 이미지(design/icon-source.png, MD|PDF 문서 + 네이비 라운드 사각형)를 PIL flood-fill로 흰 여백 투명화 → 1024 마스터 → icns(iconutil)/ico 생성, electron-builder mac.icon/win.icon 연결. 패키지 Info.plist CFBundleIconFile=icon.icns 검증.
- **README(한/영)**: macOS "손상되었다" 경고 해결법(우클릭 열기 / `xattr -dr com.apple.quarantine`) 및 Windows SmartScreen 안내 추가.
- **환경 이슈**: 작업 중 macOS TCC 권한이 회수되어 ~/Documents 접근이 차단됨 → 사용자가 전체 디스크 접근 권한 부여 + 앱 재시작으로 복구.


## 2026-07-24 (v0.3.2 — 트리↔개요 세로 분할 리사이저)

- **목표**: 사용자 요청 — "md 파일 목록창 리사이징". 질문으로 의도 확인 → **트리 ↔ 개요 세로 분할** 조절(좌우 폭은 이미 존재).
- **산출물**: 트리와 개요 사이에 row-resize 핸들 추가. 드래그로 개요 패널 높이(flex-basis) 조절, localStorage('outlineHeight')로 기억, 탭 전환 시 유지. 트리 최소 높이 확보(sidebar-160), 개요 접힘 시 리사이저 숨김.
- **현재 진행도**: 구현·번들·기동 무오류. GUI 육안 검증은 화면 기록 권한 부재로 미실시.

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
