# Handoff: KKOBAK (HKDS) 디자인 시스템

## Overview

KKOBAK / HKDS 디자인 시스템을 실제 코드베이스에 적용하기 위한 이관 패키지.
다크 테마 기반 React 컴포넌트 라이브러리(9종)와 토큰 전체, 그리고 이 프로젝트에서
추가한 **라이트 테마 오버라이드**가 들어 있다.

원본 패키지: `hk-design-system@0.1.0` (내부 명칭 "Metaverse" 다크 테마)

## About the Design Files

`reference/` 안의 HTML은 **디자인 레퍼런스**다 — 의도한 외형과 동작을 보여주는
프로토타입이며, 그대로 복사해 프로덕션에 넣을 코드가 아니다. 대상 코드베이스의
기존 환경(React / Vue / Next 등)과 패턴에 맞춰 다시 구현한다.

반면 `kkobak/` 안의 파일은 **실제 산출물**이다. 그대로 서빙해도 되는
컴파일된 컴포넌트 번들과 스타일시트다.

## Fidelity

**High-fidelity.** 색·타이포·간격·라운드·그림자 값이 모두 컴파일된 토큰에서
직접 추출된 확정값이다. 근사치가 아니다. 두 테마 모두 실제 값이 명시돼 있다.

## Files

```
kkobak/
  _ds_bundle.js       컴포넌트 9종 전체 → window.HKDS.*  (브라우저 글로벌 IIFE)
  _ds_bundle.css      컴파일된 토큰 + 컴포넌트 스타일 + 폰트(base64 내장)
  styles.css          단일 진입점 — _ds_bundle.css 를 @import
  theme-tokens.css    ★ 안정적 --k-* 별칭 + 라이트 테마 오버라이드 (이 프로젝트 추가분)
  _ds_manifest.json   DS 메타데이터
DS-USAGE-RULES.md     DS 사용 규약 (원래 이름 CLAUDE.md) — 이 저장소에는 적용하지 않는다
example.html          최소 동작 예제 (테마 토글 포함) — 브라우저로 바로 열림
reference/            디자인 레퍼런스 HTML (토큰·컴포넌트 전수 카탈로그)
```

## Setup

1. `kkobak/` 를 정적 자산 경로에 복사 (예: `public/kkobak/`)
2. ~~`CLAUDE.md` 를 저장소 루트에 복사~~ — **이 프로젝트에서는 하지 않았다.**
   그 규칙은 React 컴포넌트 사용을 전제로 하는데 우리는 토큰만 채택했다(DECISIONS D47).
   해당 파일은 `DS-USAGE-RULES.md`로 이름을 바꿔 참고 자료로만 둔다 (2026-08-17)
3. React가 로드된 뒤 아래 3줄 삽입:

```html
<link rel="stylesheet" href="/kkobak/styles.css">
<link rel="stylesheet" href="/kkobak/theme-tokens.css">
<script src="/kkobak/_ds_bundle.js"></script>
```

4. 앱 트리를 `HKDS.ThemeProvider`로 감싼다
5. `example.html` 을 브라우저로 열어 로드가 정상인지 먼저 확인

번들러 프로젝트(Vite/Next/CRA)라면 글로벌 번들 대신 `npm i hk-design-system` 후
`import { Button } from "hk-design-system"` 이 정석이다. 이 번들은 빌드 스텝 없이
바로 쓰는 경로다. 어느 쪽이든 **토큰 값과 컴포넌트 API는 동일**하다.

## Components

전부 upstream 실제 코드. 재구현하지 말고 조합한다.

