//CONNECT FOUR
function loadConnectFour() {
  hideAppTitle();
  setGameAreaContent(`
<h2>Connect Four</h2>

<h3 id="connectStatus">
${getConnectPlayerName(connectCurrentPlayer)}'s Turn
</h3>
${connectGameMode === "ai"
      ? `<div class="difficulty-label">Difficulty: ${capitalize(connectDifficulty)}</div>`
      : ""}
<div id="connectBoard" class="connect-board"></div>

<button class="restart-btn"
onclick="restartConnectFour()">

Restart Game
</button>
`);

  initializeConnectFour();
  updateConnectScoreboard();
}

function initializeConnectFour() {

  connectBoard = [];

  for (let row = 0; row < 6; row++) {

    let newRow = [];

    for (let col = 0; col < 7; col++) {
      newRow.push("");
    }

    connectBoard.push(newRow);
  }

  connectCurrentPlayer = "R";
  connectGameActive = true;

  renderConnectBoard();
}

function renderConnectBoard(animatedRow = -1, animatedCol = -1) {

  const boardElement =
    document.getElementById("connectBoard");

  boardElement.innerHTML = "";

  for (let row = 0; row < 6; row++) {

    for (let col = 0; col < 7; col++) {

      const cell = document.createElement("div");

      cell.classList.add("connect-cell");

      cell.onclick = () => dropPiece(col);

      if (connectBoard[row][col] === "R") {
        cell.classList.add("red");
      }

      if (connectBoard[row][col] === "Y") {
        cell.classList.add("yellow");
      }

      // Animate ONLY newest piece
      if (
        row === animatedRow &&
        col === animatedCol
      ) {
        cell.classList.add("new-piece");
      }

      boardElement.appendChild(cell);
    }
  }
}

function recordConnectResult(result) {
  const mode = connectGameMode === "ai"
    ? "ai"
    : "local";

  connectScores[mode][result]++;

  profiles[currentProfile].connectScores = connectScores;
  saveProfiles();

  updateConnectScoreboard();
}

function getConnectPlayerName(player) {
  if (connectGameMode === "ai") {
    return player === "R"
      ? getShortProfileName()
      : "AI";
  }

  return player === "R"
    ? getShortProfileName()
    : "Player 2";
}

function dropPiece(col) {

  if (!connectGameActive) {
    return;
  }

  // Prevent player from moving during AI turn
  if (
    connectGameMode === "ai" &&
    connectCurrentPlayer === connectAIPlayer
  ) {
    return;
  }

  for (let row = 5; row >= 0; row--) {

    if (connectBoard[row][col] === "") {

      connectBoard[row][col] =
        connectCurrentPlayer;
      playSound(dropSound);

      renderConnectBoard(row, col);

      if (checkConnectWinner(row, col)) {

        document.getElementById("connectStatus")
          .textContent =
          `${getConnectPlayerName(connectCurrentPlayer)} Wins!`;
        recordConnectResult("win");
        playSound(winSound);
        connectGameActive = false;

        return;
      }

      if (checkConnectDraw()) {

        document.getElementById("connectStatus")
          .textContent =
          "It's a Draw!";
        recordConnectResult("draw");
        connectGameActive = false;

        return;
      }

      connectCurrentPlayer =
        connectCurrentPlayer === "R"
          ? "Y"
          : "R";

      if (
        connectGameMode === "ai" &&
        connectCurrentPlayer === "Y"
      ) {

        document.getElementById("connectStatus")
          .textContent =
          "AI Thinking...";

        setTimeout(connectAIMove, 800);

      } else {

        document.getElementById("connectStatus")
          .textContent =
          connectCurrentPlayer === "R"
            ? `${getConnectPlayerName(connectCurrentPlayer)}'s Turn`
            : `${getConnectPlayerName(connectCurrentPlayer)}'s Turn`;
      }

      return;
    }
  }
}

function connectAIMove() {

  if (!connectGameActive) {
    return;
  }

  let col;

  if (connectDifficulty === "easy") {
    col = chooseRandomConnectMove();

  } else if (connectDifficulty === "medium") {
    col = chooseTacticalConnectMove();

  } else {
    col = chooseHardConnectMove();
  }

  const row = getAvailableRow(col);

  connectBoard[row][col] = "Y";
  playSound(dropSound);

  finishConnectAITurn(row, col);
}
function getAvailableRow(col) {

  for (let row = 5; row >= 0; row--) {

    if (connectBoard[row][col] === "") {
      return row;
    }
  }

  return -1;
}

function chooseRandomConnectMove() {
  let validColumns = [];

  for (let col = 0; col < 7; col++) {
    if (connectBoard[0][col] === "") {
      validColumns.push(col);
    }
  }

  return validColumns[
    Math.floor(Math.random() * validColumns.length)
  ];
}

