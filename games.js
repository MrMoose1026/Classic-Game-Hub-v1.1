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

    ticScores.player++;
    updateTicScoreboard();
    playSound(winSound);

    gameActive = false;
    return;
  }

  if (!board.includes("")) {
    document.getElementById("statusText").textContent =
      "It's a Draw!";
    ticScores.draws++;
    updateTicScoreboard();
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
    ticScores.ai++;
    updateTicScoreboard();
    playSound(winSound);
    gameActive = false;
    return;
  }

  if (!board.includes("")) {

    document.getElementById("statusText").textContent =
      "It's a Draw!";
    ticScores.draws++;
    updateTicScoreboard();
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
        connectScores.player++;
        updateConnectScoreboard();
        playSound(winSound);
        connectGameActive = false;

        return;
      }

      if (checkConnectDraw()) {

        document.getElementById("connectStatus")
          .textContent =
          "It's a Draw!";
        connectScores.draws++;
        updateConnectScoreboard();
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
    connectScores.ai++;
    updateConnectScoreboard();
    playSound(winSound);
    connectGameActive = false;

    return;
  }

  if (checkConnectDraw()) {

    document.getElementById("connectStatus")
      .textContent =
      "It's a Draw!";
    connectScores.draws++;
    updateConnectScoreboard();
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

//CHECKERS
function loadCheckers() {
  hideAppTitle();
  setGameAreaContent(`
 <h2>Checkers</h2>

 <h3 id="checkersStatus">
 ${getCheckersPlayerName(checkersCurrentPlayer)}'s Turn
 </h3>
${checkersGameMode === "ai"
      ? `<div class="difficulty-label">Difficulty: ${capitalize(checkersDifficulty)}</div>`
      : ""}
 <div id="checkersBoard" class="checkers-board"></div>

 <button class="restart-btn" onclick="restartCheckers()">
 Restart Game
 </button>
 `);

  initializeCheckers();
  updateCheckersScoreboard();
}
function setCheckersDifficulty(difficulty) {
  checkersDifficulty = difficulty;

  localStorage.setItem(
    "checkersDifficulty",
    checkersDifficulty
  );

  restartCheckers();
}

function initializeCheckers() {
  checkersBoard = [];
  highlightedMoves = [];
  for (let row = 0; row < 8; row++) {
    let newRow = [];

    for (let col = 0; col < 8; col++) {
      newRow.push(null);
    }

    checkersBoard.push(newRow);
  }

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        checkersBoard[row][col] = {
          color: "black",
          king: false
        };
      }
    }
  }

  for (let row = 5; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) {
        checkersBoard[row][col] = {
          color: "red",
          king: false
        };
      }
    }
  }

  checkersCurrentPlayer = "red";
  selectedChecker = null;
  checkersGameActive = true;

  renderCheckersBoard();
}

function getCheckersPlayerName(player) {
  if (checkersGameMode === "ai") {
    return player === "red"
      ? getShortProfileName()
      : "AI";
  }

  return player === "red"
    ? getShortProfileName()
    : "Player 2";
}

function renderCheckersBoard() {
  const boardElement =
    document.getElementById("checkersBoard");

  boardElement.innerHTML = "";

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square = document.createElement("div");
      const isHighlighted =
        highlightedMoves.some(move =>
          move.toRow === row &&
          move.toCol === col
        );

      if (isHighlighted) {
        square.classList.add("highlighted-move");
      }

      square.classList.add("checkers-square");

      if ((row + col) % 2 === 0) {
        square.classList.add("light-square");
      } else {
        square.classList.add("dark-square");
      }

      square.onclick = () => handleCheckerClick(row, col);

      const piece = checkersBoard[row][col];

      if (piece) {
        const pieceElement = document.createElement("div");

        pieceElement.classList.add("checker-piece");
        pieceElement.classList.add(piece.color);
        if (piece.king) {
          pieceElement.textContent = "K";
          pieceElement.classList.add("king-piece");
        }
        if (
          lastCheckerMove &&
          lastCheckerMove.toRow === row &&
          lastCheckerMove.toCol === col
        ) {
          const rowMove =
            lastCheckerMove.fromRow - lastCheckerMove.toRow;

          const colMove =
            lastCheckerMove.fromCol - lastCheckerMove.toCol;

          pieceElement.style.setProperty("--move-y", `${rowMove * 42}px`);
          pieceElement.style.setProperty("--move-x", `${colMove * 42}px`);

          pieceElement.classList.add("slide-piece");
          pieceElement.addEventListener("animationend", () => {
            lastCheckerMove = null;
          });
        }
        if (
          selectedChecker &&
          selectedChecker.row === row &&
          selectedChecker.col === col
        ) {
          pieceElement.classList.add("selected-piece");
        }

        square.appendChild(pieceElement);
      }

      boardElement.appendChild(square);
    }
  }
}

function handleCheckerClick(row, col) {

  if (!checkersGameActive) {
    return;
  }

  const piece = checkersBoard[row][col];

  if (
    piece &&
    piece.color === checkersCurrentPlayer
  ) {

    selectedChecker = {
      row,
      col
    };

    highlightedMoves = getLegalMoves(checkersCurrentPlayer)
      .filter(move =>
        move.fromRow === row &&
        move.fromCol === col
      );

    renderCheckersBoard();
    return;
  }

  if (selectedChecker && !piece) {
    moveChecker(row, col);
  }
}

