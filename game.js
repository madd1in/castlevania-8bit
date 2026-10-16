(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const FLOOR = 184;
  const WORLD = 3456;
  const keys = new Set();
  const justPressed = new Set();
  const heldTouches = new Map();

  let state = "title";
  let lastTime = 0;
  let camera = 0;
  let elapsed = 0;
  let score = 0;
  let soundOn = true;
  let audio = null;
  let musicStep = 0;
  let nextNote = 0;
  let checkpoint = 80;
  let player;
  let enemies = [];
  let candles = [];
  let projectiles = [];
let pickups = [];
let particles = [];
  let platforms = [];
  let boss;
let gamepadHeld = new Set();
let gamepadJustPressed = new Set();
let activeGamepadIndex = null;
let bossIntro = 0;
let shake = 0;
let combo = 0;
let comboTimer = 0;
let bestScore = 0;

try {
  bestScore = Number(localStorage.getItem("ashenMoonBestScore")) || 0;
} catch {
  bestScore = 0;
}

const cabinet = document.querySelector(".cabinet");
const fullscreenButton = document.getElementById("fullscreen-button");
const soundButton = document.getElementById("sound-button");
const gamepadStatus = document.getElementById("gamepad-status");

  const rect = (x, y, w, h, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  const text = (value, x, y, size = 8, color = "#f2e6cf", align = "left") => {
    ctx.save();
    ctx.font = size + 'px "Courier New", monospace';
    ctx.textAlign = align;
    ctx.textBaseline = "top";
    ctx.fillStyle = "#090b13";
    ctx.fillText(value, Math.round(x) + 1, Math.round(y) + 1);
    ctx.fillStyle = color;
    ctx.fillText(value, Math.round(x), Math.round(y));
    ctx.restore();
  };

  const updateGamepadStatus = gamepad => {
    if (!gamepadStatus) return;
    if (gamepad) {
      const label = gamepad.mapping === "standard" ? "XBOX-PAD VERBUNDEN" : "GAMEPAD VERBUNDEN";
      gamepadStatus.textContent = label;
    } else {
      gamepadStatus.textContent = navigator.getGamepads ? "EDGE · PAD BEREIT" : "GAMEPAD NICHT VERFÜGBAR";
    }
  };

  const enterFullscreen = () => {
    if (document.fullscreenElement || !cabinet?.requestFullscreen) return;
    try {
      const request = cabinet.requestFullscreen({ navigationUI: "hide" });
      request?.then(() => {
        if (window.matchMedia("(pointer: coarse)").matches) {
          screen.orientation?.lock?.("landscape").catch(() => {});
        }
      }).catch(() => {});
    } catch {
      return;
    }
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {});
    } else {
      enterFullscreen();
    }
  };

  document.addEventListener("fullscreenchange", () => {
    if (fullscreenButton) {
      fullscreenButton.textContent = document.fullscreenElement ? "↙ FENSTER" : "⛶ VOLLBILD";
      fullscreenButton.setAttribute("aria-label",
        document.fullscreenElement ? "Vollbild verlassen" : "Vollbild aktivieren");
    }
  });

  fullscreenButton?.addEventListener("click", event => {
    event.stopPropagation();
    toggleFullscreen();
  });

  soundButton?.addEventListener("click", event => {
    event.stopPropagation();
    soundOn = !soundOn;
    if (soundOn) startAudio();
    if (soundButton) soundButton.textContent = soundOn ? "♪ TON AN" : "♪ TON AUS";
  });

  window.addEventListener("gamepadconnected", event => {
    activeGamepadIndex = event.gamepad.index;
    updateGamepadStatus(event.gamepad);
  });

  window.addEventListener("gamepaddisconnected", event => {
    if (activeGamepadIndex === event.gamepad.index) activeGamepadIndex = null;
    updateGamepadStatus(null);
  });

  const pollGamepad = () => {
    if (!navigator.getGamepads) {
      updateGamepadStatus(null);
      return;
    }
    const connected = Array.from(navigator.getGamepads()).filter(gamepad => gamepad?.connected);
    let gamepad = connected.find(candidate => candidate.index === activeGamepadIndex) || connected[0] || null;
    const next = new Set();
    if (gamepad) {
      activeGamepadIndex = gamepad.index;
      updateGamepadStatus(gamepad);
      const pressed = index => Boolean(gamepad.buttons[index]?.pressed);
      const axisX = gamepad.axes[0] || 0;
      if (axisX < -0.28 || pressed(14)) next.add("left");
      if (axisX > 0.28 || pressed(15)) next.add("right");
      if (pressed(12)) next.add("up");
      if (pressed(13)) next.add("down");
      if (pressed(0)) next.add("jump");
      if (pressed(2)) next.add("attack");
      if (pressed(3)) next.add("dagger");
      if (pressed(9) || pressed( startButtonIndex(gamepad) )) next.add("start");
    } else {
      activeGamepadIndex = null;
      updateGamepadStatus(null);
    }
    gamepadJustPressed.clear();
    for (const key of next) {
      if (!gamepadHeld.has(key)) gamepadJustPressed.add(key);
    }
    gamepadHeld = next;
  };

  const startButtonIndex = gamepad => gamepad.buttons.length > 9 ? 9 : gamepad.buttons.length - 1;

  const startAudio = () => {
    if (!soundOn) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (!audio) audio = new AudioContext();
    if (audio.state === "suspended") audio.resume();
    if (!nextNote || nextNote < audio.currentTime - 0.4) nextNote = audio.currentTime + 0.1;
  };

  const scheduleTone = (frequency, when, duration, type, volume) => {
    if (!soundOn || !audio || !frequency) return;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, when);
    gain.gain.setValueAtTime(volume, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(when);
    oscillator.stop(when + duration);
  };

  const tone = (frequency, duration = 0.08, type = "square", volume = 0.035) => {
    if (!soundOn || !audio) return;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + duration);
  };

  const updateMusic = () => {
    if (!soundOn || !audio || state === "title" || state === "paused" || state === "gameover" || state === "win") return;
    const region = player.x < 1152 ? 0 : player.x < 2304 ? 1 : 2;
    const themes = [
      [220, 0, 261.63, 329.63, 293.66, 0, 261.63, 196, 220, 0, 329.63, 392, 349.23, 0, 293.66, 261.63],
      [164.81, 0, 196, 246.94, 220, 0, 196, 146.83, 164.81, 0, 246.94, 293.66, 261.63, 0, 220, 196],
      [196, 0, 246.94, 293.66, 329.63, 0, 293.66, 246.94, 220, 0, 293.66, 369.99, 392, 0, 329.63, 293.66]
    ];
    const notes = boss.active ? [293.66, 0, 349.23, 440, 392, 349.23, 329.63, 0, 293.66, 0, 440, 523.25, 493.88, 440, 392, 349.23] : themes[region];
    const beat = boss.active ? 0.14 : 0.18;
    while (nextNote < audio.currentTime + 0.04) {
      const step = musicStep % notes.length;
      const when = Math.max(nextNote, audio.currentTime + 0.01);
      scheduleTone(notes[step], when, beat * 0.8, step % 4 === 0 ? "triangle" : "square",
        step % 4 === 0 ? 0.024 : 0.012);
      if (step % 4 === 0) {
        const bass = boss.active ? 73.42 : [55, 49, 65.41][region];
        scheduleTone(bass, when, beat * 1.8, "triangle", 0.027);
      }
      musicStep += 1;
      nextNote += beat;
    }
  };

  const freshGame = (skipAudio = false) => {
    score = 0;
    camera = 0;
    elapsed = 0;
    musicStep = 0;
    if (audio) nextNote = audio.currentTime + 0.1;
    checkpoint = 80;
    bossIntro = 0;
    shake = 0;
    combo = 0;
    comboTimer = 0;
    player = {
      x: 80,
      y: FLOOR - 27,
      w: 14,
      h: 27,
      vx: 0,
      vy: 0,
      facing: 1,
      health: 5,
      lives: 3,
      hearts: 5,
      weaponLevel: 1,
      invulnerable: 0,
      attackTime: 0,
      attackCooldown: 0,
      swing: 0,
      grounded: true,
      crouch: false
    };
    platforms = [
      { x: 635, y: 151, w: 80 },
      { x: 1040, y: 146, w: 64 },
      { x: 1460, y: 154, w: 96 },
      { x: 1845, y: 144, w: 72 },
      { x: 2260, y: 150, w: 96 },
      { x: 2710, y: 146, w: 82 }
    ];
    enemies = [];
    const placements = [
      [315, "bat"], [520, "skeleton"], [760, "bat"], [965, "skeleton"],
      [1195, "ghost"], [1400, "skeleton"], [1610, "bat"], [1810, "skeleton"],
      [2070, "ghost"], [2295, "skeleton"], [2510, "bat"], [2740, "skeleton"],
      [2960, "ghost"], [3100, "bat"]
    ];
    placements.forEach(([x, type], index) => enemies.push({
      x,
      baseX: x,
      y: type === "bat" ? FLOOR - 35 - (index % 2) * 18 : FLOOR - 25,
      type,
      w: type === "bat" ? 18 : 16,
      h: type === "bat" ? 12 : 25,
      hp: 2,
      alive: true,
      phase: Math.random() * 5,
      facing: -1
    }));
    candles = Array.from({ length: 13 }, (_, index) => ({
      x: 245 + index * 248,
      y: FLOOR - 20 - (index % 3 === 1 ? 15 : 0),
      alive: true,
      drop: index % 5 === 0 ? "relic" : index % 4 === 0 ? "heart" : "points"
    }));
    projectiles = [];
    pickups = [];
    particles = [];
    boss = {
      x: WORLD - 184,
      y: FLOOR - 53,
      w: 30,
      h: 53,
      hp: 12,
      maxHp: 12,
      active: false,
      defeated: false,
      timer: 1.1,
      phase: 0,
      hurt: 0,
      lastSwing: -1
    };
    state = "play";
    if (!skipAudio) {
      startAudio();
      enterFullscreen();
    }
  };

  const attackBox = () => {
    const reach = 34 + (player.weaponLevel - 1) * 12;
    return {
    x: player.facing > 0 ? player.x + player.w - 1 : player.x - reach + 2,
    y: player.y + 6,
    w: reach,
    h: 16
    };
  };

  const saveBestScore = () => {
    if (score <= bestScore) return;
    bestScore = score;
    try {
      localStorage.setItem("ashenMoonBestScore", String(bestScore));
    } catch {
      bestScore = Math.max(bestScore, score);
    }
  };

  const spawnBurst = (x, y, color, count = 7, speed = 74) => {
    for (let index = 0; index < count; index++) {
      const angle = Math.PI * 2 * index / count + Math.random() * 0.2;
      const velocity = speed * (0.45 + Math.random() * 0.75);
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 18,
        life: 0.32 + Math.random() * 0.35,
        maxLife: 0.67,
        color,
        size: index % 3 === 0 ? 3 : 2
      });
    }
  };

  const collectPickup = pickup => {
    if (pickup.type === "heart") {
      player.hearts = Math.min(9, player.hearts + 2);
      score += 100;
      tone(740, 0.12, "triangle", 0.028);
    } else if (pickup.type === "relic") {
      if (player.weaponLevel < 3) {
        player.weaponLevel += 1;
        score += 500;
        tone(880, 0.3, "triangle", 0.04);
      } else {
        player.health = Math.min(5, player.health + 1);
        score += 750;
        tone(660, 0.18, "triangle", 0.035);
      }
    } else {
      score += 300;
      tone(560, 0.09, "square", 0.022);
    }
    saveBestScore();
    spawnBurst(pickup.x, pickup.y, pickup.type === "relic" ? "#ffe18a" : "#f5c875", 8, 58);
  };

  const overlaps = (a, b) =>
    a.x < b.x + b.w && a.x + a.w > b.x &&
    a.y < b.y + b.h && a.y + a.h > b.y;

  const damageEnemy = enemy => {
    if (!enemy.alive) return;
    enemy.hp -= 1;
    tone(220, 0.05, "square", 0.02);
    if (enemy.hp <= 0) {
      enemy.alive = false;
      combo = comboTimer > 0 ? Math.min(9, combo + 1) : 1;
      comboTimer = 2.3;
      score += (enemy.type === "ghost" ? 300 : 200) * combo;
      spawnBurst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#e8d6b7");
      tone(520, 0.12, "square", 0.025);
      saveBestScore();
    } else {
      spawnBurst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, "#e95f70", 4, 42);
    }
  };

  const whip = () => {
    if (player.attackCooldown > 0) return;
    player.attackTime = 0.24;
    player.attackCooldown = 0.38;
    player.swing += 1;
    tone(330, 0.07, "sawtooth", 0.025);
    const box = attackBox();
    for (const enemy of enemies) {
      if (enemy.alive && overlaps(box, enemy)) damageEnemy(enemy);
    }
    for (const candle of candles) {
      if (candle.alive && overlaps(box, { x: candle.x - 5, y: candle.y - 10, w: 10, h: 20 })) {
        candle.alive = false;
        pickups.push({ x: candle.x, y: candle.y - 3, baseY: candle.y - 3, type: candle.drop, phase: 0 });
        spawnBurst(candle.x, candle.y, "#ffcf73", 6, 42);
        tone(660, 0.09, "square", 0.025);
      }
    }
    if (boss.active && !boss.defeated && boss.lastSwing !== player.swing &&
      overlaps(box, boss) && player.y + player.h > boss.y + 8) {
      boss.lastSwing = player.swing;
      boss.hp -= 1;
      boss.hurt = 0.18;
      shake = Math.max(shake, 2.5);
      spawnBurst(boss.x + boss.w / 2, boss.y + 22, "#f4c773", 9, 65);
      score += 250;
      tone(150, 0.12, "sawtooth", 0.035);
      if (boss.hp <= 0) {
        boss.defeated = true;
        score += 3000;
        saveBestScore();
        tone(720, 0.45, "triangle", 0.04);
        state = "win";
      }
    }
  };

  const throwDagger = () => {
    if (player.hearts <= 0) return;
    player.hearts -= 1;
    projectiles.push({
      x: player.facing > 0 ? player.x + player.w : player.x - 8,
      y: player.y + 11,
      w: 10,
      h: 3,
      vx: player.facing * 230,
      vy: -8,
      life: 1.3,
      kind: "dagger"
    });
    tone(570, 0.07, "square", 0.02);
  };

  const hurtPlayer = () => {
    if (player.invulnerable > 0) return;
    player.health -= 1;
    player.invulnerable = 1.15;
    shake = Math.max(shake, 5);
    spawnBurst(player.x + player.w / 2, player.y + player.h / 2, "#f07872", 7, 86);
    player.vx = player.x < WORLD / 2 ? -95 : 95;
    player.vy = -190;
    tone(95, 0.18, "sawtooth", 0.035);
    if (player.health <= 0) {
      player.lives -= 1;
      if (player.lives <= 0) {
        state = "gameover";
        saveBestScore();
      } else {
        player.health = 5;
        player.x = checkpoint;
        player.y = FLOOR - player.h;
        player.vx = 0;
        player.vy = 0;
        player.invulnerable = 1.8;
        projectiles = [];
      }
    }
  };

  const update = dt => {
    elapsed += dt;
    pollGamepad();
    if ((state === "title" || state === "gameover" || state === "win") &&
      (gamepadJustPressed.has("start") || gamepadJustPressed.has("jump"))) {
      freshGame();
      gamepadJustPressed.clear();
      return;
    }
    if (gamepadJustPressed.has("start") && state === "play") {
      state = "paused";
      audio?.suspend?.();
    } else if (gamepadJustPressed.has("start") && state === "paused") {
      state = "play";
      startAudio();
    }
    updateMusic();
    if (state !== "play") {
      justPressed.clear();
      gamepadJustPressed.clear();
      return;
    }
    player.attackCooldown = Math.max(0, player.attackCooldown - dt);
    player.attackTime = Math.max(0, player.attackTime - dt);
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    comboTimer = Math.max(0, comboTimer - dt);
    if (comboTimer === 0) combo = 0;
    bossIntro = Math.max(0, bossIntro - dt);
    shake = Math.max(0, shake - 55 * dt);

    const left = keys.has("left") || keys.has("ArrowLeft") || keys.has("a") || keys.has("A") || gamepadHeld.has("left");
    const right = keys.has("right") || keys.has("ArrowRight") || keys.has("d") || keys.has("D") || gamepadHeld.has("right");
    const down = keys.has("down") || keys.has("ArrowDown") || keys.has("s") || keys.has("S") || gamepadHeld.has("down");
    player.crouch = down && player.grounded;
    const speed = player.crouch ? 48 : 104;
    player.vx = 0;
    if (left) {
      player.vx = -speed;
      player.facing = -1;
    } else if (right) {
      player.vx = speed;
      player.facing = 1;
    }
    if (justPressed.has("jump") || justPressed.has(" ") || justPressed.has("ArrowUp") ||
      justPressed.has("w") || justPressed.has("W") || gamepadJustPressed.has("jump")) {
      if (player.grounded) {
        player.vy = -353;
        player.grounded = false;
        tone(250, 0.1, "square", 0.02);
      }
    }
    if (justPressed.has("attack") || justPressed.has("z") || justPressed.has("Z") ||
      gamepadJustPressed.has("attack")) whip();
    if (justPressed.has("dagger") || justPressed.has("x") || justPressed.has("X") ||
      gamepadJustPressed.has("dagger")) throwDagger();

    const previousBottom = player.y + player.h;
    player.vy = Math.min(player.vy + 870 * dt, 430);
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    player.grounded = false;
    if (player.y + player.h >= FLOOR) {
      player.y = FLOOR - player.h;
      player.vy = 0;
      player.grounded = true;
    }
    for (const platform of platforms) {
      if (player.vy >= 0 && previousBottom <= platform.y + 4 &&
        player.x + player.w > platform.x && player.x < platform.x + platform.w &&
        player.y + player.h >= platform.y && player.y + player.h <= platform.y + 12) {
        player.y = platform.y - player.h;
        player.vy = 0;
        player.grounded = true;
      }
    }
    const arenaLimit = boss.active && !boss.defeated ? WORLD - 196 : WORLD - 30;
    player.x = Math.max(12, Math.min(arenaLimit, player.x));
    if (player.x > 1680) checkpoint = Math.max(checkpoint, 1640);
    if (player.x > WORLD - 520 && !boss.active) {
      boss.active = true;
      bossIntro = 1.7;
      tone(82, 0.42, "sawtooth", 0.045);
    }

    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      enemy.phase += dt;
      const distance = player.x - enemy.x;
      if (enemy.type === "bat") {
        enemy.x += Math.sign(distance) * Math.min(Math.abs(distance), 28 * dt);
        enemy.y = FLOOR - 36 + Math.sin(enemy.phase * 4) * 15;
      } else if (Math.abs(distance) < 190) {
        enemy.facing = Math.sign(distance);
        enemy.x += enemy.facing * 28 * dt;
      }
      if (overlaps(player, enemy)) hurtPlayer();
      if (enemy.type === "ghost" && Math.abs(distance) < 190 && Math.sin(enemy.phase * 2) > 0.96 &&
        Math.abs(player.x - enemy.x) < 22) hurtPlayer();
    }

    if (boss.active && !boss.defeated) {
      boss.phase += dt;
      boss.hurt = Math.max(0, boss.hurt - dt);
      boss.x = WORLD - 188 + Math.sin(boss.phase * 1.3) * 26;
      boss.timer -= dt;
      if (boss.timer <= 0) {
        const dx = player.x - boss.x;
        const dy = player.y - boss.y;
        const length = Math.max(1, Math.hypot(dx, dy));
        const phaseTwo = boss.hp <= boss.maxHp / 2;
        const spread = phaseTwo ? [-0.24, 0, 0.24] : [0];
        for (const angle of spread) {
          const targetAngle = Math.atan2(dy * 0.42, dx) + angle;
          projectiles.push({
            x: boss.x + boss.w / 2,
            y: boss.y + 18,
            w: 8,
            h: 8,
            vx: Math.cos(targetAngle) * 116,
            vy: Math.sin(targetAngle) * 116,
            life: 3,
            kind: "fire"
          });
        }
        boss.timer = phaseTwo ? 0.88 + Math.random() * 0.28 : 1.35 + Math.random() * 0.5;
        tone(180, 0.12, "triangle", 0.02);
      }
      if (overlaps(player, boss)) hurtPlayer();
    }

    for (const projectile of projectiles) {
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      projectile.life -= dt;
      if (projectile.kind === "dagger") {
        for (const enemy of enemies) {
          if (enemy.alive && overlaps(projectile, enemy)) {
            damageEnemy(enemy);
            projectile.life = 0;
            break;
          }
        }
        if (boss.active && !boss.defeated && overlaps(projectile, boss)) {
          boss.hp -= 1;
          boss.hurt = 0.18;
          projectile.life = 0;
          if (boss.hp <= 0) {
            boss.defeated = true;
            score += 3000;
            saveBestScore();
            spawnBurst(boss.x + boss.w / 2, boss.y + 20, "#ffe08a", 20, 110);
            state = "win";
            tone(720, 0.45, "triangle", 0.04);
          }
        }
      } else if (overlaps(projectile, player)) {
        hurtPlayer();
        projectile.life = 0;
      }
    }
    projectiles = projectiles.filter(projectile =>
      projectile.life > 0 && projectile.x > camera - 40 && projectile.x < camera + W + 40);
    for (const pickup of pickups) {
      pickup.phase += dt;
      pickup.y = pickup.baseY + Math.sin(pickup.phase * 4) * 2.5;
      if (overlaps(player, { x: pickup.x - 6, y: pickup.y - 7, w: 12, h: 14 })) {
        collectPickup(pickup);
        pickup.collected = true;
      }
    }
    pickups = pickups.filter(pickup => !pickup.collected);
    for (const particle of particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 90 * dt;
      particle.life -= dt;
    }
    particles = particles.filter(particle => particle.life > 0);
    const targetCamera = Math.max(0, Math.min(WORLD - W, player.x - 126));
    camera += (targetCamera - camera) * Math.min(1, dt * 7);
    justPressed.clear();
    gamepadJustPressed.clear();
  };

  const regionAt = worldX => worldX < 1152 ? 0 : worldX < 2304 ? 1 : 2;

  const drawBackground = () => {
    const region = regionAt(camera + W / 2);
    const themes = [
      ["#10172d", "#292b45", "#603747"],
      ["#081522", "#1a2936", "#473348"],
      ["#17152c", "#3b2038", "#762e3d"]
    ];
    const colors = themes[region];
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(0.55, colors[1]);
    gradient.addColorStop(1, colors[2]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
    const moonX = 276 - (camera * 0.08 % 520);
    const moonColor = region === 2 ? "#df8a88" : region === 1 ? "#b7cbd0" : "#c8b885";
    rect(moonX, 27, 22, 22, moonColor);
    rect(moonX + 5, 22, 12, 3, moonColor);
    rect(moonX + 5, 51, 12, 3, moonColor);
    rect(moonX - 7, 32, 3, 12, moonColor);
    rect(moonX + 26, 32, 3, 12, moonColor);

    for (let i = 0; i < 24; i++) {
      const sx = (i * 71 - camera * 0.14) % (W + 24);
      const sy = 13 + (i * 37) % 94;
      rect((sx + W + 24) % (W + 24), sy, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1,
        i % 3 === 0 ? "#e3c98b" : "#a69fb5");
    }
    if (region === 0) {
      drawForestLayer(camera * 0.16, 137, "#171a2b");
      drawCastleLayer(camera * 0.08, 126, "#211d31", 0.7);
    } else if (region === 1) {
      drawCryptLayer(camera * 0.16);
      drawCastleLayer(camera * 0.08, 132, "#171c2a", 0.75);
    } else {
      drawCastleLayer(camera * 0.17, 122, "#21172b", 0.8);
      drawCastleLayer(camera * 0.31, 145, "#29192e", 1.2);
    }
    rect(0, 146, W, 27, "#181c2b");
    for (let i = 0; i < 12; i++) {
      const x = (i * 53 - camera * 0.4) % (W + 50);
      const fogX = (x + W + 50) % (W + 50);
      const fogY = 148 + (i % 3) * 6 + Math.sin(elapsed * 0.7 + i) * 2;
      rect(fogX, fogY, 36, 5, region === 0 ? "#65746b24" : "#a7a4bd1b");
    }
  };

  const drawForestLayer = (offset, base, color) => {
    for (let index = -1; index < 9; index++) {
      const x = ((index * 61 - offset) % (W + 90) + W + 90) % (W + 90) - 35;
      const height = 27 + Math.abs(index * 19 % 34);
      rect(x + 9, base - height + 16, 6, height - 9, color);
      rect(x + 3, base - height + 17, 18, 5, color);
      rect(x + 5, base - height + 8, 14, 7, color);
      rect(x + 7, base - height, 10, 8, color);
      rect(x + 10, base - height + 22, 4, 3, "#6e4c55");
      if (index % 3 === 0) {
        rect(x + 31, base - 19, 3, 19, "#272536");
        rect(x + 26, base - 19, 13, 3, "#272536");
        rect(x + 28, base - 27, 2, 8, "#272536");
        rect(x + 34, base - 27, 2, 8, "#272536");
        rect(x + 30, base - 22, 4, 4, "#48293d");
      }
    }
  };

  const drawCryptLayer = offset => {
    for (let index = -1; index < 7; index++) {
      const x = ((index * 83 - offset) % (W + 110) + W + 110) % (W + 110) - 40;
      rect(x, 79, 64, 9, "#252b39");
      rect(x + 8, 88, 7, 57, "#222735");
      rect(x + 49, 88, 7, 57, "#222735");
      rect(x + 4, 85, 15, 6, "#3b3948");
      rect(x + 45, 85, 15, 6, "#3b3948");
      rect(x + 16, 93, 32, 4, "#101a28");
      rect(x + 20, 97, 4, 22, "#111b28");
      rect(x + 40, 97, 4, 22, "#111b28");
      if (index % 2 === 0) {
        rect(x + 24, 119, 17, 15, "#161d2a");
        rect(x + 30, 111, 5, 8, "#647778");
      }
    }
  };

  const drawCastleLayer = (offset, base, color, scale) => {
    for (let index = -1; index < 7; index++) {
      const x = ((index * 104 - offset) % (W + 120) + W + 120) % (W + 120) - 42;
      const height = 24 + (index * 37 % 3) * 12;
      const towerW = Math.round(24 * scale);
      rect(x, base - height, towerW, height, color);
      rect(x - 4, base - height - 7, towerW + 8, 8, color);
      rect(x + 7, base - height - 14, 3, 8, color);
      rect(x + 3, base - height - 7, 11, 3, "#342138");
      rect(x + towerW + 10, base - height / 2, 13, height / 2, color);
      rect(x + towerW + 8, base - height / 2 - 5, 17, 6, color);
      for (let win = 0; win < 3; win++) {
        rect(x + 5 + win * 7, base - 12 - (win % 2) * 8, 3, 5, "#a75256");
      }
    }
  };

  const drawFloor = () => {
    const firstTile = Math.floor(camera / 16) * 16;
    rect(0, FLOOR, W, H - FLOOR, "#151724");
    for (let worldX = firstTile; worldX < camera + W + 16; worldX += 16) {
      const x = worldX - camera;
      const tile = Math.floor(worldX / 16);
      const region = regionAt(worldX);
      const base = region === 0 ? "#3c4d48" : region === 1 ? "#4b5960" : "#655260";
      const top = region === 0 ? "#82917a" : region === 1 ? "#91a0a0" : "#a18180";
      const seam = region === 0 ? "#243a38" : region === 1 ? "#303b49" : "#433346";
      rect(x, FLOOR, 15, 12, tile % 2 === 0 ? base : "#4b4b5a");
      rect(x, FLOOR, 15, 2, top);
      rect(x + 7 + tile % 3 * 2, FLOOR + 5, 2, 2, seam);
      rect(x, FLOOR + 13, 15, 1, seam);
    }
    rect(0, FLOOR + 24, W, 2, "#712a42");
  };

  const drawPlatforms = () => {
    for (const platform of platforms) {
      const x = platform.x - camera;
      if (x > W || x + platform.w < 0) continue;
      rect(x, platform.y, platform.w, 6, "#8d7e85");
      rect(x, platform.y + 6, platform.w, 5, "#4c4658");
      for (let brickX = x; brickX < x + platform.w; brickX += 16) {
        rect(brickX, platform.y + 2, 1, 3, "#d1b48a");
      }
    }
  };

  const drawCandle = candle => {
    const x = candle.x - camera;
    if (!candle.alive || x < -10 || x > W + 10) return;
    const glow = ctx.createRadialGradient(x, candle.y + 4, 0, x, candle.y + 4, 18);
    glow.addColorStop(0, "rgba(255, 181, 91, 0.24)");
    glow.addColorStop(1, "rgba(255, 181, 91, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - 18, candle.y - 14, 36, 36);
    rect(x - 1, candle.y + 5, 4, 8, "#bd374d");
    rect(x, candle.y + 3, 2, 3, "#f2d29a");
    rect(x, candle.y, 2, 3, "#ffdb70");
    rect(x + 1, candle.y - 3, 1, 3, "#f78854");
    rect(x - 3, candle.y + 13, 8, 3, "#716675");
  };

  const drawPickup = pickup => {
    const x = Math.round(pickup.x - camera);
    const y = Math.round(pickup.baseY + Math.sin(pickup.phase * 4) * 2.5);
    if (x < -12 || x > W + 12) return;
    if (pickup.type === "heart") {
      rect(x - 5, y - 3, 4, 4, "#dc5a67");
      rect(x + 1, y - 3, 4, 4, "#dc5a67");
      rect(x - 7, y, 14, 4, "#dc5a67");
      rect(x - 5, y + 4, 10, 3, "#dc5a67");
      rect(x - 3, y + 7, 6, 3, "#dc5a67");
      rect(x - 2, y - 2, 2, 2, "#ffd0a4");
    } else if (pickup.type === "relic") {
      rect(x - 2, y - 8, 5, 17, "#f4cc72");
      rect(x - 7, y - 3, 15, 5, "#f4cc72");
      rect(x - 1, y - 6, 2, 13, "#fff0b0");
      rect(x - 5, y - 2, 11, 2, "#fff0b0");
    } else {
      rect(x - 5, y - 5, 10, 10, "#dfb768");
      rect(x - 2, y - 3, 4, 6, "#fff0b0");
    }
  };

  const drawParticles = () => {
    for (const particle of particles) {
      ctx.globalAlpha = Math.max(0.12, particle.life / particle.maxLife);
      rect(particle.x - camera, particle.y, particle.size, particle.size, particle.color);
    }
    ctx.globalAlpha = 1;
  };

  const drawHero = (x, y, facing, frame, crouch, attack, flicker, weaponLevel = 1) => {
    if (flicker && Math.floor(elapsed * 14) % 2 === 0) return;
    const px = Math.round(x - camera);
    const py = Math.round(y);
    const flip = value => facing > 0 ? px + value : px + 14 - value;
    const bodyY = crouch ? py + 5 : py;
    rect(flip(2), bodyY + 1, 10, 5, "#e4bd90");
    rect(flip(1), bodyY + 3, 12, 4, "#302039");
    rect(flip(2), bodyY + 7, 10, 9, "#eee1c2");
    rect(flip(1), bodyY + 12, 12, 4, "#bd4b58");
    rect(flip(0), bodyY + 15, 14, 5, "#923d55");
    rect(flip(2), bodyY + 19, 4, 6, "#492d46");
    rect(flip(9), bodyY + 19, 4, 6, "#492d46");
    rect(flip(2), bodyY + 24, 5, 3, "#20202f");
    rect(flip(8), bodyY + 24, 5, 3, "#20202f");
    rect(flip(8), bodyY + 4, 2, 2, "#34243c");
    rect(flip(facing > 0 ? 9 : 3), bodyY + 6, 2, 2, "#31233a");
    if (frame % 2 === 1 && !crouch) {
      rect(flip(2), bodyY + 23, 4, 2, "#d9c39d");
      rect(flip(9), bodyY + 21, 4, 2, "#d9c39d");
    }
    if (attack) {
      const whipLength = 27 + (weaponLevel - 1) * 10;
      const whipX = facing > 0 ? px + 12 : px - whipLength - 2;
      const whipColor = weaponLevel > 1 ? "#f4d184" : "#e9d3a6";
      rect(facing > 0 ? px + 12 : px - 1, bodyY + 10, 4, 3, "#e8d9b7");
      rect(whipX, bodyY + 9, whipLength, 2, whipColor);
      rect(whipX + (facing > 0 ? whipLength - 3 : 0), bodyY + 6, 3, 5, "#f4e9cc");
      rect(whipX + (facing > 0 ? whipLength - 1 : -1), bodyY + 5, 2, 2, "#c7ad7c");
    }
  };

  const drawEnemy = enemy => {
    if (!enemy.alive) return;
    const x = Math.round(enemy.x - camera);
    const y = Math.round(enemy.y);
    if (enemy.type === "bat") {
      const flap = Math.floor(elapsed * 12) % 2;
      rect(x + 6, y + 3, 7, 7, "#2a2742");
      rect(x + 8, y + 5, 5, 5, "#8d3d5a");
      rect(x + 9, y + 4, 2, 2, "#ff6b64");
      rect(x + 1, y + (flap ? 1 : 5), 6, 3, "#4d3b66");
      rect(x + 12, y + (flap ? 5 : 1), 6, 3, "#4d3b66");
      rect(x + 3, y + (flap ? 0 : 8), 3, 3, "#241e38");
      rect(x + 14, y + (flap ? 8 : 0), 3, 3, "#241e38");
    } else if (enemy.type === "ghost") {
      rect(x + 5, y + 2, 10, 6, "#b0a5c7");
      rect(x + 3, y + 7, 14, 11, "#8e88aa");
      rect(x + 4, y + 17, 4, 4, "#8e88aa");
      rect(x + 10, y + 16, 4, 5, "#8e88aa");
      rect(x + 7, y + 5, 2, 3, "#29243a");
      rect(x + 13, y + 5, 2, 3, "#29243a");
      rect(x + 8, y + 12, 6, 2, "#cf6273");
    } else {
      rect(x + 3, y + 1, 10, 7, "#b7ab91");
      rect(x + 4, y + 2, 2, 2, "#514357");
      rect(x + 10, y + 2, 2, 2, "#514357");
      rect(x + 2, y + 8, 12, 11, "#514b5f");
      rect(x + 4, y + 9, 8, 4, "#ded2b5");
      rect(x + 6, y + 10, 2, 2, "#a43c51");
      rect(x + 10, y + 10, 2, 2, "#a43c51");
      rect(x + 1, y + 19, 5, 5, "#343246");
      rect(x + 9, y + 19, 5, 5, "#343246");
      rect(x - 1, y + 9, 3, 8, "#b7ab91");
      rect(x + 14, y + 9, 3, 8, "#b7ab91");
    }
  };

  const drawBoss = () => {
    if (!boss.active || boss.defeated) return;
    const x = Math.round(boss.x - camera);
    const y = Math.round(boss.y + Math.sin(boss.phase * 2) * 2);
    const phaseTwo = boss.hp <= boss.maxHp / 2;
    const robe = boss.hurt > 0 ? "#fff0d6" : phaseTwo ? "#8a294b" : "#54273f";
    rect(x + 8, y + 2, 15, 12, phaseTwo ? "#d9c7b4" : "#d4c7ae");
    rect(x + 5, y + 9, 22, 29, robe);
    rect(x + 1, y + 18, 7, 19, "#33243a");
    rect(x + 23, y + 17, 7, 19, "#33243a");
    rect(x + 8, y + 14, 15, 3, "#bc5261");
    rect(x + 10, y + 6, 3, 3, "#ff665f");
    rect(x + 19, y + 6, 3, 3, "#ff665f");
    rect(x + 7, y + 38, 6, 14, "#272136");
    rect(x + 19, y + 38, 6, 14, "#272136");
    rect(x + 4, y, 23, 4, "#30223a");
    rect(x + 7, y - 5, 4, 6, "#d5b765");
    rect(x + 20, y - 5, 4, 6, "#d5b765");
    if (phaseTwo) {
      rect(x + 2, y + 5, 3, 3, "#f1b96a");
      rect(x + 25, y + 5, 3, 3, "#f1b96a");
      rect(x + 8, y + 26, 15, 3, "#f5b268");
      if (Math.sin(elapsed * 17) > 0.2) rect(x + 12, y - 9, 7, 3, "#ff8c56");
    }
  };

  const drawProjectiles = () => {
    for (const projectile of projectiles) {
      const x = projectile.x - camera;
      if (projectile.kind === "dagger") {
        ctx.save();
        ctx.translate(Math.round(x), Math.round(projectile.y));
        ctx.rotate(Math.atan2(projectile.vy, projectile.vx));
        rect(-5, -1, 10, 2, "#f4e7ca");
        rect(3, -2, 3, 4, "#cc6870");
        ctx.restore();
      } else {
        rect(x - 3, projectile.y - 3, 7, 7, "#fa844f");
        rect(x - 1, projectile.y - 1, 3, 3, "#ffe18a");
      }
    }
  };

  const drawTorch = xWorld => {
    const x = xWorld - camera;
    if (x < -10 || x > W + 10) return;
    const flick = Math.sin(elapsed * 12 + xWorld) > 0;
    const glow = ctx.createRadialGradient(x + 1, 119, 0, x + 1, 119, 24);
    glow.addColorStop(0, "rgba(255, 158, 79, 0.22)");
    glow.addColorStop(1, "rgba(255, 158, 79, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - 23, 95, 48, 48);
    rect(x, 124, 3, 27, "#5d3945");
    rect(x - 2, 130, 7, 2, "#7d5360");
    rect(x - 1, flick ? 117 : 119, 5, 8, "#ef774e");
    rect(x, flick ? 116 : 118, 3, 5, "#ffd277");
    rect(x - 5, 153, 13, 2, "#f5a25a22");
  };

  const drawHud = () => {
    rect(0, 0, W, 24, "#0b0e1beF");
    rect(0, 24, W, 1, "#756273");
    text("MIRA", 9, 5, 7, "#ebdbbe");
    for (let i = 0; i < 5; i++) {
      rect(49 + i * 10, 6, 7, 7, i < player.health ? "#d84e5c" : "#403342");
      rect(51 + i * 10, 4, 3, 2, i < player.health ? "#ef9a85" : "#625161");
    }
    text("♥ " + String(player.hearts).padStart(2, "0"), 108, 6, 7, "#f2c86f");
    text("PTS " + String(score).padStart(6, "0"), 188, 6, 7, "#d9cfba");
    text("PEITSCHE-" + player.weaponLevel, 258, 6, 6, "#f0cc79");
    text("L-" + player.lives, 326, 6, 7, "#f18c82");
    if (boss.active && !boss.defeated) {
      rect(133, 31, 119, 8, "#11111d");
      rect(135, 33, 115, 4, "#492a3d");
      rect(135, 33, 115 * boss.hp / boss.maxHp, 4, "#c84e5d");
      text(boss.hp <= boss.maxHp / 2 ? "NACHTGRAF · PHASE II" : "DER NACHTGRAF",
        192, 43, 6, "#e5c7a9", "center");
    }
    if (combo > 1 && comboTimer > 0) text("KOMBO x" + combo, 192, 15, 6, "#f4cd72", "center");
  };

  const drawOverlay = (headline, lines, prompt) => {
    rect(0, 0, W, H, "#080a13b8");
    rect(36, 48, W - 72, 121, "#171625");
    rect(36, 48, W - 72, 2, "#d0a96b");
    rect(36, 167, W - 72, 2, "#7a354e");
    text(headline, W / 2, 61, 15, "#f0d6ac", "center");
    lines.forEach((line, index) => text(line, W / 2, 91 + index * 13, 7, "#c9c0c0", "center"));
    text(prompt, W / 2, 144, 8, "#f1c86c", "center");
  };

  const render = () => {
    ctx.fillStyle = "#060910";
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    if (shake > 0) {
      ctx.translate(Math.round((Math.random() - 0.5) * shake), Math.round((Math.random() - 0.5) * shake));
    }
    drawBackground();
    drawFloor();
    drawPlatforms();
    [95, 480, 940, 1380, 1800, 2240, 2660, 3000, 3290].forEach(drawTorch);
    if (state !== "title") {
      for (const candle of candles) drawCandle(candle);
      for (const enemy of enemies) drawEnemy(enemy);
      drawBoss();
      drawProjectiles();
      for (const pickup of pickups) drawPickup(pickup);
      drawParticles();
    }
    if (player && state !== "title") {
      const anim = Math.floor(elapsed * 10) % 2;
      drawHero(player.x, player.y, player.facing, anim, player.crouch,
        player.attackTime > 0, player.invulnerable > 0, player.weaponLevel);
      drawHud();
    }
    if (state === "title") {
      drawOverlay("DER ASCHENMOND", [
        "MIRA BELMONT GEGEN DIE NACHT",
        "WALD · KRYPTA · BURG",
        "FINDE RELIKTE, ERWECK DIE PEITSCHE"
      ], "ENTER / A STARTET · START VERSUCHT VOLLBILD");
      drawHero(12, FLOOR - 27, 1, 0, false, false, false);
    } else if (state === "paused") {
      drawOverlay("PAUSE", ["DIE NACHT WARTET"], "P ZUM WEITERSPIELEN");
    } else if (state === "gameover") {
      drawOverlay("GAME OVER", ["MIRA IST GEFALLEN", "PUNKTE: " + score, "BESTWERT: " + bestScore],
        "ENTER / A ZUM NEUSTART");
    } else if (state === "win") {
      drawOverlay("DIE NACHT ENDET", ["DER NACHTGRAF IST BESIEGT", "PUNKTE: " + score, "BESTWERT: " + bestScore],
        "ENTER / A FÜR EIN NEUES SPIEL");
    }
    if (state === "play" && bossIntro > 0) {
      text("DER NACHTGRAF ERWACHT", W / 2, 80, 8, "#f1ca7c", "center");
    }
    ctx.restore();
  };

  const frame = timestamp => {
    const dt = Math.min(0.05, lastTime ? (timestamp - lastTime) / 1000 : 0);
    lastTime = timestamp;
    update(dt);
    render();
    requestAnimationFrame(frame);
  };

  const activate = key => {
    if (!keys.has(key)) justPressed.add(key);
    keys.add(key);
  };

  const deactivate = key => {
    keys.delete(key);
  };

  window.addEventListener("keydown", event => {
    const key = event.key;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(key)) event.preventDefault();
    if (key === "Enter" && (state === "title" || state === "gameover" || state === "win")) {
      freshGame();
      return;
    }
    if ((key === "p" || key === "P" || key === "Escape") && state === "play") {
      state = "paused";
      audio?.suspend?.();
      return;
    }
    if ((key === "p" || key === "P" || key === "Escape") && state === "paused") {
      state = "play";
      startAudio();
      return;
    }
    if (key === "f" || key === "F") {
      toggleFullscreen();
      return;
    }
    if (key === "m" || key === "M") {
      soundOn = !soundOn;
      if (soundOn) startAudio();
      if (soundButton) soundButton.textContent = soundOn ? "♪ TON AN" : "♪ TON AUS";
      return;
    }
    if (state === "title" && (key.toLowerCase() === "z" || key === " ")) {
      freshGame();
      return;
    }
    if (key === "ArrowLeft") activate("left");
    else if (key === "ArrowRight") activate("right");
    else if (key === "ArrowDown") activate("down");
    else if (key === "ArrowUp") activate("ArrowUp");
    else activate(key);
  });

  window.addEventListener("keyup", event => {
    const key = event.key;
    if (key === "ArrowLeft") deactivate("left");
    else if (key === "ArrowRight") deactivate("right");
    else if (key === "ArrowDown") deactivate("down");
    else deactivate(key);
  });

  window.addEventListener("blur", () => {
    keys.clear();
    justPressed.clear();
  });

  canvas.addEventListener("pointerdown", () => {
    if (state === "title") freshGame();
  });

  document.querySelectorAll("[data-key]").forEach(button => {
    const key = button.dataset.key;
    button.addEventListener("pointerdown", event => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      heldTouches.set(event.pointerId, key);
      activate(key);
      if (state === "title") {
        freshGame();
        justPressed.delete(key);
      }
    });
    const release = event => {
      const held = heldTouches.get(event.pointerId);
      if (held) {
        heldTouches.delete(event.pointerId);
        deactivate(held);
      }
    };
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
  });

  freshGame(true);
  state = "title";
  requestAnimationFrame(frame);
})();
