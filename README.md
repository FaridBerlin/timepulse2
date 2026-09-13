# Timepulse

**A big, always-on-top digital clock for the Linux desktop** — a
transparent, fully customizable clock, stopwatch, and countdown timer
built with [Tauri](https://v2.tauri.app/) (Rust) for Ubuntu, GNOME, and
other Linux/Wayland desktops.

It exists because the regular Linux system clock is too small to read
from across the room. Timepulse blows the digits up to whatever size you
want, lets you pick any color through a built-in color picker, and can
run with a fully transparent background so it's just glowing numbers
floating over your desktop — with a stopwatch and countdown timer built
in, and a real always-on-top mode that actually stays on top on Wayland.

![Timepulse floating over the desktop, fully transparent background](img/Screenshot%20from%202026-09-11%2014-42-39.png)

## What it does

- **Huge, legible digits** in a color you choose — clicking the color
  swatch opens a built-in picker (saturation/hue square, hex field, and
  quick presets), not an OS dialog.
- **Background is fully configurable**: transparent (only the digits and
  date float over your wallpaper), a couple of solid presets, or any
  custom color with its own opacity slider.
- **Click the clock** to reveal a panel with Clock / Stopwatch / Timer
  tabs plus the color and background controls. The panel opens *below*
  the clock rather than over it, so the clock stays visible the whole
  time you're adjusting something — and the window resizes itself to fit
  exactly what's showing.
- **Stopwatch** and a **countdown timer** (type a target as `HH:MM:SS`),
  each with start/pause/reset.
- **No OS title bar** — the whole window is a drag handle, click and drag
  from anywhere on it to move it.
- **Right-click for a quick menu**: toggle Always on top, Quit, or
  Cancel.
- **Always on top actually stays on top** — including over other
  windows you click into, like a browser or an editor (see
  [Notes](#notes-on-linuxwayland) below for why that needed a specific
  fix).
- Settings (color, background, opacity, always-on-top) persist across
  restarts.

## Screenshots

| | |
|---|---|
| ![Color picker](img/Screenshot%20from%202026-09-11%2014-35-19.png) Custom color picker | ![Background options](img/Screenshot%20from%202026-09-11%2014-42-30.png) Transparent / solid / custom backgrounds |
| ![Stopwatch](img/Screenshot%20from%202026-09-11%2014-36-49.png) Stopwatch | ![Timer](img/Screenshot%20from%202026-09-11%2014-37-02.png) Countdown timer |
| ![Right-click menu](img/Screenshot%20from%202026-09-11%2014-37-32.png) Right-click quick menu (Always on top / Quit / Cancel) | |

## Install

Two ways, depending on whether you want it installed properly or just
want to run it.

### Option 1 — AppImage (nothing to install)

Download `timepulse2_0.1.0_amd64.AppImage` from the
[latest release](https://github.com/FaridBerlin/timepulse2/releases/latest),
then:

```bash
chmod +x timepulse2_0.1.0_amd64.AppImage
./timepulse2_0.1.0_amd64.AppImage
```

The `chmod` is required — a freshly downloaded AppImage has no execute
permission, and running it without that step just gives you "Permission
denied". You can do the same thing in your file manager: right-click →
Properties → Permissions → tick **Allow executing file as program**, then
double-click it.

Works on any 64-bit Linux distribution. Nothing is installed anywhere and
no root access is needed — to uninstall, delete the file.

### Option 2 — .deb package (Ubuntu / Debian)

> **Double-clicking the `.deb` will not install it.** Ubuntu 24.04 opens
> `.deb` files in Archive Manager, and ships no graphical installer for
> local `.deb` files at all. This is a change in Ubuntu, not a problem
> with the package — use the terminal instead.

Download `timepulse2_0.1.0_amd64.deb` from the
[latest release](https://github.com/FaridBerlin/timepulse2/releases/latest),
then:

```bash
sudo apt install ./timepulse2_0.1.0_amd64.deb
```

The leading `./` matters. Without it, apt looks for a package by that name
in the software repositories and fails with a confusing "unable to locate
package" error. Using `apt` rather than `dpkg -i` also pulls in the two
dependencies (`libwebkit2gtk-4.1-0`, `libgtk-3-0`) automatically, though
most Ubuntu 24.04 systems already have both.

This installs Timepulse properly: it shows up in your applications menu
with an icon, and `timepulse2` works from any terminal.

To uninstall:

```bash
sudo apt remove timepulse2
```

### Which one should I use?

|                    | AppImage         | .deb              |
| ------------------ | ---------------- | ----------------- |
| Download size      | 76 MB            | 2.8 MB            |
| Installs anything? | no               | yes               |
| Applications menu  | no               | yes               |
| Needs root?        | no               | yes               |
| Distributions      | any 64-bit Linux | Ubuntu / Debian   |

The AppImage is larger because it carries its own copy of GTK and WebKit
rather than using the ones on your system. That is exactly what makes it
run anywhere without installing anything.

On other distributions, you can also build from source — see
[Build from source](#build-from-source) below.

## Built with

[Tauri v2](https://v2.tauri.app/): a small Rust shell (`src-tauri/`)
hosting a plain HTML/CSS/JS frontend (`src/`) — no npm, no frontend
build step, no framework. All the clock/stopwatch/timer/color-picker
logic lives in `src/app.js`.

## Build from source

### Prerequisites (Ubuntu/Debian)

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

Install the Tauri CLI (as a cargo subcommand — no Node/npm required,
since the frontend has no build step):

```bash
cargo install tauri-cli --version "^2.0.0" --locked
```

(On Fedora/RHEL instead:
`sudo dnf install webkit2gtk4.1-devel openssl-devel curl wget file libappindicator-gtk3-devel librsvg2-devel libxdo-devel && sudo dnf group install "c-development"`)

### Run it in development

From the `timepulse2/` directory:

```bash
cargo tauri dev
```

### Build a distributable package

```bash
cargo tauri build
```

`bundle.targets` in `src-tauri/tauri.conf.json` is set to `deb` and
`appimage`, so this produces both without any extra flags:

- `src-tauri/target/release/bundle/deb/timepulse2_0.1.0_amd64.deb`
- `src-tauri/target/release/bundle/appimage/timepulse2_0.1.0_amd64.AppImage`

The first AppImage build downloads `linuxdeploy` and `appimagetool`, so it
needs a network connection and takes noticeably longer than the `.deb`.

## Notes on Linux/Wayland

- **Always on top**: on a Wayland session (the Ubuntu/GNOME default),
  apps aren't normally allowed to control their own window stacking at
  all — Wayland leaves that entirely to the compositor, so a plain
  "always on top" request is silently ignored. Timepulse works around
  this by forcing the window through XWayland (`GDK_BACKEND=x11`, set in
  `src-tauri/src/main.rs`), which restores normal X11 window management
  and makes always-on-top behave as expected.
- **Transparency** depends on your desktop actually compositing (most
  modern GNOME/KDE/Wayland setups do). On a non-compositing X11 window
  manager, the "Transparent" background option will likely render as
  solid black instead.

## Related project

**Timepulse is not a replacement for
[timepulse](https://github.com/FaridBerlin/timepulse).** The `2` in this
repository's name distinguishes the two projects — it is not a version
number, and this is not a sequel.

- **[timepulse](https://github.com/FaridBerlin/timepulse)** — a clock,
  stopwatch and timer for the *terminal*, written in Go. Still its own
  thing.
- **timepulse2** (this one) — a *graphical* desktop clock for Linux,
  built with Tauri.

They solve the same problem in two different places, and both are kept.
