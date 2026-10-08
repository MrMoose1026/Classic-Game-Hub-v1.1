// All players share the same animation/commit pipeline.
let chessAnimationRunning = false;
let chessMoveSession = 0;
let activeChessAnimation = null;

function cancelChessAnimation() {
  chessMoveSession++;
  activeChessAnimation?.cancel();
  activeChessAnimation = null;
  chessAnimationRunning = false;
}

async function animateChessMove(move) {
  const board = document.getElementById("chessBoard");
  if (!board || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const flights = [];
  const hiddenPieces = [];
  const animations = [];
  const transfers = [move];
  if (move.castle) {
    transfers.push({
      fromRow: move.fromRow,
      fromCol: move.castle === "kingside" ? 7 : 0,
      row: move.row,
      col: move.castle === "kingside" ? 5 : 3
    });
  }

  function cleanup() {
    animations.forEach(animation => animation.cancel());
    flights.forEach(flight => flight.remove());
    hiddenPieces.forEach(piece => { piece.style.visibility = ""; });
  }

  const currentAnimation = { cancel: cleanup };
  activeChessAnimation = currentAnimation;
  try {
    for (const transfer of transfers) {
      const sourceSquare = board.children[transfer.fromRow * 8 + transfer.fromCol];
      const targetSquare = board.children[transfer.row * 8 + transfer.col];
      const source = sourceSquare.querySelector(".chess-piece-image");
      if (!source || !source.animate) continue;

      const rect = source.getBoundingClientRect();
      const from = sourceSquare.getBoundingClientRect();
      const to = targetSquare.getBoundingClientRect();
      const flight = source.cloneNode(true);
      flight.className = "chess-moving-piece";
      Object.assign(flight.style, {
        left: `${rect.left}px`, top: `${rect.top}px`,
        width: `${rect.width}px`, height: `${rect.height}px`
      });
      document.body.appendChild(flight);
      flights.push(flight);
      const original = source.parentElement;
      original.style.visibility = "hidden";
      hiddenPieces.push(original);
      animations.push(flight.animate([
        { transform: "translate(0, 0)" },
        { transform: `translate(${to.left - from.left}px, ${to.top - from.top}px)` }
      ], { duration: 240, easing: "ease-in-out", fill: "forwards" }));
    }
    // Keep the captured piece visible until the attacker arrives.
    await Promise.all(animations.map(animation => animation.finished.catch(() => {})));
  } finally {
    cleanup();
    if (activeChessAnimation === currentAnimation) activeChessAnimation = null;
  }
}

const chessPieceLetters = { king: "K", queen: "Q", rook: "R", bishop: "B", knight: "N" };

let chessExportMetadata = null;
let chessExportResult = "*";

function getChessFEN() {
  if (chessBoard.length !== 8) return "";
  const letters = { pawn: "p", knight: "n", bishop: "b", rook: "r", queen: "q", king: "k" };
  const placement = chessBoard.map(row => {
    let text = "", empty = 0;
    for (const piece of row) {
      if (!piece) { empty++; continue; }
      if (empty) { text += empty; empty = 0; }
      const letter = letters[piece.type];
      text += piece.color === "white" ? letter.toUpperCase() : letter;
    }
    return text + (empty || "");
  }).join("/");
  let rights = "";
  for (const [row, color, kingSide, queenSide] of [[7, "white", "K", "Q"], [0, "black", "k", "q"]]) {
    const king = chessBoard[row][4];
    if (king?.type !== "king" || king.color !== color || king.hasMoved) continue;
    for (const [col, symbol] of [[7, kingSide], [0, queenSide]]) {
      const rook = chessBoard[row][col];
      if (rook?.type === "rook" && rook.color === color && !rook.hasMoved) rights += symbol;
    }
  }
  const enPassant = lastChessMove?.pieceType === "pawn" &&
    Math.abs(lastChessMove.fromRow - lastChessMove.toRow) === 2
    ? chessSquareName((lastChessMove.fromRow + lastChessMove.toRow) / 2, lastChessMove.toCol) : "-";
  return `${placement} ${chessCurrentPlayer === "white" ? "w" : "b"} ${rights || "-"} ${enPassant} ${chessHalfMoveClock} ${Math.floor(chessMoveHistory.length / 2) + 1}`;
}

function getChessPGN() {
  if (!chessExportMetadata) return "";
  const escape = value => String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/[\r\n]/g, " ");
  const tags = { ...chessExportMetadata, Result: chessExportResult };
  const headers = Object.entries(tags).map(([key, value]) => `[${key} "${escape(value)}"]`).join("\n");
  const turns = [];
  for (let i = 0; i < chessMoveHistory.length; i += 2) {
    turns.push(`${i / 2 + 1}. ${chessMoveHistory[i]}${chessMoveHistory[i + 1] ? " " + chessMoveHistory[i + 1] : ""}`);
  }
  return headers + "\n\n" + [...turns, chessExportResult].join(" ") + "\n";
}

