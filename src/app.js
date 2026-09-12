(() => {
  const displayH = document.getElementById("segment-h");
  const displayM = document.getElementById("segment-m");
  const displayS = document.getElementById("segment-s");
  const dateLine = document.getElementById("date-line");
  const display = document.getElementById("display");
  const digits = document.getElementById("digits");
  const controls = document.getElementById("controls");
  const tabButtons = document.querySelectorAll(".tab-btn");
  const startBtn = document.getElementById("start-btn");
  const resetBtn = document.getElementById("reset-btn");
  const timerInputRow = document.getElementById("timer-input-row");
  const timerInput = document.getElementById("timer-input");
  const colorPicker = document.getElementById("color-picker");
  const colorSwatch = document.getElementById("color-swatch");
  const sizeSelect = document.getElementById("size-select");
  const bgSelect = document.getElementById("bg-select");
  const bgCustom = document.getElementById("bg-custom");
  const bgCustomSwatch = document.getElementById("bg-custom-swatch");
  const bgOpacity = document.getElementById("bg-opacity");
  const colorPopup = document.getElementById("color-popup");
  const popupSwatch = document.getElementById("popup-swatch");
  const popupHex = document.getElementById("popup-hex");
  const svSquare = document.getElementById("sv-square");
  const svCursor = document.getElementById("sv-cursor");
  const hueTrack = document.getElementById("hue-track");
  const hueCursor = document.getElementById("hue-cursor");
  const popupPresets = document.getElementById("popup-presets");
  const alwaysOnTop = document.getElementById("always-on-top");
  const closeBtn = document.getElementById("close-btn");
  const quitCorner = document.getElementById("quit-corner");
  const contextMenu = document.getElementById("context-menu");
  const contextAlwaysOnTop = document.getElementById("context-always-on-top");
  const contextQuit = document.getElementById("context-quit");
  const contextCancel = document.getElementById("context-cancel");

  // window.__TAURI__ is only injected when "withGlobalTauri": true is set
  // in tauri.conf.json (it is, here). Guard it anyway so this file also
  // just runs in a normal browser tab during quick UI iteration.
  const tauriWindowApi = window.__TAURI__ && window.__TAURI__.window;
  const currentWindow = tauriWindowApi ? tauriWindowApi.getCurrentWindow() : null;

  const DEFAULT_TIMER_MS = 5 * 60 * 1000;
  // Matches minWidth in tauri.conf.json - the floor for the clock on its
  // own, with the settings panel closed.
  const MIN_WINDOW_WIDTH = 260;
  // Ceiling on how wide the settings panel may push the window.
  const PANEL_MAX_WIDTH = 900;

  let mode = "clock";
  let tickTimer = null;

  // stopwatch state
  let swRunning = false;
  let swStart = 0;
  let swElapsed = 0;

  // timer state
  let tmRunning = false;
  let tmEnd = 0;
  let tmRemaining = DEFAULT_TIMER_MS;

  function pad(n) {
    return String(Math.floor(n)).padStart(2, "0");
  }

  const MONTH_ABBR = [
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
    "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
  ];

  // Shows today's date under the clock, e.g. "SEP 11" - always on,
  // independent of which mode (clock/stopwatch/timer) is active.
  function updateDate() {
    const now = new Date();
    dateLine.textContent = `${MONTH_ABBR[now.getMonth()]} ${now.getDate()}`;
  }

  function renderHMS(totalMs) {
    const totalSeconds = Math.max(0, Math.floor(totalMs / 1000));
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    displayH.textContent = pad(h);
    displayM.textContent = pad(m);
    displayS.textContent = pad(s);
  }

  // Mirrors util.parseTimerInput from the Go terminal/GUI apps: HH:MM:SS,
  // falls back to the 5-minute default on anything invalid.
  function parseHMS(value) {
    const parts = (value || "").trim().split(":");
    if (parts.length !== 3) return DEFAULT_TIMER_MS;
    const [h, m, s] = parts.map((p) => parseInt(p, 10));
    if (
      [h, m, s].some((n) => Number.isNaN(n)) ||
      h < 0 ||
      m < 0 ||
      m > 59 ||
      s < 0 ||
      s > 59
    ) {
      return DEFAULT_TIMER_MS;
    }
    return (h * 3600 + m * 60 + s) * 1000;
  }

  function stopTick() {
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
  }

  function tickClock() {
    const now = new Date();
    displayH.textContent = pad(now.getHours());
    displayM.textContent = pad(now.getMinutes());
    displayS.textContent = pad(now.getSeconds());
  }

  function tickStopwatch() {
    const current = swElapsed + (swRunning ? Date.now() - swStart : 0);
    renderHMS(current);
  }

  function tickCountdown() {
    if (tmRunning) {
      tmRemaining = tmEnd - Date.now();
      if (tmRemaining <= 0) {
        tmRemaining = 0;
        tmRunning = false;
        startBtn.textContent = "Start";
      }
    }
    renderHMS(tmRemaining);
  }

  function setMode(next) {
    mode = next;
    stopTick();
    tabButtons.forEach((btn) =>
      btn.classList.toggle("active", btn.dataset.mode === next)
    );
    timerInputRow.classList.toggle("hidden", next !== "timer");
    startBtn.classList.toggle("hidden", next === "clock");
    resetBtn.classList.toggle("hidden", next === "clock");

    if (next === "clock") {
      tickClock();
      tickTimer = setInterval(tickClock, 1000);
    } else if (next === "stopwatch") {
      startBtn.textContent = swRunning ? "Pause" : "Start";
      tickStopwatch();
      tickTimer = setInterval(tickStopwatch, 50);
    } else if (next === "timer") {
      startBtn.textContent = tmRunning ? "Pause" : "Start";
      tickCountdown();
      tickTimer = setInterval(tickCountdown, 100);
    }
    saveSettings();

    // Switching tabs changes how tall the panel's content is (the timer
    // tab adds an input row + start/reset buttons the other tabs don't
    // have), so re-fit the window - but only while the panel is actually
    // showing; no need to resize anything while it's collapsed.
    if (!controls.classList.contains("hidden")) {
      fitWindowToContent();
    }
  }

  startBtn.addEventListener("click", () => {
    if (mode === "stopwatch") {
      if (swRunning) {
        swElapsed += Date.now() - swStart;
        swRunning = false;
        startBtn.textContent = "Start";
      } else {
        swStart = Date.now();
        swRunning = true;
        startBtn.textContent = "Pause";
      }
    } else if (mode === "timer") {
      if (tmRunning) {
        tmRemaining = Math.max(0, tmEnd - Date.now());
        tmRunning = false;
        startBtn.textContent = "Start";
      } else {
        tmRemaining = parseHMS(timerInput.value);
        tmEnd = Date.now() + tmRemaining;
        tmRunning = true;
        startBtn.textContent = "Pause";
      }
    }
  });

  resetBtn.addEventListener("click", () => {
    if (mode === "stopwatch") {
      swElapsed = 0;
      swRunning = false;
      swStart = Date.now();
      startBtn.textContent = "Start";
      tickStopwatch();
    } else if (mode === "timer") {
      tmRemaining = DEFAULT_TIMER_MS;
      tmRunning = false;
      startBtn.textContent = "Start";
      tickCountdown();
    }
  });

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      setMode(btn.dataset.mode);
    });
  });

  const appEl = document.getElementById("app");

  // How much width the settings panel actually wants, i.e. enough for its
  // rows to lay out unwrapped.
  //
  // It cannot simply be measured: #controls is width:100%, so asking it
  // how wide it is only ever reports the window's current width straight
  // back - and feeding that into the window size would mean the window
  // could never shrink again (going Huge -> Small with the panel open
  // would strand a huge window around tiny digits). So let it size to its
  // own content for the duration of the measurement, then put it back.
  // Both writes happen inside one frame with no paint in between, so
  // nothing flickers.
  function panelNaturalWidth() {
    const previous = controls.style.width;
    controls.style.width = "max-content";
    const natural = controls.scrollWidth;
    controls.style.width = previous;
    // Capped so an unusually wide row (or the color popup's preset grid)
    // can't demand a comically wide window.
    return Math.min(natural, PANEL_MAX_WIDTH);
  }

  // The settings panel now stacks BELOW the clock instead of covering it,
  // so the OS window itself needs to grow/shrink to fit whichever content
  // is currently showing. appEl.scrollHeight (a plain DOM measurement, in
  // the same logical-pixel units Tauri's LogicalSize expects) already
  // reflects the post-toggle layout by the time this runs, since reading
  // scrollHeight forces a synchronous reflow.
  async function fitWindowToContent() {
    if (!currentWindow || !tauriWindowApi || !tauriWindowApi.LogicalSize) return;
    try {
      const neededHeight = Math.ceil(appEl.scrollHeight);
      // Width used to be left alone (the digits were sized in vw, so they
      // followed the window rather than the other way round). Now that the
      // Size setting drives the digits, the window has to follow them.
      // #app is align-items:center, so its children are sized to their own
      // content rather than stretched to the window - measuring them gives
      // the width the content actually needs, even when that is wider than
      // the window currently is.
      const displayStyle = getComputedStyle(display);
      const displayPadX =
        parseFloat(displayStyle.paddingLeft) +
        parseFloat(displayStyle.paddingRight);
      // Two things compete for width: the digits, and the settings panel
      // when it is open. At Large/Huge the digits are the wider of the
      // two; at Small/Medium the panel is, and sizing to the digits alone
      // clipped the Timer tab and the opacity slider right off the window.
      const neededWidth = Math.ceil(
        Math.max(
          digits.getBoundingClientRect().width + displayPadX,
          controls.classList.contains("hidden")
            ? MIN_WINDOW_WIDTH
            : panelNaturalWidth()
        )
      );
      await currentWindow.setSize(
        new tauriWindowApi.LogicalSize(neededWidth, neededHeight)
      );
    } catch (e) {
      // Resize permission missing or unsupported on this platform - the
      // window just stays whatever size it was, content may get clipped.
    }
  }

  function showControls() {
    controls.classList.remove("hidden");
    fitWindowToContent();
  }

  function hideControls() {
    controls.classList.add("hidden");
    fitWindowToContent();
  }

  function hideContextMenu() {
    contextMenu.classList.add("hidden");
  }

  // The one real "close the whole app" action - everything else (the
  // overlay's ✕, Escape) only goes back to the watch view.
  function quitApp() {
    if (currentWindow) {
      currentWindow.close();
    } else {
      window.close();
    }
  }

  // Click-to-reveal: tapping the digits toggles the settings/tabs panel.
  // It used to only ever open (the panel covered the digits once shown,
  // so there was no way to click them again to close it) - now that the
  // panel stacks below the clock instead of over it, the digits stay
  // reachable either way, so this can be a real toggle.
  display.addEventListener("click", () => {
    if (controls.classList.contains("hidden")) {
      showControls();
    } else {
      hideControls();
    }
  });

  // The overlay's "✕" is the reliable way back to just-the-watch - it only
  // closes the overlay, keeping whatever you just picked (color,
  // background, etc. are already applied live as you change them). It
  // does NOT quit the app.
  closeBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    hideControls();
  });

  // Clicking empty background inside the overlay (not a button/input/select)
  // also closes it, same as clicking outside a video player's OSD would.
  controls.addEventListener("click", (event) => {
    event.stopPropagation();
    if (event.target === controls) {
      hideControls();
    }
  });

  // The small corner button (visible on hover) and the right-click menu
  // are the two ways to actually quit the app - there's no title bar to
  // provide a real OS close button, and Ctrl+Q covers the keyboard case.
  quitCorner.addEventListener("click", (event) => {
    event.stopPropagation();
    quitApp();
  });

  // Keeps the context menu's own "Always on top" label in sync with the
  // panel checkbox's state (they control the same thing), so whichever
  // one you used last, the other one shows the right state next time.
  function updateContextAlwaysOnTopLabel() {
    contextAlwaysOnTop.textContent = alwaysOnTop.checked
      ? "✓ Always on top"
      : "Always on top";
  }

  document.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    updateContextAlwaysOnTopLabel();
    // Show it first (off in the corner) so its real size can be measured -
    // it's a 3-item menu now, and this window is often quite small (just
    // the clock), so placing it at the raw cursor position could push it
    // partly outside the window, where the webview simply clips it and it
    // looks broken/cut off. Clamp it back inside the window bounds instead.
    contextMenu.style.left = "0px";
    contextMenu.style.top = "0px";
    contextMenu.classList.remove("hidden");
    const menuWidth = contextMenu.offsetWidth;
    const menuHeight = contextMenu.offsetHeight;
    const maxLeft = Math.max(4, window.innerWidth - menuWidth - 4);
    const maxTop = Math.max(4, window.innerHeight - menuHeight - 4);
    contextMenu.style.left = `${Math.min(event.clientX, maxLeft)}px`;
    contextMenu.style.top = `${Math.min(event.clientY, maxTop)}px`;
  });

  contextAlwaysOnTop.addEventListener("click", (event) => {
    event.stopPropagation();
    alwaysOnTop.checked = !alwaysOnTop.checked;
    if (currentWindow) {
      currentWindow.setAlwaysOnTop(alwaysOnTop.checked);
    }
    saveSettings();
    hideContextMenu();
  });

  contextQuit.addEventListener("click", (event) => {
    event.stopPropagation();
    quitApp();
  });

  contextCancel.addEventListener("click", (event) => {
    event.stopPropagation();
    hideContextMenu();
  });

  // Dismiss the menu on any other click/press outside it. This listens on
  // "mousedown" rather than "click", and in the capture phase, for two
  // reasons: (1) every background element here has data-tauri-drag-region,
  // which starts a native window drag as soon as the mouse goes down - on
  // some platforms that swallows the follow-up "click" event entirely, so
  // a plain click listener would never see it; (2) capture phase runs
  // before any target's own handler (even ones that call
  // stopPropagation()), so this always gets a chance to close the menu
  // first regardless of what else that click does.
  // Same reasoning applies to the color popup: clicking anywhere outside
  // it (other than the swatch buttons that open/close it themselves)
  // dismisses it.
  document.addEventListener(
    "mousedown",
    (event) => {
      if (!contextMenu.classList.contains("hidden") && !contextMenu.contains(event.target)) {
        hideContextMenu();
      }
      if (
        !colorPopup.classList.contains("hidden") &&
        !colorPopup.contains(event.target) &&
        event.target !== colorSwatch &&
        event.target !== bgCustomSwatch
      ) {
        closeColorPopup();
      }
    },
    true
  );

  // Escape always gets you back to the watch (and dismisses the right-click
  // menu and color popup if they're open); Ctrl+Q actually quits.
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideControls();
      hideContextMenu();
      closeColorPopup();
    } else if (event.ctrlKey && event.key.toLowerCase() === "q") {
      quitApp();
    }
  });

  // Digit heights in logical px. Every other clock metric (colon dots and
  // their spacing, the date line, the padding around it all) is derived
  // from this one number in style.css, so the proportions hold at every
  // size. "Huge" exists for the wall-mounted / large-TV case.
  const SIZES = {
    small: 64,
    medium: 96,
    large: 144,
    huge: 208,
  };

  function applySize(name) {
    const px = SIZES[name] || SIZES.medium;
    document.documentElement.style.setProperty("--digit-size", `${px}px`);
  }

  sizeSelect.addEventListener("change", () => {
    applySize(sizeSelect.value);
    saveSettings();
    // The digits just changed size, so the window has to follow - this is
    // the one setting that changes the clock's width as well as its
    // height, which is why fitWindowToContent measures both.
    fitWindowToContent();
  });

  function applyColor(hex) {
    document.documentElement.style.setProperty("--digit-color", hex);
  }

  function hexToRgbTriplet(hex) {
    const clean = hex.replace("#", "");
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }

  function applyBackground(hexOrTransparent, opacityPercent) {
    const isTransparent = hexOrTransparent === "transparent";
    const alpha = isTransparent ? 0 : Number(opacityPercent) / 100;
    const rgbTriplet = isTransparent
      ? "15, 23, 42"
      : hexToRgbTriplet(hexOrTransparent);
    document.documentElement.style.setProperty("--bg-rgb", rgbTriplet);
    document.documentElement.style.setProperty("--bg-alpha", String(alpha));
  }

  function currentBackgroundValue() {
    return bgSelect.value === "custom" ? bgCustom.value : bgSelect.value;
  }

  bgSelect.addEventListener("change", () => {
    const isCustom = bgSelect.value === "custom";
    bgCustom.classList.toggle("hidden", !isCustom);
    bgCustomSwatch.classList.toggle("hidden", !isCustom);
    if (!isCustom) closeColorPopup("bg");
    applyBackground(currentBackgroundValue(), bgOpacity.value);
    saveSettings();
    // Showing/hiding the custom-color swatch changes the panel's height.
    fitWindowToContent();
  });

  bgOpacity.addEventListener("input", () => {
    applyBackground(currentBackgroundValue(), bgOpacity.value);
    saveSettings();
  });

  // --- Custom color picker (replaces the OS-native <input type=color>
  // dialog with an in-window saturation/value square + hue bar, in the
  // same style as the rest of the panel). The native <input type=color>
  // elements stay in the DOM purely as the value store the rest of the
  // app already reads (colorPicker.value / bgCustom.value) - they're just
  // never shown or clicked anymore.

  let activeColorTarget = null; // "digit" | "bg" | null
  let hsv = { h: 0, s: 0, v: 0 };
  let svDragging = false;
  let hueDragging = false;

  function hexToHsv(hex) {
    const clean = hex.replace("#", "");
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    if (d !== 0) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    const s = max === 0 ? 0 : d / max;
    const v = max;
    return { h, s, v };
  }

  function hsvToHex(h, s, v) {
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r = 0,
      g = 0,
      b = 0;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    const toHex = (n) =>
      Math.round((n + m) * 255)
        .toString(16)
        .padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  function updatePopupUI() {
    const hex = hsvToHex(hsv.h, hsv.s, hsv.v);
    popupSwatch.style.background = hex;
    popupHex.value = hex;
    svSquare.style.backgroundColor = hsvToHex(hsv.h, 1, 1);
    svCursor.style.left = `${hsv.s * 100}%`;
    svCursor.style.top = `${(1 - hsv.v) * 100}%`;
    hueCursor.style.left = `${(hsv.h / 360) * 100}%`;
  }

  function commitColor() {
    const hex = hsvToHex(hsv.h, hsv.s, hsv.v);
    if (activeColorTarget === "digit") {
      colorPicker.value = hex;
      colorSwatch.style.background = hex;
      applyColor(hex);
    } else if (activeColorTarget === "bg") {
      bgCustom.value = hex;
      bgCustomSwatch.style.background = hex;
      applyBackground(currentBackgroundValue(), bgOpacity.value);
    }
    saveSettings();
  }

  function openColorPopup(target, anchorHex) {
    activeColorTarget = target;
    hsv = hexToHsv(anchorHex);
    updatePopupUI();
    colorPopup.classList.remove("hidden");
    fitWindowToContent();
  }

  // targetToClose is optional: pass "bg" to only close the popup if it's
  // currently showing the background picker (used when the background
  // dropdown switches away from "Custom…" out from under it).
  function closeColorPopup(targetToClose) {
    if (colorPopup.classList.contains("hidden")) return;
    if (targetToClose && activeColorTarget !== targetToClose) return;
    colorPopup.classList.add("hidden");
    activeColorTarget = null;
    fitWindowToContent();
  }

  colorSwatch.addEventListener("click", (event) => {
    event.stopPropagation();
    if (activeColorTarget === "digit" && !colorPopup.classList.contains("hidden")) {
      closeColorPopup();
    } else {
      openColorPopup("digit", colorPicker.value);
    }
  });

  bgCustomSwatch.addEventListener("click", (event) => {
    event.stopPropagation();
    if (activeColorTarget === "bg" && !colorPopup.classList.contains("hidden")) {
      closeColorPopup();
    } else {
      openColorPopup("bg", bgCustom.value);
    }
  });

  function setSvFromEvent(event) {
    const rect = svSquare.getBoundingClientRect();
    const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
    const y = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);
    hsv.s = rect.width === 0 ? 0 : x / rect.width;
    hsv.v = rect.height === 0 ? 0 : 1 - y / rect.height;
    updatePopupUI();
    commitColor();
  }

  function setHueFromEvent(event) {
    const rect = hueTrack.getBoundingClientRect();
    const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
    hsv.h = rect.width === 0 ? 0 : (x / rect.width) * 360;
    updatePopupUI();
    commitColor();
  }

  svSquare.addEventListener("mousedown", (event) => {
    event.stopPropagation();
    svDragging = true;
    setSvFromEvent(event);
  });

  hueTrack.addEventListener("mousedown", (event) => {
    event.stopPropagation();
    hueDragging = true;
    setHueFromEvent(event);
  });

  document.addEventListener("mousemove", (event) => {
    if (svDragging) setSvFromEvent(event);
    if (hueDragging) setHueFromEvent(event);
  });

  document.addEventListener("mouseup", () => {
    svDragging = false;
    hueDragging = false;
  });

  popupHex.addEventListener("click", (event) => event.stopPropagation());
  popupHex.addEventListener("change", () => {
    const val = popupHex.value.trim();
    if (/^#?[0-9a-fA-F]{6}$/.test(val)) {
      hsv = hexToHsv(val.startsWith("#") ? val : `#${val}`);
      updatePopupUI();
      commitColor();
    } else {
      // Invalid entry - just snap the field back to the current color.
      updatePopupUI();
    }
  });

  const PRESET_COLORS = [
    "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16",
    "#22c55e", "#10b981", "#14b8a6", "#06b6d4", "#3b82f6",
    "#6366f1", "#8b5cf6", "#a855f7", "#d946ef", "#ec4899",
    "#f1f5f9", "#94a3b8", "#0f172a", "#000000",
  ];
  PRESET_COLORS.forEach((hex) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "preset-swatch";
    btn.style.background = hex;
    btn.title = hex;
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      hsv = hexToHsv(hex);
      updatePopupUI();
      commitColor();
    });
    popupPresets.appendChild(btn);
  });

  alwaysOnTop.addEventListener("change", () => {
    if (currentWindow) {
      currentWindow.setAlwaysOnTop(alwaysOnTop.checked);
    }
    saveSettings();
  });

  function saveSettings() {
    try {
      localStorage.setItem(
        "timepulse2.settings",
        JSON.stringify({
          mode,
          size: sizeSelect.value,
          color: colorPicker.value,
          bg: bgSelect.value,
          bgCustom: bgCustom.value,
          bgOpacity: bgOpacity.value,
          alwaysOnTop: alwaysOnTop.checked,
        })
      );
    } catch (e) {
      // localStorage can be unavailable in some webview configurations;
      // settings just won't persist across restarts in that case.
    }
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem("timepulse2.settings");
      if (!raw) return;
      const saved = JSON.parse(raw);

      if (saved.size && SIZES[saved.size]) {
        sizeSelect.value = saved.size;
        applySize(saved.size);
      }
      if (saved.color) {
        colorPicker.value = saved.color;
        colorSwatch.style.background = saved.color;
        applyColor(saved.color);
      }
      if (saved.bg) {
        bgSelect.value = saved.bg;
        if (saved.bgCustom) {
          bgCustom.value = saved.bgCustom;
          bgCustomSwatch.style.background = saved.bgCustom;
        }
        const isCustom = saved.bg === "custom";
        bgCustom.classList.toggle("hidden", !isCustom);
        bgCustomSwatch.classList.toggle("hidden", !isCustom);
      }
      if (saved.bgOpacity) bgOpacity.value = saved.bgOpacity;
      applyBackground(currentBackgroundValue(), bgOpacity.value);

      if (saved.alwaysOnTop) {
        alwaysOnTop.checked = true;
        if (currentWindow) currentWindow.setAlwaysOnTop(true);
      }
      if (saved.mode) mode = saved.mode;
    } catch (e) {
      // Malformed or missing settings - just start from the defaults.
    }
  }

  loadSettings();
  setMode(mode);
  // Match the window to the actual restored content right away, instead
  // of leaving it at whatever size is hardcoded in tauri.conf.json.
  fitWindowToContent();

  // The date line runs on its own timer, separate from the mode tickers
  // above, since it should stay visible under the clock/stopwatch/timer
  // digits regardless of which one is active. Once a minute is plenty.
  updateDate();
  setInterval(updateDate, 60 * 1000);
})();