function chooseTacticalConnectMove() {

  // Try to win
  for (let col = 0; col < 7; col++) {
    let row = getAvailableRow(col);

    if (row === -1) continue;

    connectBoard[row][col] = "Y";

    if (checkConnectWinner(row, col)) {
      connectBoard[row][col] = "";
      return col;
    }

    connectBoard[row][col] = "";
  }

  // Block player
  for (let col = 0; col < 7; col++) {
    let row = getAvailableRow(col);

    if (row === -1) continue;

    connectBoard[row][col] = "R";

    if (checkConnectWinner(row, col)) {
      connectBoard[row][col] = "";
      return col;
    }

    connectBoard[row][col] = "";
  }

  return chooseRandomConnectMove();
}

function chooseHardConnectMove() {

  let bestScore = -Infinity;
  let bestColumns = [];

  for (let col = 0; col < 7; col++) {
    let row = getAvailableRow(col);

    if (row === -1) continue;

    connectBoard[row][col] = "Y";

    let score = scoreConnectBoard();

    connectBoard[row][col] = "";

    if (score > bestScore) {
      bestScore = score;
      bestColumns = [col];
    } else if (score === bestScore) {
      bestColumns.push(col);
    }
  }

  return bestColumns[
    Math.floor(Math.random() * bestColumns.length)
  ];
}

function scoreConnectBoard() {
  let score = 0;

  // Prefer center column
  for (let row = 0; row < 6; row++) {
    if (connectBoard[row][3] === "Y") {
      score += 3;
    }
  }

  // Score every group of 4
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 7; col++) {

      score += scoreConnectWindow([
        getConnectCell(row, col),
        getConnectCell(row, col + 1),
        getConnectCell(row, col + 2),
        getConnectCell(row, col + 3)
      ]);

      score += scoreConnectWindow([
        getConnectCell(row, col),
        getConnectCell(row + 1, col),
        getConnectCell(row + 2, col),
        getConnectCell(row + 3, col)
      ]);

      score += scoreConnectWindow([
        getConnectCell(row, col),
        getConnectCell(row + 1, col + 1),
        getConnectCell(row + 2, col + 2),
        getConnectCell(row + 3, col + 3)
      ]);

      score += scoreConnectWindow([
        getConnectCell(row, col),
        getConnectCell(row + 1, col - 1),
        getConnectCell(row + 2, col - 2),
        getConnectCell(row + 3, col - 3)
      ]);
    }
  }

  return score;
}

function getConnectCell(row, col) {
  if (
    row < 0 ||
    row >= 6 ||
    col < 0 ||
    col >= 7
  ) {
    return null;
  }

  return connectBoard[row][col];
}

function scoreConnectWindow(window) {
  if (window.includes(null)) {
    return 0;
  }

  const aiPieces =
    window.filter(cell => cell === "Y").length;

  const playerPieces =
    window.filter(cell => cell === "R").length;

  const empty =
    window.filter(cell => cell === "").length;

  let score = 0;

  if (aiPieces === 4) score += 100;
  if (aiPieces === 3 && empty === 1) score += 8;
  if (aiPieces === 2 && empty === 2) score += 3;

  if (playerPieces === 3 && empty === 1) score -= 10;
  if (playerPieces === 2 && empty === 2) score -= 2;

  return score;
}

function finishConnectAITurn(row, col) {

  renderConnectBoard(row, col);

  if (checkConnectWinner(row, col)) {

    document.getElementById("connectStatus")
      .textContent =
        `${getConnectPlayerName(currentPlayer)} Wins!`;
    recordConnectResult("loss");
    playSound(winSound);
    connectGameActive = false;

    return;
  }

  if (checkConnectDraw()) {

    document.getElementById("connectStatus")
      .textContent =
      "It's a Draw!";
    recordConnectResult("draw");
    connectGameActive = false;

    return;
  }

  connectCurrentPlayer = "R";

  document.getElementById("connectStatus")
    .textContent =
    `${getConnectPlayerName(connectCurrentPlayer)}'s Turn`;
}

function checkConnectWinner(row, col) {

  const player = connectBoard[row][col];

  // Directions:
  // horizontal
  // vertical
  // diagonal /
  // diagonal \

  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1]
  ];

  for (let [rowDir, colDir] of directions) {

    let count = 1;

    // Check forward
    let r = row + rowDir;
    let c = col + colDir;

    while (
      r >= 0 &&
      r < 6 &&
      c >= 0 &&
      c < 7 &&
      connectBoard[r][c] === player
    ) {

      count++;

      r += rowDir;
      c += colDir;
    }

    // Check backward
    r = row - rowDir;
    c = col - colDir;

    while (
      r >= 0 &&
      r < 6 &&
      c >= 0 &&
      c < 7 &&
      connectBoard[r][c] === player
    ) {

      count++;

      r -= rowDir;
      c -= colDir;
    }

    if (count >= 4) {
      return true;
    }
  }

  return false;
}

function checkConnectDraw() {

  for (let row = 0; row < 6; row++) {

    for (let col = 0; col < 7; col++) {

      if (connectBoard[row][col] === "") {
        return false;
      }
    }
  }

  return true;
}

function restartConnectFour() {
  initializeConnectFour();
}