| 컴포넌트 | 설명 | props |
|---|---|---|
| `Button` | 네이티브 button 렌더, forwardRef | `variant` primary·secondary·ghost·danger / `size` sm·md·lg / `fullWidth` |
| `Text` | 타이포 프리미티브, `as`로 태그 지정 | `size` xs–xxl / `weight` regular·medium·bold / `tone` default·muted·accent·danger / `align` |
| `Stack` | flexbox 레이아웃 프리미티브 | `direction` row·column / `gap` none·xs–xxxl / `align` / `justify` / `wrap` |
| `Card` | 그룹핑 서피스 | `padding` none·sm·md·lg / `interactive` |
| `Badge` | 인라인 상태·분류 라벨 | `tone` neutral·accent·violet·success·warning·danger / `size` sm·md |
| `Input` | 네이티브 input | 전체 input 속성 + `invalid` |
| `Select` | 네이티브 select 래퍼 | 전체 select 속성 + `invalid`, option은 children |
| `Checkbox` | 커스텀 스타일 + 네이티브 input | 전체 checkbox 속성 + `label` |
| `Dialog` | 네이티브 `<dialog>` 기반 모달 | controlled `open` + `onClose` / `title` / `footer` |
| `ThemeProvider` | 테마 서피스 (배경·전경·기본 폰트) | div 속성 전부 — `style`, `data-theme` 등 |

부수 export: `vars` (토큰 객체), `cx` (className 병합 유틸)

## Design Tokens

`window.HKDS.vars` 가 단일 진실 소스다. hex를 하드코딩하지 말 것.
아래 표는 참고용 실제 값이며, 라이트 열은 이 패키지에서 추가된 값이다.

### Colors

| `vars.color.*` | dark | light |
|---|---|---|
| bg | `#0B0E1A` | `#F2F4F7` |
| surface | `#141A2E` | `#FBFCFD` |
| surfaceHover | `#1C2440` | `#E8EBF1` |
| text | `#E6ECFF` | `#191D28` |
| textMuted | `#9AA7C7` | `#5C6478` |
| border | `#24304F` | `#DBDFE8` |
| borderStrong | `#33436E` | `#B5BCCA` |
| accent | `#00E5D0` | `#18766D` |
| accentHover | `#25EFDD` | `#1E8B81` |
| accentActive | `#00C4B4` | `#125E58` |
| accentText | `#04121A` | `#FFFFFF` |
| accent2 | `#7C5CFF` | `#594F98` |
| accent2Hover | `#957BFF` | `#6A60AC` |
| accent2Text | `#0A0620` | `#FFFFFF` |
| danger | `#FF5A6E` | `#A8414D` |
| dangerText | `#1A0509` | `#FFFFFF` |
| success | `#3DE1A0` | `#327256` |
| warning | `#FFC24B` | `#87641A` |
| focusRing | `#00E5D0` | `#18766D` |
| overlay | `rgba(4,8,20,.72)` | `rgba(25,29,40,.4)` |

포인트 컬러는 2종: **accent = teal**, **accent2 = violet**.
라이트 테마에서는 채도를 낮추고 명도를 내려 조정했다 — 다크의 네온 값을 그대로
밝은 배경에 올리면 채도가 튀어 조악해지기 때문이다.

### Typography (두 테마 공통)

- `vars.font.body` — `"Space Grotesk", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
- `vars.font.mono` — `"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace`
- `vars.fontSize.*` — xs `.75rem`(12) · sm `.875rem`(14) · md `1rem`(16) · lg `1.125rem`(18) · xl `1.5rem`(24) · xxl `2rem`(32)
- `vars.fontWeight.*` — regular `400` · medium `500` · bold `700`
- `vars.lineHeight.*` — tight `1.2` · normal `1.5`

### Spacing — `vars.space.*`

none `0` · xs `4px` · sm `8px` · md `12px` · lg `16px` · xl `24px` · xxl `32px` · xxxl `48px`

### Radius — `vars.radius.*`

none `0` · sm `6px` · md `10px` · lg `16px` · full `9999px`

### Shadow — `vars.shadow.*`

| | dark | light |
|---|---|---|
| sm | `0 1px 2px rgba(0,0,0,.4)` | `0 1px 2px rgba(25,29,40,.07)` |
| md | `0 4px 12px rgba(0,0,0,.5)` | `0 4px 12px rgba(25,29,40,.09)` |
| lg | `0 12px 32px rgba(0,0,0,.6)` | `0 12px 32px rgba(25,29,40,.13)` |
| glow | `0 0 0 1px rgba(0,229,208,.4), 0 0 20px rgba(0,229,208,.25)` | `0 0 0 1px rgba(24,118,109,.40), 0 0 18px rgba(24,118,109,.14)` |

## Theming: dark ↔ light

