# KKOBAK (HKDS) 디자인 시스템 — 작업 규칙

이 저장소의 UI는 **KKOBAK / HKDS 디자인 시스템**을 따른다. 색·타이포·간격·컴포넌트를
새로 발명하지 말고 아래 규칙대로 조합한다.

## 로드

React가 페이지에 먼저 올라간 뒤, 순서대로:

```html
<link rel="stylesheet" href="/kkobak/styles.css">   <!-- _ds_bundle.css 를 @import -->
<link rel="stylesheet" href="/kkobak/theme-tokens.css"> <!-- 별칭 + 라이트 테마 -->
<script src="/kkobak/_ds_bundle.js"></script>       <!-- window.HKDS.* -->
```

폰트(Space Grotesk / JetBrains Mono)는 CSS에 base64로 내장되어 있다. 별도 폰트 로드 불필요.

번들러(Vite/Next) 프로젝트라면 이 브라우저 글로벌 번들 대신 원본 패키지
`hk-design-system@0.1.0` 설치가 정석이다. 번들은 프로토타입/빠른 이식용.

## 반드시 지킬 것

1. **ThemeProvider로 감싼다.** 다크 테마 전제이므로, 감싸지 않으면 ghost Button과
   기본 Text가 흰 배경 위 흰 글자로 사라진다.
2. **CSS 클래스 유틸리티는 없다.** 스타일 레버는 두 개뿐:
   컴포넌트 props, 그리고 `window.HKDS.vars` 토큰 객체.
3. **hex 하드코딩 금지, 해시 CSS 변수 직접 참조 금지.**
   `vars.color.accent` 또는 `var(--k-accent)` 를 쓴다.
   (`--_1ukhvxl7` 같은 해시명은 DS 버전이 바뀌면 깨진다.)
4. **컴포넌트를 재구현하지 않는다.** Button/Badge/Card/Input/Select/Checkbox/
   Dialog/Text/Stack 9종은 이미 있다. 없는 것만 vars로 조립한다.

```jsx
const { ThemeProvider, Card, Stack, Text, Button, vars } = window.HKDS;

<ThemeProvider style={{ minHeight: "100vh", padding: vars.space.xl }}>
  <Card padding="lg">
    <Stack gap="md">
      <Text as="h2" size="xl" weight="bold">제목</Text>
      <Text tone="muted">보조 설명.</Text>
      <Stack direction="row" gap="sm">
        <Button variant="primary">확인</Button>
        <Button variant="ghost">취소</Button>
      </Stack>
    </Stack>
  </Card>
</ThemeProvider>
```

## 컴포넌트 API

| 컴포넌트 | props |
|---|---|
| `Button` | `variant`: primary·secondary·ghost·danger / `size`: sm·md·lg / `fullWidth` + 네이티브 button 속성 전부 (forwardRef) |
| `Text` | `size`: xs·sm·md·lg·xl·xxl / `weight`: regular·medium·bold / `tone`: default·muted·accent·danger / `align`: left·center·right / `as` |
| `Stack` | `direction`: row·column / `gap`: none·xs…xxxl / `align` / `justify` / `wrap` |
| `Card` | `padding`: none·sm·md·lg / `interactive` |
| `Badge` | `tone`: neutral·accent·violet·success·warning·danger / `size`: sm·md |
| `Input` | 네이티브 input 속성 + `invalid` |
| `Select` | 네이티브 select 속성 + `invalid`, option을 children으로 |
| `Checkbox` | 네이티브 checkbox 속성 + `label` |
| `Dialog` | controlled `open` + `onClose`, `title`, `footer` — 네이티브 `<dialog>` 기반 |

## 테마 전환 (다크 ↔ 라이트)

HKDS 원본은 **다크 전용**이다. 라이트는 `theme-tokens.css`가 같은 토큰에 밝은 값을
덮어쓰는 방식으로 추가된 것이며, 전환은 감싸는 엘리먼트의 `data-theme` 속성으로 한다.

```jsx
<ThemeProvider data-theme={theme}>   {/* theme: "dark" | "light" */}
```

- `data-theme` 없음 또는 `"dark"` → 원본 다크
- `data-theme="light"` → 라이트

DS 컴포넌트도 같은 변수를 읽으므로 함께 전환된다. 부분 영역만 반대 테마로 쓰려면
그 영역만 `data-theme="light"`로 감싸도 된다(변수 상속이므로 중첩 가능).

## 토큰 값

**컬러** (다크 / 라이트)

| 토큰 | dark | light |
|---|---|---|
| bg | #0B0E1A | #F2F4F7 |
| surface | #141A2E | #FBFCFD |
| surfaceHover | #1C2440 | #E8EBF1 |
| text | #E6ECFF | #191D28 |
| textMuted | #9AA7C7 | #5C6478 |
| border | #24304F | #DBDFE8 |
| borderStrong | #33436E | #B5BCCA |
| accent | #00E5D0 | #18766D |
| accentHover | #25EFDD | #1E8B81 |
| accentActive | #00C4B4 | #125E58 |
| accentText | #04121A | #FFFFFF |
| accent2 | #7C5CFF | #594F98 |
| accent2Hover | #957BFF | #6A60AC |
| accent2Text | #0A0620 | #FFFFFF |
| danger | #FF5A6E | #A8414D |
| dangerText | #1A0509 | #FFFFFF |
| success | #3DE1A0 | #327256 |
| warning | #FFC24B | #87641A |
| focusRing | #00E5D0 | #18766D |
| overlay | rgba(4,8,20,.72) | rgba(25,29,40,.4) |

**타이포** — body: `"Space Grotesk", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` /
mono: `"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace`
크기 xs 12 · sm 14 · md 16 · lg 18 · xl 24 · xxl 32 (px) /
굵기 regular 400 · medium 500 · bold 700 / line-height tight 1.2 · normal 1.5

**간격** none 0 · xs 4 · sm 8 · md 12 · lg 16 · xl 24 · xxl 32 · xxxl 48 (px)

**라운드** none 0 · sm 6 · md 10 · lg 16 · full 9999 (px)

**그림자** (다크)
- sm `0 1px 2px rgba(0,0,0,.4)`
- md `0 4px 12px rgba(0,0,0,.5)`
- lg `0 12px 32px rgba(0,0,0,.6)`
- glow `0 0 0 1px rgba(0,229,208,.4), 0 0 20px rgba(0,229,208,.25)`

라이트 값은 `theme-tokens.css` 참조.

## 하지 말 것

- Tailwind 등 유틸리티 클래스로 DS 컴포넌트 스타일 덮어쓰기
- hex 하드코딩 (특히 #00E5D0 같은 accent를 직접 박아 넣기)
- `--_1ukhvxl*` 해시 변수 직접 참조 (theme-tokens.css 내부에서만 허용)
- Button/Card/Badge 등을 div로 재현
- 배경 없는 흰 화면에 DS 컴포넌트를 그대로 놓기 (ThemeProvider 누락)
