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
}

function updateConnectScoreboard() {
  profiles[currentProfile].connectScores =
    connectScores;
  saveProfiles();
}

function updateCheckersScoreboard() {
profiles[currentProfile].checkersScores = checkersScores;
saveProfiles();
}

function updateChessScoreboard() {
  profiles[currentProfile].chessScores = chessScores;
  saveProfiles();
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