function moveChecker(targetRow, targetCol) {

  const startRow = selectedChecker.row;
  const startCol = selectedChecker.col;
  const piece = checkersBoard[startRow][startCol];

  const rowDiff = targetRow - startRow;
  const colDiff = targetCol - startCol;

  const directions = piece.king
    ? [-1, 1]
    : [piece.color === "red" ? -1 : 1];

  for (let direction of directions) {

    if (
      rowDiff === direction &&
      Math.abs(colDiff) === 1 &&
      !playerMustCapture(piece.color)
    ) {

      lastCheckerMove = {
        fromRow: startRow,
        fromCol: startCol,
        toRow: targetRow,
        toCol: targetCol
      };
      checkersBoard[targetRow][targetCol] = piece;
      checkersBoard[startRow][startCol] = null;

      crownCheckerIfNeeded(targetRow, targetCol);

      playSound(tapSound);

      if (checkCheckersWinner()) {
        renderCheckersBoard();
        return;
      }

      finishCheckerTurn();
      return;
    }

    if (
      rowDiff === direction * 2 &&
      Math.abs(colDiff) === 2
    ) {

      const jumpedRow = startRow + direction;
      const jumpedCol = startCol + colDiff / 2;
      const jumpedPiece =
        checkersBoard[jumpedRow][jumpedCol];

      if (
        jumpedPiece &&
        jumpedPiece.color !== piece.color
      ) {

        lastCheckerMove = {
          fromRow: startRow,
          fromCol: startCol,
          toRow: targetRow,
          toCol: targetCol
        };
        checkersBoard[targetRow][targetCol] = piece;
        checkersBoard[startRow][startCol] = null;
        checkersBoard[jumpedRow][jumpedCol] = null;

        lastCheckerMove = {
          fromRow: startRow,
          fromCol: startCol,
          toRow: targetRow,
          toCol: targetCol
        };

        playCaptureSound();

        crownCheckerIfNeeded(targetRow, targetCol);

        if (checkCheckersWinner()) {
          renderCheckersBoard();
          return;
        }

        if (canCaptureAgain(targetRow, targetCol)) {

          selectedChecker = {
            row: targetRow,
            col: targetCol
          };

          renderCheckersBoard();

          if (
            checkersGameMode === "ai" &&
            checkersCurrentPlayer === checkersAIPlayer
          ) {
            setTimeout(checkersAIMove, 600);
          }

        } else {

          finishCheckerTurn();
        }
        return;
      }
    }
  }
}

function crownCheckerIfNeeded(row, col) {
  const piece = checkersBoard[row][col];

  if (!piece) {
    return;
  }

  if (piece.color === "red" && row === 0) {
    piece.king = true;
  }

  if (piece.color === "black" && row === 7) {
    piece.king = true;
  }
}

function canCaptureAgain(row, col) {

  const piece = checkersBoard[row][col];

  if (!piece) {
    return false;
  }

  const directions = piece.king
    ? [-1, 1]
    : [piece.color === "red" ? -1 : 1];

  for (let direction of directions) {

    for (let side of [-1, 1]) {

      const jumpedRow = row + direction;
      const jumpedCol = col + side;

      const targetRow = row + direction * 2;
      const targetCol = col + side * 2;

      if (
        targetRow >= 0 &&
        targetRow < 8 &&
        targetCol >= 0 &&
        targetCol < 8
      ) {

        const jumpedPiece =
          checkersBoard[jumpedRow][jumpedCol];

        if (
          jumpedPiece &&
          jumpedPiece.color !== piece.color &&
          checkersBoard[targetRow][targetCol] === null
        ) {

          return true;
        }
      }
    }
  }

  return false;
}

function playerMustCapture(color) {

  for (let row = 0; row < 8; row++) {

    for (let col = 0; col < 8; col++) {

      const piece = checkersBoard[row][col];

      if (
        piece &&
        piece.color === color
      ) {

        if (canCaptureAgain(row, col)) {
          return true;
        }
      }
    }
  }

  return false;
}

function finishCheckerTurn() {

  selectedChecker = null;
  highlightedMoves = [];

  checkersCurrentPlayer =
    checkersCurrentPlayer === "red"
      ? "black"
      : "red";

  if (!playerHasLegalMove(checkersCurrentPlayer)) {
    const winner =
      checkersCurrentPlayer === "red"
        ? "Black"
        : "Red";

    document.getElementById("checkersStatus").textContent =
      `${getCheckersPlayerName(checkersCurrentPlayer)} Wins!`;
    if (winner === "Red") {
      checkersScores.player++;
    } else {
      checkersScores.ai++;
    }

    updateCheckersScoreboard();
    playSound(winSound);
    checkersGameActive = false;
    renderCheckersBoard();
    return;
  }

  document.getElementById("checkersStatus").textContent =
    checkersCurrentPlayer === "red"
      ? `${getCheckersPlayerName(checkersCurrentPlayer)}'s Turn`
      : `${getCheckersPlayerName(checkersCurrentPlayer)}'s Turn`;

  renderCheckersBoard();

  if (
    checkersGameMode === "ai" &&
    checkersCurrentPlayer === checkersAIPlayer &&
    checkersGameActive
  ) {
    document.getElementById("checkersStatus").textContent =
      "AI Thinking...";

    setTimeout(checkersAIMove, 900);
  }
}

function checkersAIMove() {

  if (!checkersGameActive) {
    return;
  }

  const moves = getLegalMoves(checkersAIPlayer);

  if (moves.length === 0) {

    document.getElementById("checkersStatus")
      .textContent = `${getCheckersPlayerName(checkersCurrentPlayer)} Wins!`;

    playSound(winSound);

    checkersGameActive = false;

    return;
  }

  let move;

  if (checkersDifficulty === "easy") {

    move = chooseRandomCheckersMove(moves);

  } else if (checkersDifficulty === "medium") {

    move = chooseTacticalCheckersMove(moves);

  } else {

    move = chooseMinimaxCheckersMove(moves);
  }

  selectedChecker = {
    row: move.fromRow,
    col: move.fromCol
  };

  moveChecker(move.toRow, move.toCol);
}

function chooseRandomCheckersMove(moves) {
  return moves[
    Math.floor(Math.random() * moves.length)
  ];
}

function chooseTacticalCheckersMove(moves) {
  let captureMoves =
    moves.filter(move => move.capture);

  let possibleMoves =
    captureMoves.length > 0
      ? captureMoves
      : moves;

  let multiJumpMoves =
    possibleMoves.filter(move =>
      moveLeadsToAnotherCapture(move)
    );

  if (multiJumpMoves.length > 0) {
    possibleMoves = multiJumpMoves;
  }

  let kingMoves =
    possibleMoves.filter(move => {
      const piece =
        checkersBoard[move.fromRow][move.fromCol];

      if (!piece || piece.king) {
        return false;
      }

      return (
        piece.color === "black" &&
        move.toRow === 7
      ) || (
          piece.color === "red" &&
          move.toRow === 0
        );
    });

  if (kingMoves.length > 0) {
    possibleMoves = kingMoves;
  }

  let safeMoves =
    possibleMoves.filter(move =>
      !moveIsDangerous(move, checkersAIPlayer)
    );

  if (safeMoves.length > 0) {
    possibleMoves = safeMoves;
  }

  return chooseRandomCheckersMove(possibleMoves);
}

function chooseMinimaxCheckersMove(moves) {
  let bestScore = -Infinity;
  let bestMoves = [];

  for (let move of moves) {
    const undoData = simulateMove(move);

    const score = minimax(3, false);

    undoMove(move, undoData);

    if (score > bestScore) {
      bestScore = score;
      bestMoves = [move];
    } else if (score === bestScore) {
      bestMoves.push(move);
    }
  }

  return chooseRandomCheckersMove(bestMoves);
}

