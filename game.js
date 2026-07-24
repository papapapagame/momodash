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
  const MAX_JUMPS = 2;
  const PEACH_SCORE = 100;
  const FEATHER_BONUS_SCORE = 200;
  const BEST_KEY = "momoDashBest";

  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");

  const hud = document.getElementById("hud");
  const scoreEl = document.getElementById("score-value");
  const bestEl = document.getElementById("best-value");
  const titleBestEl = document.getElementById("title-best-value");
  const featherHud = document.getElementById("feather-hud");
  const titleScreen = document.getElementById("title-screen");
  const gameoverScreen = document.getElementById("gameover-screen");
  const finalScoreEl = document.getElementById("final-score");
  const newBestEl = document.getElementById("new-best");
  const btnStart = document.getElementById("btn-start");
  const btnRetry = document.getElementById("btn-retry");
  const btnTitle = document.getElementById("btn-title");
  const btnDebugTitle = document.getElementById("btn-debug-title");
  const debugBadge = document.getElementById("debug-badge");

  /** @type {"title"|"playing"|"gameover"} */
  let state = "title";
  let debugMode = false;
  let debugTapCount = 0;
  const DEBUG_TAPS_NEEDED = 10;
  let best = Number(localStorage.getItem(BEST_KEY) || 0);
  let score = 0;
  let distance = 0;
  let lastDistScore = 0;
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
  let audioCtx = null;

  const player = {
    x: PLAYER_X,
    y: GROUND_Y,
    vy: 0,
    r: 28,
    onGround: true,
    jumpsLeft: MAX_JUMPS,
    feather: false,
    squish: 1,
    blink: 0,
  };

  function syncBestDisplay() {
    const text = String(best);
    bestEl.textContent = text;
    titleBestEl.textContent = text;
  }

  function syncFeatherHud() {
    featherHud.classList.toggle("hidden", !player.feather);
  }

  function setScore(value) {
    score = value;
    scoreEl.textContent = String(score);
  }

  function addScore(amount) {
    setScore(score + amount);
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

  function playTone(freq, duration, type, volume, freqEnd) {
    if (!audioCtx) return;
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

  function sfxHit() {
    playTone(180, 0.18, "sawtooth", 0.22, 60);
    playTone(90, 0.28, "square", 0.12, 40);
  }

  function sfxScore() {
    playTone(660, 0.06, "sine", 0.08);
  }

  function sfxPeach() {
    playTone(740, 0.08, "sine", 0.14);
    playTone(980, 0.1, "triangle", 0.1, 1200);
  }

  function sfxFeather() {
    playTone(520, 0.08, "sine", 0.12, 760);
    playTone(880, 0.12, "triangle", 0.1, 1400);
  }

  function maxJumps() {
    return MAX_JUMPS + (player.feather ? 1 : 0);
  }

  function resetGame() {
    score = 0;
    distance = 0;
    lastDistScore = 0;
    speed = 280;
    spawnTimer = 0;
    nextSpawn = 1.2;
    itemSpawnTimer = 0;
    nextItemSpawn = 1.4;
    obstacles = [];
    items = [];
    particles = [];
    floatTexts = [];
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
    player.jumpsLeft = MAX_JUMPS;
    player.feather = false;
    player.squish = 1;
    player.blink = 0;
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
    titleScreen.classList.remove("hidden");
    gameoverScreen.classList.add("hidden");
    hud.classList.add("hidden");
    syncDebugUi();
    resetGame();
    initDecor();
  }

  function startGame(asDebug) {
    resumeAudio();
    debugMode = !!asDebug;
    debugTapCount = 0;
    resetGame();
    initDecor();
    state = "playing";
    titleScreen.classList.add("hidden");
    gameoverScreen.classList.add("hidden");
    hud.classList.remove("hidden");
    syncDebugUi();
    lastTime = performance.now();
  }

  function endGame() {
    if (state !== "playing") return;
    if (debugMode) return;
    state = "gameover";
    sfxHit();
    shake = 12;
    spawnBurst(player.x, player.y - player.r, "#ff8fab", 18);
    finalScoreEl.textContent = String(score);
    const isNew = score > best;
    if (isNew) {
      best = score;
      localStorage.setItem(BEST_KEY, String(best));
      syncBestDisplay();
    }
    newBestEl.classList.toggle("hidden", !isNew);
    gameoverScreen.classList.remove("hidden");
    syncDebugUi();
  }

  function jump() {
    if (state !== "playing") return;
    if (player.jumpsLeft <= 0) return;

    const isTriple = player.feather && !player.onGround && player.jumpsLeft === 1;
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
      player.feather = false;
      syncFeatherHud();
    } else if (isDouble) {
      kind = "double";
      vy = DOUBLE_JUMP_V;
      color = "#ffd0e0";
      burst = 10;
    }

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

  function tryAction() {
    if (state === "title") {
      startGame(false);
      return;
    }
    if (state === "gameover") {
      startGame(false);
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

  function difficultyFactor() {
    return Math.min(1, distance / 3500);
  }

  function currentSpeed() {
    return 280 + difficultyFactor() * 320;
  }

  function spawnObstacle() {
    const d = difficultyFactor();
    const types = ["rock", "tree", "hole"];
    if (d > 0.15) types.push("bird");
    if (d > 0.4) types.push("bird", "hole");
    if (d > 0.65) types.push("rock", "tree", "bird");

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
      obstacles.push({
        ...base,
        w: 70 + Math.random() * 50 + d * 40,
        h: 40,
        y: GROUND_Y + 8,
      });
    } else if (type === "bird") {
      obstacles.push({
        ...base,
        w: 40,
        h: 28,
        y: GROUND_Y - (90 + Math.random() * 100),
        bob: Math.random() * Math.PI * 2,
      });
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
      spawnFloatText(item.x, item.y - 20, "+" + PEACH_SCORE, "#e85a7a");
      return;
    }

    if (item.type === "feather") {
      if (player.feather) {
        addScore(FEATHER_BONUS_SCORE);
        sfxPeach();
        spawnBurst(item.x, item.y, "#7ec8e8", 10);
        spawnFloatText(item.x, item.y - 20, "+" + FEATHER_BONUS_SCORE, "#2a7ab0");
      } else {
        player.feather = true;
        if (player.onGround) {
          player.jumpsLeft = maxJumps();
        } else if (player.jumpsLeft < 2) {
          player.jumpsLeft = 2;
        }
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

    distance += speed * dt;
    const distScore = Math.floor(distance / 10);
    if (distScore > lastDistScore) {
      if (distScore % 50 === 0) sfxScore();
      addScore(distScore - lastDistScore);
      lastDistScore = distScore;
    }

    player.vy += GRAVITY * dt;
    player.y += player.vy * dt;

    const overHole =
      !debugMode &&
      obstacles.some(
        (o) =>
          o.type === "hole" &&
          player.x + player.r * 0.35 > o.x &&
          player.x - player.r * 0.35 < o.x + o.w
      );

    const fallAirJumps = player.feather ? 2 : 1;

    if (player.y >= GROUND_Y && !overHole) {
      player.y = GROUND_Y;
      player.vy = 0;
      if (!player.onGround) {
        player.squish = 0.7;
        spawnBurst(player.x, GROUND_Y, "#d4c090", 4);
      }
      player.onGround = true;
      player.jumpsLeft = maxJumps();
    } else if (overHole && player.y >= GROUND_Y - 2) {
      if (player.onGround) player.jumpsLeft = Math.min(player.jumpsLeft, fallAirJumps);
      player.onGround = false;
      if (player.y > GROUND_Y + 60) {
        endGame();
        return;
      }
    } else {
      if (player.onGround) player.jumpsLeft = Math.min(player.jumpsLeft, fallAirJumps);
      player.onGround = false;
    }

    spawnTimer += dt;
    if (spawnTimer >= nextSpawn) {
      spawnTimer = 0;
      nextSpawn = Math.max(0.55, 1.55 - difficultyFactor() * 0.9) + Math.random() * 0.45;
      spawnObstacle();
      if (difficultyFactor() > 0.5 && Math.random() < 0.28) {
        setTimeout(function () {
          if (state === "playing") spawnObstacle();
        }, 220 + Math.random() * 180);
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
      o.x -= speed * dt;
      if (o.type === "bird") {
        o.bob += dt * 4;
        o.drawY = o.y + Math.sin(o.bob) * 10;
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

      if (!debugMode && hitsPlayer(o)) {
        endGame();
        return;
      }
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
    if (state === "title") {
      ctx.globalAlpha = 0.4;
      drawPlayer();
      ctx.globalAlpha = 1;
    } else {
      drawPlayer();
    }
    drawParticles();
    drawFloatTexts();

    if (state === "playing") {
      drawSpeedBadge();
    }

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
      if (o.type === "hole") drawHole(o);
      else if (o.type === "rock") drawRock(o);
      else if (o.type === "tree") drawTree(o);
      else if (o.type === "bird") drawBird(o);
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

    ctx.fillStyle = "#3d4a5c";
    ctx.beginPath();
    ctx.ellipse(x + 18, y, 16, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // wing
    ctx.beginPath();
    ctx.moveTo(x + 14, y);
    ctx.quadraticCurveTo(x + 8, y - 18 - flap, x + 28, y - 4);
    ctx.closePath();
    ctx.fillStyle = "#55667a";
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

  function drawPlayer() {
    const x = player.x;
    const y = player.y;
    const r = player.r;
    const sx = player.squish;
    const sy = 2 - player.squish;
    const runBob = player.onGround ? Math.sin(animT * speed * 0.04) * 3 : 0;

    ctx.save();
    ctx.translate(x, y - r + runBob);
    ctx.scale(sx, sy);

    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(0, r / sy + 6, r * 0.7, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // body
    const body = ctx.createRadialGradient(-8, -10, 4, 0, 0, r);
    body.addColorStop(0, "#ffc0d0");
    body.addColorStop(0.55, "#ff8fab");
    body.addColorStop(1, "#e85a7a");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // cleft
    ctx.strokeStyle = "rgba(200, 60, 90, 0.35)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -r + 4);
    ctx.quadraticCurveTo(-2, -4, 0, 8);
    ctx.stroke();

    // leaf
    ctx.fillStyle = "#4caf50";
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
    ctx.fillStyle = "rgba(255, 120, 140, 0.45)";
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
      ctx.strokeStyle = "#e85a7a";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-8, r - 6);
      ctx.lineTo(-8 + leg, r + 8);
      ctx.moveTo(8, r - 6);
      ctx.lineTo(8 - leg, r + 8);
      ctx.stroke();
    }

    // feather stock glow
    if (player.feather) {
      ctx.strokeStyle = "rgba(255, 200, 60, 0.7)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, r + 6 + Math.sin(animT * 6) * 2, 0, Math.PI * 2);
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

  function drawSpeedBadge() {
    const pct = Math.floor(100 + difficultyFactor() * 100);
    ctx.fillStyle = "rgba(255,248,240,0.85)";
    ctx.beginPath();
    roundRect(ctx, W - 118, 16, 100, 28, 8);
    ctx.fill();
    ctx.fillStyle = "#3a2a22";
    ctx.font = "700 14px 'M PLUS Rounded 1c', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("速度 " + pct + "%", W - 68, 35);
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
  function onPointer(e) {
    e.preventDefault();
    if (state === "title") {
      const pos = canvasCoords(e);
      if (hitTitlePeach(pos.x, pos.y)) {
        handleTitlePeachTap();
      }
      return;
    }
    tryAction();
  }

  canvas.addEventListener("pointerdown", onPointer);
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

  initDecor();
  showTitle();
  lastTime = performance.now();
  requestAnimationFrame(loop);
})();
