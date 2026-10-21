// ICE CAVERNS TOWER SLIDE - Vertical Section for Castlevania: Der Aschenmond
// Integration into 8-bit game with Anor Londo-style vertical descent

// Add to game.js after region 2 (Burghof)

// Ice Tower Slide State
let iceTowerActive = false;
let iceTowerProgress = 0; // 0 to 1 (top to bottom)
let iceTowerSpeed = 0;
let iceTowerLane = 0; // -1, 0, 1 (left, center, right)
let iceTowerDucking = false;
let iceTowerCheckpoints = 0;
let iceTowerAvalanche = 100; // Distance from player (decreases over time)
let iceTowerChandeliers = [];
let iceTowerObstacles = [];
let iceTowerGrappleActive = false;
let iceTowerGrappleTarget = null;

// Initialize Ice Tower (call after defeating boss or entering ice caverns door)
const initIceTower = () => {
  iceTowerActive = true;
  iceTowerProgress = 0;
  iceTowerSpeed = 0.5;
  iceTowerLane = 0;
  iceTowerDucking = false;
  iceTowerCheckpoints = 0;
  iceTowerAvalanche = 100;
  iceTowerGrappleActive = false;

  // Create chandeliers (6 XXL with grapple points)
  iceTowerChandeliers = [];
  for (let i = 0; i < 6; i++) {
    iceTowerChandeliers.push({
      progress: 0.15 + i * 0.15,
      lane: (i % 3) - 1, // Rotate through lanes
      crystals: 8,
      active: true
    });
  }

  // Create obstacles (stalactites)
  iceTowerObstacles = [];
  for (let i = 0; i < 12; i++) {
    iceTowerObstacles.push({
      progress: 0.08 + i * 0.08,
      lane: Math.floor(Math.random() * 3) - 1,
      passed: false
    });
  }

  // Reset player for tower slide
  player.towerSlideActive = true;
  player.y = 50; // Start at top

  currentRegion = 3; // New region: Ice Caverns
  regionBannerTimer = 2.5;
};

// Update Ice Tower (call in main update loop)
const updateIceTower = dt => {
  if (!iceTowerActive) return;

  // Accelerate downward
  iceTowerSpeed = Math.min(3, iceTowerSpeed + 0.6 * dt);
  iceTowerProgress += (iceTowerSpeed / 100) * dt;

  // Lane control
  if (keys.has("ArrowLeft") || keys.has("a")) {
    iceTowerLane = Math.max(-1, iceTowerLane - 3 * dt);
  }
  if (keys.has("ArrowRight") || keys.has("d")) {
    iceTowerLane = Math.min(1, iceTowerLane + 3 * dt);
  }

  // Duck control
  iceTowerDucking = keys.has("ArrowDown") || keys.has("s");

  // Dash boost (C key - Mondsturm as boost)
  if (justPressed.has("c")) {
    iceTowerSpeed += 1.5;
    score += 100;
    spawnBurst(player.x, player.y, "#40d0ff", 8, 80);
    justPressed.delete("c");
  }

  // Whip grapple to chandelier
  if (justPressed.has("z") && !iceTowerGrappleActive) {
    // Check if near chandelier
    const nearChandelier = iceTowerChandeliers.find(ch =>
      Math.abs(ch.progress - iceTowerProgress) < 0.05 &&
      Math.abs(ch.lane - iceTowerLane) < 0.4 &&
      ch.active
    );

    if (nearChandelier) {
      iceTowerGrappleActive = true;
      iceTowerGrappleTarget = nearChandelier;
      iceTowerSpeed *= 0.3; // Slow down while grappling
      score += 250;
      scheduleBeep(audio.currentTime, 440, 0.12, "triangle");

      // Release after short time
      setTimeout(() => {
        iceTowerGrappleActive = false;
        iceTowerSpeed += 0.8; // Boost after grapple
      }, 400);
    } else {
      // Regular whip attack on obstacles
      const nearObstacle = iceTowerObstacles.find(obs =>
        Math.abs(obs.progress - iceTowerProgress) < 0.03 &&
        Math.abs(obs.lane - iceTowerLane) < 0.4 &&
        !obs.passed
      );

      if (nearObstacle) {
        nearObstacle.passed = true;
        nearObstacle.destroyed = true;
        score += 300;
        combo++;
        comboTimer = 1.8;
        spawnBurst(W / 2, H / 2, "#ffff40", 12, 90);
        scheduleBeep(audio.currentTime, 880, 0.08, "square");
      }
    }
    justPressed.delete("z");
  }

  // Avalanche catches up
  iceTowerAvalanche -= (1.8 - iceTowerSpeed * 0.4) * dt;

  // Check obstacle collisions
  iceTowerObstacles.forEach(obs => {
    if (obs.passed || obs.destroyed) return;

    const dist = Math.abs(obs.progress - iceTowerProgress);
    if (dist < 0.02) {
      const laneDist = Math.abs(obs.lane - iceTowerLane);

      if (laneDist < 0.4) {
        if (iceTowerDucking) {
          // Successfully ducked
          obs.passed = true;
          score += 200;
          combo++;
          comboTimer = 1.8;
          spawnBurst(player.x, player.y + 20, "#40ff80", 8, 60);
        } else if (!obs.hit) {
          // Hit obstacle
          obs.passed = true;
          obs.hit = true;
          iceTowerSpeed *= 0.6;
          iceTowerAvalanche -= 5;
          player.hp -= 1;
          player.hurt = 0.3;
          combo = 0;
          spawnBurst(player.x, player.y, "#ff4040", 10, 70);
          scheduleNoise(audio.currentTime, 0.15, 0.02, 220);
          shake = 6;
        }
      }
    }
  });

  // Checkpoint system (every 10%)
  const currentCheckpoint = Math.floor(iceTowerProgress * 10);
  if (currentCheckpoint > iceTowerCheckpoints && currentCheckpoint <= 10) {
    iceTowerCheckpoints = currentCheckpoint;
    iceTowerAvalanche = Math.min(100, iceTowerAvalanche + 15); // Push avalanche back
    score += 500;
    player.hp = Math.min(player.maxHp, player.hp + 1); // Heal
    checkpoint = player.x; // Save progress
    spawnBurst(W / 2, H / 2, "#40d0ff", 15, 100);
    scheduleBeep(audio.currentTime, 660, 0.15, "triangle");
    scheduleBeep(audio.currentTime + 0.08, 880, 0.15, "triangle");
  }

  // Avalanche caught player
  if (iceTowerAvalanche < 10) {
    player.hp -= 2;
    player.hurt = 0.5;
    iceTowerAvalanche = 30;
    iceTowerProgress = Math.max(0, iceTowerProgress - 0.1);
    shake = 12;
    scheduleNoise(audio.currentTime, 0.3, 0.03, 180);

    if (player.hp <= 0) {
      state = "gameover";
      iceTowerActive = false;
    }
  }

  // Complete tower slide
  if (iceTowerProgress >= 1.0) {
    iceTowerActive = false;
    player.towerSlideActive = false;

    // Completion bonus
    const cleanRun = iceTowerObstacles.every(o => o.passed || o.destroyed);
    score += 2000;
    score += iceTowerCheckpoints * 500;
    if (cleanRun) {
      score += 3000;
      // Show "PERFECT RUN" banner
      regionBannerTimer = 3.0;
    }

    // Return to normal gameplay or proceed to next region
    currentRegion = 0;
    player.x = checkpoint;
    player.y = FLOOR - player.h;
  }
};