function moveIsDangerous(move, color) {

  const piece =
    checkersBoard[move.fromRow][move.fromCol];

  if (!piece) {
    return true;
  }

  const opponent =
    color === "red" ? "black" : "red";

  // Temporarily make the move
  checkersBoard[move.toRow][move.toCol] = piece;
  checkersBoard[move.fromRow][move.fromCol] = null;

  const opponentMoves =
    getLegalMoves(opponent);

  // Undo the move
  checkersBoard[move.fromRow][move.fromCol] = piece;
  checkersBoard[move.toRow][move.toCol] = null;

  return opponentMoves.some(opponentMove =>
    opponentMove.capture &&
    opponentMove.toRow === move.fromRow &&
    opponentMove.toCol === move.fromCol
  );
}

function moveLeadsToAnotherCapture(move) {

  const piece =
    checkersBoard[move.fromRow][move.fromCol];

  if (!piece || !move.capture) {
    return false;
  }

  checkersBoard[move.toRow][move.toCol] = piece;
  checkersBoard[move.fromRow][move.fromCol] = null;

  const result =
    canCaptureAgain(move.toRow, move.toCol);

  checkersBoard[move.fromRow][move.fromCol] = piece;
  checkersBoard[move.toRow][move.toCol] = null;

  return result;
}

function checkCheckersWinner() {

  let redPieces = 0;
  let blackPieces = 0;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {

      const piece = checkersBoard[row][col];

      if (piece) {
        if (piece.color === "red") {
          redPieces++;
        } else {
          blackPieces++;
        }
      }
    }
  }

  if (redPieces === 0) {
    document.getElementById("checkersStatus")
      .textContent = `${getCheckersPlayerName(checkersCurrentPlayer)} Wins!`;

    playSound(winSound);
    checkersScores.ai++;
    updateCheckersScoreboard();
    checkersGameActive = false;
    return true;
  }

  if (blackPieces === 0) {
    document.getElementById("checkersStatus")
      .textContent = `${getCheckersPlayerName(checkersCurrentPlayer)} Wins!`;

    playSound(winSound);
    checkersScores.player++;
    updateCheckersScoreboard();
    checkersGameActive = false;
    return true;
  }

  return false;
}

function playerHasLegalMove(color) {

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {

      const piece = checkersBoard[row][col];

      if (!piece || piece.color !== color) {
        continue;
      }

      const directions = piece.king
        ? [-1, 1]
        : [piece.color === "red" ? -1 : 1];

      for (let direction of directions) {
        for (let side of [-1, 1]) {

          const moveRow = row + direction;
          const moveCol = col + side;

          if (
            moveRow >= 0 &&
            moveRow < 8 &&
            moveCol >= 0 &&
            moveCol < 8 &&
            checkersBoard[moveRow][moveCol] === null
          ) {
            return true;
          }

          const jumpRow = row + direction * 2;
          const jumpCol = col + side * 2;

          const enemyRow = row + direction;
          const enemyCol = col + side;

          if (
            jumpRow >= 0 &&
            jumpRow < 8 &&
            jumpCol >= 0 &&
            jumpCol < 8
          ) {

            const enemyPiece =
              checkersBoard[enemyRow][enemyCol];

            if (
              enemyPiece &&
              enemyPiece.color !== piece.color &&
              checkersBoard[jumpRow][jumpCol] === null
            ) {
              return true;
            }
          }
        }
      }
    }
  }

  return false;
}

function getLegalMoves(color) {

  let moves = [];

  const mustCapture =
    playerMustCapture(color);

  for (let row = 0; row < 8; row++) {

    for (let col = 0; col < 8; col++) {

      const piece = checkersBoard[row][col];

      if (
        !piece ||
        piece.color !== color
      ) {
        continue;
      }

      const directions = piece.king
        ? [-1, 1]
        : [piece.color === "red" ? -1 : 1];

      for (let direction of directions) {

        for (let side of [-1, 1]) {

          const moveRow =
            row + direction;

          const moveCol =
            col + side;

          const jumpRow =
            row + direction * 2;

          const jumpCol =
            col + side * 2;

          // Capture move
          if (
            jumpRow >= 0 &&
            jumpRow < 8 &&
            jumpCol >= 0 &&
            jumpCol < 8
          ) {

            const jumpedPiece =
              checkersBoard[
              row + direction
              ][
              col + side
              ];

            if (
              jumpedPiece &&
              jumpedPiece.color !== color &&
              checkersBoard[jumpRow][jumpCol] === null
            ) {

              moves.push({
                fromRow: row,
                fromCol: col,
                toRow: jumpRow,
                toCol: jumpCol,
                capture: true,
                jumpedRow: row + direction,
                jumpedCol: col + side
              });
            }
          }

          // Normal move
          if (
            !mustCapture &&
            moveRow >= 0 &&
            moveRow < 8 &&
            moveCol >= 0 &&
            moveCol < 8 &&
            checkersBoard[moveRow][moveCol] === null
          ) {

            moves.push({
              fromRow: row,
              fromCol: col,
              toRow: moveRow,
              toCol: moveCol,
              capture: false
            });
          }
        }
      }
    }
  }

  return moves;
}

function evaluateCheckersBoard() {
  let score = 0;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = checkersBoard[row][col];

      if (!piece) continue;

      let value = piece.king ? 5 : 3;

      if (piece.color === checkersAIPlayer) {
        score += value;
      } else {
        score -= value;
      }
    }
  }

  return score;
}
function simulateMove(move) {
  const piece =
    checkersBoard[move.fromRow][move.fromCol];

  const capturedPiece = move.capture
    ? checkersBoard[move.jumpedRow][move.jumpedCol]
    : null;

  const wasKing = piece.king;

  checkersBoard[move.toRow][move.toCol] = piece;
  checkersBoard[move.fromRow][move.fromCol] = null;

  if (move.capture) {
    checkersBoard[move.jumpedRow][move.jumpedCol] = null;
  }

  crownCheckerIfNeeded(move.toRow, move.toCol);

  return {
    capturedPiece,
    wasKing
  };
}

function undoMove(move, undoData) {
  const piece =
    checkersBoard[move.toRow][move.toCol];

  piece.king = undoData.wasKing;

  checkersBoard[move.fromRow][move.fromCol] = piece;
  checkersBoard[move.toRow][move.toCol] = null;

  if (move.capture) {
    checkersBoard[move.jumpedRow][move.jumpedCol] =
      undoData.capturedPiece;
  }
}

