const stage = document.getElementById("stage");
const dino = document.getElementById("dino");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const modeEl = document.getElementById("mode");
const messageEl = document.getElementById("message");
const portalEl = document.getElementById("specialPortal");
const assistantEl = document.getElementById("assistant");
const assistantTextEl = document.getElementById("assistantText");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");

const gameState = {
  running: false,
  score: 0,
  lives: 3,
  mode: "normal",
  gravity: 0.88,
  speed: 6,
  y: 0,
  velocityY: 0,
  jumpForce: 15.5,
  ducking: false,
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
  nextAssistantMilestone: 50,
  assistantHideTimer: 0,
};

const FLOOR = 72;
const NORMAL_MODE_NAME = "一般地表";
const SPECIAL_MODE_NAME = "特殊關卡";
const ASSISTANT_MILESTONE_STEP = 50;

const assistantLines = {
  start: ["好，開跑！我幫你看分數。", "節奏穩住，第一段先暖身。"],
  hurt: ["哎呀，撞到了！先別慌，還能追回來。", "這下有點痛，但你剛剛差一點就閃過了。", "深呼吸，下一個障礙我們一起抓節奏。"],
  praise: ["漂亮！{score} 分了，手感正在升溫。", "{score} 分，這波很穩。", "好會跑，{score} 分不是運氣。", "節奏真乾淨，已經 {score} 分！"],
  crystal: ["晶體收下！這個加分很香。", "抓得準，藍色晶體到手。"],
  portal: ["傳送門來了，準備進低重力區！", "前方特殊關卡，跳躍會變飄。"],
  special: ["特殊關卡啟動，我會幫你盯流星。", "低重力模式，別被漂亮星空騙了。"],
  escape: ["成功脫出！這段操作很帥。", "回到地表，速度會更刺激。"],
  gameOver: ["辛苦了，這場跑到 {score} 分。再來一次會更順。"],
};

function randomLine(lines) {
  return lines[Math.floor(Math.random() * lines.length)];
}

