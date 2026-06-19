//AUDIO SYSTEM
const savedSoundSetting = localStorage.getItem("soundEnabled");
if (savedSoundSetting !== null) {
 soundEnabled = JSON.parse(savedSoundSetting);
}

//TIC-TAC-TOE
let aiEnabled = true;

//CONNECT FOUR
let connectAIEnabled = true;

//Checkers
let checkersAIEnabled = true;

//CHESS
let chessAIEnabled = true;

//SCORE SYSTEM
function updateTicScoreboard() {
profiles[currentProfile].ticScores = ticScores;
saveProfiles();
localStorage.setItem(
"ticScores",
JSON.stringify(ticScores)
);
}

function updateConnectScoreboard() {
  profiles[currentProfile].connectScores =
    connectScores;
  saveProfiles();
  localStorage.setItem(
    "connectScores",
    JSON.stringify(connectScores)
  );
}

function updateCheckersScoreboard() {
profiles[currentProfile].checkersScores = checkersScores;
saveProfiles();
 localStorage.setItem(
 "checkersScores",
 JSON.stringify(checkersScores)
 );
}

function updateChessScoreboard() {
  profiles[currentProfile].chessScores = chessScores;
  saveProfiles();
  localStorage.setItem(
    "chessScores",
    JSON.stringify(chessScores)
  );
}

//SYSTEM SETTINGS
function setTicMode(mode) {

ticGameMode = mode;

restartGame();
}

function setConnectMode(mode) {

connectGameMode = mode;

restartConnectFour();
}

function setCheckersMode(mode) {
 checkersGameMode = mode;
 restartCheckers();
}

function setChessMode(mode) {
 chessGameMode = mode;
 restartChess();
}