function minimax(depth, isMaximizing) {

  const color = isMaximizing
    ? checkersAIPlayer
    : "red";

  const moves = getLegalMoves(color);

  if (depth === 0 || moves.length === 0) {
    return evaluateCheckersBoard();
  }

  if (isMaximizing) {
    let bestScore = -Infinity;

    for (let move of moves) {
      const undoData = simulateMove(move);
      const score = minimax(depth - 1, false);

      undoMove(move, undoData);

      bestScore = Math.max(bestScore, score);
    }

    return bestScore;

  } else {
    let bestScore = Infinity;

    for (let move of moves) {
      const undoData = simulateMove(move);
      const score = minimax(depth - 1, true);

      undoMove(move, undoData);

      bestScore = Math.min(bestScore, score);
    }

    return bestScore;
  }
}

function restartCheckers() {
  initializeCheckers();
}

//CHESS
function loadChess() {
  hideAppTitle();
  setGameAreaContent(`
    <h2 class="chess-title">Chess</h2>
    <h3 id="chessStatus" class="chess-status">
      ${getChessPlayerName(chessCurrentPlayer)}'s Turn
    </h3>
    ${chessGameMode === "ai"
      ? `<div class="difficulty-label">Difficulty: ${capitalize(chessDifficulty)}</div>`
      : ""}

  <div class="chess-layout">
    <div class="chess-side-panel captured-panel">
     <div>
      <h4>Captured</h4>
      <div id="capturedWhite" class="captured-section"></div>
    </div>
     
    <div class="captured-spacer"></div>
    
    <div id="capturedBlack" class="captured-section"></div>
  </div>

  <div class="chess-center">
  <div id="chessBoard" class="chess-board"></div>
  </div>

  <div id="moveHistory" class="chess-side-panel">
  <h4>Moves</h4>
  <div id="moveHistoryList"></div>
  </div>
  </div>
  
  <div id="actionButtons" class="chess-actions">
    <button class="restart-btn" onclick="restartChess()">
     Restart Game
    </button>
  <button
    class="restart-btn"
    onclick="resignChessGame()">
    Resign
  </button>
 ${chessGameMode === "local"
  ? `<button
       class="restart-btn"
       onclick="offerChessDraw()">
        Offer Draw
  </button>`
      : ""}
</div>
  `);

  initializeChess();
}

function initializeChess() {
  chessMoveHistory = []; 
  capturedBlack = [];
  capturedWhite = [];
  chessBoard = [
    [
      { type: "rook", color: "black", hasMoved: false },
      { type: "knight", color: "black" },
      { type: "bishop", color: "black" },
      { type: "queen", color: "black" },
      { type: "king", color: "black", hasMoved: false },
      { type: "bishop", color: "black" },
      { type: "knight", color: "black" },
      { type: "rook", color: "black", hasMoved: false }
    ],
    Array(8).fill(null).map(() => ({
      type: "pawn",
      color: "black"
    })),
    Array(8).fill(null),
    Array(8).fill(null),
    Array(8).fill(null),
    Array(8).fill(null),
    Array(8).fill(null).map(() => ({
      type: "pawn",
      color: "white"
    })),
    [
      { type: "rook", color: "white", hasMoved: false },
      { type: "knight", color: "white" },
      { type: "bishop", color: "white" },
      { type: "queen", color: "white" },
      { type: "king", color: "white", hasMoved: false },
      { type: "bishop", color: "white" },
      { type: "knight", color: "white" },
      { type: "rook", color: "white", hasMoved: false }
    ]
  ];

  chessCurrentPlayer = "white";
  selectedChessPiece = null;
  chessGameActive = true;
  chessHalfMoveClock = 0;
  chessPositionHistory = {};
  recordChessPosition();
  renderChessBoard();
}

function getChessPlayerName(player) {
  if (chessGameMode === "ai") {
    return player === "white"
      ? getShortProfileName()
      : "AI";
  }

  return player === "white"
    ? getShortProfileName()
    : "Player 2";
}

function renderChessBoard() {
  const boardElement =
    document.getElementById("chessBoard");

  boardElement.innerHTML = "";

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const square =
        document.createElement("div");

      square.classList.add("chess-square");

      if ((row + col) % 2 === 0) {
        square.classList.add("chess-light");
      } else {
        square.classList.add("chess-dark");
      }

      square.onclick = () => handleChessClick(row, col);
      if (
        selectedChessPiece &&
        selectedChessPiece.row === row &&
        selectedChessPiece.col === col
      ) {
        square.classList.add("chess-selected");
      }
      const isHighlighted =
        highlightedChessMoves.some(move =>
          move.row === row &&
          move.col === col
        );

        if (
  lastChessMoveHighlight &&
  (
    (lastChessMoveHighlight.fromRow === row &&
     lastChessMoveHighlight.fromCol === col) ||
    (lastChessMoveHighlight.toRow === row &&
     lastChessMoveHighlight.toCol === col)
  )
) {
  square.classList.add("chess-last-move");
}
      if (isHighlighted) {
        square.classList.add("chess-highlight");
      }
      const piece = chessBoard[row][col];

      if (piece) {
        const pieceElement =
          document.createElement("div");
        if (
          lastChessAnimationMove &&
          lastChessAnimationMove.toRow === row &&
          lastChessAnimationMove.toCol === col
        ) {
          const rowMove =
            lastChessMove.fromRow - lastChessMove.toRow;

          const colMove =
            lastChessMove.fromCol - lastChessMove.toCol;

          pieceElement.style.setProperty("--move-y", `${rowMove * 50}px`);
          pieceElement.style.setProperty("--move-x", `${colMove * 50}px`);

          pieceElement.classList.add("chess-slide-piece");

          pieceElement.addEventListener("animationend", () => {
            lastChessAnimationMove = null;
          });
        }

        pieceElement.classList.add("chess-piece");

        pieceElement.innerHTML = ` 
          <img 
            src="img/chess/${piece.color}-${piece.type}.png"
          class="chess-piece-image"
          >
          `;

        square.appendChild(pieceElement);
        if (piece.color === "white") {
          pieceElement.classList.add("white-piece");
        } else {
          pieceElement.classList.add("black-piece");
        }
      }

      if (
        piece &&
        piece.type === "king" &&
        isKingInCheck(piece.color)
      ) {
        square.classList.add("chess-check");
      }
      boardElement.appendChild(square);
    }
  }
}

