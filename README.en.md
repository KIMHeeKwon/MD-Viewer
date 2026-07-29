# MD Viewer

**한국어**: [README.md](README.md) · **English**: this document

A **standalone desktop viewer** that renders Markdown the way the author intended. Runs on macOS, Windows, and Linux, fully offline.

Supports GitHub Flavored Markdown plus math (KaTeX), diagrams (Mermaid), syntax highlighting, and Obsidian extensions (`[[wikilinks]]`, callouts). Browse many documents at once with a folder tree and multiple tabs.

## What it's for

This viewer exists to **re-read notes distilled from conversations with an LLM**. Working
through a system design or a research topic with AI quickly produces a pile of Markdown
mixing math, diagrams, and cross-references. The goal is to read those documents
**as the author intended, moving across a whole folder** rather than one file at a time.

So the repository also includes a guide on **how to prompt an AI so the Markdown it
produces renders correctly here** — a copy-paste prompt block, the exact supported syntax,
the things LLMs often emit that will not render (raw HTML, among others), and file/folder
conventions for notes that keep accumulating:

**→ [Writing Markdown with AI — authoring guide](docs/AI-AUTHORING.md)** (written in Korean)

A per-OS manual covering installation, usage, and shortcuts is also included:
**→ [User guide (macOS · Windows · Linux)](docs/USER-GUIDE.md)** (written in Korean)

## Features

- **Rich syntax support** — GFM (tables, task lists, strikethrough, footnotes), KaTeX math, Mermaid diagrams, code syntax highlighting, Obsidian wikilinks & callouts
- **Folder tree + tabs** — Open a folder to see the document tree in the sidebar, and open documents in multiple tabs. Sidebar width is draggable and remembered
- **Outline panel** — Heading list at the bottom of the sidebar; click to jump, with the current position tracked as you scroll
- **Backlinks panel** — Lists documents that reference the current one via `[[wikilinks]]`; click to open them
- **Link graph (⌘⇧G)** — Visualizes how documents in the folder connect. Click a node to open it, focus on the current document's neighbours, pan and zoom
- **Drag and drop** — Drop a file or folder onto the window to open it
- **Find in document (⌘F)** — Match highlighting, match count, previous/next navigation, with **regex** and **case-sensitive** options; **works in PDFs too**
- **Reading width** — Choose narrow / normal / wide / full from the View menu (remembered)
- **Body text size** — Scales headings, tables, and code proportionally. Adjust from the View menu, the status bar, or `⌘⌥+` / `⌘⌥-` (UI stays the same size)
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
| Linux | `MD-Viewer-<version>.AppImage` (chmod +x, then run) or `.deb` |

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
| Link graph | ⌘⇧G |
| Export to PDF | ⌘E |
| Export to HTML | ⌘⇧E |
| Toggle theme | ⌘⇧L |
| Body text larger / smaller | ⌘⌥+ / ⌘⌥− |
| Zoom whole UI in / out | ⌘+ / ⌘− |

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

Pushing a `v*` tag triggers GitHub Actions to build macOS, Windows, and Linux installers automatically.

### Tech stack

Electron · markdown-it · KaTeX · Mermaid · highlight.js · PDF.js · chokidar · esbuild

## License

MIT
