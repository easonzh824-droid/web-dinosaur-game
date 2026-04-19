const stage = document.getElementById("stage");
const dino = document.getElementById("dino");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const modeEl = document.getElementById("mode");
const chapterHintEl = document.getElementById("chapterHint");
const chapterBannerEl = document.getElementById("chapterBanner");
const messageEl = document.getElementById("message");
const portalEl = document.getElementById("specialPortal");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");

const FLOOR = 72;
const STAGE_CLASSES = ["chapter-plains", "chapter-sandstorm", "chapter-ruins", "chapter-special", "chapter-rush"];

const CHAPTERS = {
  plains: {
    name: "草原熱身",
    hint: "熟悉跳躍節奏",
    speed: 6,
    gravity: 0.88,
    jumpForce: 15.5,
    spawnBase: 1120,
    pickupInterval: 0,
    stageClass: "chapter-plains",
    message: ["草原上先暖機，障礙比較單純。", "注意節奏，後面每一章都會改變玩法。"],
    patterns: [
      [{ kind: "cactus" }],
      [{ kind: "cactus" }, { kind: "cactus", offset: 72 }],
      [{ kind: "bird", height: 32 }],
    ],
  },
  sandstorm: {
    name: "沙暴追擊",
    hint: "視野變差，飛鳥變多",
    speed: 7.2,
    gravity: 0.92,
    jumpForce: 15.2,
    spawnBase: 970,
    pickupInterval: 0,
    stageClass: "chapter-sandstorm",
    message: ["沙暴會讓畫面更混亂，飛鳥也會貼著地面突襲。", "有些障礙間距更短，提早準備起跳。"],
    patterns: [
      [{ kind: "bird", height: 24 }],
      [{ kind: "cactus" }, { kind: "bird", offset: 145, height: 20 }],
      [{ kind: "rock" }, { kind: "cactus", offset: 94 }],
    ],
  },
  ruins: {
    name: "斷垣遺跡",
    hint: "需要跳躍與蹲下混用",
    speed: 7.8,
    gravity: 0.9,
    jumpForce: 15.7,
    spawnBase: 920,
    pickupInterval: 0,
    stageClass: "chapter-ruins",
    message: ["遺跡裡會出現殘柱和低門，不能只靠跳。", "看到低門時要蹲下滑過去。"],
    patterns: [
      [{ kind: "pillar" }],
      [{ kind: "gate" }],
      [{ kind: "pillar" }, { kind: "gate", offset: 162 }],
      [{ kind: "rock" }, { kind: "rock", offset: 78 }, { kind: "bird", offset: 170, height: 30 }],
    ],
  },
  special: {
    name: "流星失重區",
    hint: "低重力，收集能量晶體",
    speed: 8.3,
    gravity: 0.46,
    jumpForce: 12.8,
    spawnBase: 880,
    pickupInterval: 1450,
    stageClass: "chapter-special",
    message: ["你進入了低重力流星區，跳躍會更飄。", "藍色晶體能加分，但流星會從高處快速掠過。"],
    patterns: [
      [{ kind: "meteor", height: 110 }],
      [{ kind: "meteor", height: 170 }, { kind: "meteor", offset: 110, height: 95 }],
      [{ kind: "meteor", height: 140 }, { kind: "crater", offset: 170 }],
    ],
  },
  rush: {
    name: "極速衝刺",
    hint: "速度最高，連續判斷",
    speed: 9.3,
    gravity: 0.9,
    jumpForce: 15.4,
    spawnBase: 760,
    pickupInterval: 0,
    stageClass: "chapter-rush",
    message: ["最後衝刺開始，速度大幅提高。", "連續障礙會更密集，蹲和跳要銜接得更快。"],
    patterns: [
      [{ kind: "cactus" }, { kind: "rock", offset: 86 }, { kind: "bird", offset: 188, height: 28 }],
      [{ kind: "gate" }, { kind: "rock", offset: 122 }],
      [{ kind: "pillar" }, { kind: "pillar", offset: 92 }, { kind: "rock", offset: 194 }],
    ],
  },
};

const gameState = {
  running: false,
  score: 0,
  lives: 3,
  y: 0,
  velocityY: 0,
  ducking: false,
  chapterKey: "plains",
  obstacles: [],
  pickups: [],
  lastTime: 0,
  spawnTimer: 0,
  pickupTimer: 0,
  invulnerableUntil: 0,
  portalReady: false,
  portalTriggered: false,
  portalX: 0,
  specialEndScore: 0,
  rushUnlocked: false,
  shownMessages: new Set(),
};

function currentChapter() {
  return CHAPTERS[gameState.chapterKey];
}

function showMessage(title, lines) {
  messageEl.innerHTML = `
    <h1>${title}</h1>
    ${lines.map((line) => `<p>${line}</p>`).join("")}
  `;
  messageEl.classList.add("visible");
}

function hideMessage() {
  messageEl.classList.remove("visible");
}

