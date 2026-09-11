(() => {
  const displayH = document.getElementById("segment-h");
  const displayM = document.getElementById("segment-m");
  const displayS = document.getElementById("segment-s");
  const display = document.getElementById("display");
  const controls = document.getElementById("controls");
  const tabButtons = document.querySelectorAll(".tab-btn");
  const startBtn = document.getElementById("start-btn");
  const resetBtn = document.getElementById("reset-btn");
  const timerInputRow = document.getElementById("timer-input-row");
  const timerInput = document.getElementById("timer-input");
  const colorPicker = document.getElementById("color-picker");
  const bgSelect = document.getElementById("bg-select");
  const bgCustom = document.getElementById("bg-custom");
  const bgOpacity = document.getElementById("bg-opacity");
  const alwaysOnTop = document.getElementById("always-on-top");
  const closeBtn = document.getElementById("close-btn");

  // window.__TAURI__ is only injected when "withGlobalTauri": true is set
  // in tauri.conf.json (it is, here). Guard it anyway so this file also
  // just runs in a normal browser tab during quick UI iteration.
  const tauriWindowApi = window.__TAURI__ && window.__TAURI__.window;
  const currentWindow = tauriWindowApi ? tauriWindowApi.getCurrentWindow() : null;

  const DEFAULT_TIMER_MS = 5 * 60 * 1000;

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

  // Click-to-reveal: tapping the digits toggles the settings/tabs overlay.
  display.addEventListener("click", () => {
    controls.classList.toggle("hidden");
  });

  // Don't let clicks inside the overlay bubble up and immediately
  // re-toggle it closed via the listener above.
  controls.addEventListener("click", (event) => event.stopPropagation());

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

  colorPicker.addEventListener("input", () => {
    applyColor(colorPicker.value);
    saveSettings();
  });

  bgSelect.addEventListener("change", () => {
    bgCustom.classList.toggle("hidden", bgSelect.value !== "custom");
    applyBackground(currentBackgroundValue(), bgOpacity.value);
    saveSettings();
  });

  bgCustom.addEventListener("input", () => {
    applyBackground(currentBackgroundValue(), bgOpacity.value);
    saveSettings();
  });

  bgOpacity.addEventListener("input", () => {
    applyBackground(currentBackgroundValue(), bgOpacity.value);
    saveSettings();
  });

  alwaysOnTop.addEventListener("change", () => {
    if (currentWindow) {
      currentWindow.setAlwaysOnTop(alwaysOnTop.checked);
    }
    saveSettings();
  });

  closeBtn.addEventListener("click", () => {
    if (currentWindow) {
      currentWindow.close();
    } else {
      window.close();
    }
  });

  function saveSettings() {
    try {
      localStorage.setItem(
        "timepulse2.settings",
        JSON.stringify({
          mode,
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

      if (saved.color) {
        colorPicker.value = saved.color;
        applyColor(saved.color);
      }
      if (saved.bg) {
        bgSelect.value = saved.bg;
        if (saved.bgCustom) bgCustom.value = saved.bgCustom;
        bgCustom.classList.toggle("hidden", saved.bg !== "custom");
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
})();
