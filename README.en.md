# MD Viewer

**한국어**: [README.md](README.md) · **English**: README.en.md

A **standalone desktop viewer** that renders Markdown the way the author intended. Runs on macOS and Windows, fully offline.

Supports GitHub Flavored Markdown plus math (KaTeX), diagrams (Mermaid), syntax highlighting, and Obsidian extensions ([[wikilinks]], callouts). Browse many documents at once with a folder tree and multiple tabs.

## Features

- **Rich syntax support** — GFM (tables, task lists, strikethrough, footnotes), KaTeX math, Mermaid diagrams, code syntax highlighting, Obsidian wikilinks & callouts
- **Folder tree + tabs** — Open a folder to see the document tree in the sidebar, and open documents in multiple tabs. Sidebar width is draggable and remembered
- **Find in document (⌘F)** — Match highlighting, match count, previous/next navigation
- **PDF** — View PDF files (integrated into the app theme, with page navigation and zoom) and export Markdown to PDF (⌘E, always output in light theme)
- **File watching** — Automatically re-renders when a document is saved from an external editor (VS Code, Obsidian, etc.)
- **Dark / light theme** (⌘⇧L)
- **Fully offline** — Fonts and scripts are all bundled; no network requests

## Installation

Download the file for your platform from [Releases](https://github.com/KIMHeeKwon/MD-Viewer/releases/latest).

| Platform | File |
|----------|------|
| macOS (Apple Silicon) | `MD-Viewer-<version>-arm64.dmg` |
| Windows | `MD-Viewer-Setup-<version>.exe` |

> The macOS build is unsigned, so you'll see a Gatekeeper warning on first launch. Use **right-click → Open** to run it.

## Keyboard shortcuts

| Action | Shortcut |
|--------|----------|
| Open folder | ⌘O |
| Find in document | ⌘F |
| Export to PDF | ⌘E |
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
