const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const overlay = document.getElementById("overlay");
const startBtn = document.getElementById("startBtn");
const musicBtn = document.getElementById("musicBtn");
const music = document.getElementById("music");

const t = {
  name: "\u6731\u968f\u5b89",
  level1: "\u7b2c 1 \u5173\uff1a\u9713\u8679\u5e9f\u589f",
  level2: "\u7b2c 2 \u5173\uff1a\u9ad8\u538b\u5de5\u5382",
  level3: "\u7b2c 3 \u5173\uff1a\u5929\u53f0\u5c01\u9501",
  winA: "\u901a\u5173\u6210\u529f\uff01\u6731\u968f\u5b89\u5b8c\u6210\u7b2c ",
  winB: " \u6b21\u7a81\u56f4",
  hp: "  HP ",
  wins: "    \u901a\u5173\u6b21\u6570 ",
  musicOn: "\u97f3\u4e50\uff1a\u5f00",
  musicOff: "\u97f3\u4e50\uff1a\u5173",
  musicPlay: "\u97f3\u4e50\uff1a\u70b9\u6211\u64ad\u653e"
};

const keys = new Set();
const W = canvas.width;
const H = canvas.height;
let running = false;
let muted = false;
let levelIndex = 0;
let shake = 0;
let messageTimer = 0;
let message = t.level1;
let last = performance.now();
let particles = [];
let wrenches = [];

const player = {
  name: t.name,
  x: 70,
  y: 500,
  w: 32,
  h: 68,
  vx: 0,
  vy: 0,
  face: 1,
  ground: false,
  hp: 3,
  dash: 0,
  attack: 0,
  throwCooldown: 0,
  inv: 0,
  wins: 0
};

const levels = [
  {
    title: t.level1,
    spawn: [70, 500],
    goal: { x: 1160, y: 430, w: 54, h: 130 },
    platforms: [
      [0, 650, 1280, 70], [210, 535, 150, 24], [460, 470, 180, 24],
      [750, 555, 135, 24], [980, 495, 180, 24]
    ],
    spikes: [[390, 626, 110, 24], [900, 626, 150, 24]],
    lasers: [{ x: 690, y: 480, h: 170, phase: 0 }],
    drones: [{ x: 550, y: 420, min: 470, max: 665, dir: 1 }]
  },
  {
    title: t.level2,
    spawn: [60, 500],
    goal: { x: 1165, y: 210, w: 54, h: 130 },
    platforms: [
      [0, 650, 1280, 70], [155, 560, 120, 24], [380, 500, 150, 24],
      [610, 430, 120, 24], [840, 360, 150, 24], [1070, 340, 150, 24]
    ],
    spikes: [[280, 626, 250, 24], [760, 626, 190, 24]],
    lasers: [{ x: 570, y: 438, h: 212, phase: 1.2 }, { x: 1000, y: 350, h: 300, phase: 2.4 }],
    drones: [{ x: 910, y: 300, min: 820, max: 1040, dir: -1 }]
  },
  {
    title: t.level3,
    spawn: [55, 265],
    goal: { x: 1168, y: 515, w: 54, h: 130 },
    platforms: [
      [0, 338, 185, 24], [255, 405, 155, 24], [510, 472, 165, 24],
      [780, 545, 135, 24], [0, 650, 1280, 70], [1030, 610, 190, 24]
    ],
    spikes: [[185, 626, 310, 24], [680, 626, 260, 24]],
    lasers: [{ x: 455, y: 410, h: 240, phase: 0.6 }, { x: 960, y: 548, h: 102, phase: 2.1 }],
    drones: [{ x: 565, y: 420, min: 500, max: 690, dir: 1 }, { x: 1080, y: 560, min: 1030, max: 1210, dir: -1 }]
  }
];

function resetPlayer() {
  const level = levels[levelIndex];
  [player.x, player.y] = level.spawn;
  player.vx = 0;
  player.vy = 0;
  player.hp = 3;
  player.inv = 60;
  player.dash = 0;
  player.attack = 0;
  player.throwCooldown = 0;
  wrenches = [];
  level.drones.forEach((drone) => {
    drone.dead = false;
  });
  message = level.title;
  messageTimer = 150;
}