function clearActors() {
  [...gameState.obstacles, ...gameState.pickups].forEach((actor) => actor.remove());
  gameState.obstacles = [];
  gameState.pickups = [];
}

function applyChapterStyles() {
  STAGE_CLASSES.forEach((className) => stage.classList.remove(className));
  const chapter = currentChapter();
  stage.classList.add(chapter.stageClass);
  modeEl.textContent = chapter.name;
  chapterHintEl.textContent = chapter.hint;
  chapterBannerEl.textContent = chapter.name;
}

function updateHud() {
  scoreEl.textContent = Math.floor(gameState.score);
  livesEl.textContent = gameState.lives;
  applyChapterStyles();
}

function setChapter(chapterKey, showIntro = false) {
  gameState.chapterKey = chapterKey;
  gameState.spawnTimer = 0;
  gameState.pickupTimer = 0;
  clearActors();
  applyChapterStyles();

  if (showIntro) {
    const chapter = currentChapter();
    showMessage(chapter.name, chapter.message);
    window.setTimeout(() => {
      if (gameState.running) {
        hideMessage();
      }
    }, 1700);
  }
}

function resetGame() {
  gameState.running = false;
  gameState.score = 0;
  gameState.lives = 3;
  gameState.y = 0;
  gameState.velocityY = 0;
  gameState.ducking = false;
  gameState.lastTime = 0;
  gameState.spawnTimer = 0;
  gameState.pickupTimer = 0;
  gameState.invulnerableUntil = 0;
  gameState.portalReady = false;
  gameState.portalTriggered = false;
  gameState.portalX = 0;
  gameState.specialEndScore = 0;
  gameState.rushUnlocked = false;
  gameState.shownMessages = new Set();
  clearActors();
  portalEl.classList.add("hidden");
  portalEl.style.left = "";
  portalEl.style.right = "88px";
  dino.classList.remove("duck");
  dino.style.bottom = `${FLOOR}px`;
  dino.style.opacity = "1";
  dino.style.filter = "none";
  setChapter("plains");
  updateHud();
  showMessage("小恐龍特別行動", [
    "按空白鍵開始，空白鍵跳躍，方向下鍵可以蹲下或快速落地。",
    "你會依序闖過草原、沙暴、遺跡、流星失重區與極速衝刺。",
  ]);
}

function startGame() {
  if (gameState.running) {
    return;
  }

  if (gameState.lives <= 0 || gameState.score === 0) {
    resetGame();
  }

  gameState.running = true;
  gameState.lastTime = performance.now();
  hideMessage();
  requestAnimationFrame(loop);
}

function jump() {
  if (!gameState.running) {
    startGame();
    return;
  }

  if (gameState.y === 0) {
    gameState.velocityY = currentChapter().jumpForce;
  }
}

function setDuck(enabled) {
  gameState.ducking = enabled && gameState.y === 0;
  dino.classList.toggle("duck", gameState.ducking);
}

function createObstacle(kind, offset = 0, height = 0) {
  const obstacle = document.createElement("div");
  obstacle.classList.add("obstacle", kind);
  obstacle.dataset.kind = kind;
  obstacle.style.left = `${stage.clientWidth + 10 + offset}px`;

  let bottom = FLOOR;
  if (kind === "bird") {
    bottom = FLOOR + height;
  }
  if (kind === "meteor") {
    bottom = FLOOR + height;
  }
  if (kind === "gate") {
    bottom = FLOOR + 26;
  }
  if (kind === "crater") {
    bottom = FLOOR - 2;
  }

  obstacle.style.bottom = `${bottom}px`;
  stage.appendChild(obstacle);
  gameState.obstacles.push(obstacle);
}

function spawnObstaclePattern() {
  const chapter = currentChapter();
  const pattern = chapter.patterns[Math.floor(Math.random() * chapter.patterns.length)];
  pattern.forEach((item) => createObstacle(item.kind, item.offset || 0, item.height || 0));
}

function spawnPickup() {
  if (gameState.chapterKey !== "special") {
    return;
  }

  const crystal = document.createElement("div");
  crystal.classList.add("pickup", "crystal");
  crystal.style.left = `${stage.clientWidth + 20}px`;
  crystal.style.bottom = `${FLOOR + 80 + Math.random() * 150}px`;
  stage.appendChild(crystal);
  gameState.pickups.push(crystal);
}

function getBounds(el) {
  const rect = el.getBoundingClientRect();
  return {
    left: rect.left,
    right: rect.right,
    top: rect.top,
    bottom: rect.bottom,
  };
}