function chessSquareName(row, col) {
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const rank = 8 - row;

  return files[col] + rank;
}

function getChessSymbol(piece) {
  const symbols = {
    white: {
      king: "♔",
      queen: "♕",
      rook: "♖",
      bishop: "♗",
      knight: "♘",
      pawn: "♙"
    },
    black: {
      king: "♚",
      queen: "♛",
      rook: "♜",
      bishop: "♝",
      knight: "♞",
      pawn: "♟"
    }
  };

  return symbols[piece.color][piece.type];
}

function handleChessClick(row, col) {

  if (!chessGameActive) {
    return;
  }

  const piece = chessBoard[row][col];

  if (
    piece &&
    piece.color === chessCurrentPlayer
  ) {
    selectedChessPiece = {
      row,
      col
    };

    highlightedChessMoves =
      getChessLegalMoves(row, col)
        .filter(move =>
          !chessMoveLeavesKingInCheck(
            row,
            col,
            move.row,
            move.col
          )
        );

    renderChessBoard();
    return;
  }

  if (selectedChessPiece) {
    const legalMove =
      highlightedChessMoves.find(move =>
        move.row === row &&
        move.col === col
      );

    if (legalMove) {
      moveChessPiece(row, col);
    }
  }
}

function getChessLegalMoves(row, col, includeCastling = true) {
  const piece = chessBoard[row][col];

  if (!piece) {
    return [];
  }

  if (piece.type === "pawn") {
    return getPawnMoves(row, col, piece);
  }

  if (piece.type === "rook") {
    return getRookMoves(row, col, piece);
  }

  if (piece.type === "bishop") {
    return getBishopMoves(row, col, piece);
  }

  if (piece.type === "queen") {
    return getQueenMoves(row, col, piece);
  }

  if (piece.type === "knight") {
    return getKnightMoves(row, col, piece);
  }
  if (piece.type === "king") {
    return getKingMoves(row, col, piece, includeCastling);
  }
  return [];
}

function getKingMoves(row, col, piece, includeCastling = true) {
  let moves = [];

  for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
    for (let colOffset = -1; colOffset <= 1; colOffset++) {

      if (rowOffset === 0 && colOffset === 0) {
        continue;
      }

      const r = row + rowOffset;
      const c = col + colOffset;

      if (!isInsideChessBoard(r, c)) {
        continue;
      }

      const target = chessBoard[r][c];

      if (!target || target.color !== piece.color) {
        moves.push({ row: r, col: c });
      }
    }
  }
  if (includeCastling) {
    moves.push(...getCastlingMoves(row, col, piece));
  }
  return moves;
}

function getCastlingMoves(row, col, piece) {
  let moves = [];

  if (piece.type !== "king" || piece.hasMoved) {
    return moves;
  }

  if (isKingInCheck(piece.color)) {
    return moves;
  }

  const opponent =
    piece.color === "white" ? "black" : "white";

  // Kingside castle
  const kingsideRook =
    chessBoard[row][7];

  if (
    kingsideRook &&
    kingsideRook.type === "rook" &&
    kingsideRook.color === piece.color &&
    !kingsideRook.hasMoved &&
    chessBoard[row][5] === null &&
    chessBoard[row][6] === null &&
    !isSquareAttacked(row, 5, opponent) &&
    !isSquareAttacked(row, 6, opponent)
  ) {
    moves.push({
      row,
      col: 6,
      castle: "kingside"
    });
  }

  // Queenside castle
  const queensideRook =
    chessBoard[row][0];

  if (
    queensideRook &&
    queensideRook.type === "rook" &&
    queensideRook.color === piece.color &&
    !queensideRook.hasMoved &&
    chessBoard[row][1] === null &&
    chessBoard[row][2] === null &&
    chessBoard[row][3] === null &&
    !isSquareAttacked(row, 2, opponent) &&
    !isSquareAttacked(row, 3, opponent)
  ) {
    moves.push({
      row,
      col: 2,
      castle: "queenside"
    });
  }

  return moves;
}

function moveCastlingRook(row, side) {
  if (side === "kingside") {
    const rook = chessBoard[row][7];

    chessBoard[row][5] = rook;
    chessBoard[row][7] = null;

    if (rook) {
      rook.hasMoved = true;
    }
  }

  if (side === "queenside") {
    const rook = chessBoard[row][0];

    chessBoard[row][3] = rook;
    chessBoard[row][0] = null;

    if (rook) {
      rook.hasMoved = true;
    }
  }
}

function getPawnMoves(row, col, piece) {
  let moves = [];

  const direction =
    piece.color === "white" ? -1 : 1;

  const startRow =
    piece.color === "white" ? 6 : 1;

  const oneStepRow = row + direction;

  if (
    isInsideChessBoard(oneStepRow, col) &&
    chessBoard[oneStepRow][col] === null
  ) {
    moves.push({
      row: oneStepRow,
      col
    });

    const twoStepRow = row + direction * 2;

    if (
      row === startRow &&
      chessBoard[twoStepRow][col] === null
    ) {
      moves.push({
        row: twoStepRow,
        col
      });
    }
  }

  for (let side of [-1, 1]) {
    const captureRow = row + direction;
    const captureCol = col + side;

    if (
      isInsideChessBoard(captureRow, captureCol)
    ) {
      const target =
        chessBoard[captureRow][captureCol];

      if (
        target &&
        target.color !== piece.color
      ) {
        moves.push({
          row: captureRow,
          col: captureCol
        });
      }
    }
  }
  // En passant
  if (
    lastChessMove &&
    lastChessMove.pieceType === "pawn" &&
    lastChessMove.pieceColor !== piece.color &&
    Math.abs(lastChessMove.toRow - lastChessMove.fromRow) === 2 &&
    lastChessMove.toRow === row &&
    Math.abs(lastChessMove.toCol - col) === 1
  ) {
    moves.push({
      row: row + direction,
      col: lastChessMove.toCol,
      enPassant: true,
      capturedPawnRow: lastChessMove.toRow,
      capturedPawnCol: lastChessMove.toCol
    });
  }
  return moves;
}

function getRookMoves(row, col, piece) {
  let moves = [];

  const directions = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1]
  ];

  for (let [rowDir, colDir] of directions) {
    let r = row + rowDir;
    let c = col + colDir;

    while (isInsideChessBoard(r, c)) {
      const target = chessBoard[r][c];

      if (!target) {
        moves.push({
          row: r,
          col: c
        });
      } else {
        if (target.color !== piece.color) {
          moves.push({
            row: r,
            col: c
          });
        }

        break;
      }

      r += rowDir;
      c += colDir;
    }
  }

  return moves;
}

