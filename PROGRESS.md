# Timepulse — Progress Log

A running record of what's been done across this whole project: the
original Go codebase review, the Tauri rewrite, and the Snap Store
packaging attempt (currently blocked — see the end of this file).

## 1. Go/Fyne project (`timepulse`) — code review and fixes

The original project was a terminal clock/stopwatch/timer (built with
`urfave/cli` + `termbox-go`) plus a Fyne v2 desktop GUI. A full review
found and fixed several real bugs:

- `-hf`/`--hour-format` was broken (`util/clock.go`) — it compared the
  wrong flag, so 12-hour mode never actually activated.
- The timer's total-seconds calculation had a `sec*60` bug, and `--time`
  was additive with the individual `-H/-M/-S` flags instead of taking
  priority over them (`util/timer.go`).
- An error message was in Chinese instead of English (`util/util.go`).
- Both the stopwatch and timer busy-looped on a 1ms sleep instead of a
  sane tick interval — bumped to 10ms.
- A dead global `--color` flag was removed from `main.go`.
- Added table-driven unit tests for the fixed logic
  (`util/util_test.go`, `util/timer_test.go`).
- Updated the README's documented `--help` output to match, added
  `/timepulse` (the committed binary) to `.gitignore`.
- Drafted a GitHub Actions CI workflow, but `.github/workflows/ci.yml` is
  a protected path this environment can't write directly — it was
  delivered as a download for manual placement instead.

Full history and backlog: `codebase-review.md` in the Claude Project.

## 2. Why a second project (`timepulse2`) exists

The real motivation behind the whole project: the stock Linux system
clock is too small to read from across a room. The goal became a large,
highly visible, color-customizable desktop clock.

Fyne v2 was investigated for a borderless, transparent, click-to-reveal
window (the actual desired look) and turned out not to support this in
its stable public API — confirmed against fyne-io/fyne GitHub issues
#204, #231, #2175, #181, and a draft PR (#6338) that hadn't landed. A
full-screen "kiosk mode" workaround was proposed for Fyne but shelved
when the idea of trying a different framework came up instead.