function intersects(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function transitionChapterIfNeeded() {
  if (!gameState.shownMessages.has("sandstorm") && gameState.score >= 90 && gameState.chapterKey === "plains") {
    gameState.shownMessages.add("sandstorm");
    setChapter("sandstorm", true);
    return;
  }

  if (!gameState.shownMessages.has("ruins") && gameState.score >= 190 && gameState.chapterKey === "sandstorm") {
    gameState.shownMessages.add("ruins");
    setChapter("ruins", true);
    return;
  }

  if (!gameState.portalTriggered && !gameState.portalReady && gameState.score >= 300 && gameState.chapterKey === "ruins") {
    gameState.portalReady = true;
    gameState.portalX = stage.clientWidth + 20;
    portalEl.classList.remove("hidden");
    portalEl.style.right = "auto";
  }

  if (gameState.chapterKey === "special" && gameState.score >= gameState.specialEndScore) {
    gameState.rushUnlocked = true;
    setChapter("rush", true);
  }
}

function enterSpecialMode() {
  gameState.portalTriggered = true;
  gameState.portalReady = false;
  gameState.specialEndScore = gameState.score + 220;
  portalEl.classList.add("hidden");
  setChapter("special", true);
}

function takeHit(now) {
  if (now < gameState.invulnerableUntil) {
    return;
  }

  gameState.lives -= 1;
  gameState.invulnerableUntil = now + 1200;
  dino.style.opacity = "0.45";
  window.setTimeout(() => {
    dino.style.opacity = "1";
  }, 250);
  window.setTimeout(() => {
    dino.style.opacity = "0.45";
  }, 500);
  window.setTimeout(() => {
    dino.style.opacity = "1";
  }, 750);

  if (gameState.lives <= 0) {
    gameState.running = false;
    showMessage("任務失敗", [
      `最終分數：${Math.floor(gameState.score)}`,
      "你已經看過多段關卡節奏了，按重新開始再挑戰一次。",
    ]);
  }
}

function moveActors(delta, now) {
  const dinoBounds = getBounds(dino);
  const speed = currentChapter().speed;

  gameState.obstacles = gameState.obstacles.filter((obstacle) => {
    const extra = obstacle.dataset.kind === "meteor" ? 1.4 : 1;
    const left = parseFloat(obstacle.style.left) - speed * extra * delta * 0.06;
    obstacle.style.left = `${left}px`;

    if (left < -120) {
      obstacle.remove();
      return false;
    }

    if (intersects(dinoBounds, getBounds(obstacle))) {
      takeHit(now);
      obstacle.remove();
      return false;
    }

    return true;
  });

  gameState.pickups = gameState.pickups.filter((pickup) => {
    const left = parseFloat(pickup.style.left) - (speed - 1) * delta * 0.06;
    pickup.style.left = `${left}px`;

    if (left < -60) {
      pickup.remove();
      return false;
    }

    if (intersects(dinoBounds, getBounds(pickup))) {
      gameState.score += 30;
      pickup.remove();
      return false;
    }

    return true;
  });
}

function updateDino(delta) {
  const chapter = currentChapter();
  gameState.velocityY -= chapter.gravity * delta * 0.06;
  gameState.y += gameState.velocityY * delta * 0.06;

  if (gameState.y < 0) {
    gameState.y = 0;
    gameState.velocityY = 0;
  }

  dino.style.bottom = `${FLOOR + gameState.y}px`;
}

function loop(timestamp) {
  if (!gameState.running) {
    updateHud();
    return;
  }

  const delta = Math.min(timestamp - gameState.lastTime, 32);
  gameState.lastTime = timestamp;

  gameState.score += delta * 0.02;
  gameState.spawnTimer += delta;
  gameState.pickupTimer += delta;

  updateDino(delta);
  moveActors(delta, timestamp);
  transitionChapterIfNeeded();

  const chapter = currentChapter();
  const spawnGap = Math.max(560, chapter.spawnBase - Math.min(gameState.score, 600) * 0.35);
  if (gameState.spawnTimer >= spawnGap) {
    spawnObstaclePattern();
    gameState.spawnTimer = 0;
  }

  if (chapter.pickupInterval > 0 && gameState.pickupTimer >= chapter.pickupInterval) {
    spawnPickup();
    gameState.pickupTimer = 0;
  }

  if (gameState.portalReady && !gameState.portalTriggered) {
    gameState.portalX -= 6.2 * delta * 0.06;
    portalEl.style.left = `${gameState.portalX}px`;
    const portalBounds = getBounds(portalEl);
    const dinoBounds = getBounds(dino);
    if (intersects(dinoBounds, portalBounds)) {
      enterSpecialMode();
    } else if (gameState.portalX < -120) {
      gameState.portalReady = false;
      portalEl.classList.add("hidden");
      gameState.portalX = stage.clientWidth + 20;
    }
  }

  if (timestamp < gameState.invulnerableUntil) {
    dino.style.filter = "drop-shadow(0 0 12px rgba(231, 111, 81, 0.65))";
  } else {
    dino.style.filter = "none";
  }

  updateHud();
  requestAnimationFrame(loop);
}

document.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    jump();
  }

  if (event.code === "ArrowDown") {
    event.preventDefault();
    if (gameState.y > 0) {
      gameState.velocityY = -10;
    } else {
      setDuck(true);
    }
  }
});

document.addEventListener("keyup", (event) => {
  if (event.code === "ArrowDown") {
    setDuck(false);
  }
});

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", resetGame);

resetGame();
