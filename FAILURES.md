# FAILURES.md — MD-Viewer-ALL

## Active Rules

1. **릴리스는 `releaseType: "release"` 설정을 유지한다.** macOS·Windows 러너가 동시에
   `electron-builder --publish always`를 실행하면 각자 드래프트 릴리스를 만들어
   같은 태그에 릴리스 2개가 생긴다 (드래프트는 태그 검색에 안 잡혀 서로를 못 찾음).
   `build.publish.releaseType: "release"`로 두 러너가 동일 릴리스에 자산을 합치게 한다.

## 사례 기록

### 2026-07-24 — v0.1.0 릴리스 드래프트 분열
- 증상: Release 워크플로 성공했으나 자산이 드래프트 2개(맥 4개 / 윈 3개+깨진 이름 1개)로 분산.
- 원인: 위 Active Rule 1의 경합. electron-builder 기본값이 draft 생성이기 때문.
- 조치: 자산 수동 병합 후 공개, `releaseType: "release"` 설정 추가. 다음 태그에서 검증 필요.

## 프로토콜 우회 로그

(없음)