function rects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function damage() {
  if (player.inv > 0) return;
  player.hp -= 1;
  player.inv = 85;
  shake = 14;
  burst(player.x + player.w / 2, player.y + 28, "#ff2bc2", 18);
  if (player.hp <= 0) resetPlayer();
}

function burst(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 7,
      life: 28 + Math.random() * 20,
      color
    });
  }
}

function update() {
  const level = levels[levelIndex];
  const left = keys.has("ArrowLeft") || keys.has("a");
  const right = keys.has("ArrowRight") || keys.has("d");
  const jump = keys.has("ArrowUp") || keys.has("w") || keys.has(" ");
  const dashKey = keys.has("Shift");

  const speed = dashKey && player.dash <= 0 ? 14 : 5.8;
  if (dashKey && player.dash <= 0) {
    player.dash = 34;
    burst(player.x, player.y + 40, "#31f7ff", 12);
  }

  player.vx = (right ? speed : 0) - (left ? speed : 0);
  if (player.vx !== 0) player.face = Math.sign(player.vx);
  if (jump && player.ground) {
    player.vy = -17.2;
    player.ground = false;
  }

  player.vy += 0.82;
  player.vy = Math.min(player.vy, 21);
  player.x += player.vx;
  collide("x");
  player.y += player.vy;
  player.ground = false;
  collide("y");

  player.x = Math.max(0, Math.min(W - player.w, player.x));
  if (player.y > H + 120) resetPlayer();
  if (player.inv > 0) player.inv--;
  if (player.dash > 0) player.dash--;
  if (player.attack > 0) player.attack--;
  if (player.throwCooldown > 0) player.throwCooldown--;
  if (messageTimer > 0) messageTimer--;
  if (shake > 0) shake *= 0.82;

  for (const spike of level.spikes) {
    if (rects(player, { x: spike[0], y: spike[1], w: spike[2], h: spike[3] })) damage();
  }

  for (const laser of level.lasers) {
    const active = Math.sin(performance.now() / 290 + laser.phase) > -0.2;
    if (active && rects(player, { x: laser.x - 7, y: laser.y, w: 14, h: laser.h })) damage();
    laser.active = active;
  }

  for (const drone of level.drones) {
    drone.x += drone.dir * 2.2;
    if (drone.x < drone.min || drone.x > drone.max) drone.dir *= -1;
    const body = { x: drone.x - 28, y: drone.y - 20, w: 56, h: 40 };
    for (const wrench of wrenches) {
      if (!drone.dead && rects(wrench, body)) {
        drone.dead = true;
        wrench.dead = true;
        burst(drone.x, drone.y, "#ffe45e", 30);
      }
    }
    if (!drone.dead && rects(player, body)) damage();
  }

  wrenches = wrenches.filter((wrench) => {
    wrench.x += wrench.vx;
    wrench.spin += wrench.vx > 0 ? 0.34 : -0.34;
    wrench.life--;
    const inBounds = wrench.x > -60 && wrench.x < W + 60 && wrench.y > -60 && wrench.y < H + 60;
    return !wrench.dead && wrench.life > 0 && inBounds;
  });

  if (rects(player, level.goal)) {
    levelIndex++;
    let completedAll = false;
    if (levelIndex >= levels.length) {
      levelIndex = 0;
      player.wins++;
      completedAll = true;
    }
    resetPlayer();
    if (completedAll) {
      message = t.winA + player.wins + t.winB;
      messageTimer = 240;
    }
  }

  particles = particles.filter((p) => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.18;
    p.life--;
    return p.life > 0;
  });
}

function collide(axis) {
  for (const p of levels[levelIndex].platforms) {
    const box = { x: p[0], y: p[1], w: p[2], h: p[3] };
    if (!rects(player, box)) continue;
    if (axis === "x") {
      if (player.vx > 0) player.x = box.x - player.w;
      if (player.vx < 0) player.x = box.x + box.w;
    } else {
      if (player.vy > 0) {
        player.y = box.y - player.h;
        player.ground = true;
      }
      if (player.vy < 0) player.y = box.y + box.h;
      player.vy = 0;
    }
  }
}