function getBishopMoves(row, col, piece) {
  let moves = [];

  const directions = [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1]
  ];

  for (let [rowDir, colDir] of directions) {
    let r = row + rowDir;
    let c = col + colDir;

    while (isInsideChessBoard(r, c)) {
      const target = chessBoard[r][c];

      if (!target) {
        moves.push({ row: r, col: c });
      } else {
        if (target.color !== piece.color) {
          moves.push({ row: r, col: c });
        }

        break;
      }

      r += rowDir;
      c += colDir;
    }
  }

  return moves;
}
function getQueenMoves(row, col, piece) {
  return [
    ...getRookMoves(row, col, piece),
    ...getBishopMoves(row, col, piece)
  ];
}

function getKnightMoves(row, col, piece) {
  let moves = [];

  const offsets = [
    [-2, -1],
    [-2, 1],
    [-1, -2],
    [-1, 2],
    [1, -2],
    [1, 2],
    [2, -1],
    [2, 1]
  ];

  for (let [rowOffset, colOffset] of offsets) {
    const r = row + rowOffset;
    const c = col + colOffset;

    if (!isInsideChessBoard(r, c)) {
      continue;
    }

    const target = chessBoard[r][c];

    if (!target || target.color !== piece.color) {
      moves.push({ row: r, col: c });
    }
  }

  return moves;
}

function isInsideChessBoard(row, col) {
  return (
    row >= 0 &&
    row < 8 &&
    col >= 0 &&
    col < 8
  );
}

function findKing(color) {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = chessBoard[row][col];

      if (
        piece &&
        piece.type === "king" &&
        piece.color === color
      ) {
        return { row, col };
      }
    }
  }

  return null;
}

function isSquareAttacked(row, col, byColor) {

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {

      const piece = chessBoard[r][c];

      if (!piece || piece.color !== byColor) {
        continue;
      }

      let attacks = [];

      if (piece.type === "pawn") {
        attacks = getPawnAttackSquares(r, c, piece);
      } else {
        attacks = getChessLegalMoves(r, c, false);
      }

      if (
        attacks.some(move =>
          move.row === row &&
          move.col === col
        )
      ) {
        return true;
      }
    }
  }

  return false;
}
function getPawnAttackSquares(row, col, piece) {
  let attacks = [];

  const direction =
    piece.color === "white" ? -1 : 1;

  for (let side of [-1, 1]) {
    const attackRow = row + direction;
    const attackCol = col + side;

    if (isInsideChessBoard(attackRow, attackCol)) {
      attacks.push({
        row: attackRow,
        col: attackCol
      });
    }
  }

  return attacks;
}

function isKingInCheck(color) {
  const king = findKing(color);

  if (!king) {
    return false;
  }

  const opponent =
    color === "white" ? "black" : "white";

  return isSquareAttacked(
    king.row,
    king.col,
    opponent
  );
}

function moveChessPiece(targetRow, targetCol) {
  const startRow = selectedChessPiece.row;
  const startCol = selectedChessPiece.col;

  if (
    chessMoveLeavesKingInCheck(
      startRow,
      startCol,
      targetRow,
      targetCol
    )
  ) {
    return;
  }
  const piece = chessBoard[startRow][startCol];
  const legalMove =
    highlightedChessMoves.find(move =>
      move.row === targetRow &&
      move.col === targetCol
    );
  const capturedPiece =
    chessBoard[targetRow][targetCol];
    if (capturedPiece) {

    if (capturedPiece.color === "white") {
        capturedWhite.push(capturedPiece);
    } else {
        capturedBlack.push(capturedPiece);
    }
    renderCapturedPieces();
};


  const isPawnMove =
    piece.type === "pawn";

  const isCapture =
    capturedPiece !== null ||
    (legalMove && legalMove.enPassant);

  lastChessMove = {
    pieceType: piece.type,
    pieceColor: piece.color,
    fromRow: startRow,
    fromCol: startCol,
    toRow: targetRow,
    toCol: targetCol
  };

  lastChessAnimationMove = {
    fromRow: startRow,
    fromCol: startCol,
    toRow: targetRow,
    toCol: targetCol
  };

lastChessMoveHighlight = {
  fromRow: startRow,
  fromCol: startCol,
  toRow: targetRow,
  toCol: targetCol
};  

  chessBoard[targetRow][targetCol] = piece;
  chessBoard[startRow][startCol] = null;
  if (legalMove && legalMove.enPassant) {
    chessBoard[legalMove.capturedPawnRow][legalMove.capturedPawnCol] = null;
  }
  if (legalMove && legalMove.castle) {
    moveCastlingRook(targetRow, legalMove.castle);
  }
  if (
    piece.type === "king" ||
    piece.type === "rook"
  ) {
    piece.hasMoved = true;
  }
  if (isPawnMove || isCapture) {
    chessHalfMoveClock = 0;
  } else {
    chessHalfMoveClock++;
  }
  const isPromotion =
    promotePawnIfNeeded(targetRow, targetCol);

  if (isPromotion) {
    renderChessBoard();
  }
  playQuietBlockSound();
const moveText =
  `${capitalize(piece.type)}: ` +
  `${chessSquareName(targetRow, targetCol)}`;

chessMoveHistory.push(moveText);

renderChessMoveHistory();
  selectedChessPiece = null;
  highlightedChessMoves = [];

  chessCurrentPlayer =
    chessCurrentPlayer === "white"
      ? "black"
      : "white";
  const repetitionCount =
    recordChessPosition();

  if (repetitionCount >= 3) {
    document.getElementById("chessStatus")
      .textContent =
      "Draw by threefold repetition!";

    chessScores.draws++;
    updateChessScoreboard();

    chessGameActive = false;

    renderChessBoard();
    return;
  }
  if (chessHalfMoveClock >= 100) {
    document.getElementById("chessStatus")
      .textContent =
      "Draw by 50-move rule!";

    chessScores.draws++;
    updateChessScoreboard();
    chessGameActive = false;
    renderChessBoard();
    return;
  }
  if (
    chessGameMode === "ai" &&
    chessCurrentPlayer === chessAIPlayer &&
    chessGameActive
  ) {
    document.getElementById("chessStatus")
      .textContent = "AI Thinking...";

    setTimeout(chessAIMove, 1000);
  }


  if (checkChessGameOver(chessCurrentPlayer)) {
    selectedChessPiece = null;
    highlightedChessMoves = [];
    renderChessBoard();
    return;
  }

  const inCheck =
    isKingInCheck(chessCurrentPlayer);

  document.getElementById("chessStatus")
    .textContent =
    chessCurrentPlayer === "white"
      ? inCheck
        ? "White is in Check!"
        : `${getChessPlayerName(chessCurrentPlayer)}'s Turn`
      : inCheck
        ? "Black is in Check!"
        : `${getChessPlayerName(chessCurrentPlayer)}'s Turn`;

  renderChessBoard();
}