**HKDS 원본은 다크 전용이다.** 라이트 테마는 이 패키지의 `theme-tokens.css`가
동일한 CSS 변수에 밝은 값을 덮어쓰는 방식으로 구현했다. DS 컴포넌트도 같은 변수를
읽으므로 Button·Badge·Card·Input이 전부 함께 전환된다.

```jsx
const [theme, setTheme] = useState("dark"); // "dark" | "light"

<ThemeProvider data-theme={theme} style={{ minHeight: "100vh" }}>
  …
</ThemeProvider>
```

- `data-theme` 미지정 또는 `"dark"` → 원본 다크
- `data-theme="light"` → 라이트

CSS 변수 상속이므로 **중첩 가능**하다. 라이트 페이지 안의 특정 패널만 다크로
쓰려면 그 패널을 `data-theme="dark"`로 감싼다.

### 주의: 해시된 변수명

`theme-tokens.css` 는 `--_1ukhvxl0` 같은 해시 변수명을 직접 다룬다. 이 이름은
vanilla-extract가 생성한 것으로 **DS 버전이 올라가면 바뀔 수 있다.**

- 앱 코드에서는 절대 해시명을 참조하지 말고 `vars.color.*` 또는 `--k-*` 별칭을 쓴다
- DS 업그레이드 시 `_ds_bundle.css` 의 `:root` 블록을 열어 순서·개수가 같은지 확인하고
  `theme-tokens.css` 의 매핑을 갱신한다 (파일 상단 주석에 순서 대응이 적혀 있다)

## Interactions & Behavior

- **Button** — hover/active/disabled/focus 상태는 컴포넌트 CSS에 내장. 직접 구현 금지
- **focus ring** — `vars.color.focusRing` (teal). 키보드 포커스 링을 제거하지 말 것
- **Dialog** — controlled. `open` prop과 `onClose` 콜백을 앱이 관리한다.
  네이티브 `<dialog>`라 ESC 닫기·포커스 트랩·백드롭이 브라우저 기본 동작으로 제공됨
- **Input/Select** — `invalid` prop이 danger 톤 보더를 적용. 검증 로직은 앱 책임
- **테마 전환 트랜지션** — DS는 트랜지션을 정의하지 않는다. 부드럽게 하려면
  래퍼에 `transition: background 160ms linear, color 160ms linear` 정도를 직접 넣는다
- **테마 영속화** — DS 기능이 아니다. `localStorage` + 초기 렌더 시 복원을 앱에서 구현.
  `prefers-color-scheme` 를 초기값으로 쓸지는 제품 판단

## State Management

DS 자체는 상태를 갖지 않는다 (`Dialog`도 controlled). 앱에서 필요한 상태는:

| 상태 | 타입 | 트리거 |
|---|---|---|
| `theme` | `"dark" \| "light"` | 토글 클릭 · localStorage 복원 · (선택) OS 설정 |
| `dialogOpen` | `boolean` | Dialog를 쓰는 화면마다 |
| 폼 값 / `invalid` | 화면별 | Input·Select·Checkbox는 전부 uncontrolled/controlled 자유 |

## Assets

- **폰트** — Space Grotesk(400/500/700), JetBrains Mono. `_ds_bundle.css` 에
  woff2 base64로 내장. 네트워크 폰트 로드나 별도 라이선스 처리 불필요
- **아이콘** — DS는 아이콘 세트를 제공하지 않는다. 기존 코드베이스의 아이콘
  라이브러리를 쓰고, 색은 `currentColor` 또는 `vars.color.*` 로 맞춘다
- **이미지** — 없음. 레퍼런스 HTML도 이미지를 쓰지 않는다

## Checklist

- [ ] `kkobak/` 정적 경로에 배치, 3줄 로드 확인
- [ ] `example.html` 이 브라우저에서 정상 렌더 (다크/라이트 토글 동작)
- [x] ~~`CLAUDE.md` 저장소 루트에 배치~~ — 해당 없음 (토큰만 채택)
- [ ] 앱 트리 최상단이 `ThemeProvider`로 감싸짐
- [ ] 기존 화면의 하드코딩 색상을 `vars.color.*` 로 치환
- [ ] Button/Card/Badge 자체 구현이 있으면 DS 컴포넌트로 교체
- [ ] 라이트 테마에서 텍스트 대비 실측 확인
