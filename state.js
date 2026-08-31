// APP STATE
let pendingGame = null;
let soundEnabled = true;
let ticGameMode = "ai";
let connectGameMode = "ai";
let checkersGameMode = "ai";

//SCORE STATE
let ticScores = {
player: 0,
ai: 0,
draws: 0
};
let connectScores = {
player: 0,
ai: 0,
draws: 0
};
let checkersScores = {
 player: 0,
 ai: 0
};
let chessScores = {
  wins: 0,
  losses: 0,
  draws: 0
};

//PROFILE SYSTEM
let currentProfile =
 localStorage.getItem("currentProfile") || "Player 1";
let selectedAvatar = "♟️";
let editSelectedAvatar = null;
let profiles =
 JSON.parse(localStorage.getItem("profiles")) || {};
 let pendingProfileSwitch = null;

 //TIC-TAC-TOE STATE
let board;
let currentPlayer;
let gameActive;
let winningCells = [];

//CONNECT 4 STATE
let connectBoard = [];
let connectCurrentPlayer = "R";
let connectGameActive = true;
let connectAIPlayer = "Y";
let connectDifficulty =
 localStorage.getItem("connectDifficulty") || "medium";

//CHECKERS STATE
let highlightedMoves = [];
let checkersBoard = [];
let checkersCurrentPlayer = "red";
let checkersAIPlayer = "black";
let selectedChecker = null;
let checkersGameActive = true;
let lastCheckerMove = null;
let checkersDifficulty =
 localStorage.getItem("checkersDifficulty") || "hard";

 //CHESS STATE
let chessBoard = [];
let chessCurrentPlayer = "white";
let selectedChessPiece = null;
let highlightedChessMoves = [];
let lastChessMove = null;
let lastChessMoveHighlight = null;
let lastChessAnimationMove = null;
let capturedBlack = [];
let capturedPieceElement
let capturedWhite = [];
let chessGameMode = "ai";
let chessAIPlayer = "black";
let chessDifficulty =
  localStorage.getItem("chessDifficulty") || "easy";
const pieceValues = {
  pawn: 100,
  knight: 320,
  bishop: 330,
  rook: 500,
  queen: 900,
  king: 20000
};
let chessHalfMoveClock = 0;
let chessPositionHistory = {};
let chessMoveHistory = [];
let pendingPromotion = null;
let chessGameActive = true;