function renderCapturedPieces() {
  const whitePanel =
    document.getElementById("capturedWhite");

  const blackPanel =
    document.getElementById("capturedBlack");

  if (!whitePanel || !blackPanel) {
    return;
  }

  whitePanel.innerHTML = "";
  blackPanel.innerHTML = "";
   
  capturedWhite.forEach(piece => {
    const pieceDiv = document.createElement("div");

    pieceDiv.innerHTML = `
        <img
            src="img/chess/${piece.color}-${piece.type}.png"
            class="captured-piece"
        >
    `;

    whitePanel.appendChild(pieceDiv);
  });

  capturedBlack.forEach(piece => {
    const pieceDiv = document.createElement("div");

    pieceDiv.innerHTML = `
        <img
            src="img/chess/${piece.color}-${piece.type}.png"
            class="captured-piece"
        >
    `;
    blackPanel.appendChild(pieceDiv);
  });
}

function renderChessMoveHistory() {
  const panel =
    document.getElementById("moveHistoryList");

  if (!panel) {
    return;
  }

  panel.innerHTML = "";

  chessMoveHistory.forEach((move, index) => {
    const item =
      document.createElement("div");

    item.textContent =
      `${index + 1}. ${move}`;

    panel.appendChild(item);
  });

panel.scrollTop = panel.scrollHeight;
}

function promotePawnIfNeeded(row, col) {
  const piece = chessBoard[row][col];

  if (!piece || piece.type !== "pawn") {
    return false;
  }

  const reachedEnd =
    (piece.color === "white" && row === 0) ||
    (piece.color === "black" && row === 7);

  if (!reachedEnd) {
    return false;
  }

  pendingPromotion = {
    row,
    col,
    color: piece.color
  };

  showPromotionMenu(piece.color);

  return true;
}

function chessMoveLeavesKingInCheck(
  fromRow,
  fromCol,
  toRow,
  toCol
) {
  const piece = chessBoard[fromRow][fromCol];
  const capturedPiece = chessBoard[toRow][toCol];

  chessBoard[toRow][toCol] = piece;
  chessBoard[fromRow][fromCol] = null;

  const inCheck =
    isKingInCheck(piece.color);

  chessBoard[fromRow][fromCol] = piece;
  chessBoard[toRow][toCol] = capturedPiece;

  return inCheck;
}

function getAllLegalChessMoves(color) {
  let allMoves = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = chessBoard[row][col];

      if (!piece || piece.color !== color) {
        continue;
      }

      const moves =
        getChessLegalMoves(row, col)
          .filter(move =>
            !chessMoveLeavesKingInCheck(
              row,
              col,
              move.row,
              move.col
            )
          );

      allMoves.push(
        ...moves.map(move => ({
          ...move,
          fromRow: row,
          fromCol: col
        }))
      );
    }
  }

  return allMoves;
}

function chessAIMove() {
  if (!chessGameActive) {
    return;
  }

  const moves =
    getAllLegalChessMoves(chessAIPlayer);

  if (moves.length === 0) {
    return;
  }

  let move;

  if (chessDifficulty === "easy") {
    move = chooseRandomChessMove(moves);

  } else if (
    chessDifficulty === "medium"
  ) {
    move = chooseTacticalChessMove(moves);

  } else {
    move = chooseMinimaxChessMove(moves);
  }

  selectedChessPiece = {
    row: move.fromRow,
    col: move.fromCol
  };

  highlightedChessMoves = [move];

  moveChessPiece(move.row, move.col);
}

function chooseRandomChessMove(moves) {
  return moves[
    Math.floor(Math.random() * moves.length)
  ];
}

function chooseTacticalChessMove(moves) {

  // 1. Checkmate if possible
  let mateMoves =
    moves.filter(move =>
      moveWouldCheckmate(move)
    );

  if (mateMoves.length > 0) {
    return chooseRandomChessMove(mateMoves);
  }

  // 2. Prefer captures
  let captureMoves =
    moves.filter(move =>
      chessBoard[move.row][move.col] !== null
    );

  if (captureMoves.length > 0) {
    return chooseRandomChessMove(captureMoves);
  }

  // 3. Prefer promotions
  let promotionMoves =
    moves.filter(move =>
      moveWouldPromote(move)
    );

  if (promotionMoves.length > 0) {
    return chooseRandomChessMove(promotionMoves);
  }

  // 4. Prefer checks
  let checkMoves =
    moves.filter(move =>
      moveWouldGiveCheck(move)
    );

  if (checkMoves.length > 0) {
    return chooseRandomChessMove(checkMoves);
  }

  return chooseRandomChessMove(moves);
}

function moveWouldPromote(move) {
  const piece =
    chessBoard[move.fromRow][move.fromCol];

  if (!piece || piece.type !== "pawn") {
    return false;
  }

  return (
    piece.color === "white" &&
    move.row === 0
  ) || (
      piece.color === "black" &&
      move.row === 7
    );
}

function moveWouldGiveCheck(move) {
  const piece =
    chessBoard[move.fromRow][move.fromCol];

  const capturedPiece =
    chessBoard[move.row][move.col];

  chessBoard[move.row][move.col] = piece;
  chessBoard[move.fromRow][move.fromCol] = null;

  const opponent =
    piece.color === "white" ? "black" : "white";

  const givesCheck =
    isKingInCheck(opponent);

  chessBoard[move.fromRow][move.fromCol] = piece;
  chessBoard[move.row][move.col] = capturedPiece;

  return givesCheck;
}

function moveWouldCheckmate(move) {
  const piece =
    chessBoard[move.fromRow][move.fromCol];

  const capturedPiece =
    chessBoard[move.row][move.col];

  chessBoard[move.row][move.col] = piece;
  chessBoard[move.fromRow][move.fromCol] = null;

  const opponent =
    piece.color === "white" ? "black" : "white";

  const isMate =
    isKingInCheck(opponent) &&
    getAllLegalChessMoves(opponent).length === 0;

  chessBoard[move.fromRow][move.fromCol] = piece;
  chessBoard[move.row][move.col] = capturedPiece;

  return isMate;
}