function draw() {
  const level = levels[levelIndex];
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  const sx = (Math.random() - 0.5) * shake;
  const sy = (Math.random() - 0.5) * shake;
  ctx.translate(sx, sy);

  drawBackground();
  for (const p of level.platforms) drawPlatform(...p);
  for (const spike of level.spikes) drawSpikes(...spike);
  for (const laser of level.lasers) drawLaser(laser);
  for (const drone of level.drones) if (!drone.dead) drawDrone(drone);
  drawGoal(level.goal);
  drawWrenches();
  drawPlayer();
  drawParticles();
  drawHud();
  ctx.restore();
}

function drawWrenches() {
  for (const wrench of wrenches) {
    ctx.save();
    ctx.translate(wrench.x + wrench.w / 2, wrench.y + wrench.h / 2);
    ctx.rotate(wrench.spin);
    ctx.shadowColor = "#ffe45e";
    ctx.shadowBlur = 18;
    ctx.strokeStyle = "#dce7f2";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-20, 0);
    ctx.lineTo(17, 0);
    ctx.stroke();
    ctx.strokeStyle = "#31f7ff";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(-24, 0, 9, 0.65, Math.PI * 1.35);
    ctx.stroke();
    ctx.fillStyle = "#ffe45e";
    ctx.beginPath();
    ctx.arc(22, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#090a19");
  g.addColorStop(0.48, "#121335");
  g.addColorStop(1, "#050510");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(49,247,255,.18)";
  ctx.lineWidth = 1;
  for (let x = -40; x < W; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, H);
    ctx.lineTo(x + 230, 0);
    ctx.stroke();
  }
  for (let y = 90; y < H; y += 92) {
    ctx.fillStyle = y % 184 === 0 ? "rgba(255,43,194,.13)" : "rgba(49,247,255,.10)";
    ctx.fillRect(0, y, W, 2);
  }
}

function drawPlatform(x, y, w, h) {
  ctx.fillStyle = "#151b2d";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#31f7ff";
  ctx.fillRect(x, y, w, 4);
  ctx.shadowColor = "#31f7ff";
  ctx.shadowBlur = 12;
  ctx.strokeStyle = "rgba(49,247,255,.7)";
  ctx.strokeRect(x, y, w, h);
  ctx.shadowBlur = 0;
}

function drawSpikes(x, y, w, h) {
  ctx.fillStyle = "#ff2bc2";
  const count = Math.max(3, Math.floor(w / 24));
  for (let i = 0; i < count; i++) {
    const sx = x + (i * w) / count;
    ctx.beginPath();
    ctx.moveTo(sx, y + h);
    ctx.lineTo(sx + w / count / 2, y);
    ctx.lineTo(sx + w / count, y + h);
    ctx.closePath();
    ctx.fill();
  }
}