// Draw Ice Tower (call in render loop)
const drawIceTower = () => {
  if (!iceTowerActive) return;

  ctx.save();

  // Dark ice cavern background
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, "#0a1828");
  grad.addColorStop(1, "#1a1040");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Buntglas windows (stained glass) - 8-bit style
  const windowColors = [
    "#d03030", // Red
    "#3040d0", // Blue
    "#d0a030", // Gold
    "#30d030", // Green
    "#a030d0", // Purple
    "#d0d030", // Yellow
    "#30d0d0", // Cyan
    "#d050a0"  // Pink
  ];

  for (let i = 0; i < 8; i++) {
    const windowProgress = (i / 8) + (iceTowerProgress * 0.5) % 1;
    const wy = H * 0.3 + Math.sin(windowProgress * Math.PI * 2) * 80;
    const wx = 30 + (i % 2) * (W - 80);

    if (wy > -40 && wy < H + 40) {
      ctx.fillStyle = windowColors[i];
      ctx.globalAlpha = 0.4;
      ctx.fillRect(wx, wy, 20, 50);
      ctx.globalAlpha = 1.0;

      // 8-bit window frame
      ctx.strokeStyle = "#506070";
      ctx.lineWidth = 2;
      ctx.strokeRect(wx, wy, 20, 50);
    }
  }

  // Ice tower walls (vertical lines)
  ctx.strokeStyle = "#405060";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + Math.sin(iceTowerProgress * 3) * 10, H);
    ctx.stroke();
  }

  // Chandeliers (XXL Kronleuchter)
  iceTowerChandeliers.forEach((ch, idx) => {
    const dist = Math.abs(ch.progress - iceTowerProgress);
    if (dist > 0.2) return; // Only draw near player

    const cy = H / 2 - (ch.progress - iceTowerProgress) * 800;
    const cx = W / 2 + ch.lane * 80;

    if (cy > -50 && cy < H + 50) {
      // Chandelier body (8-bit golden)
      ctx.fillStyle = "#d0a050";
      ctx.fillRect(cx - 15, cy - 8, 30, 16);

      // Chain
      ctx.strokeStyle = "#908070";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 8);
      ctx.lineTo(cx, cy - 30);
      ctx.stroke();

      // Crystals (grapple points) - glowing
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 + elapsed;
        const crystalX = cx + Math.cos(angle) * 12;
        const crystalY = cy + Math.sin(angle) * 12;

        ctx.fillStyle = iceTowerGrappleActive && iceTowerGrappleTarget === ch
          ? "#ffff80"
          : "#40c0ff";
        ctx.fillRect(crystalX - 3, crystalY - 3, 6, 6);
      }

      // Glow effect
      if (dist < 0.05) {
        ctx.strokeStyle = "#80d0ff";
        ctx.lineWidth = 3;
        ctx.strokeRect(cx - 18, cy - 11, 36, 22);
      }
    }
  });

  // Obstacles (stalactites) - 8-bit icicles
  iceTowerObstacles.forEach(obs => {
    if (obs.destroyed) return;

    const dist = Math.abs(obs.progress - iceTowerProgress);
    if (dist > 0.15) return;

    const oy = H / 2 - (obs.progress - iceTowerProgress) * 800;
    const ox = W / 2 + obs.lane * 80;

    if (oy > -30 && oy < H + 30) {
      ctx.fillStyle = obs.passed ? "#304050" : "#6090b0";

      // Stalactite shape (triangle)
      ctx.beginPath();
      ctx.moveTo(ox, oy - 20);
      ctx.lineTo(ox - 10, oy + 10);
      ctx.lineTo(ox + 10, oy + 10);
      ctx.closePath();
      ctx.fill();

      // Highlight
      ctx.fillStyle = "#b0d0f0";
      ctx.fillRect(ox - 3, oy - 15, 2, 8);
    }
  });

  // Player in slide
  const playerX = W / 2 + iceTowerLane * 80;
  const playerY = H / 2;

  // Player sprite (simplified 8-bit Mira sliding)
  ctx.fillStyle = player.hurt > 0 ? "#ff6060" : "#d08040";
  const playerHeight = iceTowerDucking ? 12 : 20;
  ctx.fillRect(playerX - 8, playerY - playerHeight / 2, 16, playerHeight);

  // Face
  ctx.fillStyle = "#f0c090";
  ctx.fillRect(playerX - 6, playerY - playerHeight / 2 + 2, 12, 8);

  // Hair
  ctx.fillStyle = "#804020";
  ctx.fillRect(playerX - 6, playerY - playerHeight / 2, 12, 3);

  // Whip trail when grappling
  if (iceTowerGrappleActive && iceTowerGrappleTarget) {
    const targetY = H / 2 - (iceTowerGrappleTarget.progress - iceTowerProgress) * 800;
    const targetX = W / 2 + iceTowerGrappleTarget.lane * 80;

    ctx.strokeStyle = "#ffff40";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(playerX, playerY);
    ctx.lineTo(targetX, targetY);
    ctx.stroke();
  }

  // Avalanche (from above)
  const avalancheY = playerY - iceTowerAvalanche * 3;
  if (avalancheY < H + 50) {
    // Snow particles
    ctx.fillStyle = "#f0f8ff";
    for (let i = 0; i < 40; i++) {
      const px = Math.random() * W;
      const py = avalancheY + Math.random() * 60;
      const size = 2 + Math.random() * 4;
      ctx.fillRect(px, py, size, size);
    }

    // Danger indicator when close
    if (iceTowerAvalanche < 30) {
      ctx.fillStyle = `rgba(255, 80, 80, ${0.3 + Math.sin(elapsed * 10) * 0.2})`;
      ctx.fillRect(0, 0, W, 30);

      ctx.fillStyle = "#ff4040";
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "center";
      ctx.fillText("ACHTUNG! LAWINE!", W / 2, 20);
    }
  }

  // Speed lines
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 10; i++) {
    const lx = Math.random() * W;
    ctx.beginPath();
    ctx.moveTo(lx, 0);
    ctx.lineTo(lx + 10, H);
    ctx.stroke();
  }

  // HUD overlays
  ctx.fillStyle = "#ffffff";
  ctx.font = "12px monospace";
  ctx.textAlign = "left";
  ctx.fillText(`TIEFE: ${Math.floor(iceTowerProgress * 100)}%`, 10, 20);
  ctx.fillText(`TEMPO: ${iceTowerSpeed.toFixed(1)}`, 10, 35);
  ctx.fillText(`LAWINE: ${Math.floor(iceTowerAvalanche)}m`, 10, 50);
  ctx.fillText(`CHECKPOINT: ${iceTowerCheckpoints}/10`, 10, 65);

  ctx.restore();
};

// Music theme for Ice Tower (add to themes array)
const iceTowerTheme = [
  "E4", null, "F#4", "G#4", "A4", null, "G#4", "F#4",
  "E4", null, "D4", "E4", "F#4", null, "E4", "D4",
  "C#4", null, "D4", "E4", "F#4", null, "E4", "D4",
  "C#4", null, "B3", "C#4", "D4", null, "E4", "F#4"
];

// Add ice tower music to existing theme system
// themes[3] = iceTowerTheme;

// Trigger Ice Tower entrance (call after boss defeat or special door)
const enterIceTower = () => {
  initIceTower();
  scheduleBeep(audio.currentTime, 220, 0.2, "triangle");
  scheduleBeep(audio.currentTime + 0.1, 330, 0.2, "triangle");
};

// Export for integration
if (typeof module !== 'undefined') {
  module.exports = {
    initIceTower,
    updateIceTower,
    drawIceTower,
    enterIceTower,
    iceTowerTheme
  };
}