function evaluateChessBoard() {
  let score = 0;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {

      const piece = chessBoard[row][col];

      if (!piece) {
        continue;
      }

      const value =
        pieceValues[piece.type];

      if (piece.color === chessAIPlayer) {
        score += value;
      } else {
        score -= value;
      }
    }
  }

  return score;
}

function simulateChessMove(move) {
  const piece =
    chessBoard[move.fromRow][move.fromCol];

  const capturedPiece =
    chessBoard[move.row][move.col];

  const originalHasMoved =
    piece.hasMoved;

  chessBoard[move.row][move.col] = piece;
  chessBoard[move.fromRow][move.fromCol] = null;

  if (
    piece.type === "king" ||
    piece.type === "rook"
  ) {
    piece.hasMoved = true;
  }

  return {
    capturedPiece,
    originalHasMoved
  };
}

function undoChessMove(move, undoData) {
  const piece =
    chessBoard[move.row][move.col];

  piece.hasMoved =
    undoData.originalHasMoved;

  chessBoard[move.fromRow][move.fromCol] = piece;
  chessBoard[move.row][move.col] =
    undoData.capturedPiece;
}

function chessMinimax(depth, maximizingPlayer) {

  if (depth === 0) {
    return evaluateChessBoard();
  }

  const color =
    maximizingPlayer
      ? chessAIPlayer
      : (chessAIPlayer === "white"
        ? "black"
        : "white");

  const moves =
    getAllLegalChessMoves(color);

  if (moves.length === 0) {

    if (isKingInCheck(color)) {

      return maximizingPlayer
        ? -100000
        : 100000;
    }

    return 0;
  }

  if (maximizingPlayer) {

    let bestScore = -Infinity;

    for (const move of moves) {

      const undoData =
        simulateChessMove(move);

      const score =
        chessMinimax(
          depth - 1,
          false
        );

      undoChessMove(move, undoData);

      bestScore =
        Math.max(bestScore, score);
    }

    return bestScore;

  } else {

    let bestScore = Infinity;

    for (const move of moves) {

      const undoData =
        simulateChessMove(move);

      const score =
        chessMinimax(
          depth - 1,
          true
        );

      undoChessMove(move, undoData);

      bestScore =
        Math.min(bestScore, score);
    }

    return bestScore;
  }
}

function chooseMinimaxChessMove(moves) {

  let bestScore = -Infinity;
  let bestMoves = [];

  for (const move of moves) {

    const undoData =
      simulateChessMove(move);

    const score =
      chessMinimax(
        3,
        false
      );

    undoChessMove(move, undoData);

    if (score > bestScore) {

      bestScore = score;
      bestMoves = [move];

    } else if (
      score === bestScore
    ) {

      bestMoves.push(move);
    }
  }

  return bestMoves[
    Math.floor(
      Math.random() *
      bestMoves.length
    )
  ];
}

function getChessPositionKey() {
  let key = "";

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = chessBoard[row][col];

      key += piece
        ? piece.color[0] + piece.type[0]
        : "--";

      key += ",";
    }
  }

  key += chessCurrentPlayer;

  return key;
}

function recordChessPosition() {
  const key = getChessPositionKey();

  chessPositionHistory[key] =
    (chessPositionHistory[key] || 0) + 1;

  return chessPositionHistory[key];
}

function showPromotionMenu(color) {
  const overlay =
    document.getElementById("promotionOverlay");

  const choices =
    document.getElementById("promotionChoices");

  choices.innerHTML = "";

  const pieces = [
    "queen",
    "rook",
    "knight",
    "bishop"
  ];

  pieces.forEach(type => {
    const button =
      document.createElement("button");

    button.classList.add("promotion-choice");

    button.innerHTML = `
      <img
        src="img/chess/${color}-${type}.png"
        alt="${type}"
      >
    `;

    button.onclick = () => {
      completePromotion(type);
    };

    choices.appendChild(button);
  });

  overlay.classList.remove("hidden");
}

function completePromotion(type) {
  if (!pendingPromotion) {
    return;
  }

  const piece =
    chessBoard[pendingPromotion.row][pendingPromotion.col];

  piece.type = type;

  pendingPromotion = null;

  document.getElementById("promotionOverlay")
    .classList.add("hidden");

  renderChessBoard();
}

function offerChessDraw() {
  showConfirmation(
    `${getChessPlayerName(chessCurrentPlayer)} offers a draw.\n\nDoes the other player accept?`,
  () => drawAccepted()
  );
}

  function drawAccepted() {
    document.getElementById("chessStatus")
    .textContent = "Draw by Agreement!";

  chessScores.draws++;
  updateChessScoreboard();

  chessGameActive = false;

  renderChessBoard();
}

function resignChessGame() {
 showConfirmation(
    "Are you sure you want to resign?",
  () => resignationConfirmed()
  );
}

function resignationConfirmed() {
  const winner =
    chessCurrentPlayer === "white"
      ? "black"
      : "white";

  document.getElementById("chessStatus")
    .textContent =
    `${getChessPlayerName(winner)} Wins by Resignation!`;

  playSound(winSound);

  if (winner === "white") {
    chessScores.wins++
  }
  updateChessScoreboard();
  if (winner === "black") {
    chessScores.losses++
  }
  updateChessScoreboard();
  chessGameActive = false;

  renderChessBoard();
}

function checkChessGameOver(color) {
  const legalMoves =
    getAllLegalChessMoves(color);

  const inCheck =
    isKingInCheck(color);

  if (legalMoves.length === 0 && inCheck) {
    const winner =
      color === "white"
      ? "black" 
      : "white";

    document.getElementById("chessStatus")
      .textContent =
      `Checkmate! ${getChessPlayerName(winner)} Wins!`;

    playSound(winSound);
    if (winner === "white") {
      chessScores.wins++
    };
    updateChessScoreboard();
    if (winner === "black") {
      chessScores.losses++
    };
    updateChessScoreboard();

    chessGameActive = false;

    return true;
  }

  if (legalMoves.length === 0 && !inCheck) {
    document.getElementById("chessStatus")
      .textContent =
      "Stalemate! It's a Draw!";

    playSound(winSound);
    chessScores.draws++;
    updateChessScoreboard();
    chessGameActive = false;

    return true;
  }

  return false;
}

function restartChess() {
  initializeChess();
}