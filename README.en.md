# MD Viewer

**한국어**: [README.md](README.md) · **English**: README.en.md

A **standalone desktop viewer** that renders Markdown the way the author intended. Runs on macOS and Windows, fully offline.

Supports GitHub Flavored Markdown plus math (KaTeX), diagrams (Mermaid), syntax highlighting, and Obsidian extensions ([[wikilinks]], callouts). Browse many documents at once with a folder tree and multiple tabs.

## Features

- **Rich syntax support** — GFM (tables, task lists, strikethrough, footnotes), KaTeX math, Mermaid diagrams, code syntax highlighting, Obsidian wikilinks & callouts
- **Folder tree + tabs** — Open a folder to see the document tree in the sidebar, and open documents in multiple tabs. Sidebar width is draggable and remembered
- **Outline panel** — Heading list at the bottom of the sidebar; click to jump, with the current position tracked as you scroll
- **Backlinks panel** — Lists documents that reference the current one via `[[wikilinks]]`; click to open them
- **Drag and drop** — Drop a file or folder onto the window to open it
- **Find in document (⌘F)** — Match highlighting, match count, previous/next navigation, with **regex** and **case-sensitive** options; **works in PDFs too**
- **Reading width** — Choose narrow / normal / wide / full from the View menu (remembered)
- **Project-wide search (⌘⇧F)** — Search across all Markdown files in the folder; click a result to jump to that document
- **Session restore** — Reopens the last folder and open tabs on the next launch
- **File association** — Double-click a `.md` file in Finder/Explorer to open it in MD Viewer (active after install)
- **PDF** — View PDF files (integrated into the app theme, with page navigation, zoom, and text selection & search) and export Markdown to PDF (⌘E, always output in light theme)
- **HTML export (⌘⇧E)** — A **single self-contained HTML file** with styles, math fonts, and images embedded; opens identically in any browser, offline
- **File watching** — Automatically re-renders when a document is saved from an external editor (VS Code, Obsidian, etc.)
- **Dark / light theme** (⌘⇧L)
- **Fully offline** — Fonts and scripts are all bundled; no network requests

## Installation

Download the file for your platform from [Releases](https://github.com/KIMHeeKwon/MD-Viewer/releases/latest).

| Platform | File |
|----------|------|
| macOS (Apple Silicon) | `MD-Viewer-<version>-arm64.dmg` |
| Windows | `MD-Viewer-Setup-<version>.exe` |

### First-launch warnings (macOS)

This app is not signed/notarized by Apple, so macOS shows a warning on first launch. The app is not actually damaged — it's the **quarantine attribute** that macOS attaches to files downloaded from the internet.

- **"unidentified developer" warning**: **right-click → Open** → click **Open** in the dialog. (Only needed once.)
- **"damaged and can't be opened, move to Trash" warning**: remove the quarantine attribute, then launch:

```bash
xattr -dr com.apple.quarantine "/Applications/MD Viewer.app"
```

On Windows, SmartScreen may show a "Windows protected your PC" dialog → click **More info → Run anyway**.

## Keyboard shortcuts

| Action | Shortcut |
|--------|----------|
| Open folder | ⌘O |
| Find in document | ⌘F |
| Project-wide search | ⌘⇧F |
| Export to PDF | ⌘E |
| Export to HTML | ⌘⇧E |
| Toggle theme | ⌘⇧L |
| Zoom in / out | ⌘+ / ⌘− |

## Development

```bash
npm install
npm start          # bundle the renderer, then launch Electron
```

Build & package:

```bash
npm run bundle     # bundle the renderer with esbuild
npm run dist       # build installers with electron-builder
```

Pushing a `v*` tag triggers GitHub Actions to build macOS and Windows installers automatically.

### Tech stack

Electron · markdown-it · KaTeX · Mermaid · highlight.js · PDF.js · chokidar · esbuild

## License

MIT
