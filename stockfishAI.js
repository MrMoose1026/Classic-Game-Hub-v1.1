let stockfishEngine = null;
let stockfishReady = null;
let stockfishRejectReady = null;
let stockfishLoadTimer = null;
let stockfishSearchTimer = null;
let stockfishRequest = null;

let stockfishMoveHistory = [];
let stockfishPromotionType = null;

let chessAITimer = null;
let chessAISession = 0;

function cancelStockfishSearch() {
  chessAISession++;

  clearTimeout(chessAITimer);
  clearTimeout(stockfishLoadTimer);
  clearTimeout(stockfishSearchTimer);

  stockfishEngine?.terminate();

  stockfishEngine = null;
  stockfishReady = null;
  stockfishRequest = null;
  stockfishPromotionType = null;

  if (stockfishRejectReady) {
    stockfishRejectReady(
      new Error("Engine loading cancelled.")
    );
    stockfishRejectReady = null;
  }
}

function failStockfish(error) {
  console.error("Stockfish:", error);

  const playing =
    chessGameActive &&
    chessDifficulty === "expert" &&
    document.getElementById("chessBoard");

  cancelStockfishSearch();

  if (playing) {
    chessGameActive = false;
    stopChessClock();

    document.getElementById("chessStatus").textContent =
      "Expert engine failed to load or respond. Please restart the game.";
  }
}

function prepareStockfish() {
  if (stockfishReady) return stockfishReady;

  stockfishReady = new Promise((resolve, reject) => {
    stockfishRejectReady = reject;

    const engine = new Worker(
      "./engine/stockfish-19-lite-single.js"
    );

    stockfishEngine = engine;

    engine.onerror = () => {
      failStockfish(
        new Error("Check the Stockfish JS and WASM files.")
      );
    };

    engine.onmessage = event => {
      if (engine !== stockfishEngine) return;

      for (const line of String(event.data).split("\n")) {
        if (line.trim() === "uciok") {
          engine.postMessage("setoption name Hash value 16");
          engine.postMessage("setoption name Skill Level value 20");
          engine.postMessage("isready");

        } else if (line.trim() === "readyok") {
          clearTimeout(stockfishLoadTimer);
          stockfishRejectReady = null;
          resolve();

        } else if (line.startsWith("bestmove ")) {
          receiveStockfishMove(line.split(/\s+/)[1]);
        }
      }
    };

    stockfishLoadTimer = setTimeout(() => {
      failStockfish(
        new Error("Stockfish loading timed out.")
      );
    }, 20000);

    engine.postMessage("uci");
  });

  return stockfishReady;
}

function recordStockfishMove(promotion = "") {
  const move = lastChessMove;

  stockfishMoveHistory.push(
    chessSquareName(move.fromRow, move.fromCol) +
    chessSquareName(move.toRow, move.toCol) +
    promotion
  );
}

function scheduleChessAI() {
  clearTimeout(chessAITimer);

  const session = chessAISession;

  chessAITimer = setTimeout(() => {
    if (session === chessAISession) {
      chessAIMove();
    }
  }, chessDifficulty === "expert" ? 50 : 1000);
}

async function requestStockfishMove() {
  if (stockfishRequest) return;

  const session = chessAISession;

  try {
    await prepareStockfish();

    if (
      session !== chessAISession ||
      !chessGameActive ||
      chessCurrentPlayer !== chessAIPlayer ||
      chessDifficulty !== "expert" ||
      !document.getElementById("chessBoard") ||
      !syncChessClock()
    ) {
      return;
    }

    const history = stockfishMoveHistory.join(" ");

    stockfishRequest = {
      history,
      board: JSON.stringify(chessBoard)
    };

    stockfishEngine.postMessage(
      "position startpos" +
      (history ? " moves " + history : "")
    );

    const remaining = chessAIPlayer === "white"
      ? player1Time
      : player2Time;

    const thinkMs = chessTimeMinutes === 0
      ? 1500
      : Math.max(
          20,
          Math.min(
            1500,
            Math.floor(
              remaining * 1000 / 25 +
              chessIncrementSeconds * 250
            ),
            Math.floor(remaining * 500)
          )
        );

    stockfishSearchTimer = setTimeout(() => {
      failStockfish(
        new Error("Stockfish search timed out.")
      );
    }, 15000);

    stockfishEngine.postMessage(
      "go movetime " + thinkMs
    );

  } catch (error) {
    if (session === chessAISession) {
      failStockfish(error);
    }
  }
}

async function receiveStockfishMove(uci) {
  const request = stockfishRequest;
  stockfishRequest = null;

  clearTimeout(stockfishSearchTimer);

  if (
    !request ||
    !chessGameActive ||
    chessAnimationRunning ||
    chessGameMode !== "ai" ||
    chessDifficulty !== "expert" ||
    chessCurrentPlayer !== chessAIPlayer ||
    !document.getElementById("chessBoard") ||
    request.history !== stockfishMoveHistory.join(" ") ||
    request.board !== JSON.stringify(chessBoard) ||
    !syncChessClock()
  ) {
    return;
  }

  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) {
    if (!checkChessGameOver(chessCurrentPlayer)) {
      failStockfish(
        new Error("No usable engine move.")
      );
    }
    return;
  }

  const fromCol = uci.charCodeAt(0) - 97;
  const fromRow = 8 - Number(uci[1]);
  const col = uci.charCodeAt(2) - 97;
  const row = 8 - Number(uci[3]);

  const move = getAllLegalChessMoves(chessAIPlayer)
    .find(candidate =>
      candidate.fromRow === fromRow &&
      candidate.fromCol === fromCol &&
      candidate.row === row &&
      candidate.col === col
    );

  if (!move) {
    failStockfish(
      new Error(
        "Engine move disagrees with the board's legal moves."
      )
    );
    return;
  }

  const promotionTypes = {
    q: "queen",
    r: "rook",
    b: "bishop",
    n: "knight"
  };

  stockfishPromotionType =
    promotionTypes[uci[4]] || null;

  selectedChessPiece = {
    row: fromRow,
    col: fromCol
  };

  // Preserve castling and en passant metadata.
  highlightedChessMoves = [move];

  try {
    await moveChessPiece(row, col);
  } finally {
    stockfishPromotionType = null;
  }
}