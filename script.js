const player = document.getElementById("player");
const gameButton = document.getElementById("game-button");
const statusLabel = document.querySelector(".status-label");
const scoreDisplay = document.getElementById("score");
const livesDisplay = document.getElementById("lives");
const dropsDisplay = document.getElementById("drops-remaining");
const gameMessage = document.getElementById("game-message");
const messageTitle = document.getElementById("message-title");
const messageText = document.getElementById("message-text");
const restartButton = document.getElementById("restart-button");
const resumeButton = document.getElementById("resume-button");
const resetButton = document.getElementById("reset-button");
const pauseButton = document.getElementById("pause-button");
const drops = document.querySelectorAll(".drop");
const hazards = document.querySelectorAll(".hazard");
const walls = document.querySelectorAll(".wall");
const directionButtons = document.querySelectorAll(".key[data-direction]");
const startingLives = 3;
const startingPlayerX = 22;
const startingPlayerY = 60;

let score = 0;
let lives = startingLives;
let dropsRemaining = drops.length;
let playerX = startingPlayerX;
let playerY = startingPlayerY;
let isGameRunning = false;
let isPaused = false;
let hazardMovementInterval = null;
let playerMovementInterval = null;

// Show the current score, lives, and drops left on the page.
function updateGameDisplay() {
  scoreDisplay.textContent = score.toLocaleString();
  livesDisplay.textContent = "■ ".repeat(lives).trim();
  livesDisplay.setAttribute("aria-label", `${lives} ${lives === 1 ? "life" : "lives"}`);
  dropsDisplay.textContent = dropsRemaining;
}

// Keep the on-screen controls in sync with the current game state.
function updateControlButtons() {
  directionButtons.forEach((button) => {
    button.disabled = !isGameRunning || isPaused;
  });
  pauseButton.disabled = !isGameRunning;
  pauseButton.textContent = isPaused ? "Resume" : "Pause";
  resumeButton.hidden = !isPaused;
}

// Start a new game and reset the player and counters.
function startGame() {
  clearInterval(hazardMovementInterval);
  stopPlayerMovement();
  score = 0;
  lives = startingLives;
  dropsRemaining = drops.length;
  playerX = startingPlayerX;
  playerY = startingPlayerY;
  isGameRunning = true;
  isPaused = false;

  drops.forEach((drop) => {
    drop.hidden = false;
  });

  hazards.forEach((hazard) => {
    hazard.style.left = "";
    hazard.style.top = "";
  });

  player.style.left = `${playerX}%`;
  player.style.top = `${playerY}%`;
  gameMessage.hidden = true;
  restartButton.hidden = false;
  gameButton.disabled = true;
  statusLabel.textContent = "GAME IN PROGRESS";
  hazardMovementInterval = setInterval(moveHazards, 500);
  updateControlButtons();
  updateGameDisplay();
}

// Stop the game and show why the round ended.
function endGame(won) {
  clearInterval(hazardMovementInterval);
  stopPlayerMovement();
  isGameRunning = false;
  isPaused = false;
  gameButton.disabled = false;
  statusLabel.textContent = "PLAY AGAIN?";
  messageTitle.textContent = won ? "You did It!" : "Game Over!";
  messageText.textContent = won
    ? "You collected enough safe water!"
    : "You ran out of lives!";
  restartButton.hidden = false;
  gameMessage.hidden = false;
  updateControlButtons();
}

// Show or hide the pause message and pause both keyboard and touchscreen play.
function setPaused(paused) {
  if (paused) stopPlayerMovement();

  isPaused = paused;
  statusLabel.textContent = isPaused ? "GAME PAUSED" : "GAME IN PROGRESS";

  if (isPaused) {
    messageTitle.textContent = "Paused";
    messageText.textContent = window.matchMedia("(max-width: 540px)").matches
      ? "Press SPACE or tap Resume to continue."
      : "Press SPACE to resume.";
    restartButton.hidden = true;
    gameMessage.hidden = false;
  } else {
    gameMessage.hidden = true;
  }

  updateControlButtons();
}

// Move the player one step in the selected direction.
function movePlayer(direction) {
  if (!isGameRunning || isPaused) return;

  const movement = 0.75;
  const directions = {
    up: [0, -1],
    down: [0, 1],
    left: [-1, 0],
    right: [1, 0],
  };
  const [moveX, moveY] = directions[direction];

  for (let step = 0; step < movement; step += 0.25) {
    const nextPlayerX = Math.max(2, Math.min(94, playerX + moveX * 0.25));
    const nextPlayerY = Math.max(2, Math.min(91, playerY + moveY * 0.25));

    player.style.left = `${nextPlayerX}%`;
    player.style.top = `${nextPlayerY}%`;

    if (overlapsWall(player, 0.5)) {
      player.style.left = `${playerX}%`;
      player.style.top = `${playerY}%`;
      break;
    }

    playerX = nextPlayerX;
    playerY = nextPlayerY;
  }

  checkForCollisions();
}

// Keep moving while a direction button is held down.
function startPlayerMovement(direction) {
  stopPlayerMovement();
  movePlayer(direction);
  playerMovementInterval = setInterval(() => {
    movePlayer(direction);
  }, 150);
}

// Stop repeated movement when the player releases the direction button.
function stopPlayerMovement() {
  clearInterval(playerMovementInterval);
  playerMovementInterval = null;
}

