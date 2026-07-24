# FAILURES.md — MD-Viewer-ALL

## Active Rules

1. **릴리스는 매트릭스 시작 전 선행 잡(create-release)에서 단독 생성한다.**
   macOS·Windows 러너가 동시에 `electron-builder --publish always`를 실행하면 각자
   릴리스를 만들어 같은 태그에 릴리스 2개가 생긴다. `releaseType: "release"` 설정만으로는
   불충분함이 v0.2.0에서 실증됨 — 두 러너가 "없음 확인 → 생성"을 동시에 수행하는 TOCTOU 경합.
   release.yml의 create-release 잡이 먼저 릴리스를 만들고 package 잡은 `needs`로 대기한다.
   `build.publish.releaseType: "release"`는 기존 릴리스를 태그로 찾게 하기 위해 유지.

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
  v0.3.0 태그에서 최종 검증 필요.

## 프로토콜 우회 로그

(없음)
