# OnCue

A lightweight Windows utility that launches apps on schedule and in response to your workflow.

**OnCue** (from _on cue_ — right on time) runs programs by day and time window, sends advance notifications, and lets you cancel a launch before it happens. It also learns local usage habits, suggests new rules, and can chain companion apps when a trigger starts.

## Features

- **Schedules** — app + days + time window + launch mode
- **Sequences** — when a trigger app starts, launch an ordered list of companion apps (with cooldown and context gates)
- **Notifications** — advance warning (1 h / 30 min / 15 min) with cancel from the app or the notification
- **Habit suggestions** — local usage stats (opt-in) and confidence-scored rule proposals
- **Context gates** — skip on battery, block while a game is running
- **Settings** — launch OnCue with Windows, background tray operation
- **Offline-first** — no internet required for core features

## Stack

- [Tauri 2](https://tauri.app/) + Rust
- React + TypeScript + Vite + Tailwind

## Install

Download an installer from [Releases](https://github.com/Roman13-k/OnCue/releases):

- `OnCue_*_x64-setup.exe` — NSIS installer (recommended)
- `OnCue_*_x64_en-US.msi` — MSI

## Development

```bash
npm install
npm run tauri dev
```

Release build:

```bash
npm run tauri build
```

Artifacts are written to `src-tauri/target/release/bundle/`.
