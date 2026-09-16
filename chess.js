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
  <div class="chess-clock"></div>
  <div class="clock-player"></div>
    <div id="player2Time">05:00</div>

  <div id="chessBoard" class="chess-board"></div>

   <div class="chess-clock"> </div>
  <div class="clock-player"></div>
    <div id="player1Time">05:00</div>
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

function preloadChessPieces() {
  const colors = ["white", "black"];
  const pieces = [
    "king",
    "queen",
    "rook",
    "bishop",
    "knight",
    "pawn"
  ];

  colors.forEach(color => {
    pieces.forEach(piece => {
      const img = new Image();
      img.src = `img/chess/${color}-${piece}.png`;
    });
  });
}

const chessWorker =
  new Worker("chessWorker.js");

chessWorker.onmessage = function(event) {

  const move = event.data;

  if (
    !move ||
    !chessGameActive ||
    chessCurrentPlayer !== chessAIPlayer
  ) {
    return;
  }

  selectedChessPiece = {
    row: move.fromRow,
    col: move.fromCol
  };

  highlightedChessMoves = [move];

  moveChessPiece(
    move.row,
    move.col
  );
};

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
  preloadChessPieces();
  resetChessClock();
  recordChessPosition();
  renderChessBoard();
}

let player1Time = 5 * 60;
let player2Time = 5 * 60;
let activePlayer = null;
let clockInterval = null;
let lastClockUpdate = null;

function syncChessClock(now = performance.now()) {
  if (!chessGameActive) return false;
  if (activePlayer === null) return true;

  const elapsed = (now - lastClockUpdate) / 1000;
  lastClockUpdate = now;

  const player = activePlayer;

  if (player === 1) {
    player1Time = Math.max(0, player1Time - elapsed);
  } else {
    player2Time = Math.max(0, player2Time - elapsed);
  }

  updateChessClockDisplay();

  const remaining =
    player === 1 ? player1Time : player2Time;

  if (remaining > 0) return true;

  stopChessClock();
  handleChessTimeout(player);
  return false;
}

function startClock(player) {
  const now = performance.now();

  // Charge the previous player before switching clocks.
  if (!syncChessClock(now)) return false;

  activePlayer = player;
  lastClockUpdate = now;

  if (clockInterval === null) {
    clockInterval = setInterval(syncChessClock, 100);
  }

  updateChessClockDisplay();
  return true;
}

function stopChessClock() {
  clearInterval(clockInterval);
  clockInterval = null;
  activePlayer = null;
  lastClockUpdate = null;
}

function formatTime(seconds) {
  seconds = Math.ceil(Math.max(0, seconds));
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function updateChessClockDisplay() {
  const player1Display = document.getElementById("player1Time");
  const player2Display = document.getElementById("player2Time");

  if (!player1Display || !player2Display) return;

  player1Display.textContent = formatTime(player1Time);
  player2Display.textContent = formatTime(player2Time);
}

function resetChessClock() {
  stopChessClock();
  lastClockUpdate = null;
  player1Time = 5 * 60;
  player2Time = 5 * 60;

  updateChessClockDisplay();
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

function recordChessResult(result) {
  const mode = chessGameMode === "ai"
    ? "ai"
    : "local";

  chessScores[mode][result]++;

  profiles[currentProfile].chessScores = chessScores;
  saveProfiles();

  updateChessScoreboard();
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
    const nextClockPlayer =
  chessCurrentPlayer === "white" ? 2 : 1;

// Check the mover's time before changing the board.
if (!startClock(nextClockPlayer)) {
  selectedChessPiece = null;
  highlightedChessMoves = [];
  renderChessBoard();
  return;
}
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
  return;
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

if (chessCurrentPlayer === "white") {
  startClock(1);
} else {
  startClock(2);
}
 const repetitionCount =
    recordChessPosition();

  if (repetitionCount >= 3) {
    document.getElementById("chessStatus")
      .textContent =
      "Draw by threefold repetition!";

    recordChessResult("draw");

    chessGameActive = false;
    stopChessClock();
    renderChessBoard();
    return;
  }
  if (chessHalfMoveClock >= 100) {
    document.getElementById("chessStatus")
      .textContent =
      "Draw by 50-move rule!";

    recordChessResult("draw");
    chessGameActive = false;
    stopChessClock();
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

function resetChessClock() {
  clearInterval(clockInterval);
  clockInterval = null;

  player1Time = 5 * 60;
  player2Time = 5 * 60;
  activePlayer = null;

  updateChessClockDisplay();
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
    chessDifficulty === "hard"
  chessWorker.postMessage({
    board: chessBoard,
    aiPlayer: chessAIPlayer,
    moves: moves,
    lastMove: lastChessMove
  });

  return;
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

  chessCurrentPlayer =
    chessCurrentPlayer === "white"
      ? "black"
      : "white";

  if (checkChessGameOver(chessCurrentPlayer)) {
    renderChessBoard();
    return;
  }

  if (chessCurrentPlayer === "white") {
    startClock(1);
  } else {
    startClock(2);
  }

  renderChessBoard();

  if (
    chessGameMode === "ai" &&
    chessCurrentPlayer === chessAIPlayer &&
    chessGameActive
  ) {
    document.getElementById("chessStatus")
      .textContent = "AI Thinking...";

    setTimeout(chessAIMove, 1000);
  }
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

 recordChessResult("draw");

  chessGameActive = false;
stopChessClock();
  renderChessBoard();
}

function resignChessGame() {
  if (!chessGameActive) {
    return;
  }
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
   recordChessResult("win");
  }
  if (winner === "black") {
    recordChessResult("loss");
  }
  chessGameActive = false;
  stopChessClock();
  renderChessBoard();
}

function hasOnlyKing(color) {
  const pieces = chessBoard
    .flat()
    .filter(piece => piece && piece.color === color);

  return pieces.length === 1 && pieces[0].type === "king";
}

function handleChessTimeout(flaggedPlayer) {
  stopChessClock();

  const opponentColor =
    flaggedPlayer === 1 ? "black" : "white";

  if (hasOnlyKing(opponentColor)) {
    document.getElementById("chessStatus").textContent =
      "Draw by insufficient mating material!";

    recordChessResult("draw");
  } else {
    const winner =
      flaggedPlayer === 1 ? "Black" : "White";

    document.getElementById("chessStatus").textContent =
      `${winner} wins on time!`;

    recordChessResult(
      flaggedPlayer === 1 ? "black" : "white"
    );
  }

  chessGameActive = false;
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
      recordChessResult("win");
    }
    if (winner === "black") {
      recordChessResult("loss");
    }
    chessGameActive = false;
    stopChessClock();
    return true;
  }

  if (legalMoves.length === 0 && !inCheck) {
    document.getElementById("chessStatus")
      .textContent =
      "Stalemate! It's a Draw!";

    playSound(winSound);
    recordChessResult("draw");
    chessGameActive = false;
    stopChessClock();
    return true;
  }

  return false;
}

function restartChess() {
  initializeChess();
  resetChessClock();
}
