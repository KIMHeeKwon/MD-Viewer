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
- **CI/CD**: GitHub Actions 2종 추가 — `ci.yml`(push/PR 시, package.json 생기기 전에는 자동 skip), `release.yml`(v* 태그 시 electron-builder로 macOS+Windows 패키징 후 Release 업로드). 스캐폴드 생성 시 npm 스크립트명(build/dist)과 정합 확인 필요.
