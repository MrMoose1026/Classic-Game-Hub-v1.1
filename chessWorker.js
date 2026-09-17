console.log("CHESS WORKER: loaded");
let chessBoard = [];
let chessAIPlayer = null;
let lastChessMove = null;

const pieceValues = {
  pawn: 100,
  knight: 320,
  bishop: 330,
  rook: 500,
  queen: 900,
  king: 20000
};

self.onmessage = function(event) {
  console.log("CHESS WORKER: message received");
  const {
    board,
    aiPlayer,
    moves,
    lastMove
  } = event.data;

  chessBoard = board;
  chessAIPlayer = aiPlayer;
  lastChessMove = lastMove;

  const bestMove =
    chooseMinimaxChessMove(moves);
console.log(
  "CHESS WORKER: sending move",
  bestMove
);
  self.postMessage(bestMove);
};

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