`timepulse2` is that different-framework exploration: [Tauri
v2](https://v2.tauri.app/) — a small Rust shell around a plain
HTML/CSS/JS frontend, no npm build step. It directly supports borderless
+ transparent windows, which Fyne doesn't, so this became the actively
developed version. The Go project stays as-is for its terminal-mode
tools.

## 3. `timepulse2` features built

All of the following are implemented and confirmed working when run
normally (`cargo tauri dev` / the built `.deb`) — see section 5 for the
separate, unresolved Snap packaging problem.

- Borderless, transparent window (`decorations: false`, `transparent:
  true` in `tauri.conf.json`) — just the digits and date float over the
  desktop when background is set to "Transparent".
- Click-anywhere-to-drag (no title bar to grab), via
  `data-tauri-drag-region`.
- Click the clock to reveal a settings panel (Clock/Stopwatch/Timer tabs,
  color, background, opacity, always-on-top). The panel stacks **below**
  the clock in normal document flow (not as an overlay covering it) so
  the clock stays visible while adjusting things; the OS window itself
  resizes to fit via `fitWindowToContent()` in `app.js` whenever the
  panel opens/closes or its content changes.
- Custom color picker (saturation/value square + hue bar + hex field +
  presets) replacing the native OS color dialog for both the digit color
  and the custom background color.
- Small round colon dots between HH:MM:SS instead of the monospace
  font's blocky `:` character, styled to match the date line's color and
  opacity, with tunable spacing.
- Countdown timer (`HH:MM:SS` input) and stopwatch, each with
  start/pause/reset.
- Right-click quick menu: Always on top (with a live checkmark), Quit,
  Cancel — positioned to stay clamped inside the (often small) window
  instead of getting clipped at the edges.
- **Always-on-top that actually works on Wayland/GNOME**: Wayland
  normally never lets an app control its own window stacking at all,
  which is why the checkbox did nothing at first. Fixed by forcing the
  window through XWayland instead (`GDK_BACKEND=x11`, set in
  `src-tauri/src/main.rs` before GTK initializes) — this restores normal
  X11 window management, which does support `_NET_WM_STATE_ABOVE`. This
  is also almost certainly why the *old* Fyne/GLFW build's always-on-top
  worked out of the box — GLFW likely defaulted to XWayland too.
- Settings persist across restarts via `localStorage`.
- A hand-generated app icon set (`src-tauri/icons/`) so `cargo tauri
  build` doesn't fail on a missing icon.

## 4. Docs, README, GitHub discoverability

- `README.md` rewritten with a proper description, a hero screenshot
  (the fully-transparent floating clock) plus a small gallery of the
  color picker, background options, stopwatch, timer, and right-click
  menu, and search-friendly wording (digital clock, Linux desktop,
  transparent, stopwatch, countdown timer, always-on-top, Tauri, Ubuntu,
  GNOME, Wayland).
- Suggested GitHub repo "About" description and a topics list
  (`desktop-clock`, `linux-desktop`, `tauri`, `tauri-app`, `rust`,
  `stopwatch`, `countdown-timer`, `always-on-top`, `transparent-window`,
  `gnome`, `wayland`, `ubuntu`, `clock-app`) — these are what actually
  drive GitHub's own repo search, more than README prose does.
- `docs/` is gitignored on purpose (private, local-only notes) —
  `docs/dev-notes.md` holds internal status/history that doesn't belong
  in the public README. `img/` is **not** gitignored — the README's
  screenshots live there and do get pushed.

## 5. Snap Store packaging — BLOCKED, unresolved

Goal: get Timepulse into the Ubuntu App Center, which is a Snap Store
front-end. `snap/snapcraft.yaml` takes the simplest approach — build the
`.deb` with Tauri's own bundler, then have snapcraft just unpack it
(`plugin: dump`), rather than rebuilding the whole Rust/WebKitGTK stack
inside snapcraft's own build environment.

### Fixed along the way

- `architectures:` isn't valid for `base: core24` — replaced with the
  newer `platforms:` key.
- The `stage:` list referenced `usr/lib`, which this particular `.deb`
  doesn't actually contain — removed.
- LXD (snapcraft's build backend) needed the user account added to the
  `lxd` group, and a fresh login/`newgrp lxd` to pick that up.
- Filled in optional-but-recommended metadata snapcraft's linter flagged
  (`title`, `contact`, `issues`, `source-code`, `website`).
- `snapcraft` (no subcommand) is being deprecated in favor of `snapcraft
  pack`.

### The actual blocker

Once packaged, the app **launches and renders correctly inside the
snap** (the clock displays and ticks in real time, the date is correct)
but **no input reaches it at all** — clicking the digits doesn't open
the settings panel, right-click shows nothing, dragging doesn't move the
window. Everything about the app is otherwise fully working outside the
snap (`cargo tauri dev`, the plain installed `.deb`).

Diagnosis so far — **ruled out**:
- `snap connections timepulse2` showed all interfaces (`desktop`,
  `desktop-legacy`, `wayland`, `x11`, `opengl`, `gsettings`) properly
  connected.
- Rebuilt and reinstalled with `confinement: devmode` (disables snapd's
  own AppArmor/seccomp confinement entirely) — **still completely
  unresponsive**, which rules out snapd's confinement layer.
- **WebKit's internal sandbox / broken WebKit IPC.** This was the working
  theory for a while and it is *wrong* — it is falsified by the symptom
  itself. In WebKitGTK the UIProcess is only the GTK widget: it does not
  run JavaScript and does not render the page. Rendered frames travel
  over the *same* UIProcess↔WebProcess IPC channel that input events do.
  Since the clock renders and ticks in real time, that channel is
  provably healthy in both directions. A broken one would give a blank
  window, not a working clock.
  - Related correction: the log line `WEBKIT_FORCE_SANDBOX no longer
    allows disabling the sandbox. Use
    WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS=1 instead.` was almost
    certainly emitted *because we set that variable ourselves* during the
    first fix attempt. It was our own experiment echoing back, not an
    independent clue — it got read as one.
  - Also: WebKitGTK's bubblewrap sandbox is opt-in via
    `webkit_web_context_set_sandbox_enabled()`, which Tauri/wry never
    calls. There was most likely no sandbox enabled to disable, which
    matches the observed result (setting the variable changed nothing).
  - `WEBKIT_DISABLE_SANDBOX_THIS_IS_DANGEROUS` has now been **removed**
    from `snap/snapcraft.yaml`. It only ever applied to the snap's own
    app process — never to `cargo tauri dev`, never to the installed
    `.deb`, and never to anything else on the system.
- **WebKitGTK version skew between the build host and the snap runtime.**
  Real, but measured and cleared as the cause:

  | | WebKitGTK |
  |---|---|
  | Build host (what the `.deb` links against) | 2.52.6 → `libwebkit2gtk-4.1.so.0.21.10` |
  | What the snap actually loads (`gnome-46-2404`) | `libwebkit2gtk-4.1.so.0.19.7` |

  Several releases apart, and worth fixing for hygiene. But all 97
  webkit/JSC symbols the binary imports were diffed against the older
  library's exports and **none are missing**, so there is no lazy-binding
  symbol failure. Not the blocker.

**What this leaves.** Input is being lost *before* WebKit, at the
GTK/X11 layer — the window receives paint events but not pointer events.

**Current state: unresolved, and intentionally not being actively
debugged further right now per instruction.** Next steps, cheapest first:

1. **`GTK_USE_PORTAL=1`** — the `gnome` extension injects this into the
   snap (visible in the built snap's `meta/snap.yaml`), and it is *not*
   present when running the plain `.deb`. Testable in seconds with no
   rebuild at all:
   `GTK_USE_PORTAL=1 GDK_BACKEND=x11 timepulse2`
   If that reproduces the dead input on the host, it is isolated.
2. **`GDK_BACKEND=x11`** — the prime suspect. Forcing XWayland is the one
   genuinely unusual thing this app does that almost no other snapped GTK
   app does, and it is set in two places (`src-tauri/src/main.rs` and
   `snap/snapcraft.yaml`). Temporarily flip the snapcraft one to
   `wayland` and rebuild: if input returns, the bug is fully localized to
   XWayland-inside-a-snap. This trades away always-on-top, so it is a
   bisect, not a fix.
3. The WebKit remote inspector (`WEBKIT_INSPECTOR_SERVER=127.0.0.1:9222
   timepulse2`, then open `http://127.0.0.1:9222` in a normal, non-snapped
   browser) to check the JS console and test whether
   `document.getElementById("display").click()` run manually actually
   opens the panel — separating JS/event-listener wiring from input never
   reaching the page. **Proposed in an earlier session, never actually
   completed.**
4. `journalctl --user -xe` captured at the exact moment of a failed click.
5. Building the snap with the `rust` plugin (compiling inside snapcraft's
   own build environment) instead of `dump`-ing a pre-built `.deb`. This
   also fixes the version skew above as a side effect.

Note one more suspect area that is *not* snap-specific but is fragile on
Linux generally: `#display` carries both `data-tauri-drag-region` and a
`click` handler (`src/app.js`), and `begin_move_drag` takes a pointer
grab that can swallow the follow-up click. It is the exact code path
reported dead.

### Other Store-release blockers found (independent of the input bug)

- **No launcher entry or icon.** The built snap's `meta/gui/` was
  **empty**, so the app would install with no entry in the GNOME app grid
  and no icon in the App Center even once input works. Fixed by adding
  `snap/gui/timepulse2.desktop` + `snap/gui/timepulse2.png`, which
  snapcraft copies into `meta/gui/` directly. Written by hand rather than
  pointing a `desktop:` key at Tauri's generated file, because that one
  has `Name=timepulse2` (lowercase) and an empty — therefore invalid —
  `Categories=` line, and lives under the gitignored `target/` dir where
  it can't be corrected in-repo.
  (`desktop-file-validate` warns about `Icon=${SNAP}/...` looking
  relative; that is a false positive — `${SNAP}` is expanded by snapd at
  runtime and is the form snapcraft's docs prescribe.)
- **`grade: stable` + `confinement: devmode` is rejected by the Store.**
  `confinement` is currently left as `devmode` from the diagnostic step —
  **this must go back to `strict` before any real Store release**, and
  the two keys have to be consistent.
- **The version number lives in four places**: `src-tauri/Cargo.toml`,
  `src-tauri/tauri.conf.json`, snapcraft's `version:`, and hardcoded
  *again* in snapcraft's `source:` deb path. A bump silently breaks the
  build. Worth a `craftctl` step or a small release script.
- Added a top-level `LICENSE` (MIT) to match `license: MIT` in
  `snap/snapcraft.yaml`, which the Store surfaces.
- `.gitignore` now covers `*.snap` and snapcraft's `parts/`, `stage/`,
  `prime/` output dirs — a stray 2.2 MB `timepulse2_0.1.0_amd64.snap` in
  the repo root was one `git add .` away from being committed.

## 6. Known product gaps (not packaging)

- **The countdown timer never announces that it finished** — it just
  stops at `00:00:00` with no sound, flash, or notification. README and
  section 3 both list the timer as simply done.
- **The app can start up not showing the time.** `loadSettings()` restores
  `mode` but not stopwatch/timer *state*, so quitting while on the
  Stopwatch tab relaunches to a frozen `00:00:00` with the panel closed
  and no indication why. Either stop persisting `mode`, or always boot
  into clock.
- **The 12/24-hour toggle did not survive the rewrite.** Fixing
  `-hf/--hour-format` was a headline item in the Go project (section 1);
  `tickClock()` in `src/app.js` is hardcoded 24-hour.
- **`setInterval(tickClock, 1000)` drifts** against the wall clock, so the
  seconds digit visibly skips a number now and then. For an app whose
  entire product is a clock, scheduling to the next second boundary is
  worth it.
- **No tests**, though `parseHMS`, `hexToHsv` and `hsvToHex` are pure
  functions and trivially testable. The Go project got tests; this one
  did not.
