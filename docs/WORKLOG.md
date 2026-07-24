# WORKLOG — MD-Viewer-ALL

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