// Move every hazard by a random number of pixels once each second.
function moveHazards() {
  if (!isGameRunning || isPaused) return;

  const maze = document.querySelector(".maze-inner");

  hazards.forEach((hazard) => {
    const axis = Math.random() < 0.5 ? "x" : "y";
    const hazardBounds = hazard.getBoundingClientRect();
    const hazardX = hazardBounds.left + hazardBounds.width / 2;
    const hazardY = hazardBounds.top + hazardBounds.height / 2;
    const targets = [player, ...Array.from(drops).filter((drop) => !drop.hidden)];
    const target = targets.reduce((nearest, candidate) => {
      const bounds = candidate.getBoundingClientRect();
      const candidateX = bounds.left + bounds.width / 2;
      const candidateY = bounds.top + bounds.height / 2;
      const nearestBounds = nearest.getBoundingClientRect();
      const nearestX = nearestBounds.left + nearestBounds.width / 2;
      const nearestY = nearestBounds.top + nearestBounds.height / 2;
      const candidateDistance =
        (candidateX - hazardX) ** 2 + (candidateY - hazardY) ** 2;
      const nearestDistance = (nearestX - hazardX) ** 2 + (nearestY - hazardY) ** 2;

      return candidateDistance < nearestDistance ? candidate : nearest;
    });
    const targetBounds = target.getBoundingClientRect();
    const targetCoordinate =
      axis === "x"
        ? targetBounds.left + targetBounds.width / 2
        : targetBounds.top + targetBounds.height / 2;
    const hazardCoordinate = axis === "x" ? hazardX : hazardY;
    const targetDirection = Math.sign(targetCoordinate - hazardCoordinate) ||
      (Math.random() < 0.5 ? 1 : -1);
    const direction = Math.random() < 0.75 ? targetDirection : -targetDirection;
    const distance = Math.floor(Math.random() * 10) + 1;
    const change = direction * distance;
    const mazeSize = axis === "x" ? maze.clientWidth : maze.clientHeight;

    moveHazardAxis(hazard, change, axis, mazeSize);
  });

  checkForCollisions();
}

// Move a hazard one pixel at a time so it cannot pass through a wall.
function moveHazardAxis(hazard, change, axis, mazeSize) {
  const dimension = axis === "x" ? hazard.offsetWidth : hazard.offsetHeight;
  const stepDirection = Math.sign(change);
  const positionName = axis === "x" ? "left" : "top";
  const limit = mazeSize - dimension;

  for (let step = 0; step < Math.abs(change); step += 1) {
    const currentPosition = axis === "x" ? hazard.offsetLeft : hazard.offsetTop;
    const nextPosition = currentPosition + stepDirection;

    if (nextPosition < 0 || nextPosition > limit) return;

    hazard.style[positionName] = `${nextPosition}px`;

    if (overlapsWall(hazard)) {
      hazard.style[positionName] = `${currentPosition}px`;
      return;
    }
  }
}

// Check whether an element overlaps any maze wall.
function overlapsWall(element, inset = 0) {
  const elementBounds = element.getBoundingClientRect();
  const collisionBounds = {
    left: elementBounds.left + inset,
    right: elementBounds.right - inset,
    top: elementBounds.top + inset,
    bottom: elementBounds.bottom - inset,
  };

  return Array.from(walls).some((wall) => {
    const wallBounds = wall.getBoundingClientRect();
    return (
      collisionBounds.left < wallBounds.right &&
      collisionBounds.right > wallBounds.left &&
      collisionBounds.top < wallBounds.bottom &&
      collisionBounds.bottom > wallBounds.top
    );
  });
}

// Check whether the player is touching a drop or a hazard.
function checkForCollisions() {
  const playerBounds = player.getBoundingClientRect();

  drops.forEach((drop) => {
    if (drop.hidden) return;

    const dropBounds = drop.getBoundingClientRect();
    const touchedDrop =
      playerBounds.left < dropBounds.right &&
      playerBounds.right > dropBounds.left &&
      playerBounds.top < dropBounds.bottom &&
      playerBounds.bottom > dropBounds.top;

    if (touchedDrop) {
      drop.hidden = true;
      score += 100;
      dropsRemaining -= 1;
    }
  });

  if (dropsRemaining === 0) {
    updateGameDisplay();
    endGame(true);
    return;
  }

  const touchedHazard = Array.from(hazards).some((hazard) => {
    const hazardBounds = hazard.getBoundingClientRect();
    return (
      playerBounds.left < hazardBounds.right &&
      playerBounds.right > hazardBounds.left &&
      playerBounds.top < hazardBounds.bottom &&
      playerBounds.bottom > hazardBounds.top
    );
  });

  if (touchedHazard) {
    lives -= 1;
    playerX = startingPlayerX;
    playerY = startingPlayerY;
    player.style.left = `${playerX}%`;
    player.style.top = `${playerY}%`;
  }

  updateGameDisplay();

  if (lives === 0) {
    endGame(false);
  }
}

gameButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);
resetButton.addEventListener("click", startGame);
pauseButton.addEventListener("click", () => {
  if (isGameRunning) setPaused(!isPaused);
});
resumeButton.addEventListener("click", () => setPaused(false));
directionButtons.forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.setPointerCapture(event.pointerId);
    startPlayerMovement(button.dataset.direction);
  });
  button.addEventListener("pointerup", stopPlayerMovement);
  button.addEventListener("pointercancel", stopPlayerMovement);
  button.addEventListener("lostpointercapture", stopPlayerMovement);
  button.addEventListener("click", (event) => {
    if (event.detail === 0) movePlayer(button.dataset.direction);
  });
});
window.addEventListener("blur", stopPlayerMovement);

// Support keyboard movement and pause controls.
document.addEventListener("keydown", (event) => {
  if (event.code === "Space" && isGameRunning) {
    event.preventDefault();
    setPaused(!isPaused);
    return;
  }

  if (!isGameRunning || isPaused) return;

  const directions = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
  };
  const direction = directions[event.key];

  if (!direction) return;

  event.preventDefault();
  movePlayer(direction);
});

updateGameDisplay();
updateControlButtons();
