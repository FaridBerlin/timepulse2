# timepulse2 (Tauri prototype)

A side-by-side experiment with the main `timepulse` Go/Fyne project, testing
whether a different desktop framework gets you the "just the watch, no
title bar, background can be transparent, click to reveal controls" look
more directly than Fyne currently can.

Built with [Tauri v2](https://v2.tauri.app/): a Rust shell hosting a plain
HTML/CSS/JS frontend (no npm build step, no framework — just static files).
All the clock/stopwatch/timer logic lives in `src/app.js`; the Rust side
(`src-tauri/`) is just the window shell.

## What it does

- The window has **no title bar** (`"decorations": false`) and a
  **transparent background** (`"transparent": true`), both set in
  `src-tauri/tauri.conf.json`.
- By default you just see the big colored digits — no chrome at all.
- **Clicking the digits** toggles an overlay with Clock/Stopwatch/Timer
  tabs, a color picker, a background picker (including a genuine
  "Transparent" option so *only* the digits float over your desktop), an
  opacity slider, an "always on top" toggle, and a close button (there's no
  OS close button without a title bar, so one is built into the overlay).
- Since there's no title bar to drag, the whole background area is a Tauri
  drag region — click-and-drag anywhere on the digits to move the window.
- Settings persist across restarts via `localStorage`.

## Important: this hasn't been built or run yet

I wrote every file here by hand, from Tauri's current documentation — I
don't have a way to install the Rust/Node toolchains or compile a Tauri app
in this session, and I don't have shell access to your machine either. The
JS and JSON have been syntax-checked, and the Rust files match Tauri's
standard minimal scaffold, but **the first `cargo tauri dev` you run is
also this project's first real compile.** If something doesn't build,
paste me the error and I'll fix it.

## Prerequisites (Ubuntu/Debian, since that's what you're on)

If you don't already have Rust — **use the official installer, not the
`apt`/`snap` rustup packages** (those ship older Rust versions that can
cause confusing Tauri build failures):

```bash
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
source "$HOME/.cargo/env"
```

System dependencies:

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

Install the Tauri CLI (as a cargo subcommand, no Node/npm required for this
project since the frontend has no build step):

```bash
cargo install tauri-cli --version "^2.0.0" --locked
```

(If you're on Fedora/RHEL instead, swap the `apt install` above for:
`sudo dnf install webkit2gtk4.1-devel openssl-devel curl wget file libappindicator-gtk3-devel librsvg2-devel libxdo-devel && sudo dnf group install "c-development"`)

## Run it

From the `timepulse2/` directory:

```bash
cargo tauri dev
```

This compiles the Rust shell and opens the window pointed at `src/`
directly (no dev server needed, since there's no bundler in the loop).

## Build a distributable binary

```bash
cargo tauri build
```

Note: `tauri.conf.json` doesn't declare any app icons yet (`bundle.icon`),
which `cargo tauri dev` doesn't need but `cargo tauri build` will complain
about — add real icon files under `src-tauri/icons/` before packaging for
distribution. `cargo tauri icon <path-to-a-source-png>` generates the full
set from one source image.

## Known unknowns / things to check once you can actually run it

- Whether Linux window transparency renders as expected depends on your
  desktop environment/compositor actually supporting an alpha channel on
  the window (most modern GNOME/KDE/Wayland setups with a compositor do;
  some minimal X11 window managers without a compositing manager running
  won't show transparency at all and the "Transparent" background option
  will likely just render as solid black instead).
- The always-on-top checkbox and close button call the Tauri v2 JS window
  API (`window.__TAURI__.window`, exposed via `"withGlobalTauri": true` in
  the config) — this is standard v2 behavior but is one of the pieces I
  couldn't verify by actually running it.

## Comparing this to the Go/Fyne version

The Go project (`timepulse`) is staying as-is per your call — this is a
separate exploration, not a replacement. If this feels better once you've
run it, we can talk about what it'd take to actually move forward with it
(porting the terminal-mode tools would still make sense to leave in Go,
since this only covers the desktop GUI). If it doesn't, the full-screen
kiosk-mode approach I proposed for the Fyne app is still on the table.
