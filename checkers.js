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

function recordCheckersResult(result) {
  const mode = checkersGameMode === "ai"
    ? "ai"
    : "local";

  checkersScores[mode][result]++;

  profiles[currentProfile].checkersScores = checkersScores;
  saveProfiles();

  updateCheckersScoreboard();
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
        pieceElement.dataset.row = row;
        pieceElement.dataset.col = col;
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

  const legalMoves = getLegalMoves(checkersCurrentPlayer);

  const captureMoves = legalMoves.filter(move =>
    Math.abs(move.toRow - move.fromRow) === 2
  );

  if (
    piece &&
    piece.color === checkersCurrentPlayer
  ) {

    const pieceMoves = legalMoves.filter(move =>
      move.fromRow === row &&
      move.fromCol === col
    );

    const pieceCanCapture = captureMoves.some(move =>
      move.fromRow === row &&
      move.fromCol === col
    );

    if (
      captureMoves.length > 0 &&
      !pieceCanCapture
    ) {
      playWrongSound();
      showForcedCaptureHint(captureMoves);
      return;
    }

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

function showForcedCaptureHint(captureMoves) {
  const highlightedPieces = new Set();

  captureMoves.forEach(move => {
    const key = `${move.fromRow}-${move.fromCol}`;

    // Prevent the same piece from being flashed twice
    // if it has more than one possible capture.
    if (highlightedPieces.has(key)) {
      return;
    }

    highlightedPieces.add(key);

    const pieceElement = document.querySelector(
      `.checker-piece[data-row="${move.fromRow}"][data-col="${move.fromCol}"]`
    );

    if (!pieceElement) {
      return;
    }

    // Allows the animation to restart if the player
    // clicks the wrong piece again quickly.
    pieceElement.classList.remove("forced-capture-hint");

    void pieceElement.offsetWidth;

    pieceElement.classList.add("forced-capture-hint");

    pieceElement.addEventListener(
      "animationend",
      () => {
        pieceElement.classList.remove("forced-capture-hint");
      },
      { once: true }
    );
  });
}

function getCheckersCapturingPieces(player) {
  const capturingPieces = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = checkersBoard[row][col];

      if (!piece || piece.player !== player) {
        continue;
      }

      const captures = getCheckersCaptures(row, col);

      if (captures.length > 0) {
        capturingPieces.push({ row, col });
      }
    }
  }

  return capturingPieces;
}

function flashCapturingPieces(pieces) {
  pieces.forEach(({ row, col }) => {
    const square = document.querySelector(
      `[data-row="${row}"][data-col="${col}"]`
    );

    if (!square) return;

    square.classList.add("forced-capture-flash");

    setTimeout(() => {
      square.classList.remove("forced-capture-flash");
    }, 1000);
  });
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

  highlightedMoves = getLegalMoves(checkersCurrentPlayer)
    .filter(move =>
      move.fromRow === targetRow &&
      move.fromCol === targetCol
    );

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
      recordCheckersResult("win");
    } else {
      recordCheckersResult("loss");
    }
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

    const score = minimax(6, false);

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
    recordCheckersResult("loss");
    checkersGameActive = false;
    return true;
  }

  if (blackPieces === 0) {
    document.getElementById("checkersStatus")
      .textContent = `${getCheckersPlayerName(checkersCurrentPlayer)} Wins!`;

    playSound(winSound);
    recordCheckersResult("win");
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