(function () {
  "use strict";

  const W = 960;
  const H = 540;
  const GROUND_Y = 420;
  const PLAYER_X = 180;
  const GRAVITY = 2200;
  const JUMP_V = -780;
  const DOUBLE_JUMP_V = -700;
  const MAX_JUMPS = 2;
  const BEST_KEY = "momoDashBest";

  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");

  const hud = document.getElementById("hud");
  const scoreEl = document.getElementById("score-value");
  const bestEl = document.getElementById("best-value");
  const titleBestEl = document.getElementById("title-best-value");
  const titleScreen = document.getElementById("title-screen");
  const gameoverScreen = document.getElementById("gameover-screen");
  const finalScoreEl = document.getElementById("final-score");
  const newBestEl = document.getElementById("new-best");
  const btnStart = document.getElementById("btn-start");
  const btnRetry = document.getElementById("btn-retry");
  const btnTitle = document.getElementById("btn-title");

  /** @type {"title"|"playing"|"gameover"} */
  let state = "title";
  let best = Number(localStorage.getItem(BEST_KEY) || 0);
  let score = 0;
  let distance = 0;
  let speed = 280;
  let spawnTimer = 0;
  let nextSpawn = 1.4;
  let lastTime = 0;
  let animT = 0;
  let shake = 0;
  let clouds = [];
  let hills = [];
  let obstacles = [];
  let particles = [];
  let audioCtx = null;

  const player = {
    x: PLAYER_X,
    y: GROUND_Y,
    vy: 0,
    r: 28,
    onGround: true,
    jumpsLeft: MAX_JUMPS,
    squish: 1,
    blink: 0,
  };

  function syncBestDisplay() {
    const text = String(best);
    bestEl.textContent = text;
    titleBestEl.textContent = text;
  }

  syncBestDisplay();

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
      { x: 0, h: 90, w: 280, color: "#7bb86a" },
      { x: 220, h: 130, w: 340, color: "#6aa85c" },
      { x: 500, h: 100, w: 300, color: "#7bb86a" },
      { x: 740, h: 140, w: 320, color: "#629e52" },
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

  function sfxJump(isDouble) {
    if (isDouble) {
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

  function resetGame() {
    score = 0;
    distance = 0;
    speed = 280;
    spawnTimer = 0;
    nextSpawn = 1.2;
    obstacles = [];
    particles = [];
    shake = 0;
    animT = 0;
    player.x = PLAYER_X;
    player.y = GROUND_Y;
    player.vy = 0;
    player.onGround = true;
    player.jumpsLeft = MAX_JUMPS;
    player.squish = 1;
    player.blink = 0;
    scoreEl.textContent = "0";
    syncBestDisplay();
  }

  function showTitle() {
    state = "title";
    titleScreen.classList.remove("hidden");
    gameoverScreen.classList.add("hidden");
    hud.classList.add("hidden");
    resetGame();
    initDecor();
  }

  function startGame() {
    resumeAudio();
    resetGame();
    initDecor();
    state = "playing";
    titleScreen.classList.add("hidden");
    gameoverScreen.classList.add("hidden");
    hud.classList.remove("hidden");
    lastTime = performance.now();
  }

  function endGame() {
    if (state !== "playing") return;
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
  }

  function jump() {
    if (state !== "playing") return;
    if (player.jumpsLeft <= 0) return;

    const isDouble = !player.onGround;
    player.vy = isDouble ? DOUBLE_JUMP_V : JUMP_V;
    player.onGround = false;
    player.jumpsLeft -= 1;
    player.squish = isDouble ? 1.35 : 1.25;
    sfxJump(isDouble);
    spawnBurst(
      player.x,
      isDouble ? player.y - player.r : GROUND_Y - 4,
      isDouble ? "#ffd0e0" : "#c8e6a0",
      isDouble ? 10 : 6
    );
  }

  function tryAction() {
    if (state === "title") {
      startGame();
      return;
    }
    if (state === "gameover") {
      startGame();
      return;
    }
    jump();
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

    for (const c of clouds) {
      c.x -= c.speed * dt * (state === "playing" ? 0.35 : 0.15);
      if (c.x < -120) c.x = W + 40 + Math.random() * 80;
    }

    for (const h of hills) {
      const hs = state === "playing" ? speed * 0.15 : 20;
      h.x -= hs * dt;
      if (h.x + h.w < 0) h.x += W + h.w;
    }

    if (shake > 0) shake = Math.max(0, shake - dt * 40);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 400 * dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    if (state !== "playing") {
      player.blink += dt;
      return;
    }

    distance += speed * dt;
    const nextScore = Math.floor(distance / 10);
    if (nextScore > score) {
      if (nextScore % 50 === 0) sfxScore();
      score = nextScore;
      scoreEl.textContent = String(score);
    }

    player.vy += GRAVITY * dt;
    player.y += player.vy * dt;

    const overHole = obstacles.some(
      (o) =>
        o.type === "hole" &&
        player.x + player.r * 0.35 > o.x &&
        player.x - player.r * 0.35 < o.x + o.w
    );

    if (player.y >= GROUND_Y && !overHole) {
      player.y = GROUND_Y;
      player.vy = 0;
      if (!player.onGround) {
        player.squish = 0.7;
        spawnBurst(player.x, GROUND_Y, "#d4c090", 4);
      }
      player.onGround = true;
      player.jumpsLeft = MAX_JUMPS;
    } else if (overHole && player.y >= GROUND_Y - 2) {
      if (player.onGround) player.jumpsLeft = Math.min(player.jumpsLeft, 1);
      player.onGround = false;
      if (player.y > GROUND_Y + 60) {
        endGame();
        return;
      }
    } else {
      if (player.onGround) player.jumpsLeft = Math.min(player.jumpsLeft, 1);
      player.onGround = false;
    }

    player.squish += (1 - player.squish) * Math.min(1, dt * 10);
    player.blink += dt;

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

      if (hitsPlayer(o)) {
        endGame();
        return;
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
    drawPlayer();
    drawParticles();

    if (state === "playing") {
      drawSpeedBadge();
    }

    ctx.restore();
  }

  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#6eb8dc");
    g.addColorStop(0.45, "#b7dff0");
    g.addColorStop(1, "#ffe2b8");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // sun
    ctx.beginPath();
    ctx.arc(820, 90, 42, 0, Math.PI * 2);
    ctx.fillStyle = "#ffe08a";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(820, 90, 58, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 224, 138, 0.25)";
    ctx.fill();

    for (const c of clouds) drawCloud(c.x, c.y, c.s);
  }

  function drawCloud(x, y, s) {
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.ellipse(x, y, 38 * s, 18 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 28 * s, y + 4 * s, 30 * s, 15 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 24 * s, y + 6 * s, 26 * s, 14 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawHills() {
    for (const h of hills) {
      ctx.fillStyle = h.color;
      ctx.beginPath();
      ctx.moveTo(h.x, GROUND_Y);
      ctx.quadraticCurveTo(h.x + h.w * 0.5, GROUND_Y - h.h, h.x + h.w, GROUND_Y);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawGround() {
    ctx.fillStyle = "#6bb04f";
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    ctx.fillStyle = "#8b6a45";
    ctx.fillRect(0, GROUND_Y + 18, W, H - GROUND_Y - 18);

    // grass blades parallax
    ctx.strokeStyle = "#4f9340";
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

    // dirt texture
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    const dOff = (distance * 0.5) % 40;
    for (let x = -dOff; x < W; x += 40) {
      ctx.fillRect(x, GROUND_Y + 40, 18, 4);
      ctx.fillRect(x + 20, GROUND_Y + 70, 12, 3);
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
    startGame();
  });
  btnRetry.addEventListener("click", function (e) {
    e.stopPropagation();
    startGame();
  });
  btnTitle.addEventListener("click", function (e) {
    e.stopPropagation();
    showTitle();
  });

  initDecor();
  showTitle();
  lastTime = performance.now();
  requestAnimationFrame(loop);
})();
