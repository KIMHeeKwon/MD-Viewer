# FAILURES.md — MD-Viewer-ALL

## Active Rules

1. **릴리스는 매트릭스 시작 전 선행 잡(create-release)에서 단독 생성한다.**
   macOS·Windows 러너가 동시에 `electron-builder --publish always`를 실행하면 각자
   릴리스를 만들어 같은 태그에 릴리스 2개가 생긴다. `releaseType: "release"` 설정만으로는
   불충분함이 v0.2.0에서 실증됨 — 두 러너가 "없음 확인 → 생성"을 동시에 수행하는 TOCTOU 경합.
   release.yml의 create-release 잡이 먼저 릴리스를 만들고 package 잡은 `needs`로 대기한다.
   `build.publish.releaseType: "release"`는 기존 릴리스를 태그로 찾게 하기 위해 유지.

## Active Rules (계속)

2. **릴리스 워크플로는 electron-builder 전에 반드시 `npm run bundle`을 실행한다.**
   `renderer-dist/`는 gitignore 대상이라 CI 체크아웃에 존재하지 않는다. 번들 단계 없이
   패키징하면 `files` 글롭의 `renderer-dist/**/*`가 빈 것을 잡아, 설치본이 스타일·스크립트
   없이 뼈대 HTML만 표시된다. dev 실행(`npm start`)은 bundle을 포함하므로 이 결함이
   가려진다 — **패키징 산출물은 반드시 설치·실행까지 검증**할 것(asar에 renderer-dist 포함 확인).

## 사례 기록

### 2026-07-24 — v0.1.0 릴리스 드래프트 분열
- 증상: Release 워크플로 성공했으나 자산이 드래프트 2개(맥 4개 / 윈 3개+깨진 이름 1개)로 분산.
- 원인: 위 Active Rule 1의 경합. electron-builder 기본값이 draft 생성이기 때문.
- 조치: 자산 수동 병합 후 공개, `releaseType: "release"` 설정 추가. 다음 태그에서 검증 필요.

### 2026-07-24 — v0.2.0에서 경합 재발 (`releaseType: release`로 불충분 판명)
- 증상: 공개 릴리스 2개가 같은 태그에 생성. 자산 분산 + 깨진 이름 blockmap 재현.
- 원인: 두 러너가 "릴리스 없음 확인 → 생성"을 동시 수행 (TOCTOU). releaseType은 조회 방식만
  바꿀 뿐 생성 원자성을 보장하지 않음.
- 조치: 수동 병합 2회차 수행 후, release.yml에 create-release 선행 잡 추가 (Active Rule 1 개정).
- **검증 완료 (v0.2.1)**: 선행 잡 구조로 단일 릴리스에 자산 8개가 정상 집결. 경합 종결.
  잔여 특이점: zip 블록맵 자산명이 `MD.Viewer-...`로 보이는 것은 productName의 공백을
  GitHub가 점으로 치환한 것 — 무해 (자동 업데이트 델타용 파일).

### 2026-07-25 — 설치본에서 GUI·기능 전무 (renderer-dist 누락)
- 증상: v0.3.2 설치본 실행 시 스타일·스크립트 없이 뼈대 HTML만 표시. 그동안의 기능이 하나도 안 보임.
- 진단: 설치 앱의 app.asar(199KB, 정상은 ~8MB)에 `renderer-dist/`가 없음. index.html이
  참조하는 `../../renderer-dist/renderer.{js,css}`가 404 → 무스타일·무기능.
- 원인: release.yml이 `npm ci` 후 곧바로 electron-builder 실행, `npm run bundle` 누락.
  renderer-dist는 gitignore라 CI에 미존재 → 패키지에서 통째 누락. v0.1.0~v0.3.2 전부 동일.
  dev 실행(`npm start`)에만 의존해 검증한 탓에 6개 릴리스 동안 미발견.
- 조치: release.yml에 "Build renderer" 단계 추가. 로컬 `npm run dist`로 asar에 renderer-dist
  포함(8.3MB) 검증 후 v0.3.3 재릴리스. Active Rule 2 승격.

## 프로토콜 우회 로그

(없음)
