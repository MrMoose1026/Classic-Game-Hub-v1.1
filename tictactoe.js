//TIC-TAC-TOE
function loadTicTacToe() {
  hideAppTitle();
  setGameAreaContent(`
<h2>Tic-Tac-Toe</h2>

<h3 id="statusText">${getTicPlayerName(currentPlayer)}'s Turn</h3>
<div class="board">
<div class="cell" onclick="makeMove(0)"></div>
<div class="cell" onclick="makeMove(1)"></div>
<div class="cell" onclick="makeMove(2)"></div>

<div class="cell" onclick="makeMove(3)"></div>
<div class="cell" onclick="makeMove(4)"></div>
<div class="cell" onclick="makeMove(5)"></div>

<div class="cell" onclick="makeMove(6)"></div>
<div class="cell" onclick="makeMove(7)"></div>
<div class="cell" onclick="makeMove(8)"></div>
</div>

<button class="restart-btn" onclick="restartGame()">
Restart Game
</button>
`);

  initializeGame();
  updateTicScoreboard();
}
function initializeGame() {
  board = ["", "", "", "", "", "", "", "", ""];
  currentPlayer = "X";
  gameActive = true;
  winningCells = [];
}

function recordTicResult(result) {
  const mode = ticGameMode === "ai"
    ? "ai"
    : "local";

  ticScores[mode][result]++;

  profiles[currentProfile].ticScores = ticScores;
  saveProfiles();

  updateTicScoreboard();
}

const winningConditions = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
];

function getTicPlayerName(player) {
  if (ticGameMode === "ai") {
    return player === "X"
      ? getShortProfileName()
      : "AI";
  }

  return player === "X"
    ? getShortProfileName()
    : "Player 2";
};

function makeMove(index) {

  if (board[index] !== "" || !gameActive) {
    return;
  }

  if (
    ticGameMode === "ai" &&
    currentPlayer !== "X"
  ) {
    return;
  }

  board[index] = currentPlayer;
  playSound(clickSound);
  updateBoard();


  if (checkWinner()) {
    updateBoard();

    document.getElementById("statusText").textContent =
  `${getTicPlayerName(currentPlayer)} Wins!`;

    recordTicResult("win");
    playSound(winSound);

    gameActive = false;
    return;
  }

  if (!board.includes("")) {
    document.getElementById("statusText").textContent =
      "It's a Draw!";
    recordTicResult("draw");
    gameActive = false;
    return;
  }

  currentPlayer =
    currentPlayer === "X"
      ? "O"
      : "X";

  if (ticGameMode === "ai") {

    document.getElementById("statusText").textContent =
      "AI Thinking...";

    setTimeout(aiMove, 800);

  } else {

    document.getElementById("statusText").textContent =
      `${getTicPlayerName(currentPlayer)}'s Turn`
  }

}

function aiMove() {

  if (!gameActive) {
    return;
  }

  // 1. Try to win
  for (let condition of winningConditions) {

    const [a, b, c] = condition;

    let values = [
      board[a],
      board[b],
      board[c]
    ];

    if (
      values.filter(v => v === "O").length === 2 &&
      values.includes("")
    ) {

      let emptyIndex = condition[values.indexOf("")];

      board[emptyIndex] = "O";

      finishAITurn();
      return;
    }
  }

  // 2. Block player win
  for (let condition of winningConditions) {

    const [a, b, c] = condition;

    let values = [
      board[a],
      board[b],
      board[c]
    ];

    if (
      values.filter(v => v === "X").length === 2 &&
      values.includes("")
    ) {

      let emptyIndex = condition[values.indexOf("")];

      board[emptyIndex] = "O";
      playSound(clickSound);

      finishAITurn();
      return;
    }
  }

  // 3. Random move
  let emptySpots = [];

  board.forEach((cell, index) => {
    if (cell === "") {
      emptySpots.push(index);
    }
  });

  const randomIndex =
    emptySpots[Math.floor(Math.random() * emptySpots.length)];

  board[randomIndex] = "O";
  playSound(clickSound);

  finishAITurn();
}

function finishAITurn() {

  updateBoard();

  if (checkWinner()) {

    document.getElementById("statusText").textContent =
  `${getTicPlayerName(currentPlayer)} Wins!`;
    recordTicResult("loss");
    playSound(winSound);
    gameActive = false;
    return;
  }

  if (!board.includes("")) {

    document.getElementById("statusText").textContent =
      "It's a Draw!";
    recordTicResult("draw");
    gameActive = false;
    return;
  }

  currentPlayer = "X";

  document.getElementById("statusText").textContent =
   `${getTicPlayerName(currentPlayer)}'s Turn`
}

function checkWinner() {

  for (let condition of winningConditions) {

    const [a, b, c] = condition;

    if (
      board[a] &&
      board[a] === board[b] &&
      board[a] === board[c]
    ) {

      winningCells = [a, b, c];

      return true;
    }
  }

  winningCells = [];

  return false;
}
function restartGame() {
  initializeGame();
  updateBoard();

  document.getElementById("statusText").textContent =
    `${getTicPlayerName(currentPlayer)}'s Turn`
}

function updateBoard() {

  const cells = document.querySelectorAll(".cell");

  cells.forEach((cell, index) => {

    cell.textContent = board[index];

    cell.classList.remove("winner");

    if (winningCells.includes(index)) {
      cell.classList.add("winner");
    }
  });
}