async function exportChess(format, action) {
  if (chessAnimationRunning || pendingPromotion) {
    showSmokeSignal("Finish the move before exporting.");
    return;
  }
  const text = format === "pgn" ? getChessPGN() : getChessFEN();
  if (!text) return;
  if (action === "copy") {
    try {
      await navigator.clipboard.writeText(text);
      showSmokeSignal(`${format.toUpperCase()} copied!`);
    } catch {
      // A selectable dialog also works when clipboard access is unavailable.
      window.prompt(`Copy ${format.toUpperCase()}:`, text);
    }
    return;
  }
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `CGH-chess-${chessExportMetadata.Date.replace(/\./g, "-")}.${format}`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Build the base SAN before moving, while alternative legal origins still exist.
function buildChessSAN(move, piece) {
  if (move.castle) return move.castle === "kingside" ? "O-O" : "O-O-O";
  const capture = !!chessBoard[move.row][move.col] || !!move.enPassant;
  const destination = chessSquareName(move.row, move.col);
  if (piece.type === "pawn") {
    return (capture ? chessSquareName(move.fromRow, move.fromCol)[0] + "x" : "") + destination;
  }
  const alternatives = getAllLegalChessMoves(piece.color).filter(candidate =>
    candidate.row === move.row && candidate.col === move.col &&
    (candidate.fromRow !== move.fromRow || candidate.fromCol !== move.fromCol) &&
    chessBoard[candidate.fromRow][candidate.fromCol]?.type === piece.type
  );
  let origin = "";
  if (alternatives.length) {
    const square = chessSquareName(move.fromRow, move.fromCol);
    const sameFile = alternatives.some(candidate => candidate.fromCol === move.fromCol);
    const sameRank = alternatives.some(candidate => candidate.fromRow === move.fromRow);
    origin = !sameFile ? square[0] : !sameRank ? square[1] : square;
  }
  return chessPieceLetters[piece.type] + origin + (capture ? "x" : "") + destination;
}

//CHESS
function loadChess() {
  if (!requirePlayerProfile()) return;
  const bottomColor = getChessHumanColor();
  const topColor = bottomColor === "white" ? "black" : "white";
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
  <div id="chessTopPlayer" class="clock-player"></div>
    <div id="${topColor === "white" ? "player1Time" : "player2Time"}">05:00</div>

  <div id="chessBoard" class="chess-board"></div>

   <div class="chess-clock"> </div>
  <div id="chessBottomPlayer" class="clock-player"></div>
    <div id="${bottomColor === "white" ? "player1Time" : "player2Time"}">05:00</div>
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
  <div class="chess-export-actions" aria-label="Export chess game">
    <button onclick="exportChess('pgn', 'copy')">Copy PGN</button>
    <button onclick="exportChess('pgn', 'download')">Download PGN</button>
    <button onclick="exportChess('fen', 'copy')">Copy FEN</button>
    <button onclick="exportChess('fen', 'download')">Download FEN</button>
  </div>
  `);
  
initializeChess();

chessClockStarted = true;

document.getElementById("chessStatus").textContent =
  `${getChessPlayerName("white")}'s Turn`;

document.getElementById("chessTopPlayer").textContent =
  `${getChessPlayerName(topColor)} · ${capitalize(topColor)}`;
document.getElementById("chessBottomPlayer").textContent =
  `${getChessPlayerName(bottomColor)} · ${capitalize(bottomColor)}`;
startClock(1);
if (chessGameMode === "ai" && chessCurrentPlayer === chessAIPlayer) {
  document.getElementById("chessStatus").textContent = "AI Thinking...";
  scheduleChessAI();
}
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
  new Worker("./chessWorker.js");

chessWorker.onmessage = function(event) {
  const move = event.data;

  if (
    !move ||
    !chessGameActive ||
    chessAnimationRunning ||
    chessCurrentPlayer !== chessAIPlayer ||
    chessGameMode !== "ai" ||
    chessDifficulty !== "hard"
  ) 
  {
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

chessWorker.onerror = function(error) {
  console.error("Chess worker error:", error);
};

function initializeChess() {
  chessExportResult = "*";
  const date = new Date();
  chessExportMetadata = {
    Event: "Classic Games Hub", Site: "CGH",
    Date: `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`,
    Round: "-", White: getChessPlayerName("white"), Black: getChessPlayerName("black"),
    TimeControl: chessTimeMinutes === 0 ? "-" : `${chessTimeMinutes * 60}+${chessIncrementSeconds}`
  };
  cancelChessAnimation();
stockfishMoveHistory = [];
lastChessMove = null;
lastChessMoveHighlight = null;
highlightedChessMoves = [];
  chessMoveHistory = []; 
  capturedBlack = [];
  capturedWhite = [];
  renderChessMoveHistory();
  renderCapturedPieces();
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

const savedChessColorChoice = localStorage.getItem("chessColorChoice");
let chessColorChoice = ["white", "black", "random"].includes(savedChessColorChoice)
  ? savedChessColorChoice : "white";

function getChessHumanColor() {
  return chessGameMode === "ai" && chessAIPlayer === "white" ? "black" : "white";
}

function getChessResultForWinner(winner) {
  return winner === getChessHumanColor() ? "win" : "loss";
}

let chessTimeMinutes = 5;
let chessIncrementSeconds = 0;
let chessClockStarted = false;

let player1Time = 5 * 60;
let player2Time = 5 * 60;
let activePlayer = null;
let clockInterval = null;
let lastClockUpdate = null;

async function startSelectedChessGame() {
  const timeSelect =
    document.getElementById("chessTimeSelect");

  const incrementSelect =
    document.getElementById("chessIncrementSelect");

  const button =
    document.getElementById("chessStartButton");

  if (!timeSelect || !incrementSelect || !button) return;
  if (button.disabled) return;

  const minutes = Number(timeSelect.value);
  const increment = Number(incrementSelect.value);

  chessTimeMinutes = [0, 3, 5, 10, 30].includes(minutes)
    ? minutes : 5;

  chessIncrementSeconds =
    [0, 1, 2, 3, 5, 10].includes(increment)
      ? increment : 0;

  const chosenColor = document.getElementById("chessColorSelect")?.value;
  const colorChoice = ["white", "black", "random"].includes(chosenColor)
    ? chosenColor : chessColorChoice;
  button.disabled = true;

  try {
    if (
      chessGameMode === "ai" &&
      chessDifficulty === "expert"
    ) {
      button.textContent = "Loading Stockfish…";
      await prepareStockfish();
    }

    // Don't start if the player left this screen.
    if (
      document.getElementById("chessStartButton") !== button
    ) {
      return;
    }

    if (chessGameMode === "ai") {
      chessColorChoice = colorChoice;
      localStorage.setItem("chessColorChoice", colorChoice);
      const humanColor = colorChoice === "random"
        ? (Math.random() < 0.5 ? "white" : "black") : colorChoice;
      chessAIPlayer = humanColor === "white" ? "black" : "white";
    } else {
      chessAIPlayer = "black";
    }
    loadChess();

  } catch (error) {
    if (
      document.getElementById("chessStartButton") === button
    ) {
      cancelStockfishSearch();
      button.disabled = false;
      button.textContent =
        "Engine unavailable — check files and retry";

      console.error(error);
    }
  }
}

function syncChessClock(now = performance.now()) {
  if (!chessGameActive) return false;

  if (
    !chessClockStarted ||
    chessTimeMinutes === 0 ||
    activePlayer === null
  ) {
    return true;
  }

  // A visual transition is not thinking time for either player.
  if (chessAnimationRunning) {
    lastClockUpdate = now;
    return true;
  }
  const elapsed = Math.max(0, (now - lastClockUpdate) / 1000);
  lastClockUpdate = now;

  const player = activePlayer;

  if (player === 1) {
    player1Time = Math.max(0, player1Time - elapsed);
  } else {
    player2Time = Math.max(0, player2Time - elapsed);
  }

  updateChessClockDisplay();

  const remaining = player === 1 ? player1Time : player2Time;

  if (remaining > 0) return true;

  stopChessClock();
  handleChessTimeout(player);
  return false;
}

function startClock(player) {
  if (!chessClockStarted || !chessGameActive) return false;

  const now = performance.now();

  if (!syncChessClock(now)) return false;

  activePlayer = player;
  lastClockUpdate = now;

  if (chessTimeMinutes !== 0 && clockInterval === null) {
    clockInterval = setInterval(() => syncChessClock(), 100);
  }

  updateChessClockDisplay();
  return true;
}

// Call once when a move is fully completed.
function finishChessClockTurn() {
  if (chessTimeMinutes !== 0) {
    if (chessCurrentPlayer === "black") {
      player1Time += chessIncrementSeconds;
    } else {
      player2Time += chessIncrementSeconds;
    }
  }

  startClock(chessCurrentPlayer === "white" ? 1 : 2);
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

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function updateChessClockDisplay() {
  const whiteDisplay = document.getElementById("player1Time");
  const blackDisplay = document.getElementById("player2Time");

  if (!whiteDisplay || !blackDisplay) return;

  whiteDisplay.textContent =
    chessTimeMinutes === 0 ? "∞" : formatTime(player1Time);

  blackDisplay.textContent =
    chessTimeMinutes === 0 ? "∞" : formatTime(player2Time);
}

function resetChessClock() {
  stopChessClock();
  chessClockStarted = false;

  player1Time = chessTimeMinutes * 60;
  player2Time = chessTimeMinutes * 60;

  pendingPromotion = null;
  document.getElementById("promotionOverlay")
    ?.classList.add("hidden");

  [
    "chessTimeSelect",
    "chessColorSelect",
    "chessIncrementSelect",
    "chessStartButton"
  ].forEach(id => {
    const element = document.getElementById(id);
    if (element) element.disabled = false;
  });

  const status = document.getElementById("chessStatus");

  if (status) {
    status.textContent = "Choose your time control, then press Start Game.";
  }

  updateChessClockDisplay();
}

function getChessPlayerName(player) {
  if (chessGameMode === "ai") {
    return player === getChessHumanColor()
      ? getShortProfileName()
      : "AI";
  }

  return player === "white"
    ? getShortProfileName()
    : "Player 2";
}

function recordChessResult(result) {
  const humanColor = getChessHumanColor();
  const winner = result === "win" ? humanColor : humanColor === "white" ? "black" : "white";
  chessExportResult = result === "draw" ? "1/2-1/2" : winner === "white" ? "1-0" : "0-1";
  const mode = chessGameMode === "ai"
    ? "ai"
    : "local";
playGameResultSound(mode, result);
  chessScores[mode][result]++;

  profiles[currentProfile].chessScores = chessScores;
  saveProfiles();

  updateChessScoreboard();
}
function buildChessBoardDOM() {
  const boardElement =
    document.getElementById("chessBoard");

  if (!boardElement) {
    return;
  }

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

      square.dataset.row = row;
      square.dataset.col = col;

      square.onclick = () =>
        handleChessClick(row, col);

      const pieceElement =
        document.createElement("div");

      pieceElement.classList.add("chess-piece");

      const pieceImage =
        document.createElement("img");

      pieceImage.classList.add(
        "chess-piece-image"
      );

      pieceElement.appendChild(pieceImage);

      // Empty squares start with no visible piece.
      pieceElement.style.display = "none";

      square.appendChild(pieceElement);
      boardElement.appendChild(square);
    }
  }
}

function renderChessBoard() {
  if (chessAnimationRunning) return;
  const boardElement =
    document.getElementById("chessBoard");

  if (!boardElement) {
    return;
  }

  // Build the DOM only once.
  if (boardElement.children.length !== 64) {
    buildChessBoardDOM();
  }

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {

      const index = row * 8 + col;
      const square =
        boardElement.children[index];
      // Keep logical indices stable for clicks and animations; flip visually.
      square.style.order = getChessHumanColor() === "black" ? 63 - index : index;

      const pieceElement =
        square.querySelector(".chess-piece");

      const pieceImage =
        pieceElement.querySelector(
          ".chess-piece-image"
        );

      const piece =
        chessBoard[row][col];

      // ------------------------
      // RESET DYNAMIC SQUARE CSS
      // ------------------------

      square.classList.remove(
        "chess-selected",
        "chess-highlight",
        "chess-last-move",
        "chess-check"
      );

      // Selected piece
      if (
        selectedChessPiece &&
        selectedChessPiece.row === row &&
        selectedChessPiece.col === col
      ) {
        square.classList.add(
          "chess-selected"
        );
      }

      // Legal move highlight
      const isHighlighted =
        highlightedChessMoves.some(move =>
          move.row === row &&
          move.col === col
        );

      if (isHighlighted) {
        square.classList.add(
          "chess-highlight"
        );
      }

      // Last move highlight
      if (
        lastChessMoveHighlight &&
        (
          (
            lastChessMoveHighlight.fromRow === row &&
            lastChessMoveHighlight.fromCol === col
          ) ||
          (
            lastChessMoveHighlight.toRow === row &&
            lastChessMoveHighlight.toCol === col
          )
        )
      ) {
        square.classList.add(
          "chess-last-move"
        );
      }

      // ------------------------
      // UPDATE PIECE
      // ------------------------

      pieceElement.classList.remove(
        "white-piece",
        "black-piece",
        "chess-slide-piece"
      );

      if (!piece) {
        pieceElement.style.display = "none";
        continue;
      }

      pieceElement.style.display = "";

      if (piece.color === "white") {
        pieceElement.classList.add(
          "white-piece"
        );
      } else {
        pieceElement.classList.add(
          "black-piece"
        );
      }

      const imagePath =
        `img/chess/${piece.color}-${piece.type}.png`;

      // IMPORTANT:
      // Only change src when the piece actually changes.
      if (
        pieceImage.getAttribute("src") !==
        imagePath
      ) {
        pieceImage.setAttribute(
          "src",
          imagePath
        );
      }

      // King in check
      if (
        piece.type === "king" &&
        isKingInCheck(piece.color)
      ) {
        square.classList.add(
          "chess-check"
        );
      }
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

  if (
  !chessGameActive ||
  !chessClockStarted ||
  chessAnimationRunning ||
  pendingPromotion
) {
  return;
}

if (!syncChessClock()) return;

  if (
    chessGameMode === "ai" &&
    chessCurrentPlayer === chessAIPlayer
  ) {
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

async function moveChessPiece(targetRow, targetCol) {
  if (chessAnimationRunning || pendingPromotion || !selectedChessPiece || !chessGameActive) return;
  const startRow = selectedChessPiece.row;
  const startCol = selectedChessPiece.col;
  const piece = chessBoard[startRow][startCol];
  const legalMove = getAllLegalChessMoves(chessCurrentPlayer).find(move =>
    move.fromRow === startRow && move.fromCol === startCol &&
    move.row === targetRow && move.col === targetCol
  );
  if (!piece || piece.color !== chessCurrentPlayer || !legalMove) return;
  if (!chessClockStarted || !syncChessClock()) return;

  const notation = buildChessSAN(legalMove, piece);
  const capturedPiece = legalMove.enPassant
    ? chessBoard[legalMove.capturedPawnRow][legalMove.capturedPawnCol]
    : chessBoard[targetRow][targetCol];
  const boardElement = document.getElementById("chessBoard");
  const session = chessMoveSession;
  const promotionType = stockfishPromotionType;
  chessAnimationRunning = true;
  try {
    await animateChessMove(legalMove);
    if (session !== chessMoveSession || !chessGameActive ||
        document.getElementById("chessBoard") !== boardElement || !syncChessClock()) return;

    lastChessMove = {
      pieceType: piece.type, pieceColor: piece.color,
      fromRow: startRow, fromCol: startCol,
      toRow: targetRow, toCol: targetCol, notation
    };
    lastChessMoveHighlight = {
      fromRow: startRow, fromCol: startCol,
      toRow: targetRow, toCol: targetCol
    };
    chessBoard[targetRow][targetCol] = piece;
    chessBoard[startRow][startCol] = null;
    if (legalMove.enPassant) {
      chessBoard[legalMove.capturedPawnRow][legalMove.capturedPawnCol] = null;
    }
    if (legalMove.castle) moveCastlingRook(targetRow, legalMove.castle);
    if (piece.type === "king" || piece.type === "rook") piece.hasMoved = true;
    if (capturedPiece) {
      (capturedPiece.color === "white" ? capturedWhite : capturedBlack).push(capturedPiece);
      renderCapturedPieces();
    }
    chessHalfMoveClock = piece.type === "pawn" || capturedPiece ? 0 : chessHalfMoveClock + 1;
    selectedChessPiece = null;
    highlightedChessMoves = [];
    const promotion = piece.type === "pawn" && (targetRow === 0 || targetRow === 7);
    if (promotion) {
      pendingPromotion = { row: targetRow, col: targetCol, color: piece.color };
      if (chessGameMode === "ai" && piece.color === chessAIPlayer) {
        completePromotion(promotionType || "queen");
      } else {
        showPromotionMenu(piece.color);
      }
    } else {
      finishChessMove();
    }
  } finally {
    if (session === chessMoveSession) {
      chessAnimationRunning = false;
      renderChessBoard();
    }
  }
}

// Promotion and ordinary moves record notation, switch clocks, and schedule AI once.
function finishChessMove(promotionType = null) {
  recordStockfishMove(promotionType ? chessPieceLetters[promotionType].toLowerCase() : "");
  playQuietBlockSound();
  chessCurrentPlayer = chessCurrentPlayer === "white" ? "black" : "white";
  const inCheck = isKingInCheck(chessCurrentPlayer);
  const mate = inCheck && getAllLegalChessMoves(chessCurrentPlayer).length === 0;
  const notation = lastChessMove.notation +
    (promotionType ? "=" + chessPieceLetters[promotionType] : "") +
    (mate ? "#" : inCheck ? "+" : "");
  chessMoveHistory.push(notation);
  renderChessMoveHistory();
  finishChessClockTurn();
  const repetitionCount = recordChessPosition();
  if (checkChessGameOver(chessCurrentPlayer)) return;
  if (repetitionCount >= 3 || chessHalfMoveClock >= 100) {
    document.getElementById("chessStatus").textContent = repetitionCount >= 3
      ? "Draw by threefold repetition!" : "Draw by 50-move rule!";
    recordChessResult("draw");
    chessGameActive = false;
    stopChessClock();
    return;
  }
  const aiTurn = chessGameMode === "ai" && chessCurrentPlayer === chessAIPlayer;
  document.getElementById("chessStatus").textContent = aiTurn
    ? "AI Thinking..."
    : inCheck ? `${capitalize(chessCurrentPlayer)} is in Check!`
    : `${getChessPlayerName(chessCurrentPlayer)}'s Turn`;
  if (aiTurn) scheduleChessAI();
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

  for (let index = 0; index < chessMoveHistory.length; index += 2) {
    const row = document.createElement("div");
    row.className = "chess-move-row";
    [`${index / 2 + 1}.`, chessMoveHistory[index], chessMoveHistory[index + 1] || ""].forEach((text, column) => {
      const cell = document.createElement("span");
      cell.className = column === 0 ? "chess-move-number" : "chess-move-notation";
      cell.textContent = text;
      row.appendChild(cell);
    });
    panel.appendChild(row);
  }

panel.scrollTop = panel.scrollHeight;
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
  if (
    !chessGameActive ||
    chessAnimationRunning ||
    !chessClockStarted ||
    chessGameMode !== "ai" ||
    chessCurrentPlayer !== chessAIPlayer ||
    !document.getElementById("chessBoard")
  ) {
    return;
  }

  if (chessDifficulty === "expert") {
    requestStockfishMove();
    return;
  }

  const moves = getAllLegalChessMoves(chessAIPlayer);

  if (moves.length === 0) return;

  let move;

  if (chessDifficulty === "easy") {
    move = chooseRandomChessMove(moves);

  } else if (chessDifficulty === "medium") {
    move = chooseTacticalChessMove(moves);

  } else {
    chessWorker.postMessage({
      board: chessBoard,
      aiPlayer: chessAIPlayer,
      moves,
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
  if (!piece) return true;

  const changes = [];

  function place(row, col, value) {
    changes.push({
      row,
      col,
      previous: chessBoard[row][col]
    });

    chessBoard[row][col] = value;
  }

  const enPassant =
    piece.type === "pawn" &&
    fromCol !== toCol &&
    chessBoard[toRow][toCol] === null &&
    lastChessMove?.pieceType === "pawn" &&
    lastChessMove.pieceColor !== piece.color &&
    Math.abs(
      lastChessMove.toRow - lastChessMove.fromRow
    ) === 2 &&
    lastChessMove.toRow === fromRow &&
    lastChessMove.toCol === toCol;

  try {
    place(toRow, toCol, piece);
    place(fromRow, fromCol, null);

    if (enPassant) {
      place(fromRow, toCol, null);
    }

    if (
      piece.type === "king" &&
      fromRow === toRow &&
      Math.abs(toCol - fromCol) === 2
    ) {
      const rookCol = toCol > fromCol ? 7 : 0;
      const rookTarget = toCol > fromCol ? 5 : 3;

      place(
        fromRow,
        rookTarget,
        chessBoard[fromRow][rookCol]
      );

      place(fromRow, rookCol, null);
    }

    return isKingInCheck(piece.color);

  } finally {
    for (let i = changes.length - 1; i >= 0; i--) {
      const change = changes[i];

      chessBoard[change.row][change.col] =
        change.previous;
    }
  }
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
  if (!pendingPromotion || !chessGameActive ||
      !["queen", "rook", "bishop", "knight"].includes(type) || !syncChessClock()) return;
  const piece = chessBoard[pendingPromotion.row][pendingPromotion.col];
  piece.type = type;
  pendingPromotion = null;
  document.getElementById("promotionOverlay").classList.add("hidden");
  finishChessMove(type);
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
  if (!chessGameActive) return;

  // Against AI, the person pressing Resign is always the human.
  const winner = chessGameMode === "ai"
    ? chessAIPlayer
    : chessCurrentPlayer === "white"
      ? "black"
      : "white";

  document.getElementById("chessStatus").textContent =
    `${getChessPlayerName(winner)} Wins by Resignation!`;

  chessGameActive = false;
  stopChessClock();

  recordChessResult(getChessResultForWinner(winner));

  renderChessBoard();
}

function hasOnlyKing(color) {
  const pieces = chessBoard
    .flat()
    .filter(piece => piece && piece.color === color);

  return pieces.length === 1 && pieces[0].type === "king";
}

function handleChessTimeout(flaggedPlayer) {
  if (!chessGameActive) return;
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
      getChessResultForWinner(opponentColor)
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

    recordChessResult(getChessResultForWinner(winner));
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
  showChessTimeScreen();
}

