# CLAUDE.md — MD-Viewer-ALL 프로젝트 지침

> 전역 지침(`~/.claude/CLAUDE.md`, `~/.claude/rules/*`)에 대한 **프로젝트 오버라이드**.
> 여기에는 이 저장소에서만 유효한 고정 사실과 절차만 적는다. 결정 이력은 [[DECISIONS]],
> 디자인 토큰은 [[DESIGN]], 재발 방지 규칙은 [[FAILURES]], 진행 로그는 [[WORKLOG]],
> 사고 과정은 [[RATIONALE]]에 있다.

## 1. 프로젝트 성격

- **단독 실행 데스크톱 문서 뷰어** (마크다운 + PDF). 웹 서버로 구동되지 않는다 ([[DECISIONS#2026-07-24 — G3 수렴 및 잔여 결정|D7]]).
- **개인 프로젝트**다. ETRI 업무 저장소가 아니므로 GitHub 계정은 `KIMHeeKwon`,
  커밋 이메일은 `hkkim79@gmail.com`을 이 저장소의 로컬 설정으로 사용한다.
- 전역 지침의 도메인 정의(디지털 트윈 = 건축물·도시)는 이 프로젝트와 무관하다.

## 1.1 문서 표기 예외 (의도적)

전역 `doc-style.md`는 모든 `.md`의 내부 참조를 `[[위키링크]]`로 통일하도록 규정한다.
**[[README]]와 [[README.en]]만 예외**로 표준 마크다운 링크를 쓴다 — 공개 저장소의 첫 화면이라
GitHub 웹에서 링크로 동작해야 한다는 판단(사용자 승인, 2026-07-29). 그 외 모든 문서는 규약을 따른다.

## 2. 스택 고정 사실

| 층위 | 기술 |
|------|------|
| 앱 셸 | Electron 43 (main + preload + renderer, `contextIsolation`·`sandbox` 유지) |
| 번들러 | esbuild (렌더러를 `renderer-dist/`로 번들 — **gitignore 대상**) |
| 렌더링 | markdown-it (+ task-lists · footnote · texmath) · KaTeX · Mermaid · highlight.js |
| PDF | PDF.js (`pdfjs-dist`) — 캔버스 + 텍스트 레이어 |
| 파일 감시 | chokidar |
| 패키징 | electron-builder (macOS dmg/zip, Windows nsis, Linux AppImage/deb) |
| 업데이트 | electron-updater (Windows·Linux AppImage 자동 설치, macOS·deb 알림) |

- **렌더링 자산은 전부 번들한다**: 폰트·스크립트를 CDN에서 불러오지 않는다. 목적은
  오프라인 자체가 아니라 **어디서나 같은 모습으로 보이게** 하는 것이다
  ([[DESIGN#4. 금지 목록|DESIGN 금지 목록]]).
- 새 의존성을 추가할 때는 번들 크기와 렌더링 영향을 먼저 확인한다.
- **전역 지침의 환경 전제는 이 프로젝트에 적용되지 않는다**: `~/.claude/rules/protocol.md` §5의
  온프레미·망분리·GPU(RTX 6000) 전제는 **하드웨어 사양이 필요하거나 망분리 환경에 구축해야 하는
  LLM·추론 시스템**을 위한 것이다. 이 앱은 어느 PC에서나 동작하는 범용 도구이므로 그 제약을
  끌어오지 않는다 (사용자 확인, 2026-07-29 — [[DECISIONS|D16]]).

## 3. 개발·릴리스 절차

```bash
npm start          # 렌더러 번들 후 Electron 실행
npm run bundle     # 렌더러만 번들
npm run dist       # 설치 파일 생성 (dist/)
```

릴리스는 **버전 bump → 커밋 → `v*` 태그 push → 단일 릴리스 확인** 순서다.
`main` 브랜치는 보호되어 있다 (강제 push·삭제 차단, PR 필수 아님).

## 4. 이 프로젝트에서 반드시 지키는 검증 규칙

[[FAILURES#Active Rules|Active Rules]]에서 파생된, 실제 사고로 확립된 규칙이다.

1. **배포물까지 검증한다.** `npm start`가 되는 것은 설치본이 된다는 증거가 아니다.
   릴리스 후 패키지 내부(`app.asar`)에 `renderer-dist`와 참조 자산이 들어갔는지 확인한다.
2. **릴리스 워크플로는 electron-builder 전에 `npm run bundle`을 실행해야 한다.**
3. **사용자 조작 경로(닫기·삭제·취소)의 정리 코드는 try/catch로 감싼다.**
   자원 해제 실패가 조작을 막아서는 안 된다.
4. **라이브러리 생명주기 API(`destroy`·`cleanup`)는 해당 버전에 존재하는지 확인한다.**

## 5. GUI 검증 수단

화면 기록 권한이 없어도 **CDP(원격 디버깅)로 실제 앱을 자동 조작해 검증할 수 있다.**

```bash
npx electron . --remote-debugging-port=9222 --user-data-dir=<임시 프로필>
```

- `localStorage`의 `session` 키를 심고 새로고침하면 원하는 탭 상태를 재현할 수 있다.
- 설치본이 실행 중이면 단일 인스턴스 잠금 때문에 개발 인스턴스가 즉시 종료된다.
  `--user-data-dir`로 프로필을 격리하면 **설치본을 끄지 않고** 동시에 띄울 수 있다.
- UI 버그 신고를 받으면 추측하지 말고 이 방법으로 먼저 재현한다.
