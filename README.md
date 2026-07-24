# MD Viewer

**한국어**: README.md · **English**: [README.en.md](README.en.md)

작성자의 의도대로 마크다운을 렌더링하는 **단독 실행 데스크톱 뷰어**. macOS · Windows 지원, 완전 오프라인 동작.

GitHub Flavored Markdown에 수식(KaTeX) · 다이어그램(Mermaid) · 코드 하이라이트 · Obsidian 확장([[위키링크]], 콜아웃)까지 지원하며, 폴더 트리와 다중 탭으로 여러 문서를 한 번에 탐색합니다.

## 주요 기능

- **폭넓은 문법 지원** — GFM(표 · 작업 목록 · 취소선 · 각주), KaTeX 수식, Mermaid 다이어그램, 코드 신택스 하이라이트, Obsidian 위키링크 · 콜아웃
- **폴더 트리 + 다중 탭** — 폴더를 열면 사이드바에 문서 트리가 표시되고, 문서를 탭으로 여러 개 열람. 사이드바 폭은 드래그로 조절되며 기억됨
- **문서 내 찾기 (⌘F)** — 매치 하이라이트, 개수 표시, 이전/다음 이동
- **PDF** — PDF 파일 열람(앱 테마에 통합, 페이지 이동 · 확대/축소) 및 마크다운 → PDF 내보내기(⌘E, 항상 라이트 테마로 출력)
- **파일 감시** — 외부 편집기(VS Code, Obsidian 등)에서 문서를 저장하면 자동으로 다시 렌더링
- **다크 / 라이트 테마** (⌘⇧L)
- **완전 오프라인** — 폰트 · 스크립트 전부 번들, 네트워크 요청 없음

## 설치

[Releases](https://github.com/KIMHeeKwon/MD-Viewer/releases/latest)에서 플랫폼에 맞는 파일을 내려받습니다.

| 플랫폼 | 파일 |
|--------|------|
| macOS (Apple Silicon) | `MD-Viewer-<버전>-arm64.dmg` |
| Windows | `MD-Viewer-Setup-<버전>.exe` |

> macOS 빌드는 코드 서명이 없어 처음 열 때 Gatekeeper 경고가 나옵니다. **우클릭 → 열기**로 실행하세요.

## 단축키

| 동작 | 단축키 |
|------|--------|
| 폴더 열기 | ⌘O |
| 문서 내 찾기 | ⌘F |
| PDF로 내보내기 | ⌘E |
| 테마 전환 | ⌘⇧L |
| 확대 / 축소 | ⌘+ / ⌘− |

## 개발

```bash
npm install
npm start          # 렌더러 번들 후 Electron 실행
```

빌드 · 패키징:

```bash
npm run bundle     # esbuild로 렌더러 번들
npm run dist       # electron-builder로 설치 파일 생성
```

릴리스는 `v*` 태그를 push하면 GitHub Actions가 macOS · Windows 설치 파일을 자동 생성합니다.

### 기술 스택

Electron · markdown-it · KaTeX · Mermaid · highlight.js · PDF.js · chokidar · esbuild

## 라이선스

MIT
