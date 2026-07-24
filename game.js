(function () {
  "use strict";

  const W = 960;
  const H = 540;
  const GROUND_Y = 420;
  const PLAYER_X = 180;
  const GRAVITY = 2200;
  const JUMP_V = -780;
  const DOUBLE_JUMP_V = -700;
  const TRIPLE_JUMP_V = -680;
  const DIVE_V = 1650;
  const MAX_JUMPS = 2;
  const PEACH_SCORE = 100;
  const FEATHER_BONUS_SCORE = 200;
  const BEST_KEY = "momoDashBest";
  const RECORDS_KEY = "momoDashRecords";
  const MODE_KEY = "momoDashMode";
  const BGM_MODE_KEY = "momoDashBgmMode";
  const SFX_KEY = "momoDashSfx";
  const CHAR_KEY = "momoDashChar";
  const BGM_VOLUME = 0.45;
  const BGM_TRACKS = [
    { file: "sounds/bgm.mp3", label: "ももももラン！" },
    { file: "sounds/peach-mode.mp3", label: "Peach Mode" },
    { file: "sounds/peach-dash.mp3", label: "Peach Dash" },
  ];
  const BGM_MODE_VALUES = ["0", "1", "2", "sequence", "random", "off"];
  const CHAR_IDS = ["normal", "spin", "heavy", "wing", "yuzu", "hakase"];
  const SECRET_CHAR_IDS = ["yuzu", "hakase"];
  const MODE_IDS = ["easy", "normal", "hard"];
  const CHARACTERS = {
    normal: {
      id: "normal",
      name: "ノーマル桃",
      desc: "普通のもも。1度だけ落とし穴以外の障害物への接触を我慢できるし時間経過で獲得できるスコアが他のももより少し多いぞ！",
      distMult: 1.2,
      canDive: true,
    },
    spin: {
      id: "spin",
      name: "スピン桃",
      desc: "ジャンプ上昇中はスピンで落とし穴以外の障害物を吹き飛ばしてスコアにするぞ！急降下もできるぞ！",
      distMult: 0.8,
      canDive: true,
    },
    heavy: {
      id: "heavy",
      name: "ヘビー桃",
      desc: "急降下中に接触した落とし穴以外の障害物を破壊してスコアにするぞ！羽を持っているときだけ、急降下の着地が落とし穴でも穴を壊せる！ただし羽でも3段ジャンプは出来ない",
      distMult: 0.8,
      canDive: true,
    },
    wing: {
      id: "wing",
      name: "ウイング桃",
      desc: "常に3段ジャンプができて落とし穴も無効！羽を取ると急降下を2回まで使えるぞ！ただしスコアの伸びは一番遅い",
      distMult: 0.65,
      canDive: false,
    },
    yuzu: {
      id: "yuzu",
      name: "ゆずりんご",
      desc: "白猫のもも？鳥に当たると吹き飛ばして羽状態になり＋100！鳥を10匹倒すたびに無敵を1回ためられる（最大1）。無敵中は岩・木・落とし穴のダメージを無効化！",
      distMult: 1.2,
      canDive: true,
    },
    hakase: {
      id: "hakase",
      name: "はかせ",
      desc: "金色のティラノ！2秒ごとに火の玉を前方発射（羽所持中は1秒間隔）。通常の火の玉は穴以外を破壊して＋100。桃を取ると前方三方向に特殊火の玉を発射し、穴も破壊できる！3段ジャンプを使うと発射間隔は元に戻るぞ",
      distMult: 1.2,
      canDive: true,
    },
  };

  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");

  const hud = document.getElementById("hud");
  const scoreEl = document.getElementById("score-value");
  const bestEl = document.getElementById("best-value");
  const speedEl = document.getElementById("speed-value");
  const featherHud = document.getElementById("feather-hud");
  const charDescEl = document.getElementById("char-desc");
  const charButtons = Array.prototype.slice.call(document.querySelectorAll(".char-btn"));
  const modeButtons = Array.prototype.slice.call(document.querySelectorAll(".mode-btn"));
  const charBestEasyEl = document.getElementById("char-best-easy");
  const charBestNormalEl = document.getElementById("char-best-normal");
  const charBestHardEl = document.getElementById("char-best-hard");
  const titleScreen = document.getElementById("title-screen");
  const gameoverScreen = document.getElementById("gameover-screen");
  const finalScoreEl = document.getElementById("final-score");
  const newBestEl = document.getElementById("new-best");
  const btnStart = document.getElementById("btn-start");
  const btnRetry = document.getElementById("btn-retry");
  const btnTitle = document.getElementById("btn-title");
  const btnDebugTitle = document.getElementById("btn-debug-title");
  const debugBadge = document.getElementById("debug-badge");
  const bgmModeSelect = document.getElementById("bgm-mode");
  const toggleSfx = document.getElementById("toggle-sfx");

  /** @type {"title"|"playing"|"gameover"} */
  let state = "title";
  let debugMode = false;
  let debugTapCount = 0;
  const DEBUG_TAPS_NEEDED = 10;
  let records = loadRecords();
  let unlocks = { yuzu: false, hakase: false };
  let bgmMode = loadBgmMode();
  let sfxEnabled = localStorage.getItem(SFX_KEY) !== "0";
  let selectedCharId = loadSelectedChar();
  let selectedMode = loadSelectedMode();
  /** @type {{phase:"idle"|"spin"|"heavy"|"wing_yuzu"|"wing_hakase", count:number}} */
  let secretTap = { phase: "idle", count: 0 };
  let score = 0;
  let distance = 0;
  let lastDistScore = 0;
  let distScoreAcc = 0;
  let speed = 280;
  let spawnTimer = 0;
  let nextSpawn = 1.4;
  let itemSpawnTimer = 0;
  let nextItemSpawn = 1.6;
  let lastTime = 0;
  let animT = 0;
  let shake = 0;
  let clouds = [];
  let hills = [];
  let stars = [];
  let shootingStars = [];
  let planets = [];
  let fireworks = [];
  let shootTimer = 0;
  let fireworkTimer = 0;
  let obstacles = [];
  let items = [];
  let particles = [];
  let floatTexts = [];
  let fireballs = [];
  let fireTimer = 0;
  let audioCtx = null;
  let bgm = null;
  let bgmTrackIndex = 0;
  let bgmEndedBound = false;

  function loadBgmMode() {
    const raw = localStorage.getItem(BGM_MODE_KEY);
    if (BGM_MODE_VALUES.indexOf(raw) !== -1) return raw;
    // 旧ON/OFF設定からの移行
    const legacy = localStorage.getItem("momoDashBgm");
    if (legacy === "0") return "off";
    return "0";
  }

  function emptyRecords() {
    const chars = {};
    for (let i = 0; i < CHAR_IDS.length; i++) {
      chars[CHAR_IDS[i]] = { easy: 0, normal: 0, hard: 0 };
    }
    return {
      modes: {
        easy: { score: 0, charId: null },
        normal: { score: 0, charId: null },
        hard: { score: 0, charId: null },
      },
      chars: chars,
    };
  }

  function loadRecords() {
    const data = emptyRecords();
    try {
      const raw = JSON.parse(localStorage.getItem(RECORDS_KEY) || "null");
      if (raw && raw.modes && raw.chars) {
        for (let i = 0; i < MODE_IDS.length; i++) {
          const m = MODE_IDS[i];
          if (raw.modes[m]) {
            data.modes[m].score = Number(raw.modes[m].score) || 0;
            data.modes[m].charId =
              CHAR_IDS.indexOf(raw.modes[m].charId) !== -1 ? raw.modes[m].charId : null;
          }
        }
        for (let i = 0; i < CHAR_IDS.length; i++) {
          const c = CHAR_IDS[i];
          if (raw.chars[c]) {
            for (let j = 0; j < MODE_IDS.length; j++) {
              const m = MODE_IDS[j];
              data.chars[c][m] = Number(raw.chars[c][m]) || 0;
            }
          }
        }
      }
    } catch (e) {
      /* ignore */
    }
    // 旧ハイスコアを NORMAL に移行
    const legacy = Number(localStorage.getItem(BEST_KEY) || 0);
    if (legacy > data.modes.normal.score) {
      data.modes.normal.score = legacy;
      if (!data.modes.normal.charId) data.modes.normal.charId = "normal";
      data.chars.normal.normal = Math.max(data.chars.normal.normal, legacy);
    }
    return data;
  }

  function saveRecords() {
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  }

  function loadSelectedChar() {
    const raw = localStorage.getItem(CHAR_KEY);
    // 隠しキャラはセッション解禁のみ。起動時は通常キャラに戻す
    if (raw === "yuzu" || raw === "hakase") return "normal";
    if (CHAR_IDS.indexOf(raw) !== -1) return raw;
    return "normal";
  }

  function loadSelectedMode() {
    const raw = localStorage.getItem(MODE_KEY);
    if (MODE_IDS.indexOf(raw) !== -1) return raw;
    return "normal";
  }

  function currentChar() {
    return CHARACTERS[selectedCharId] || CHARACTERS.normal;
  }

  function currentModeBest() {
    return (records.modes[selectedMode] && records.modes[selectedMode].score) || 0;
  }

  function setSelectedChar(id) {
    if (CHAR_IDS.indexOf(id) === -1) return;
    if (id === "yuzu" && !unlocks.yuzu) return;
    if (id === "hakase" && !unlocks.hakase) return;
    selectedCharId = id;
    localStorage.setItem(CHAR_KEY, id);
    syncCharSelectUi();
  }

  function secretSlotOptions() {
    const opts = ["normal"];
    if (unlocks.yuzu) opts.push("yuzu");
    if (unlocks.hakase) opts.push("hakase");
    return opts;
  }

  function isSecretSlotChar(id) {
    return id === "normal" || SECRET_CHAR_IDS.indexOf(id) !== -1;
  }

  function updateSecretSlotButton() {
    const btn = document.getElementById("char-btn-secret");
    const nameEl = document.getElementById("char-slot-name");
    const swatchEl = document.getElementById("char-slot-swatch");
    if (!btn) return;
    const displayId = isSecretSlotChar(selectedCharId) ? selectedCharId : "normal";
    const ch = CHARACTERS[displayId] || CHARACTERS.normal;
    btn.setAttribute("data-char", displayId);
    if (nameEl) nameEl.textContent = ch.name;
    if (swatchEl) {
      swatchEl.className = "char-swatch char-swatch-" + displayId;
    }
  }

  function handleSecretUnlockTap(charId) {
    if (charId === "spin") {
      if (secretTap.phase === "spin") {
        secretTap.count += 1;
      } else {
        secretTap.phase = "spin";
        secretTap.count = 1;
      }
      if (secretTap.count >= 10) {
        secretTap.phase = "wing_yuzu";
        secretTap.count = 0;
      }
      return false;
    }
    if (charId === "heavy") {
      if (secretTap.phase === "heavy") {
        secretTap.count += 1;
      } else {
        secretTap.phase = "heavy";
        secretTap.count = 1;
      }
      if (secretTap.count >= 10) {
        secretTap.phase = "wing_hakase";
        secretTap.count = 0;
      }
      return false;
    }
    if (charId === "wing") {
      if (secretTap.phase === "wing_yuzu") {
        secretTap.count += 1;
        if (secretTap.count >= 10) {
          const got = unlockSecret("yuzu");
          secretTap = { phase: "idle", count: 0 };
          return got;
        }
        return false;
      }
      if (secretTap.phase === "wing_hakase") {
        secretTap.count += 1;
        if (secretTap.count >= 10) {
          const got = unlockSecret("hakase");
          secretTap = { phase: "idle", count: 0 };
          return got;
        }
        return false;
      }
    }
    secretTap = { phase: "idle", count: 0 };
    return false;
  }

  function unlockSecret(id) {
    if (id === "yuzu" && !unlocks.yuzu) {
      unlocks.yuzu = true;
      selectedCharId = "yuzu";
      syncCharSelectUi();
      spawnBurst(player.x, player.y - player.r, "#ffffff", 24);
      spawnFloatText(player.x, player.y - player.r - 40, "ゆずりんご 解禁！", "#555");
      return true;
    }
    if (id === "hakase" && !unlocks.hakase) {
      unlocks.hakase = true;
      selectedCharId = "hakase";
      syncCharSelectUi();
      spawnBurst(player.x, player.y - player.r, "#ffd24a", 24);
      spawnFloatText(player.x, player.y - player.r - 40, "はかせ 解禁！", "#b8860b");
      return true;
    }
    return false;
  }

  function clearSecretUnlocks() {
    unlocks.yuzu = false;
    unlocks.hakase = false;
    secretTap = { phase: "idle", count: 0 };
    if (isSecretSlotChar(selectedCharId) && selectedCharId !== "normal") {
      selectedCharId = "normal";
    }
    const stored = localStorage.getItem(CHAR_KEY);
    if (stored === "yuzu" || stored === "hakase") {
      localStorage.setItem(CHAR_KEY, "normal");
    }
  }

  function onCharButtonClick(btn) {
    const rawId = btn.getAttribute("data-char");
    const tapId = btn.getAttribute("data-slot") === "secret" ? "normal" : rawId;
    const unlockedNow = handleSecretUnlockTap(tapId);
    if (unlockedNow) return;

    if (btn.getAttribute("data-slot") === "secret") {
      const opts = secretSlotOptions();
      if (isSecretSlotChar(selectedCharId) && opts.length > 1) {
        const idx = opts.indexOf(selectedCharId);
        const next = opts[(Math.max(0, idx) + 1) % opts.length];
        setSelectedChar(next);
      } else {
        setSelectedChar(btn.getAttribute("data-char") || "normal");
      }
      return;
    }
    setSelectedChar(rawId);
  }

  function setSelectedMode(id) {
    if (MODE_IDS.indexOf(id) === -1) return;
    selectedMode = id;
    localStorage.setItem(MODE_KEY, id);
    syncModeSelectUi();
    syncBestDisplay();
  }

  function syncModeSelectUi() {
    for (let i = 0; i < modeButtons.length; i++) {
      const btn = modeButtons[i];
      const on = btn.getAttribute("data-mode") === selectedMode;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    }
  }

  function applyRecordCharIcon(el, charId) {
    if (!el) return;
    el.className = "record-char char-swatch";
    if (charId && CHAR_IDS.indexOf(charId) !== -1) {
      el.classList.add("char-swatch-" + charId);
      el.classList.add("has-record");
      el.title = CHARACTERS[charId] ? CHARACTERS[charId].name : charId;
    } else {
      el.removeAttribute("title");
    }
  }

  function syncModeRecordsUi() {
    for (let i = 0; i < MODE_IDS.length; i++) {
      const m = MODE_IDS[i];
      const scoreNode = document.getElementById("record-" + m + "-score");
      const charNode = document.getElementById("record-" + m + "-char");
      const rec = records.modes[m];
      if (scoreNode) scoreNode.textContent = String(rec.score || 0);
      applyRecordCharIcon(charNode, rec.score > 0 ? rec.charId : null);
    }
  }

  function syncCharRecordsUi() {
    const c = records.chars[selectedCharId] || { easy: 0, normal: 0, hard: 0 };
    if (charBestEasyEl) charBestEasyEl.textContent = String(c.easy || 0);
    if (charBestNormalEl) charBestNormalEl.textContent = String(c.normal || 0);
    if (charBestHardEl) charBestHardEl.textContent = String(c.hard || 0);
  }

  function syncCharSelectUi() {
    updateSecretSlotButton();
    for (let i = 0; i < charButtons.length; i++) {
      const btn = charButtons[i];
      const id = btn.getAttribute("data-char");
      const on = btn.getAttribute("data-slot") === "secret"
        ? isSecretSlotChar(selectedCharId)
        : id === selectedCharId;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    }
    if (charDescEl) charDescEl.textContent = currentChar().desc;
    syncCharRecordsUi();
  }

  function submitScore(finalScore) {
    if (debugMode) return false;
    let isNew = false;
    const modeRec = records.modes[selectedMode];
    if (finalScore > (modeRec.score || 0)) {
      modeRec.score = finalScore;
      modeRec.charId = selectedCharId;
      isNew = true;
    }
    const charRec = records.chars[selectedCharId];
    if (charRec && finalScore > (charRec[selectedMode] || 0)) {
      charRec[selectedMode] = finalScore;
      isNew = true;
    }
    if (isNew) {
      saveRecords();
      syncBestDisplay();
      syncModeRecordsUi();
      syncCharRecordsUi();
    }
    return isNew;
  }

  const player = {
    x: PLAYER_X,
    y: GROUND_Y,
    vy: 0,
    r: 28,
    onGround: true,
    jumpsLeft: MAX_JUMPS,
    feather: false,
    diving: false,
    squish: 1,
    blink: 0,
    shield: 0,
    diveCharges: 0,
    spinAngle: 0,
    invuln: 0,
    birdKills: 0,
    yuzuGuard: 0,
    fallingInHole: false,
  };

  function syncBestDisplay() {
    bestEl.textContent = String(currentModeBest());
  }

  function syncFeatherHud() {
    const label = featherHud.querySelector(".feather-label");
    if (selectedCharId === "wing") {
      if (label) label.textContent = "急降下×" + player.diveCharges;
      featherHud.classList.toggle("hidden", player.diveCharges <= 0);
    } else if (selectedCharId === "heavy") {
      if (label) label.textContent = "穴破壊";
      featherHud.classList.toggle("hidden", !player.feather);
    } else if (selectedCharId === "yuzu") {
      if (label) label.textContent = player.yuzuGuard > 0 ? "無敵" : "3段ジャンプ";
      featherHud.classList.toggle("hidden", !(player.feather || player.yuzuGuard > 0));
    } else {
      if (label) label.textContent = "3段ジャンプ";
      featherHud.classList.toggle("hidden", !player.feather);
    }
  }

  function setScore(value) {
    score = value;
    scoreEl.textContent = String(score);
  }

  function addScore(amount) {
    const gained = amount * (debugMode ? 3 : 1);
    setScore(score + gained);
  }

  function scoreGainLabel(base) {
    return String(base * (debugMode ? 3 : 1));
  }

  syncBestDisplay();
  syncFeatherHud();

  function skyPhase() {
    if (score >= 5000) return "space";
    if (score >= 3000) return "night";
    if (score >= 2000) return "evening";
    return "day";
  }

  /** 宇宙ステージ強化段階: 0(5000)〜5(10000+) */
  function spaceTier() {
    if (score < 5000) return -1;
    return Math.min(5, Math.floor((score - 5000) / 1000));
  }

  function initDecor() {
    clouds = [];
    for (let i = 0; i < 6; i++) {
      clouds.push({
        x: Math.random() * W,
        y: 40 + Math.random() * 120,
        s: 0.6 + Math.random() * 0.8,
        speed: 18 + Math.random() * 22,
      });
    }
    hills = [
      { x: 0, h: 90, w: 280 },
      { x: 220, h: 130, w: 340 },
      { x: 500, h: 100, w: 300 },
      { x: 740, h: 140, w: 320 },
    ];
    stars = [];
    for (let i = 0; i < 110; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * (GROUND_Y - 40),
        r: 0.6 + Math.random() * 1.8,
        tw: Math.random() * Math.PI * 2,
        bright: 0.4 + Math.random() * 0.6,
      });
    }
    shootingStars = [];
    fireworks = [];
    shootTimer = 0;
    fireworkTimer = 0;
    planets = buildPlanetCatalog();
  }

  function buildPlanetCatalog() {
    return [
      { x: 720, y: 110, r: 48, style: "rose", drift: 8, unlock: 0 },
      { x: 180, y: 70, r: 22, style: "ocean", drift: 12, unlock: 0 },
      { x: 480, y: 160, r: 34, style: "saturn", drift: 6, unlock: 0 },
      { x: 860, y: 220, r: 16, style: "violet", drift: 15, unlock: 0 },
      { x: 320, y: 95, r: 28, style: "ice", drift: 9, unlock: 1 },
      { x: 600, y: 55, r: 18, style: "mint", drift: 14, unlock: 1 },
      { x: 100, y: 180, r: 40, style: "lava", drift: 7, unlock: 2 },
      { x: 820, y: 140, r: 26, style: "stripe", drift: 10, unlock: 2 },
      { x: 400, y: 50, r: 55, style: "gas", drift: 5, unlock: 3 },
      { x: 250, y: 200, r: 20, style: "binary", drift: 11, unlock: 3 },
      { x: 900, y: 80, r: 32, style: "emerald", drift: 8, unlock: 4 },
      { x: 540, y: 120, r: 24, style: "peach", drift: 13, unlock: 4 },
    ];
  }

  function initAudio() {
    if (audioCtx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx = new Ctx();
  }

  function resumeAudio() {
    initAudio();
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
  }

  /** game.js と同じディレクトリを基準に絶対URLへ解決（GitHub Pagesのサブパスでも404回避） */
  function resolveAssetUrl(relativePath) {
    let base = document.baseURI || window.location.href;
    const scripts = document.getElementsByTagName("script");
    for (let i = scripts.length - 1; i >= 0; i--) {
      const raw = scripts[i].getAttribute("src");
      if (!raw) continue;
      if (!/(^|\/)game\.js(\?|#|$)/i.test(raw)) continue;
      const scriptUrl = new URL(raw, document.baseURI || window.location.href);
      base = scriptUrl.href.replace(/game\.js([?#].*)?$/i, "");
      break;
    }
    return new URL(relativePath, base).href;
  }

  function ensureBgm() {
    if (bgm) return bgm;

    bgm = new Audio();
    bgm.preload = "auto";
    bgm.volume = BGM_VOLUME;
    bgm.setAttribute("playsinline", "true");
    bgm.playsInline = true;

    bgm.addEventListener("loadeddata", function () {
      console.log("[BGM] loaded OK:", bgm.currentSrc || bgm.src);
    });

    bgm.addEventListener("error", function () {
      const mediaError = bgm.error;
      console.error("[BGM] failed to load audio", {
        src: bgm.src,
        currentSrc: bgm.currentSrc,
        code: mediaError ? mediaError.code : null,
        message: mediaError ? mediaError.message : null,
        networkState: bgm.networkState,
        readyState: bgm.readyState,
      });
    });

    if (!bgmEndedBound) {
      bgmEndedBound = true;
      bgm.addEventListener("ended", function () {
        if (state !== "playing" || bgmMode !== "sequence") return;
        bgmTrackIndex = (bgmTrackIndex + 1) % BGM_TRACKS.length;
        loadBgmTrack(bgmTrackIndex, true);
        startBgmPlayback(true);
      });
    }

    return bgm;
  }

  function loadBgmTrack(index, shouldLoad) {
    const track = BGM_TRACKS[index];
    if (!track) return;
    const audio = ensureBgm();
    const url = resolveAssetUrl(track.file);
    console.log("[BGM] track:", track.label);
    console.log("[BGM] file:", track.file);
    console.log("[BGM] resolved Audio URL:", url);
    console.log("[BGM] location.href:", window.location.href);
    audio.loop = bgmMode !== "sequence";
    if (audio.src !== url) {
      audio.src = url;
      if (shouldLoad !== false) audio.load();
    }
  }

  function pickTrackIndexForMode() {
    if (bgmMode === "off") return -1;
    if (bgmMode === "sequence") return 0;
    if (bgmMode === "random") return (Math.random() * BGM_TRACKS.length) | 0;
    const n = Number(bgmMode);
    if (n >= 0 && n < BGM_TRACKS.length) return n;
    return 0;
  }

  function startBgmPlayback(fromStart) {
    const audio = ensureBgm();
    audio.volume = BGM_VOLUME;
    if (fromStart) {
      try {
        audio.currentTime = 0;
      } catch (err) {
        console.error("[BGM] currentTime reset failed:", err);
      }
    }

    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise
        .then(function () {
          console.log("[BGM] playing:", audio.currentSrc || audio.src);
        })
        .catch(function (err) {
          console.error("[BGM] Audio.play() rejected:", err);
          const retry = function () {
            audio.removeEventListener("canplay", retry);
            if (state !== "playing" || bgmMode === "off") return;
            audio.play().then(function () {
              console.log("[BGM] playing after canplay retry");
            }).catch(function (retryErr) {
              console.error("[BGM] Audio.play() retry rejected:", retryErr);
            });
          };
          audio.addEventListener("canplay", retry);
        });
    }
  }

  function playBgm(fromStart) {
    if (bgmMode === "off") {
      stopBgm();
      return;
    }

    if (fromStart || bgmTrackIndex < 0) {
      bgmTrackIndex = pickTrackIndexForMode();
    }
    if (bgmTrackIndex < 0) {
      stopBgm();
      return;
    }

    loadBgmTrack(bgmTrackIndex, true);
    startBgmPlayback(!!fromStart);
  }

  function stopBgm() {
    if (!bgm) return;
    bgm.pause();
    try {
      bgm.currentTime = 0;
    } catch (err) {
      console.error("[BGM] stop currentTime reset failed:", err);
    }
  }

  function pauseBgm() {
    if (!bgm) return;
    bgm.pause();
  }

  function syncSoundToggles() {
    bgmModeSelect.value = bgmMode;
    toggleSfx.checked = sfxEnabled;
  }

  function setBgmMode(mode) {
    if (BGM_MODE_VALUES.indexOf(mode) === -1) mode = "0";
    bgmMode = mode;
    localStorage.setItem(BGM_MODE_KEY, bgmMode);
    bgmModeSelect.value = bgmMode;
    if (state === "playing") {
      if (bgmMode === "off") {
        stopBgm();
      } else {
        resumeAudio();
        playBgm(true);
      }
    } else {
      stopBgm();
    }
  }

  function setSfxEnabled(on) {
    sfxEnabled = !!on;
    localStorage.setItem(SFX_KEY, sfxEnabled ? "1" : "0");
    toggleSfx.checked = sfxEnabled;
  }

  function playTone(freq, duration, type, volume, freqEnd) {
    if (!sfxEnabled || !audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const t = audioCtx.currentTime;
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t + duration);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  function sfxJump(kind) {
    if (!sfxEnabled) return;
    if (kind === "triple") {
      playTone(560, 0.1, "triangle", 0.16, 980);
      playTone(880, 0.1, "sine", 0.12, 1280);
    } else if (kind === "double") {
      playTone(520, 0.1, "triangle", 0.16, 880);
      playTone(780, 0.08, "sine", 0.1, 1100);
    } else {
      playTone(420, 0.12, "triangle", 0.18, 720);
    }
  }

  function sfxDive() {
    if (!sfxEnabled) return;
    playTone(320, 0.08, "sawtooth", 0.14, 90);
    playTone(180, 0.16, "triangle", 0.12, 55);
  }

  function sfxHit() {
    if (!sfxEnabled) return;
    playTone(180, 0.18, "sawtooth", 0.22, 60);
    playTone(90, 0.28, "square", 0.12, 40);
  }

  function sfxScore() {
    if (!sfxEnabled) return;
    playTone(660, 0.06, "sine", 0.08);
  }

  function sfxPeach() {
    if (!sfxEnabled) return;
    playTone(740, 0.08, "sine", 0.14);
    playTone(980, 0.1, "triangle", 0.1, 1200);
  }

  function sfxFeather() {
    if (!sfxEnabled) return;
    playTone(520, 0.08, "sine", 0.12, 760);
    playTone(880, 0.12, "triangle", 0.1, 1400);
  }

  function maxJumps() {
    if (selectedCharId === "wing") return 3;
    if (selectedCharId === "heavy") return MAX_JUMPS;
    return MAX_JUMPS + (player.feather ? 1 : 0);
  }

  function resetGame() {
    score = 0;
    distance = 0;
    lastDistScore = 0;
    distScoreAcc = 0;
    speed = 280;
    spawnTimer = 0;
    nextSpawn = 1.2;
    if (selectedMode === "easy") nextSpawn = 2.6;
    itemSpawnTimer = 0;
    nextItemSpawn = 1.4;
    obstacles = [];
    items = [];
    particles = [];
    floatTexts = [];
    fireballs = [];
    fireTimer = 0;
    shootingStars = [];
    fireworks = [];
    shootTimer = 0;
    fireworkTimer = 0;
    shake = 0;
    animT = 0;
    player.x = PLAYER_X;
    player.y = GROUND_Y;
    player.vy = 0;
    player.onGround = true;
    player.feather = false;
    player.diving = false;
    player.squish = 1;
    player.blink = 0;
    player.shield = selectedCharId === "normal" ? 1 : 0;
    player.diveCharges = 0;
    player.spinAngle = 0;
    player.invuln = 0;
    player.birdKills = 0;
    player.yuzuGuard = 0;
    player.fallingInHole = false;
    player.jumpsLeft = maxJumps();
    setScore(0);
    syncBestDisplay();
    syncFeatherHud();
  }

  function syncDebugUi() {
    btnDebugTitle.classList.toggle("hidden", !(debugMode && state === "playing"));
    debugBadge.classList.toggle("hidden", !(debugMode && state === "playing"));
  }

  function showTitle() {
    state = "title";
    debugMode = false;
    debugTapCount = 0;
    clearSecretUnlocks();
    titleScreen.classList.remove("hidden");
    gameoverScreen.classList.add("hidden");
    hud.classList.add("hidden");
    syncDebugUi();
    stopBgm();
    resetGame();
    initDecor();
    syncCharSelectUi();
    syncModeRecordsUi();
    syncCharRecordsUi();
    syncBestDisplay();
  }

  function startGame(asDebug) {
    // ユーザー操作起点で AudioContext / BGM を開始（iPhone Safari）
    resumeAudio();
    debugMode = !!asDebug;
    debugTapCount = 0;
    resetGame();
    initDecor();
    state = "playing";
    titleScreen.classList.add("hidden");
    gameoverScreen.classList.add("hidden");
    hud.classList.remove("hidden");
    syncSpeedDisplay();
    syncDebugUi();
    playBgm(true);
    lastTime = performance.now();
  }

  function endGame() {
    if (state !== "playing") return;
    if (debugMode) return;
    state = "gameover";
    pauseBgm();
    sfxHit();
    shake = 12;
    spawnBurst(player.x, player.y - player.r, "#ff8fab", 18);
    finalScoreEl.textContent = String(score);
    const isNew = submitScore(score);
    newBestEl.classList.toggle("hidden", !isNew);
    gameoverScreen.classList.remove("hidden");
    syncDebugUi();
  }

  function jump() {
    if (state !== "playing") return;
    if (player.jumpsLeft <= 0) return;

    const canTriple =
      selectedCharId === "wing" ||
      (selectedCharId !== "heavy" && player.feather);
    const isTriple = canTriple && !player.onGround && player.jumpsLeft === 1;
    const isDouble = !player.onGround && !isTriple;
    let kind = "single";
    let vy = JUMP_V;
    let color = "#c8e6a0";
    let burst = 6;

    if (isTriple) {
      kind = "triple";
      vy = TRIPLE_JUMP_V;
      color = "#a8e8ff";
      burst = 14;
      if (selectedCharId !== "wing") {
        player.feather = false;
        syncFeatherHud();
      }
    } else if (isDouble) {
      kind = "double";
      vy = DOUBLE_JUMP_V;
      color = "#ffd0e0";
      burst = 10;
    }

    player.diving = false;
    player.vy = vy;
    player.onGround = false;
    player.jumpsLeft -= 1;
    player.squish = isTriple ? 1.4 : isDouble ? 1.35 : 1.25;
    sfxJump(kind);
    spawnBurst(
      player.x,
      kind === "single" ? GROUND_Y - 4 : player.y - player.r,
      color,
      burst
    );
  }

  function canPlayerDive() {
    if (selectedCharId === "wing") return player.diveCharges > 0;
    return currentChar().canDive;
  }

  function dive() {
    if (state !== "playing") return;
    if (!canPlayerDive()) return;
    if (player.onGround) return;
    if (player.jumpsLeft > 0) return;
    if (player.diving) return;

    player.diving = true;
    player.vy = DIVE_V;
    player.squish = 0.55;
    if (selectedCharId === "wing") {
      player.diveCharges = Math.max(0, player.diveCharges - 1);
      syncFeatherHud();
    }
    sfxDive();
    spawnBurst(player.x, player.y - player.r, "#ffe08a", 12);
  }

  function tryAction() {
    if (state === "title") {
      startGame(false);
      return;
    }
    if (state === "gameover") {
      startGame(false);
      return;
    }
    if (!player.onGround && player.jumpsLeft <= 0) {
      dive();
      return;
    }
    jump();
  }

  function canvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    };
  }

  function hitTitlePeach(x, y) {
    const cx = player.x;
    const cy = player.y - player.r;
    const dx = x - cx;
    const dy = y - cy;
    return dx * dx + dy * dy <= (player.r * 1.6) * (player.r * 1.6);
  }

  function handleTitlePeachTap() {
    debugTapCount += 1;
    player.squish = 1.3;
    spawnBurst(player.x, player.y - player.r, "#ff8fab", 5);
    if (debugTapCount >= DEBUG_TAPS_NEEDED) {
      startGame(true);
    }
  }

  /** 障害物出現など用（従来どおり） */
  function difficultyFactor() {
    return Math.min(1, distance / 3500);
  }

  /** スピード上昇用（従来の約1/3の速度で上昇） */
  function speedDifficultyFactor() {
    return Math.min(1, distance / 10500);
  }

  /** 表示・移動速度用のパーセント（100起算、上限なし） */
  function speedPercent() {
    const preCap = selectedMode === "hard" ? 400 : 200;
    const preRange = preCap - 100;

    if (score < 10000) {
      return 100 + speedDifficultyFactor() * preRange;
    }
    if (score < 15000) {
      // 10000→preCap, 15000→preCap+50
      return preCap + ((score - 10000) / 5000) * 50;
    }
    // 15000以降: 10000スコアごとに +50%（上限なし）
    return preCap + 50 + ((score - 15000) / 10000) * 50;
  }

  function currentSpeed() {
    const pct = speedPercent();
    // 100%→280, 200%→600（従来どおり）
    return 280 + ((pct - 100) / 100) * 320;
  }

  function syncSpeedDisplay() {
    if (speedEl) speedEl.textContent = Math.floor(speedPercent()) + "%";
  }

  function nextObstacleSpawnDelay() {
    // EASY・穴のみ区間だけ間隔を広げる（2000以降は通常と同じ）
    if (selectedMode === "easy" && score < 2000) {
      return 2.4 + Math.random() * 1.1;
    }
    let base = Math.max(0.55, 1.55 - difficultyFactor() * 0.9) + Math.random() * 0.45;
    const late = lateSpawnLevel();
    if (late > 0) {
      // 10000以降、1000ごとに出現間隔を短縮（下限あり）
      base *= Math.max(0.35, 1 - late * 0.08);
      base = Math.max(0.28, base);
    }
    return base;
  }

  /** 10000以上: 1, 11000: 2, … */
  function lateSpawnLevel() {
    if (score < 10000) return 0;
    return 1 + Math.floor((score - 10000) / 1000);
  }

  function spawnObstacle() {
    const d = difficultyFactor();
    let types;

    if (selectedMode === "easy") {
      types = ["hole"];
      if (score >= 2000) types.push("rock");
      if (score >= 4000) types.push("tree");
      if (score >= 6000) types.push("bird");
    } else {
      types = ["rock", "tree", "hole"];
      if (d > 0.15) types.push("bird");
      if (d > 0.4) types.push("bird", "hole");
      if (d > 0.65) types.push("rock", "tree", "bird");
    }

    const type = types[(Math.random() * types.length) | 0];
    const base = { type, x: W + 40, passed: false };

    if (type === "rock") {
      obstacles.push({
        ...base,
        w: 36 + Math.random() * 18,
        h: 28 + Math.random() * 16,
        y: GROUND_Y,
      });
    } else if (type === "tree") {
      obstacles.push({
        ...base,
        w: 26,
        h: 70 + Math.random() * 30,
        y: GROUND_Y,
      });
    } else if (type === "hole") {
      const easyHoleOnly = selectedMode === "easy" && score < 2000;
      obstacles.push({
        ...base,
        w: easyHoleOnly
          ? 52 + Math.random() * 28
          : 70 + Math.random() * 50 + d * 40,
        h: 40,
        y: GROUND_Y + 8,
      });
    } else if (type === "bird") {
      if (selectedMode === "hard") {
        // 個体差ありの一定周期・広めの上下
        const amp = 48 + Math.random() * 42;
        const mid = GROUND_Y - (110 + Math.random() * 120);
        obstacles.push({
          ...base,
          w: 40,
          h: 28,
          y: mid,
          bob: Math.random() * Math.PI * 2,
          bobSpeed: 2.2 + Math.random() * 2.4,
          bobAmp: amp,
          hardBird: true,
        });
      } else {
        obstacles.push({
          ...base,
          w: 40,
          h: 28,
          y: GROUND_Y - (90 + Math.random() * 100),
          bob: Math.random() * Math.PI * 2,
          bobSpeed: 4,
          bobAmp: 10,
        });
      }
    }
  }

  function spawnItem() {
    // 桃は多め、羽は少なめ
    const type = Math.random() < 0.82 ? "peach" : "feather";
    const airY = GROUND_Y - (50 + Math.random() * 140);
    items.push({
      type,
      x: W + 30,
      y: airY,
      r: type === "peach" ? 16 : 22,
      bob: Math.random() * Math.PI * 2,
    });
  }

  function spawnFloatText(x, y, text, color) {
    floatTexts.push({
      x,
      y,
      text,
      color,
      life: 0.9,
      max: 0.9,
    });
  }

  function collectItem(item) {
    if (item.type === "peach") {
      addScore(PEACH_SCORE);
      sfxPeach();
      spawnBurst(item.x, item.y, "#ff8fab", 12);
      spawnFloatText(item.x, item.y - 20, "+" + scoreGainLabel(PEACH_SCORE), "#e85a7a");
      if (selectedCharId === "hakase") {
        spawnHakasePeachFireballs();
      }
      return;
    }

    if (item.type === "feather") {
      // ヘビー桃: 3段不可。羽は穴破壊チャージ
      if (selectedCharId === "heavy") {
        if (player.feather) {
          addScore(FEATHER_BONUS_SCORE);
          sfxPeach();
          spawnBurst(item.x, item.y, "#7ec8e8", 10);
          spawnFloatText(item.x, item.y - 20, "+" + scoreGainLabel(FEATHER_BONUS_SCORE), "#2a7ab0");
        } else {
          player.feather = true;
          syncFeatherHud();
          sfxFeather();
          spawnBurst(item.x, item.y, "#ffd24a", 14);
          spawnFloatText(item.x, item.y - 20, "穴破壊チャージ！", "#6a6a6a");
        }
        return;
      }

      // ウイング桃: ジャンプ回数は増えない。急降下を2回まで付与
      if (selectedCharId === "wing") {
        const hadCharges = player.diveCharges > 0;
        player.diveCharges = 2;
        syncFeatherHud();
        if (hadCharges) {
          addScore(FEATHER_BONUS_SCORE);
          sfxPeach();
          spawnBurst(item.x, item.y, "#7ec8e8", 10);
          spawnFloatText(item.x, item.y - 20, "+" + scoreGainLabel(FEATHER_BONUS_SCORE), "#2a7ab0");
        } else {
          sfxFeather();
          spawnBurst(item.x, item.y, "#ffd24a", 14);
          spawnFloatText(item.x, item.y - 20, "急降下×2！", "#5a8ad0");
        }
        return;
      }

      if (player.feather) {
        addScore(FEATHER_BONUS_SCORE);
        sfxPeach();
        spawnBurst(item.x, item.y, "#7ec8e8", 10);
        spawnFloatText(item.x, item.y - 20, "+" + scoreGainLabel(FEATHER_BONUS_SCORE), "#2a7ab0");
      } else {
        player.feather = true;
        if (player.onGround) {
          player.jumpsLeft = maxJumps();
        } else if (player.jumpsLeft < 2) {
          player.jumpsLeft = 2;
        }
        if (selectedCharId === "hakase" && fireTimer > 1) fireTimer = 1;
        syncFeatherHud();
        sfxFeather();
        spawnBurst(item.x, item.y, "#ffd24a", 14);
        spawnFloatText(item.x, item.y - 20, "3段ジャンプ！", "#9a6a00");
      }
    }
  }

  function spawnBurst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 180;
      particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 40,
        life: 0.35 + Math.random() * 0.35,
        max: 0.7,
        color,
        r: 2 + Math.random() * 3,
      });
    }
  }

  function update(dt) {
    animT += dt;
    speed = currentSpeed();
    syncSpeedDisplay();
    const phase = skyPhase();

    for (const c of clouds) {
      c.x -= c.speed * dt * (state === "playing" ? 0.35 : 0.15);
      if (c.x < -120) c.x = W + 40 + Math.random() * 80;
    }

    for (const h of hills) {
      const hs = state === "playing" ? speed * 0.15 : 20;
      h.x -= hs * dt;
      if (h.x + h.w < 0) h.x += W + h.w;
    }

    if (phase === "night" || phase === "space") {
      shootTimer += dt;
      const tier = spaceTier();
      const interval = phase === "space" ? Math.max(0.55, 1.1 - tier * 0.1) : 1.8;
      if (shootTimer >= interval) {
        shootTimer = 0;
        spawnShootingStar();
        if (tier >= 3 && Math.random() < 0.45) spawnShootingStar();
      }
    }

    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const s = shootingStars[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      if (s.life <= 0 || s.x > W + 40 || s.y > H) shootingStars.splice(i, 1);
    }

    if (phase === "space") {
      const tier = spaceTier();
      for (const p of planets) {
        if (p.unlock > tier) continue;
        p.x -= p.drift * dt * (state === "playing" ? 1 : 0.3);
        if (p.x + p.r * 2 < -60) p.x = W + p.r + Math.random() * 80;
      }

      if (tier >= 5) {
        fireworkTimer += dt;
        if (fireworkTimer >= 0.45) {
          fireworkTimer = 0;
          spawnFirework();
          spawnFirework();
          if (Math.random() < 0.55) spawnFirework();
          if (Math.random() < 0.25) spawnFirework();
        }
      }
    }

    for (let i = fireworks.length - 1; i >= 0; i--) {
      const fw = fireworks[i];
      fw.age += dt;
      if (fw.phase === "rise") {
        fw.y += fw.vy * dt;
        fw.vy += 90 * dt;
        fw.trail.push({ x: fw.x, y: fw.y, life: 0.35 });
        for (let t = fw.trail.length - 1; t >= 0; t--) {
          fw.trail[t].life -= dt;
          if (fw.trail[t].life <= 0) fw.trail.splice(t, 1);
        }
        if (fw.y <= fw.burstY) {
          fw.phase = "burst";
          fw.age = 0;
          fw.flash = 1;
          spawnFireworkBurst(fw);
          fw.secondaryAt = Math.random() < 0.55 ? 0.1 + Math.random() * 0.12 : null;
        }
      } else {
        if (fw.flash > 0) fw.flash = Math.max(0, fw.flash - dt * 3.5);
        if (fw.secondaryAt != null) {
          fw.secondaryAt -= dt;
          if (fw.secondaryAt <= 0) {
            fw.secondaryAt = null;
            spawnFireworkBurst(fw, true);
          }
        }
        for (const spark of fw.sparks) {
          spark.x += spark.vx * dt;
          spark.y += spark.vy * dt;
          spark.vy += spark.grav * dt;
          spark.vx *= 1 - 0.55 * dt;
          spark.vy *= 1 - 0.15 * dt;
          spark.life -= dt;
          if (spark.trail) {
            spark.trail.push({ x: spark.x, y: spark.y });
            if (spark.trail.length > 6) spark.trail.shift();
          }
        }
        fw.sparks = fw.sparks.filter(function (s) { return s.life > 0; });
        if (fw.sparks.length === 0 && fw.age > 0.35) fireworks.splice(i, 1);
      }
    }

    if (shake > 0) shake = Math.max(0, shake - dt * 40);

    player.squish += (1 - player.squish) * Math.min(1, dt * 10);
    player.blink += dt;

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 400 * dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    for (let i = floatTexts.length - 1; i >= 0; i--) {
      const ft = floatTexts[i];
      ft.life -= dt;
      ft.y -= 40 * dt;
      if (ft.life <= 0) floatTexts.splice(i, 1);
    }

    if (state !== "playing") {
      return;
    }

    if (player.invuln > 0) player.invuln = Math.max(0, player.invuln - dt);

    // スピン桃: 上昇中のみ回転
    if (selectedCharId === "spin" && !player.onGround && player.vy < 0) {
      player.spinAngle += dt * 14;
    } else if (player.onGround) {
      player.spinAngle = 0;
    }

    distance += speed * dt;
    const distScore = Math.floor(distance / 10);
    if (distScore > lastDistScore) {
      const rawGain = distScore - lastDistScore;
      if (distScore % 50 === 0) sfxScore();
      distScoreAcc += rawGain * currentChar().distMult;
      const whole = Math.floor(distScoreAcc);
      if (whole > 0) {
        addScore(whole);
        distScoreAcc -= whole;
      }
      lastDistScore = distScore;
    }

    player.vy += GRAVITY * dt;
    player.y += player.vy * dt;

    // 障害物を先に動かしてから穴判定（高速時のすり抜け防止）
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      if (o.blown) continue;
      o.x -= speed * dt;
    }

    const overHole = isPlayerOverHole(dt);

    const fallAirJumps = Math.max(0, maxJumps() - 1);

    if (player.y >= GROUND_Y && !overHole && !player.fallingInHole) {
      player.y = GROUND_Y;
      player.vy = 0;
      if (!player.onGround) {
        player.squish = player.diving ? 0.45 : 0.7;
        spawnBurst(player.x, GROUND_Y, player.diving ? "#ffe08a" : "#d4c090", player.diving ? 10 : 4);
      }
      player.onGround = true;
      player.diving = false;
      player.spinAngle = 0;
      player.fallingInHole = false;
      player.jumpsLeft = maxJumps();
    } else if (player.fallingInHole || (overHole && player.y >= GROUND_Y - 2)) {
      // ヘビー桃: 羽所持中の急降下着地なら穴を破壊して着地
      if (selectedCharId === "heavy" && player.diving && player.feather) {
        smashHolesUnderPlayer();
        player.feather = false;
        syncFeatherHud();
        player.y = GROUND_Y;
        player.vy = 0;
        player.squish = 0.45;
        spawnBurst(player.x, GROUND_Y, "#ffe08a", 12);
        spawnFloatText(player.x, GROUND_Y - 30, "穴破壊！", "#6a6a6a");
        player.onGround = true;
        player.diving = false;
        player.spinAngle = 0;
        player.fallingInHole = false;
        player.jumpsLeft = maxJumps();
      } else if (selectedCharId === "yuzu" && player.yuzuGuard > 0) {
        // ゆずりんご無敵: 落とし穴ダメージ無効
        player.yuzuGuard = 0;
        syncFeatherHud();
        smashHolesUnderPlayer();
        player.y = GROUND_Y;
        player.vy = 0;
        player.squish = 0.7;
        player.invuln = 0.6;
        spawnBurst(player.x, GROUND_Y, "#ffffff", 12);
        spawnFloatText(player.x, GROUND_Y - 30, "無敵！", "#888");
        player.onGround = true;
        player.diving = false;
        player.spinAngle = 0;
        player.fallingInHole = false;
        player.jumpsLeft = maxJumps();
      } else {
        player.fallingInHole = true;
        if (player.onGround) player.jumpsLeft = Math.min(player.jumpsLeft, fallAirJumps);
        player.onGround = false;
        if (player.y > GROUND_Y + 60) {
          endGame();
          return;
        }
      }
    } else {
      // 穴から上へジャンプで脱出した場合は落下状態を解除
      if (player.fallingInHole && !overHole && player.y < GROUND_Y - 12) {
        player.fallingInHole = false;
      }
      if (player.onGround) player.jumpsLeft = Math.min(player.jumpsLeft, fallAirJumps);
      player.onGround = false;
    }

    // 急降下中はさらに真下へ加速
    if (player.diving && player.vy < DIVE_V) {
      player.vy = Math.min(DIVE_V, player.vy + 2400 * dt);
    }

    spawnTimer += dt;
    if (spawnTimer >= nextSpawn) {
      spawnTimer = 0;
      nextSpawn = nextObstacleSpawnDelay();
      spawnObstacle();
      // EASYの穴のみ区間は連続スポーンなし
      const late = lateSpawnLevel();
      const doubleChance = 0.28 + late * 0.06;
      if (!(selectedMode === "easy" && score < 2000) &&
          (difficultyFactor() > 0.5 || late > 0) &&
          Math.random() < Math.min(0.7, doubleChance)) {
        setTimeout(function () {
          if (state === "playing") spawnObstacle();
        }, Math.max(90, 220 - late * 12) + Math.random() * Math.max(60, 180 - late * 10));
      }
    }

    itemSpawnTimer += dt;
    if (itemSpawnTimer >= nextItemSpawn) {
      itemSpawnTimer = 0;
      nextItemSpawn = 1.5 + Math.random() * 1.4;
      spawnItem();
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];

      if (o.blown) {
        o.x += (o.bvx || 0) * dt;
        o.y += (o.bvy || 0) * dt;
        o.bvy = (o.bvy || 0) + 900 * dt;
        o.spin = (o.spin || 0) + dt * 10;
        if (o.x > W + 120 || o.y > H + 80 || o.x < -160) {
          obstacles.splice(i, 1);
        }
        continue;
      }

      if (o.type === "bird") {
        const bobSpeed = o.bobSpeed != null ? o.bobSpeed : 4;
        const bobAmp = o.bobAmp != null ? o.bobAmp : 10;
        o.bob += dt * bobSpeed;
        o.drawY = o.y + Math.sin(o.bob) * bobAmp;
      } else {
        o.drawY = o.y;
      }

      if (!o.passed && o.x + (o.w || 0) < player.x - player.r) {
        o.passed = true;
      }

      if (o.x + Math.max(o.w || 0, 50) < -80) {
        obstacles.splice(i, 1);
        continue;
      }

      if (debugMode) continue;

      if (o.type === "hole") continue;

      if (hitsPlayer(o)) {
        const outcome = resolveObstacleHit(o);
        if (outcome === "die") {
          endGame();
          return;
        }
      }
    }

    if (selectedCharId === "hakase") {
      updateFireballs(dt);
    }

    const px = player.x;
    const py = player.y - player.r;
    const pr = player.r * 0.85;

    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.x -= speed * dt;
      it.bob += dt * 3;
      it.drawY = it.y + Math.sin(it.bob) * 8;

      if (it.x + it.r < -40) {
        items.splice(i, 1);
        continue;
      }

      const dy = py - (it.drawY != null ? it.drawY : it.y);
      const dx = px - it.x;
      if (dx * dx + dy * dy < (pr + it.r) * (pr + it.r)) {
        collectItem(it);
        items.splice(i, 1);
      }
    }
  }

  function smashHolesUnderPlayer() {
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const o = obstacles[i];
      if (o.type !== "hole" || o.blown) continue;
      if (
        player.x + player.r * 0.4 > o.x &&
        player.x - player.r * 0.4 < o.x + o.w
      ) {
        destroyObstacle(o, 0, "#6a6a6a");
      }
    }
  }

  /** 穴の上判定（高速時は前フレーム位置も見てすり抜けを防ぐ） */
  function isPlayerOverHole(dt) {
    if (debugMode || selectedCharId === "wing") return false;
    const half = player.r * 0.45;
    const left = player.x - half;
    const right = player.x + half;
    const move = speed * dt;
    for (let i = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      if (o.blown || o.type !== "hole") continue;
      // 今フレーム位置
      if (right > o.x && left < o.x + o.w) return true;
      // 移動前〜現在のスイープ（穴がプレイヤーを飛び越えた場合）
      const prevX = o.x + move;
      const sweepLeft = Math.min(o.x, prevX);
      const sweepRight = Math.max(o.x + o.w, prevX + o.w);
      if (right > sweepLeft && left < sweepRight) return true;
    }
    return false;
  }

  function isSpinAscending() {
    return selectedCharId === "spin" && !player.onGround && player.vy < 0;
  }

  function destroyObstacle(o, points, color) {
    const ox = o.x + (o.w || 20) * 0.5;
    const oy =
      o.type === "bird"
        ? (o.drawY != null ? o.drawY : o.y) - (o.h || 20) * 0.5
        : o.y - (o.h || 20) * 0.5;
    spawnBurst(ox, oy, color || "#ffd24a", 16);
    if (points > 0) {
      addScore(points);
      sfxPeach();
      spawnFloatText(ox, oy - 10, "+" + scoreGainLabel(points), color || "#e85a7a");
    }
    if (o.type === "hole") {
      const idx = obstacles.indexOf(o);
      if (idx !== -1) obstacles.splice(idx, 1);
      return;
    }
    o.blown = true;
    o.bvx = 420 + Math.random() * 260;
    o.bvy = -320 - Math.random() * 220;
    o.spin = 0;
  }

  /** @returns {"die"|"ok"} */
  function resolveObstacleHit(o) {
    if (player.invuln > 0) return "ok";

    // ゆずりんご: 鳥ヒットで吹き飛ばし＋羽状態＋100、10匹で無敵
    if (selectedCharId === "yuzu" && o.type === "bird") {
      destroyObstacle(o, 100, "#ffffff");
      grantYuzuBirdReward();
      return "ok";
    }

    // スピン桃: 上昇スピン中は吹き飛ばし
    if (isSpinAscending()) {
      destroyObstacle(o, 100, "#3a9fd0");
      return "ok";
    }

    // ヘビー桃: 急降下中は破壊
    if (selectedCharId === "heavy" && player.diving) {
      destroyObstacle(o, 100, "#6a6a6a");
      return "ok";
    }

    // ゆずりんご無敵: 岩・木
    if (selectedCharId === "yuzu" && player.yuzuGuard > 0) {
      player.yuzuGuard = 0;
      player.invuln = 0.85;
      player.squish = 1.35;
      syncFeatherHud();
      sfxHit();
      spawnBurst(player.x, player.y - player.r, "#ffffff", 14);
      spawnFloatText(player.x, player.y - player.r - 28, "無敵！", "#888");
      return "ok";
    }

    // ノーマル桃: 1回ガード（穴以外）
    if (selectedCharId === "normal" && player.shield > 0) {
      player.shield -= 1;
      player.invuln = 0.85;
      player.squish = 1.35;
      sfxHit();
      spawnBurst(player.x, player.y - player.r, "#fff0a0", 14);
      spawnFloatText(player.x, player.y - player.r - 28, "ガード！", "#c45c1a");
      return "ok";
    }

    return "die";
  }

  function grantYuzuBirdReward() {
    player.birdKills += 1;
    if (!player.feather) {
      player.feather = true;
      if (player.onGround) {
        player.jumpsLeft = maxJumps();
      } else if (player.jumpsLeft < 2) {
        player.jumpsLeft = 2;
      }
      spawnFloatText(player.x, player.y - player.r - 36, "羽ゲット！", "#9a6a00");
    }
    if (player.birdKills >= 10) {
      player.birdKills = 0;
      if (player.yuzuGuard < 1) {
        player.yuzuGuard = 1;
        spawnFloatText(player.x, player.y - player.r - 52, "無敵チャージ！", "#666");
      }
    }
    syncFeatherHud();
    sfxFeather();
  }

  function updateFireballs(dt) {
    fireTimer += dt;
    const interval = player.feather ? 1 : 2;
    if (fireTimer >= interval) {
      fireTimer = 0;
      spawnFireball(player.x + player.r + 8, player.y - player.r, 480, 0, false);
    }

    for (let i = fireballs.length - 1; i >= 0; i--) {
      const f = fireballs[i];
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.life -= dt;

      if (f.life <= 0 || f.x > W + 60 || f.y > H + 60 || f.y < -60) {
        fireballs.splice(i, 1);
        continue;
      }

      let hit = false;
      for (let j = obstacles.length - 1; j >= 0; j--) {
        const o = obstacles[j];
        if (o.blown) continue;
        if (fireballHitsObstacle(f, o)) {
          // 通常火の玉は穴を破壊できない（桃由来のみ可）
          if (o.type === "hole" && !f.breaksHole) {
            continue;
          }
          destroyObstacle(o, 100, f.breaksHole ? "#ff4020" : "#ff8a30");
          hit = true;
          break;
        }
      }
      if (hit) fireballs.splice(i, 1);
    }
  }

  function spawnFireball(x, y, vx, vy, breaksHole) {
    fireballs.push({
      x: x,
      y: y,
      vx: vx,
      vy: vy,
      r: breaksHole ? 18 : 22,
      breaksHole: !!breaksHole,
      life: 2.2,
    });
  }

  /** 桃取得時: 前方三方向。通常発射とは独立。穴も破壊可 */
  function spawnHakasePeachFireballs() {
    const x = player.x + player.r + 8;
    const y = player.y - player.r;
    const speed = 500;
    spawnFireball(x, y, speed * 0.92, -speed * 0.38, true);
    spawnFireball(x, y, speed, 0, true);
    spawnFireball(x, y, speed * 0.92, speed * 0.38, true);
    spawnBurst(x, y, "#ff6020", 14);
  }

  function fireballHitsObstacle(f, o) {
    if (o.type === "hole") {
      return (
        f.x + f.r > o.x &&
        f.x - f.r < o.x + o.w &&
        f.y + f.r > GROUND_Y - 8 &&
        f.y - f.r < GROUND_Y + 50
      );
    }
    if (o.type === "rock") {
      return circleRect(f.x, f.y, f.r, o.x, o.y - o.h, o.w, o.h);
    }
    if (o.type === "tree") {
      const trunkHit = circleRect(f.x, f.y, f.r, o.x + 6, o.y - o.h * 0.55, 14, o.h * 0.55);
      const leafHit = circleRect(f.x, f.y, f.r, o.x - 10, o.y - o.h, o.w + 20, o.h * 0.5);
      return trunkHit || leafHit;
    }
    if (o.type === "bird") {
      const by = (o.drawY != null ? o.drawY : o.y) - o.h * 0.5;
      return circleRect(f.x, f.y, f.r, o.x, by, o.w, o.h);
    }
    return false;
  }

  function drawFireballs() {
    for (let i = 0; i < fireballs.length; i++) {
      const f = fireballs[i];
      const g = ctx.createRadialGradient(f.x - 4, f.y - 4, 2, f.x, f.y, f.r);
      g.addColorStop(0, "#fff6a0");
      g.addColorStop(0.45, "#ff9020");
      g.addColorStop(1, "#d43010");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255, 240, 180, 0.7)";
      ctx.beginPath();
      ctx.arc(f.x - f.r * 0.25, f.y - f.r * 0.25, f.r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function hitsPlayer(o) {
    const px = player.x;
    const py = player.y - player.r;
    const pr = player.r * 0.72;

    if (o.type === "hole") return false;

    if (o.type === "rock") {
      return circleRect(px, py, pr, o.x, o.y - o.h, o.w, o.h);
    }
    if (o.type === "tree") {
      const trunkHit = circleRect(px, py, pr, o.x + 6, o.y - o.h * 0.55, 14, o.h * 0.55);
      const leafHit = circleRect(px, py, pr, o.x - 10, o.y - o.h, o.w + 20, o.h * 0.5);
      return trunkHit || leafHit;
    }
    if (o.type === "bird") {
      const by = (o.drawY != null ? o.drawY : o.y) - o.h * 0.5;
      return circleRect(px, py, pr, o.x, by, o.w, o.h);
    }
    return false;
  }

  function circleRect(cx, cy, cr, rx, ry, rw, rh) {
    const nx = Math.max(rx, Math.min(cx, rx + rw));
    const ny = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - nx;
    const dy = cy - ny;
    return dx * dx + dy * dy < cr * cr;
  }

  function draw() {
    const sx = shake ? (Math.random() - 0.5) * shake : 0;
    const sy = shake ? (Math.random() - 0.5) * shake : 0;
    ctx.save();
    ctx.translate(sx, sy);

    drawSky();
    drawHills();
    drawGround();
    drawObstacles();
    drawItems();
    drawFireballs();
    if (state === "title") {
      ctx.globalAlpha = 0.4;
      drawPlayer();
      ctx.globalAlpha = 1;
    } else {
      drawPlayer();
    }
    drawParticles();
    drawFloatTexts();

    ctx.restore();
  }

  function spawnShootingStar() {
    shootingStars.push({
      x: 80 + Math.random() * (W * 0.7),
      y: 10 + Math.random() * 120,
      vx: 280 + Math.random() * 220,
      vy: 160 + Math.random() * 140,
      life: 0.55 + Math.random() * 0.35,
      len: 40 + Math.random() * 50,
    });
  }

  function spawnFirework() {
    const palette = [
      ["#ff4d7a", "#ffb3c8", "#ffffff"],
      ["#ffd24a", "#fff0a8", "#ffffff"],
      ["#4db8ff", "#a8e0ff", "#ffffff"],
      ["#7dff6a", "#c8ffb0", "#ffffff"],
      ["#ff8a3a", "#ffd0a0", "#ffffff"],
      ["#d080ff", "#f0c8ff", "#ffffff"],
      ["#ff5ac8", "#ffb0e8", "#ffffff"],
      ["#5affd0", "#c0fff0", "#ffffff"],
    ];
    const colors = palette[(Math.random() * palette.length) | 0];
    const x = 50 + Math.random() * (W - 100);
    fireworks.push({
      x: x,
      y: GROUND_Y - 10,
      vy: -(480 + Math.random() * 220),
      burstY: 40 + Math.random() * 180,
      phase: "rise",
      age: 0,
      flash: 0,
      color: colors[0],
      colors: colors,
      size: 0.85 + Math.random() * 0.55,
      trail: [],
      sparks: [],
    });
  }

  function spawnFireworkBurst(fw, secondary) {
    const scale = fw.size || 1;
    const layers = secondary
      ? [{ n: 36, sp: 70, life: 0.7 }]
      : [
          { n: 64, sp: 220, life: 1 },
          { n: 48, sp: 140, life: 0.85 },
          { n: 40, sp: 90, life: 0.7 },
        ];

    for (let L = 0; L < layers.length; L++) {
      const layer = layers[L];
      const n = Math.floor(layer.n * scale) + ((Math.random() * 20) | 0);
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / n + Math.random() * 0.25;
        const sp = (layer.sp * 0.65 + Math.random() * layer.sp * 0.55) * scale;
        const color = fw.colors[(Math.random() * fw.colors.length) | 0];
        fw.sparks.push({
          x: fw.x + (Math.random() - 0.5) * 6,
          y: fw.y + (Math.random() - 0.5) * 6,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: (0.9 + Math.random() * 0.7) * layer.life,
          maxLife: 1.4,
          r: (2.8 + Math.random() * 3.8) * scale * layer.life,
          grav: 180 + Math.random() * 120,
          color: color,
          trail: [],
        });
      }
    }

    // glitter core
    const glitter = Math.floor(30 * scale);
    for (let i = 0; i < glitter; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (40 + Math.random() * 100) * scale;
      fw.sparks.push({
        x: fw.x,
        y: fw.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 1.1 + Math.random() * 0.8,
        maxLife: 1.8,
        r: 1.6 + Math.random() * 2.2,
        grav: 90,
        color: "#ffffff",
        trail: [],
      });
    }
  }

  function drawFireworks() {
    for (const fw of fireworks) {
      if (fw.phase === "rise") {
        for (let t = 0; t < fw.trail.length; t++) {
          const tr = fw.trail[t];
          ctx.globalAlpha = Math.max(0, tr.life * 1.8);
          ctx.fillStyle = fw.color;
          ctx.beginPath();
          ctx.arc(tr.x, tr.y, 2 + t * 0.15, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = "#fff6c8";
        ctx.beginPath();
        ctx.arc(fw.x, fw.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = fw.color;
        ctx.beginPath();
        ctx.arc(fw.x, fw.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = fw.color;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(fw.x, fw.y);
        ctx.lineTo(fw.x, fw.y + 18);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else {
        if (fw.flash > 0) {
          const flashR = 36 + fw.flash * 55 * (fw.size || 1);
          ctx.globalAlpha = fw.flash * 0.5;
          ctx.fillStyle = fw.color;
          ctx.beginPath();
          ctx.arc(fw.x, fw.y, flashR, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = fw.flash * 0.85;
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(fw.x, fw.y, flashR * 0.32, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        for (const spark of fw.sparks) {
          const alpha = Math.max(0, Math.min(1, spark.life * 1.2));
          if (spark.trail && spark.trail.length > 1) {
            ctx.strokeStyle = spark.color;
            ctx.globalAlpha = alpha * 0.35;
            ctx.lineWidth = Math.max(1, spark.r * 0.45);
            ctx.beginPath();
            ctx.moveTo(spark.trail[0].x, spark.trail[0].y);
            for (let t = 1; t < spark.trail.length; t++) {
              ctx.lineTo(spark.trail[t].x, spark.trail[t].y);
            }
            ctx.stroke();
          }

          ctx.globalAlpha = alpha * 0.45;
          ctx.fillStyle = spark.color;
          ctx.beginPath();
          ctx.arc(spark.x, spark.y, spark.r * 2.2, 0, Math.PI * 2);
          ctx.fill();

          ctx.globalAlpha = alpha;
          ctx.fillStyle = spark.color;
          ctx.beginPath();
          ctx.arc(spark.x, spark.y, spark.r, 0, Math.PI * 2);
          ctx.fill();

          ctx.globalAlpha = alpha * 0.9;
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(spark.x, spark.y, spark.r * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }
  }

  function drawSky() {
    const phase = skyPhase();

    if (phase === "space") {
      drawSpaceSky();
      return;
    }
    if (phase === "night") {
      drawNightSky();
      return;
    }
    if (phase === "evening") {
      drawEveningSky();
      return;
    }

    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#6eb8dc");
    g.addColorStop(0.45, "#b7dff0");
    g.addColorStop(1, "#ffe2b8");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.beginPath();
    ctx.arc(820, 90, 42, 0, Math.PI * 2);
    ctx.fillStyle = "#ffe08a";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(820, 90, 58, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 224, 138, 0.25)";
    ctx.fill();

    for (const c of clouds) drawCloud(c.x, c.y, c.s, "rgba(255,255,255,0.85)");
  }

  function drawEveningSky() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#2a3a6a");
    g.addColorStop(0.35, "#c45c6a");
    g.addColorStop(0.65, "#e88850");
    g.addColorStop(1, "#f0c080");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.beginPath();
    ctx.arc(700, GROUND_Y - 20, 55, 0, Math.PI * 2);
    ctx.fillStyle = "#ffb040";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(700, GROUND_Y - 20, 80, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 140, 60, 0.28)";
    ctx.fill();

    for (const c of clouds) {
      drawCloud(c.x, c.y, c.s, "rgba(255, 200, 180, 0.55)");
    }
  }

  function drawNightSky() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0a1028");
    g.addColorStop(0.55, "#1a2450");
    g.addColorStop(1, "#2a3868");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    drawStarField(0.9);
    drawMoon(780, 90, 36);
    drawShootingStars();

    for (const c of clouds) {
      drawCloud(c.x, c.y * 0.7 + 20, c.s * 0.85, "rgba(40, 50, 90, 0.45)");
    }
  }

  function drawSpaceSky() {
    const tier = spaceTier();
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#05010f");
    g.addColorStop(0.4, "#120828");
    g.addColorStop(0.75, "#1a0a35");
    g.addColorStop(1, "#0d1528");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // base nebulae
    drawNebula(280, 120, 220, "rgba(160, 60, 180, 0.28)", "rgba(60, 80, 180, 0.12)");
    drawNebula(720, 200, 180, "rgba(40, 160, 200, 0.2)", "rgba(0,0,0,0)");

    if (tier >= 1) {
      drawNebula(500, 80, 160, "rgba(80, 220, 200, 0.18)", "rgba(0,0,0,0)");
    }
    if (tier >= 2) {
      drawAurora();
    }
    if (tier >= 4) {
      drawGalaxySwirl(650, 100, 70);
    }

    drawStarField(1.05 + tier * 0.08);
    drawPlanets();
    drawShootingStars();

    if (tier >= 5) {
      drawFireworks();
    }
  }

  function drawNebula(x, y, radius, c0, c1) {
    const nebula = ctx.createRadialGradient(x, y, 10, x, y + 20, radius);
    nebula.addColorStop(0, c0);
    nebula.addColorStop(0.55, c1);
    nebula.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = nebula;
    ctx.fillRect(0, 0, W, H);
  }

  function drawAurora() {
    ctx.save();
    ctx.globalAlpha = 0.35 + Math.sin(animT * 1.5) * 0.08;
    for (let i = 0; i < 4; i++) {
      const x0 = 80 + i * 200;
      const wave = Math.sin(animT * 1.2 + i) * 18;
      const grad = ctx.createLinearGradient(x0, 40, x0 + 40, 220);
      grad.addColorStop(0, "rgba(80, 255, 180, 0)");
      grad.addColorStop(0.4, i % 2 ? "rgba(100, 220, 255, 0.55)" : "rgba(140, 255, 160, 0.5)");
      grad.addColorStop(1, "rgba(80, 255, 180, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(x0 + wave, 30);
      ctx.quadraticCurveTo(x0 + 30, 120 + wave, x0 + 10 + wave, 230);
      ctx.quadraticCurveTo(x0 - 10, 140, x0 - 20 + wave, 30);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawGalaxySwirl(cx, cy, r) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(animT * 0.15);
    for (let i = 0; i < 3; i++) {
      ctx.rotate((Math.PI * 2) / 3);
      const grad = ctx.createRadialGradient(0, 0, 2, r * 0.6, 0, r);
      grad.addColorStop(0, "rgba(255, 220, 255, 0.55)");
      grad.addColorStop(0.5, "rgba(180, 120, 255, 0.25)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(r * 0.35, 0, r * 0.7, r * 0.22, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(255, 240, 255, 0.85)";
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawStarField(scale) {
    const tier = Math.max(0, spaceTier());
    const count = skyPhase() === "space" ? Math.min(stars.length, 60 + tier * 10) : stars.length;
    for (let i = 0; i < count; i++) {
      const s = stars[i];
      const twinkle = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(animT * 3 + s.tw));
      ctx.globalAlpha = s.bright * twinkle;
      ctx.fillStyle = "#fff8e8";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawMoon(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r + 14, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(220, 230, 255, 0.15)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = "#f0f2ff";
    ctx.fill();

    ctx.fillStyle = "rgba(180, 185, 210, 0.35)";
    ctx.beginPath();
    ctx.arc(x - 8, y - 4, 7, 0, Math.PI * 2);
    ctx.arc(x + 10, y + 8, 5, 0, Math.PI * 2);
    ctx.arc(x + 2, y + 2, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawShootingStars() {
    for (const s of shootingStars) {
      const a = Math.max(0, s.life);
      const ang = Math.atan2(s.vy, s.vx);
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(ang);
      const grad = ctx.createLinearGradient(-s.len, 0, 0, 0);
      grad.addColorStop(0, "rgba(255,255,255,0)");
      grad.addColorStop(1, "rgba(255,255,255," + Math.min(1, a * 1.4) + ")");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-s.len, 0);
      ctx.lineTo(0, 0);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,240," + Math.min(1, a * 1.5) + ")";
      ctx.beginPath();
      ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawPlanets() {
    const tier = spaceTier();
    for (const p of planets) {
      if (p.unlock > tier) continue;
      drawPlanetByStyle(p);
    }
  }

  function drawPlanetByStyle(p) {
    const x = p.x;
    const y = p.y;
    const r = p.r;

    if (p.style === "saturn" || p.style === "gas") {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, 0.35);
      ctx.strokeStyle = p.style === "gas" ? "rgba(200, 180, 255, 0.5)" : "rgba(230, 210, 160, 0.55)";
      ctx.lineWidth = p.style === "gas" ? 8 : 6;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.75, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (p.style === "binary") {
      drawPlanetBody(x - r * 0.55, y, r * 0.7, "#f0c060", "#ffe0a0");
      drawPlanetBody(x + r * 0.55, y + 4, r * 0.55, "#d07050", "#f0a080");
      return;
    }

    const palette = {
      rose: ["#c45c6a", "#e8a0a8"],
      ocean: ["#6a9ad4", "#9ec4f0"],
      saturn: ["#d4a85a", "#f0d090"],
      violet: ["#8b7cc8", "#b5a8e8"],
      ice: ["#a8d8f0", "#e8f8ff"],
      mint: ["#5cbc9a", "#b0f0d8"],
      lava: ["#c04020", "#ff9040"],
      stripe: ["#d4b06a", "#f5e0b0"],
      gas: ["#9a7ad4", "#d0b8ff"],
      emerald: ["#2e8b6a", "#7ae0b0"],
      peach: ["#f76c8c", "#ffc0d0"],
    };
    const colors = palette[p.style] || ["#aaa", "#ddd"];
    drawPlanetBody(x, y, r, colors[0], colors[1]);

    if (p.style === "ice") {
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x - r * 0.2, y + r * 0.1, r * 0.55, 0.2, 1.4);
      ctx.stroke();
    }
    if (p.style === "lava") {
      ctx.strokeStyle = "rgba(255, 200, 80, 0.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.5, y);
      ctx.quadraticCurveTo(x - 4, y + r * 0.3, x + r * 0.4, y - r * 0.1);
      ctx.stroke();
    }
    if (p.style === "stripe") {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.strokeStyle = "rgba(120, 80, 40, 0.35)";
      ctx.lineWidth = 4;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(x - r, y + i * 8);
        ctx.lineTo(x + r, y + i * 8 + 3);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (p.style === "peach") {
      ctx.strokeStyle = "rgba(200, 60, 90, 0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y - r + 4);
      ctx.quadraticCurveTo(x - 2, y, x, y + 6);
      ctx.stroke();
      ctx.fillStyle = "#4caf50";
      ctx.beginPath();
      ctx.ellipse(x - 4, y - r + 2, 6, 4, -0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPlanetBody(x, y, r, base, band) {
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.15, x, y, r);
    g.addColorStop(0, band);
    g.addColorStop(1, base);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.ellipse(x - r * 0.25, y - r * 0.3, r * 0.35, r * 0.2, -0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawCloud(x, y, s, color) {
    ctx.fillStyle = color || "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.ellipse(x, y, 38 * s, 18 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 28 * s, y + 4 * s, 30 * s, 15 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 24 * s, y + 6 * s, 26 * s, 14 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function hillColors(phase) {
    if (phase === "space") return ["#3a2a55", "#2e2148", "#453060", "#2a1f40"];
    if (phase === "night") return ["#1e3a2e", "#173328", "#244836", "#152e24"];
    if (phase === "evening") return ["#4a6e3a", "#3f6234", "#557a42", "#38582e"];
    return ["#7bb86a", "#6aa85c", "#7bb86a", "#629e52"];
  }

  function drawHills() {
    const phase = skyPhase();
    const colors = hillColors(phase);
    hills.forEach(function (h, i) {
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      ctx.moveTo(h.x, GROUND_Y);
      ctx.quadraticCurveTo(h.x + h.w * 0.5, GROUND_Y - h.h, h.x + h.w, GROUND_Y);
      ctx.closePath();
      ctx.fill();
    });
  }

  function drawGround() {
    const phase = skyPhase();
    let top = "#6bb04f";
    let dirt = "#8b6a45";
    let grass = "#4f9340";

    if (phase === "evening") {
      top = "#5a9440";
      dirt = "#7a5a3a";
      grass = "#3f7a32";
    } else if (phase === "night") {
      top = "#2f5a38";
      dirt = "#3a2e22";
      grass = "#244a2c";
    } else if (phase === "space") {
      top = "#4a4560";
      dirt = "#2e2a3a";
      grass = "#6a6580";
    }

    ctx.fillStyle = top;
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    ctx.fillStyle = dirt;
    ctx.fillRect(0, GROUND_Y + 18, W, H - GROUND_Y - 18);

    ctx.strokeStyle = grass;
    ctx.lineWidth = 2;
    const offset = (distance * 0.4) % 24;
    for (let x = -offset; x < W + 20; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, GROUND_Y + 4);
      ctx.lineTo(x + 3, GROUND_Y - 8);
      ctx.moveTo(x + 6, GROUND_Y + 4);
      ctx.lineTo(x + 10, GROUND_Y - 5);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(0,0,0,0.08)";
    const dOff = (distance * 0.5) % 40;
    for (let x = -dOff; x < W; x += 40) {
      ctx.fillRect(x, GROUND_Y + 40, 18, 4);
      ctx.fillRect(x + 20, GROUND_Y + 70, 12, 3);
    }

    if (phase === "space") {
      ctx.fillStyle = "rgba(180, 170, 220, 0.15)";
      for (let x = -((distance * 0.3) % 70); x < W; x += 70) {
        ctx.beginPath();
        ctx.ellipse(x + 20, GROUND_Y + 50, 10, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawObstacles() {
    for (const o of obstacles) {
      ctx.save();
      if (o.blown) {
        const cx = o.x + (o.w || 24) * 0.5;
        const cy = (o.type === "bird" ? (o.drawY != null ? o.drawY : o.y) : o.y) - (o.h || 24) * 0.4;
        ctx.translate(cx, cy);
        ctx.rotate(o.spin || 0);
        ctx.translate(-cx, -cy);
        ctx.globalAlpha = 0.9;
        if (o.type === "bird") o.drawY = o.y;
      }
      if (o.type === "hole") drawHole(o);
      else if (o.type === "rock") drawRock(o);
      else if (o.type === "tree") drawTree(o);
      else if (o.type === "bird") drawBird(o);
      ctx.restore();
    }
  }

  function drawHole(o) {
    ctx.fillStyle = "#2a1f1a";
    ctx.fillRect(o.x, GROUND_Y, o.w, H - GROUND_Y);
    ctx.fillStyle = "#1a120e";
    ctx.beginPath();
    ctx.ellipse(o.x + o.w / 2, GROUND_Y + 8, o.w / 2, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    // cracked edges
    ctx.fillStyle = "#5a9e4a";
    ctx.beginPath();
    ctx.moveTo(o.x - 8, GROUND_Y);
    ctx.lineTo(o.x + 6, GROUND_Y);
    ctx.lineTo(o.x - 2, GROUND_Y + 10);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(o.x + o.w - 6, GROUND_Y);
    ctx.lineTo(o.x + o.w + 8, GROUND_Y);
    ctx.lineTo(o.x + o.w + 2, GROUND_Y + 10);
    ctx.fill();
  }

  function drawRock(o) {
    const x = o.x;
    const y = o.y;
    ctx.fillStyle = "#7a746c";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + o.w * 0.15, y - o.h);
    ctx.lineTo(x + o.w * 0.55, y - o.h * 1.05);
    ctx.lineTo(x + o.w, y - o.h * 0.55);
    ctx.lineTo(x + o.w * 0.95, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.moveTo(x + o.w * 0.2, y - o.h * 0.85);
    ctx.lineTo(x + o.w * 0.45, y - o.h * 0.95);
    ctx.lineTo(x + o.w * 0.35, y - o.h * 0.55);
    ctx.fill();
  }

  function drawTree(o) {
    const x = o.x;
    const y = o.y;
    ctx.fillStyle = "#8b5a2b";
    ctx.fillRect(x + 8, y - o.h * 0.7, 12, o.h * 0.7);
    ctx.fillStyle = "#3f9e45";
    ctx.beginPath();
    ctx.arc(x + 14, y - o.h + 18, 28, 0, Math.PI * 2);
    ctx.arc(x - 2, y - o.h + 34, 22, 0, Math.PI * 2);
    ctx.arc(x + 30, y - o.h + 34, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#58b85c";
    ctx.beginPath();
    ctx.arc(x + 14, y - o.h + 12, 16, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBird(o) {
    const x = o.x;
    const y = o.drawY != null ? o.drawY : o.y;
    const flap = Math.sin(animT * 12 + o.bob) * 10;
    const needOutline = score >= 10000;

    function strokeBirdParts() {
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4;
      // body
      ctx.beginPath();
      ctx.ellipse(x + 18, y, 16, 10, 0, 0, Math.PI * 2);
      ctx.stroke();
      // wing
      ctx.beginPath();
      ctx.moveTo(x + 14, y);
      ctx.quadraticCurveTo(x + 8, y - 18 - flap, x + 28, y - 4);
      ctx.closePath();
      ctx.stroke();
      // beak
      ctx.beginPath();
      ctx.moveTo(x + 32, y);
      ctx.lineTo(x + 42, y + 2);
      ctx.lineTo(x + 32, y + 5);
      ctx.closePath();
      ctx.stroke();
    }

    if (needOutline) {
      // soft glow behind bird
      ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
      ctx.beginPath();
      ctx.ellipse(x + 18, y - 2, 28, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      strokeBirdParts();
    }

    ctx.fillStyle = needOutline ? "#5a6a80" : "#3d4a5c";
    ctx.beginPath();
    ctx.ellipse(x + 18, y, 16, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // wing
    ctx.beginPath();
    ctx.moveTo(x + 14, y);
    ctx.quadraticCurveTo(x + 8, y - 18 - flap, x + 28, y - 4);
    ctx.closePath();
    ctx.fillStyle = needOutline ? "#7a8aa0" : "#55667a";
    ctx.fill();

    // beak
    ctx.fillStyle = "#f0a040";
    ctx.beginPath();
    ctx.moveTo(x + 32, y);
    ctx.lineTo(x + 42, y + 2);
    ctx.lineTo(x + 32, y + 5);
    ctx.fill();

    // eye
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x + 24, y - 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.arc(x + 25, y - 2, 1.5, 0, Math.PI * 2);
    ctx.fill();

    if (needOutline) {
      // crisp inner outline on top
      ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x + 18, y, 16, 10, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 14, y);
      ctx.quadraticCurveTo(x + 8, y - 18 - flap, x + 28, y - 4);
      ctx.closePath();
      ctx.stroke();
    }
  }

  function drawItems() {
    for (const it of items) {
      const y = it.drawY != null ? it.drawY : it.y;
      if (it.type === "peach") drawItemPeach(it.x, y, it.r);
      else drawItemFeather(it.x, y);
    }
  }

  function drawItemPeach(x, y, r) {
    ctx.save();
    ctx.translate(x, y);
    const g = ctx.createRadialGradient(-4, -4, 2, 0, 0, r);
    g.addColorStop(0, "#ffc8d8");
    g.addColorStop(0.6, "#ff8fab");
    g.addColorStop(1, "#e85a7a");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(200, 60, 90, 0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -r + 2);
    ctx.quadraticCurveTo(-1, 0, 0, 6);
    ctx.stroke();
    ctx.fillStyle = "#4caf50";
    ctx.beginPath();
    ctx.ellipse(-4, -r + 2, 6, 4, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawItemFeather(x, y) {
    const pulse = 0.85 + Math.sin(animT * 5) * 0.15;

    ctx.save();
    ctx.translate(x, y);

    // soft glow halo (stands out against sky)
    const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 34 * pulse);
    glow.addColorStop(0, "rgba(255, 236, 120, 0.75)");
    glow.addColorStop(0.45, "rgba(255, 200, 60, 0.35)");
    glow.addColorStop(1, "rgba(255, 180, 40, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 34 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // ring marker
    ctx.strokeStyle = "rgba(255, 210, 60, " + (0.55 + pulse * 0.25) + ")";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 26 * pulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.rotate(-0.35 + Math.sin(animT * 3) * 0.1);
    ctx.scale(1.35, 1.35);

    // feather body — warm gold/cream for contrast vs blue sky
    ctx.fillStyle = "#fff6c8";
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.quadraticCurveTo(16, -2, 5, 20);
    ctx.quadraticCurveTo(-4, 6, 0, -18);
    ctx.fill();

    ctx.fillStyle = "#ffe082";
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.quadraticCurveTo(10, 0, 3, 16);
    ctx.quadraticCurveTo(-1, 4, 0, -16);
    ctx.fill();

    // outline
    ctx.strokeStyle = "#d4920a";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.quadraticCurveTo(16, -2, 5, 20);
    ctx.quadraticCurveTo(-4, 6, 0, -18);
    ctx.stroke();

    // shaft
    ctx.strokeStyle = "#b87a08";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(2, 18);
    ctx.stroke();

    // barbs
    ctx.strokeStyle = "rgba(184, 122, 8, 0.65)";
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 5; i++) {
      const t = -10 + i * 5.5;
      ctx.beginPath();
      ctx.moveTo(1, t);
      ctx.lineTo(9 - i * 0.6, t + 3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(1, t + 1);
      ctx.lineTo(-5 + i * 0.3, t + 4);
      ctx.stroke();
    }

    // sparkle
    const sp = Math.sin(animT * 8);
    if (sp > 0) {
      ctx.fillStyle = "rgba(255, 255, 255, " + sp + ")";
      ctx.beginPath();
      ctx.arc(-6, -8, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(8, 2, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawFloatTexts() {
    ctx.textAlign = "center";
    ctx.font = "800 18px 'M PLUS Rounded 1c', sans-serif";
    for (const ft of floatTexts) {
      ctx.globalAlpha = Math.max(0, ft.life / ft.max);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawYuzuCat(x, y, r, sx, sy, runBob) {
    ctx.save();
    ctx.translate(x, y - r + runBob);
    ctx.scale(sx, sy);
    if (player.invuln > 0 && Math.floor(player.invuln * 20) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(0, r / sy + 6, r * 0.7, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // ears
    ctx.fillStyle = "#f4f4f4";
    ctx.beginPath();
    ctx.moveTo(-16, -r + 8);
    ctx.lineTo(-22, -r - 10);
    ctx.lineTo(-6, -r + 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(16, -r + 8);
    ctx.lineTo(22, -r - 10);
    ctx.lineTo(6, -r + 2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffc0d0";
    ctx.beginPath();
    ctx.moveTo(-14, -r + 6);
    ctx.lineTo(-18, -r - 4);
    ctx.lineTo(-9, -r + 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(14, -r + 6);
    ctx.lineTo(18, -r - 4);
    ctx.lineTo(9, -r + 2);
    ctx.closePath();
    ctx.fill();

    // body
    const body = ctx.createRadialGradient(-6, -8, 4, 0, 0, r);
    body.addColorStop(0, "#ffffff");
    body.addColorStop(0.6, "#f0f0f0");
    body.addColorStop(1, "#d0d0d0");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // muzzle
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(0, 6, 10, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // eyes
    const eyesClosed = player.blink % 3.2 > 3.0;
    if (eyesClosed) {
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-12, -4);
      ctx.lineTo(-5, -4);
      ctx.moveTo(5, -4);
      ctx.lineTo(12, -4);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#2a2a2a";
      ctx.beginPath();
      ctx.ellipse(-8, -4, 3.5, 4.2, 0, 0, Math.PI * 2);
      ctx.ellipse(8, -4, 3.5, 4.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#7dff6a";
      ctx.beginPath();
      ctx.ellipse(-8, -3.5, 1.6, 2.2, 0, 0, Math.PI * 2);
      ctx.ellipse(8, -3.5, 1.6, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // nose / mouth
    ctx.fillStyle = "#ff8fab";
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.lineTo(-3, 5);
    ctx.lineTo(3, 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.quadraticCurveTo(-6, 10, -9, 7);
    ctx.moveTo(0, 5);
    ctx.quadraticCurveTo(6, 10, 9, 7);
    ctx.stroke();

    // whiskers
    ctx.strokeStyle = "rgba(80,80,80,0.45)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-10, 4);
    ctx.lineTo(-24, 1);
    ctx.moveTo(-10, 7);
    ctx.lineTo(-24, 8);
    ctx.moveTo(10, 4);
    ctx.lineTo(24, 1);
    ctx.moveTo(10, 7);
    ctx.lineTo(24, 8);
    ctx.stroke();

    if (player.onGround && state === "playing") {
      const leg = Math.sin(animT * speed * 0.05) * 7;
      ctx.strokeStyle = "#ddd";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-8, r - 6);
      ctx.lineTo(-8 + leg, r + 8);
      ctx.moveTo(8, r - 6);
      ctx.lineTo(8 - leg, r + 8);
      ctx.stroke();
    }

    if (player.feather || player.yuzuGuard > 0) {
      ctx.strokeStyle = player.yuzuGuard > 0 ? "rgba(180,180,255,0.8)" : "rgba(255, 200, 60, 0.7)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, r + 6 + Math.sin(animT * 6) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawHakaseRex(x, y, r, sx, sy, runBob) {
    ctx.save();
    ctx.translate(x, y - r + runBob);
    ctx.scale(sx, sy);
    if (player.invuln > 0 && Math.floor(player.invuln * 20) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(0, r / sy + 6, r * 0.85, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    const gold = ctx.createRadialGradient(-6, -8, 3, 0, 0, r + 6);
    gold.addColorStop(0, "#fff0a8");
    gold.addColorStop(0.45, "#e8b820");
    gold.addColorStop(1, "#9a6a08");

    // tail
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, 8);
    ctx.quadraticCurveTo(-r * 1.4, 4, -r * 1.55, -6);
    ctx.quadraticCurveTo(-r * 1.1, 10, -r * 0.2, 14);
    ctx.closePath();
    ctx.fill();

    // body
    ctx.beginPath();
    ctx.ellipse(0, 4, r * 0.95, r * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();

    // head
    ctx.beginPath();
    ctx.ellipse(r * 0.55, -r * 0.35, r * 0.7, r * 0.55, -0.15, 0, Math.PI * 2);
    ctx.fill();

    // jaw
    ctx.fillStyle = "#c99610";
    ctx.beginPath();
    ctx.ellipse(r * 0.85, -r * 0.1, r * 0.45, r * 0.28, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // teeth
    ctx.fillStyle = "#fff8e0";
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(r * 0.7 + i * 5, -r * 0.05);
      ctx.lineTo(r * 0.73 + i * 5, 4);
      ctx.lineTo(r * 0.78 + i * 5, -r * 0.05);
      ctx.closePath();
      ctx.fill();
    }

    // eye
    const eyesClosed = player.blink % 3.2 > 3.0;
    if (eyesClosed) {
      ctx.strokeStyle = "#5a3a08";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(r * 0.45, -r * 0.45);
      ctx.lineTo(r * 0.65, -r * 0.45);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#3a2a10";
      ctx.beginPath();
      ctx.arc(r * 0.55, -r * 0.45, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(r * 0.58, -r * 0.48, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // tiny arms
    ctx.strokeStyle = "#c99610";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.lineTo(14, 6);
    ctx.lineTo(18, 2);
    ctx.stroke();

    // legs
    if (player.onGround && state === "playing") {
      const leg = Math.sin(animT * speed * 0.05) * 6;
      ctx.strokeStyle = "#b8860b";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-6, r - 4);
      ctx.lineTo(-8 + leg, r + 10);
      ctx.moveTo(8, r - 4);
      ctx.lineTo(10 - leg, r + 10);
      ctx.stroke();
    } else {
      ctx.strokeStyle = "#b8860b";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-6, r - 4);
      ctx.lineTo(-4, r + 8);
      ctx.moveTo(8, r - 4);
      ctx.lineTo(10, r + 8);
      ctx.stroke();
    }

    if (player.feather) {
      ctx.strokeStyle = "rgba(255, 200, 60, 0.7)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, r + 8 + Math.sin(animT * 6) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawPlayer() {
    const x = player.x;
    const y = player.y;
    const r = player.r;
    const sx = player.squish;
    const sy = 2 - player.squish;
    const runBob = player.onGround ? Math.sin(animT * speed * 0.04) * 3 : 0;
    const charId = selectedCharId;

    if (charId === "yuzu") {
      drawYuzuCat(x, y, r, sx, sy, runBob);
      return;
    }
    if (charId === "hakase") {
      drawHakaseRex(x, y, r, sx, sy, runBob);
      return;
    }

    const spinning = isSpinAscending();

    const palettes = {
      normal: { a: "#ffc0d0", b: "#ff8fab", c: "#e85a7a", cleft: "rgba(200, 60, 90, 0.35)", leg: "#e85a7a" },
      spin: { a: "#c8f0ff", b: "#6ec8f0", c: "#3a9fd0", cleft: "rgba(40, 100, 150, 0.4)", leg: "#3a9fd0" },
      heavy: { a: "#d8d8d8", b: "#9a9a9a", c: "#5e5e5e", cleft: "rgba(40, 40, 40, 0.45)", leg: "#5e5e5e" },
      wing: { a: "#ffffff", b: "#f2f5ff", c: "#d0d8ea", cleft: "rgba(120, 140, 180, 0.4)", leg: "#b0b8c8" },
    };
    const pal = palettes[charId] || palettes.normal;

    ctx.save();
    ctx.translate(x, y - r + runBob);
    ctx.scale(sx, sy);
    if (player.invuln > 0 && Math.floor(player.invuln * 20) % 2 === 0) {
      ctx.globalAlpha = 0.45;
    }

    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(0, r / sy + 6, r * 0.7, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    if (spinning) ctx.rotate(player.spinAngle);

    // ウイング桃の羽（背面）
    if (charId === "wing") {
      const flap = Math.sin(animT * (player.onGround ? 10 : 14)) * 0.25;
      ctx.fillStyle = "rgba(210, 225, 245, 0.95)";
      ctx.beginPath();
      ctx.ellipse(-r * 0.85, -2, 16, 10, -0.5 + flap, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(r * 0.85, -2, 16, 10, 0.5 - flap, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(140, 160, 200, 0.55)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(-r * 0.85, -2, 16, 10, -0.5 + flap, 0, Math.PI * 2);
      ctx.ellipse(r * 0.85, -2, 16, 10, 0.5 - flap, 0, Math.PI * 2);
      ctx.stroke();
    }

    // スピン桃のトゲ（背面）
    if (charId === "spin") {
      ctx.fillStyle = "#2a7aad";
      for (let i = 0; i < 7; i++) {
        const a = -Math.PI * 0.75 + (i / 6) * Math.PI * 0.7;
        const x1 = Math.cos(a) * (r - 2);
        const y1 = Math.sin(a) * (r - 2);
        const x2 = Math.cos(a) * (r + 10);
        const y2 = Math.sin(a) * (r + 10);
        const ox = Math.cos(a + Math.PI / 2) * 4;
        const oy = Math.sin(a + Math.PI / 2) * 4;
        ctx.beginPath();
        ctx.moveTo(x1 + ox, y1 + oy);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x1 - ox, y1 - oy);
        ctx.closePath();
        ctx.fill();
      }
    }

    // body
    const body = ctx.createRadialGradient(-8, -10, 4, 0, 0, r);
    body.addColorStop(0, pal.a);
    body.addColorStop(0.55, pal.b);
    body.addColorStop(1, pal.c);
    ctx.fillStyle = body;
    if (charId === "heavy") {
      // 角ばった胴体
      ctx.beginPath();
      ctx.moveTo(-r * 0.75, -r * 0.55);
      ctx.lineTo(r * 0.75, -r * 0.55);
      ctx.lineTo(r * 0.95, r * 0.15);
      ctx.lineTo(r * 0.55, r * 0.9);
      ctx.lineTo(-r * 0.55, r * 0.9);
      ctx.lineTo(-r * 0.95, r * 0.15);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // cleft
    ctx.strokeStyle = pal.cleft;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -r + 4);
    ctx.quadraticCurveTo(-2, -4, 0, 8);
    ctx.stroke();

    // leaf / stem
    if (charId === "wing") {
      ctx.fillStyle = "#8fbf7a";
    } else if (charId === "heavy") {
      ctx.fillStyle = "#6a7a5a";
    } else if (charId === "spin") {
      ctx.fillStyle = "#3d9a6a";
    } else {
      ctx.fillStyle = "#4caf50";
    }
    ctx.beginPath();
    ctx.ellipse(-6, -r + 2, 10, 6, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2e7d32";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -r + 4);
    ctx.lineTo(0, -r - 10);
    ctx.stroke();

    // face
    const eyesClosed = player.blink % 3.2 > 3.0;
    if (eyesClosed) {
      ctx.strokeStyle = "#3a2a22";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-12, -4);
      ctx.lineTo(-5, -4);
      ctx.moveTo(5, -4);
      ctx.lineTo(12, -4);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#3a2a22";
      ctx.beginPath();
      ctx.arc(-8, -4, 3.2, 0, Math.PI * 2);
      ctx.arc(8, -4, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(-7, -5, 1.2, 0, Math.PI * 2);
      ctx.arc(9, -5, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // blush
    ctx.fillStyle = charId === "spin"
      ? "rgba(100, 180, 220, 0.4)"
      : charId === "heavy"
        ? "rgba(140, 140, 140, 0.4)"
        : "rgba(255, 120, 140, 0.45)";
    ctx.beginPath();
    ctx.ellipse(-14, 4, 5, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(14, 4, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // smile
    ctx.strokeStyle = "#3a2a22";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 4, 7, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    // legs when running
    if (player.onGround && state === "playing") {
      const leg = Math.sin(animT * speed * 0.05) * 8;
      ctx.strokeStyle = pal.leg;
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-8, r - 6);
      ctx.lineTo(-8 + leg, r + 8);
      ctx.moveTo(8, r - 6);
      ctx.lineTo(8 - leg, r + 8);
      ctx.stroke();
    }

    // feather / dive charge glow
    if (
      (charId === "wing" && player.diveCharges > 0) ||
      (charId !== "wing" && player.feather)
    ) {
      ctx.strokeStyle =
        charId === "wing" ? "rgba(100, 160, 255, 0.75)" : "rgba(255, 200, 60, 0.7)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, r + 6 + Math.sin(animT * 6) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    // ノーマル桃シールド残あり
    if (charId === "normal" && player.shield > 0 && state === "playing") {
      ctx.strokeStyle = "rgba(255, 220, 120, 0.55)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, r + 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  function roundRect(c, x, y, w, h, r) {
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function loop(now) {
    const dt = Math.min(0.033, (now - lastTime) / 1000 || 0.016);
    lastTime = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // input
  function isInteractiveTarget(target) {
    return !!(
      target &&
      target.closest &&
      target.closest("button, a, input, select, label, .panel, .sound-settings, .char-select, .mode-select, .mode-records, .debug-exit-btn")
    );
  }

  function onPointer(e) {
    if (isInteractiveTarget(e.target)) return;
    e.preventDefault();

    if (state === "title") {
      const rect = canvas.getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        return;
      }
      const pos = canvasCoords(e);
      if (hitTitlePeach(pos.x, pos.y)) {
        handleTitlePeachTap();
      }
      return;
    }

    if (state === "playing") {
      tryAction();
    }
  }

  const app = document.getElementById("app");
  app.addEventListener("pointerdown", onPointer);
  window.addEventListener("keydown", function (e) {
    if (e.code === "Space" || e.code === "ArrowUp" || e.key === " ") {
      e.preventDefault();
      tryAction();
    }
  });

  btnStart.addEventListener("click", function (e) {
    e.stopPropagation();
    startGame(false);
  });
  btnRetry.addEventListener("click", function (e) {
    e.stopPropagation();
    startGame(false);
  });
  btnTitle.addEventListener("click", function (e) {
    e.stopPropagation();
    showTitle();
  });
  btnDebugTitle.addEventListener("click", function (e) {
    e.stopPropagation();
    showTitle();
  });

  toggleSfx.addEventListener("change", function () {
    setSfxEnabled(toggleSfx.checked);
  });
  bgmModeSelect.addEventListener("change", function () {
    setBgmMode(bgmModeSelect.value);
  });

  // Prevent toggle/select clicks from bubbling oddly on title overlay
  toggleSfx.addEventListener("click", function (e) { e.stopPropagation(); });
  bgmModeSelect.addEventListener("click", function (e) { e.stopPropagation(); });

  for (let i = 0; i < charButtons.length; i++) {
    charButtons[i].addEventListener("click", function (e) {
      e.stopPropagation();
      onCharButtonClick(charButtons[i]);
    });
  }

  for (let i = 0; i < modeButtons.length; i++) {
    modeButtons[i].addEventListener("click", function (e) {
      e.stopPropagation();
      setSelectedMode(modeButtons[i].getAttribute("data-mode"));
    });
  }

  ensureBgm();
  syncSoundToggles();
  syncModeSelectUi();
  syncModeRecordsUi();
  syncCharSelectUi();
  syncBestDisplay();
  initDecor();
  showTitle();
  lastTime = performance.now();
  requestAnimationFrame(loop);
})();