function showAssistant(lines, options = {}) {
  const line = Array.isArray(lines) ? randomLine(lines) : lines;
  assistantTextEl.textContent = line.replace("{score}", Math.floor(gameState.score));
  assistantEl.classList.add("visible");
  assistantEl.classList.toggle("hurt", options.mood === "hurt");

  window.clearTimeout(gameState.assistantHideTimer);
  gameState.assistantHideTimer = window.setTimeout(() => {
    assistantEl.classList.remove("visible", "hurt");
  }, options.duration ?? 2600);
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

function updateHud() {
  scoreEl.textContent = Math.floor(gameState.score);
  livesEl.textContent = gameState.lives;
  modeEl.textContent = gameState.mode === "special" ? SPECIAL_MODE_NAME : NORMAL_MODE_NAME;
}

function clearActors() {
  [...gameState.obstacles, ...gameState.pickups].forEach((actor) => actor.remove());
  gameState.obstacles = [];
  gameState.pickups = [];
}

function resetGame() {
  gameState.running = false;
  gameState.score = 0;
  gameState.lives = 3;
  gameState.mode = "normal";
  gameState.gravity = 0.88;
  gameState.speed = 6;
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
  gameState.nextAssistantMilestone = ASSISTANT_MILESTONE_STEP;
  window.clearTimeout(gameState.assistantHideTimer);
  assistantEl.classList.remove("visible", "hurt");
  clearActors();
  portalEl.classList.add("hidden");
  portalEl.style.left = "";
  portalEl.style.right = "88px";
  stage.classList.remove("special");
  dino.classList.remove("duck");
  dino.style.bottom = `${FLOOR}px`;
  dino.style.transform = "translateY(0)";
  dino.style.opacity = "1";
  dino.style.filter = "none";
  updateHud();
  showMessage("小恐龍特別行動", [
    "按空白鍵開始，空白鍵跳躍，方向下鍵快速落地或蹲下。",
    "撐過一般地表後，會開啟低重力流星特殊關卡。",
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
  showAssistant(assistantLines.start);
  requestAnimationFrame(loop);
}

function jump() {
  if (!gameState.running) {
    startGame();
    return;
  }

  if (gameState.y === 0) {
    gameState.velocityY = gameState.mode === "special" ? 12.8 : gameState.jumpForce;
  }
}

function setDuck(enabled) {
  gameState.ducking = enabled && gameState.y === 0;
  dino.classList.toggle("duck", gameState.ducking);
}

function spawnObstacle() {
  const obstacle = document.createElement("div");
  obstacle.classList.add("obstacle");

  if (gameState.mode === "special") {
    obstacle.classList.add("meteor");
    obstacle.dataset.kind = "meteor";
    obstacle.style.bottom = `${FLOOR + 70 + Math.random() * 150}px`;
  } else if (Math.random() > 0.7) {
    obstacle.classList.add("bird");
    obstacle.dataset.kind = "bird";
    obstacle.style.bottom = `${FLOOR + 20 + Math.random() * 52}px`;
  } else {
    obstacle.classList.add("cactus");
    obstacle.dataset.kind = "cactus";
    obstacle.style.bottom = `${FLOOR}px`;
  }

  obstacle.style.left = `${stage.clientWidth + 10}px`;
  stage.appendChild(obstacle);
  gameState.obstacles.push(obstacle);
}

function spawnPickup() {
  if (gameState.mode !== "special") {
    return;
  }

  const crystal = document.createElement("div");
  crystal.classList.add("pickup", "crystal");
  crystal.style.left = `${stage.clientWidth + 10}px`;
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

function enterSpecialMode() {
  gameState.mode = "special";
  gameState.gravity = 0.45;
  gameState.speed = 7.8;
  gameState.spawnTimer = 0;
  gameState.pickupTimer = 0;
  gameState.specialEndScore = gameState.score + 220;
  gameState.portalTriggered = true;
  gameState.portalReady = false;
  portalEl.classList.add("hidden");
  stage.classList.add("special");
  showAssistant(assistantLines.special, { duration: 3200 });
  showMessage("特殊關卡啟動", [
    "進入低重力流星區，跳躍更飄，但流星會從高處高速掠過。",
    "收集藍色能量晶體可額外加分，撐到出口就能回到地表。",
  ]);
  window.setTimeout(() => {
    if (gameState.running && gameState.mode === "special") {
      hideMessage();
    }
  }, 1800);
}

function leaveSpecialMode() {
  gameState.mode = "normal";
  gameState.gravity = 0.88;
  gameState.speed = 8.2;
  gameState.spawnTimer = 0;
  gameState.pickupTimer = 0;
  stage.classList.remove("special");
  clearActors();
  showAssistant(assistantLines.escape, { duration: 3200 });
  showMessage("成功脫出", [
    "你穿越了特殊關卡，地表模式重新開放。",
    "接下來速度會更快，看看你能撐多久。",
  ]);
  window.setTimeout(() => {
    if (gameState.running && gameState.mode === "normal") {
      hideMessage();
    }
  }, 1600);
}

function takeHit(now) {
  if (now < gameState.invulnerableUntil) {
    return;
  }

  gameState.lives -= 1;
  gameState.invulnerableUntil = now + 1200;
  showAssistant(assistantLines.hurt, { mood: "hurt", duration: 3000 });
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
    showAssistant(assistantLines.gameOver, { mood: "hurt", duration: 5200 });
    showMessage("任務失敗", [
      `最終分數：${Math.floor(gameState.score)}`,
      "按空白鍵或點擊重新開始，再挑戰一次。",
    ]);
  }
}

function moveActors(delta, now) {
  const dinoBounds = getBounds(dino);

  gameState.obstacles = gameState.obstacles.filter((obstacle) => {
    const left = parseFloat(obstacle.style.left) - gameState.speed * delta * 0.06;
    obstacle.style.left = `${left}px`;

    if (left < -80) {
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
    const left = parseFloat(pickup.style.left) - (gameState.speed - 1.2) * delta * 0.06;
    pickup.style.left = `${left}px`;

    if (left < -60) {
      pickup.remove();
      return false;
    }

    if (intersects(dinoBounds, getBounds(pickup))) {
      gameState.score += 25;
      showAssistant(assistantLines.crystal);
      pickup.remove();
      return false;
    }

    return true;
  });
}

function updateDino(delta) {
  gameState.velocityY -= gameState.gravity * delta * 0.06;
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
  gameState.speed += delta * 0.00018;
  gameState.spawnTimer += delta;
  gameState.pickupTimer += delta;

  updateDino(delta);
  moveActors(delta, timestamp);

  const spawnGap = gameState.mode === "special" ? 920 : 1150 - Math.min(gameState.score, 500) * 0.6;
  if (gameState.spawnTimer >= spawnGap) {
    spawnObstacle();
    gameState.spawnTimer = 0;
  }

  if (gameState.mode === "special" && gameState.pickupTimer >= 1500) {
    spawnPickup();
    gameState.pickupTimer = 0;
  }

  if (!gameState.portalTriggered && !gameState.portalReady && gameState.score >= 120) {
    gameState.portalReady = true;
    gameState.portalX = stage.clientWidth + 20;
    portalEl.classList.remove("hidden");
    portalEl.style.right = "auto";
    showAssistant(assistantLines.portal, { duration: 3200 });
  }

  if (gameState.portalReady && !gameState.portalTriggered) {
    gameState.portalX -= (gameState.speed - 1.5) * delta * 0.06;
    portalEl.style.left = `${gameState.portalX}px`;
    const portalBounds = getBounds(portalEl);
    const dinoBounds = getBounds(dino);
    if (intersects(dinoBounds, portalBounds)) {
      enterSpecialMode();
    } else if (gameState.portalX < -120) {
      gameState.portalReady = false;
      portalEl.classList.add("hidden");
    }
  }

  if (gameState.mode === "special" && gameState.score >= gameState.specialEndScore) {
    leaveSpecialMode();
  }

  if (timestamp < gameState.invulnerableUntil) {
    dino.style.filter = "drop-shadow(0 0 12px rgba(231, 111, 81, 0.65))";
  } else {
    dino.style.filter = "none";
  }

  if (gameState.score >= gameState.nextAssistantMilestone) {
    showAssistant(assistantLines.praise, { duration: 2800 });
    gameState.nextAssistantMilestone += ASSISTANT_MILESTONE_STEP;
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