function drawLaser(laser) {
  ctx.globalAlpha = laser.active ? 1 : 0.18;
  ctx.strokeStyle = laser.active ? "#ff2bc2" : "#617080";
  ctx.lineWidth = laser.active ? 8 : 3;
  ctx.shadowColor = "#ff2bc2";
  ctx.shadowBlur = laser.active ? 22 : 0;
  ctx.beginPath();
  ctx.moveTo(laser.x, laser.y);
  ctx.lineTo(laser.x, laser.y + laser.h);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

function drawDrone(drone) {
  ctx.save();
  ctx.translate(drone.x, drone.y);
  ctx.fillStyle = "#ffe45e";
  ctx.shadowColor = "#ffe45e";
  ctx.shadowBlur = 18;
  ctx.fillRect(-22, -14, 44, 28);
  ctx.fillStyle = "#050711";
  ctx.fillRect(-8, -5, 16, 10);
  ctx.strokeStyle = "#ff2bc2";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(-34, 0, 10, 0, Math.PI * 2);
  ctx.arc(34, 0, 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawGoal(goal) {
  ctx.fillStyle = "rgba(89,255,147,.16)";
  ctx.fillRect(goal.x, goal.y, goal.w, goal.h);
  ctx.strokeStyle = "#59ff93";
  ctx.lineWidth = 5;
  ctx.shadowColor = "#59ff93";
  ctx.shadowBlur = 24;
  ctx.strokeRect(goal.x, goal.y, goal.w, goal.h);
  ctx.shadowBlur = 0;
}

function drawPlayer() {
  const x = player.x + player.w / 2;
  const y = player.y;
  const flicker = player.inv > 0 && Math.floor(player.inv / 5) % 2 === 0;
  if (flicker) ctx.globalAlpha = 0.45;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(player.face, 1);
  ctx.shadowColor = "#31f7ff";
  ctx.shadowBlur = 12;

  ctx.fillStyle = "#e9322e";
  roundRect(-18, 3, 34, 13, 5);
  ctx.fill();
  roundRect(-10, -2, 27, 9, 4);
  ctx.fill();

  ctx.fillStyle = "#f0b07a";
  roundRect(-14, 11, 28, 24, 7);
  ctx.fill();
  ctx.fillRect(11, 18, 9, 7);

  ctx.fillStyle = "#3b2018";
  ctx.fillRect(5, 21, 15, 6);
  ctx.fillRect(-12, 24, 28, 8);
  ctx.fillStyle = "#10131d";
  ctx.fillRect(5, 16, 4, 4);

  ctx.fillStyle = "#e9322e";
  roundRect(-16, 35, 32, 20, 5);
  ctx.fill();
  ctx.fillStyle = "#244eb6";
  ctx.fillRect(-13, 42, 26, 23);
  ctx.fillRect(-17, 39, 8, 26);
  ctx.fillRect(9, 39, 8, 26);
  ctx.fillStyle = "#ffe45e";
  ctx.fillRect(-8, 45, 5, 5);
  ctx.fillRect(3, 45, 5, 5);

  ctx.strokeStyle = "#f7fbff";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-17, 42);
  ctx.lineTo(-30, player.attack > 0 ? 28 : 51);
  ctx.moveTo(17, 42);
  ctx.lineTo(player.attack > 0 ? 48 : 31, player.attack > 0 ? 23 : 50);
  ctx.stroke();

  ctx.fillStyle = "#2b241c";
  ctx.fillRect(-18, 63, 16, 8);
  ctx.fillRect(3, 63, 18, 8);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffe45e";
  ctx.font = "700 16px Microsoft YaHei, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(player.name, 0, -12);
  ctx.restore();
  ctx.globalAlpha = 1;
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / 42);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, 4, 4);
  }
  ctx.globalAlpha = 1;
}

function drawHud() {
  ctx.fillStyle = "rgba(4,8,18,.76)";
  ctx.fillRect(18, 16, 360, 82);
  ctx.fillStyle = "#fff";
  ctx.font = "800 22px Microsoft YaHei, sans-serif";
  ctx.fillText(t.name + t.hp + "\u2665".repeat(player.hp), 36, 48);
  ctx.fillStyle = "#31f7ff";
  ctx.font = "700 16px Microsoft YaHei, sans-serif";
  ctx.fillText(levels[levelIndex].title + t.wins + player.wins, 36, 78);
  if (messageTimer > 0) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffe45e";
    ctx.font = "900 32px Microsoft YaHei, sans-serif";
    ctx.fillText(message, W / 2, 112);
    ctx.textAlign = "start";
  }
}

function loop(now) {
  const steps = Math.min(3, Math.max(1, Math.round((now - last) / 16.7)));
  last = now;
  if (running) {
    for (let i = 0; i < steps; i++) update();
  }
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (e) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", " ", "Shift"].includes(e.key)) e.preventDefault();
  keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  if ((e.key === "j" || e.key === "J") && player.throwCooldown <= 0) {
    player.attack = 18;
    player.throwCooldown = 18;
    wrenches.push({
      x: player.x + player.w / 2 + player.face * 22,
      y: player.y + 24,
      w: 46,
      h: 18,
      vx: player.face * 15,
      spin: 0,
      life: 95,
      dead: false
    });
    burst(player.x + player.w / 2 + player.face * 42, player.y + 31, "#ffe45e", 10);
  }
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
});

startBtn.addEventListener("click", async () => {
  overlay.classList.add("hidden");
  running = true;
  resetPlayer();
  if (!muted) {
    music.volume = 0.58;
    try {
      await music.play();
    } catch {
      musicBtn.textContent = t.musicPlay;
    }
  }
});

musicBtn.addEventListener("click", async () => {
  muted = !muted;
  musicBtn.setAttribute("aria-pressed", String(!muted));
  musicBtn.textContent = muted ? t.musicOff : t.musicOn;
  if (muted) {
    music.pause();
  } else {
    try {
      await music.play();
    } catch {
      musicBtn.textContent = t.musicPlay;
    }
  }
});

resetPlayer();
requestAnimationFrame(loop);
