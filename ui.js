const clickSound = new Audio("img/click.mp3");
const winSound = new Audio("img/win.mp3");
const dropSound = new Audio("img/drop.mp3");
const blockSound = new Audio("img/block.mp3");
const tapSound = new Audio("img/tap.mp3");

function playSound(sound) {
 if (!soundEnabled) {
 return;
 }
 sound.currentTime = 0;
 sound.play();
}
function playCaptureSound() {
 if (!soundEnabled) {
 return;
 }

 const sound = blockSound.cloneNode();
 sound.volume = 0.50;
 sound.play();
}

function playQuietBlockSound() {
  if (!soundEnabled) {
    return;
  }

  const sound = blockSound.cloneNode();
  sound.volume = 0.10;
  sound.play();
}

//PROFILE MANAGEMENT
function updateProfileDisplay() {
 const display =
 document.getElementById("profileNameDisplay");

 if (display) {
 display.textContent =
 `Current Profile: ${currentProfile}`;
 }
}

function createOrSwitchProfile() {
 const input =
 document.getElementById("profileNameInput");

 const name = input.value.trim();

 if (!name) {
 return;
 }

 currentProfile = name;

 ensureProfileExists(currentProfile);
 loadCurrentProfileScores();

 updateProfileDisplay();

 if (document.getElementById("ticScoreboard")) {
 updateTicScoreboard();
 }

 if (document.getElementById("connectScoreboard")) {
 updateConnectScoreboard();
 }

 if (document.getElementById("checkersScoreboard")) {
 updateCheckersScoreboard();
 }
 
 if (document.getElementById("chessScoreboard")) {
  updateChessScoreboard();
 }

 input.value = "";
}

function showProfileDrawer() {
  document.getElementById("profileOverlay")
    .classList.remove("hidden");

  document.body.classList.add("overlay-open");

  updateDrawerProfileDisplay();
  renderProfileList();
  updateProfileSummary();
}

function hideProfileDrawer() {
  const overlay =
    document.getElementById("profileOverlay");

  const drawer =
    document.getElementById("profileDrawer");

  drawer.classList.add("closing");

  setTimeout(() => {
    overlay.classList.add("hidden");
    drawer.classList.remove("closing");

    document.body.classList.remove("overlay-open");
  }, 300);
}

function updateDrawerProfileDisplay() {
  const display =
    document.getElementById("drawerProfileName");

  if (display) {
    display.textContent =
      `Current Profile: ${currentProfile}`;
  }
}

function updateProfileSummary() {

  const summary =
    document.getElementById("profileSummary");

  if (!summary) {
    return;
  }

  summary.innerHTML = `
    Games Played: ${getGamesPlayed()}<br>
    Favorite Game: ${getFavoriteGame()}
  `;
}

function createProfileFromDrawer() {
  const input =
    document.getElementById("drawerProfileInput");

  const name = input.value.trim();

  if (!name) {
    return;
  }

  currentProfile = name;

  ensureProfileExists(currentProfile);
  loadCurrentProfileScores();

  updateDrawerProfileDisplay();
  updateProfileSummary();
  if (document.getElementById("ticScoreboard")) {
    updateTicScoreboard();
  }

  if (document.getElementById("connectScoreboard")) {
    updateConnectScoreboard();
  }

  if (document.getElementById("checkersScoreboard")) {
    updateCheckersScoreboard();
  }
  if (document.getElementById("chessScoreboard")) {
    updateChessScoreboard();
  }

  input.value = "";
  renderProfileList();

}
function openStatisticsFromProfile() {
  hideProfileDrawer();
  showStatistics();
}

function ensureProfileExists(name) {

 if (!profiles[name]) {
 profiles[name] = {
 ticScores: {
 player: 0,
 ai: 0,
 draws: 0
 },
 connectScores: {
 player: 0,
 ai: 0,
 draws: 0
 },
 checkersScores: {
 player: 0,
 ai: 0
 },
 chessScores: {
  wins: 0,
  losses: 0,
  draws: 0
 }
 };
 }

 saveProfiles();
}

function saveProfiles() {
 localStorage.setItem(
 "profiles",
 JSON.stringify(profiles)
 );

 localStorage.setItem(
 "currentProfile",
 currentProfile
 );
}

function loadCurrentProfileScores() {
 ensureProfileExists(currentProfile);

 ticScores =
 profiles[currentProfile].ticScores;

 connectScores =
 profiles[currentProfile].connectScores;

 checkersScores =
 profiles[currentProfile].checkersScores;
  
 chessScores =
 profiles[currentProfile].chessScores;
}
const savedCheckersScores =
 localStorage.getItem("checkersScores");

if (savedCheckersScores) {
 checkersScores = JSON.parse(savedCheckersScores);
}
const savedTicScores =
localStorage.getItem("ticScores");
if (savedTicScores) {
ticScores = JSON.parse(savedTicScores);
}
const savedConnectScores =
localStorage.getItem("connectScores");
if (savedConnectScores) {
connectScores = JSON.parse(savedConnectScores);
}
const savedChessScores =
 localStorage.getItem("chessScores");
if (savedChessScores) {
  chessScores = JSON.parse(savedChessScores);
};
ensureProfileExists(currentProfile);
loadCurrentProfileScores();

function renderProfileList() {
  const profileList =
    document.getElementById("profileList");

  if (!profileList) {
    return;
  }

  profileList.innerHTML = "";

  Object.keys(profiles).forEach(profileName => {
    const row = document.createElement("div");
    row.classList.add("profile-row");

    const button = document.createElement("button");
    button.textContent = profileName;

    if (profileName === currentProfile) {
      button.classList.add("active-profile");
    }

    button.onclick = () => {
      switchProfile(profileName);
    };

    row.appendChild(button);

    if (profileName !== currentProfile) {
      const deleteButton = document.createElement("button");
      deleteButton.textContent = "🗑️";
      deleteButton.classList.add("delete-profile-btn");

      deleteButton.onclick = () => {
        deleteProfile(profileName);
      };

      row.appendChild(deleteButton);
    }

    profileList.appendChild(row);
  });
}

function deleteProfile(profileName) {
  const profileNames = Object.keys(profiles);

  if (profileNames.length <= 1) {
    alert("You must have at least one profile.");
    return;
  }

  if (profileName === currentProfile) {
    alert("You can't delete the active profile.");
    return;
  }

  const confirmed = confirm(
    `Delete profile "${profileName}"?\n\nThis cannot be undone.`
  );

  if (!confirmed) {
    return;
  }

  delete profiles[profileName];

  saveProfiles();
  renderProfileList();
}

function switchProfile(name) {
  currentProfile = name;

  ensureProfileExists(currentProfile);
  loadCurrentProfileScores();

  updateDrawerProfileDisplay();
  updateProfileSummary();
  renderProfileList();

  if (document.getElementById("ticScoreboard")) {
    updateTicScoreboard();
  }

  if (document.getElementById("connectScoreboard")) {
    updateConnectScoreboard();
  }

  if (document.getElementById("checkersScoreboard")) {
    updateCheckersScoreboard();
  }
  if (document.getElementById("chessScoreboard")) {
    updateChessScoreboard();
  }
}

function getGamesPlayed() {

  return (
    ticScores.player +
    ticScores.ai +
    ticScores.draws +

    connectScores.player +
    connectScores.ai +
    connectScores.draws +

    checkersScores.player +
    checkersScores.ai+

    chessScores.wins +
    chessScores.losses +
    chessScores.draws
  );
}

function getFavoriteGame() {

  const gameTotals = {
    "Tic-Tac-Toe":
      ticScores.player +
      ticScores.ai +
      ticScores.draws,

    "Connect Four":
      connectScores.player +
      connectScores.ai +
      connectScores.draws,

    "Checkers":
      checkersScores.player +
      checkersScores.ai,
    
    "Chess":
      chessScores.wins +
      chessScores.losses +
      chessScores.draws
  };

  let favorite = "None";
  let mostPlayed = 0;

  for (const game in gameTotals) {

    if (gameTotals[game] > mostPlayed) {
      mostPlayed = gameTotals[game];
      favorite = game;
    }
  }

  return mostPlayed > 0
    ? favorite
    : "None";
}


//STATISTICS
function showStatistics() {
showAppTitle();
 document.querySelector(".menu").classList.add("hidden");
 document.getElementById("backButton").style.display = "inline-block";

 const totalGames =
 ticScores.player + ticScores.ai + ticScores.draws +
 connectScores.player + connectScores.ai + connectScores.draws +
 checkersScores.player + checkersScores.ai +
 chessScores.wins + chessScores.losses + chessScores.draws;

 document.getElementById("gameArea").innerHTML = `
 <h2>Statistics</h2>

 <div class="stats-panel">
 <h3>Tic-Tac-Toe</h3>
 <p>Wins: ${ticScores.player}</p>
 <p>Losses: ${ticScores.ai}</p>
 <p>Draws: ${ticScores.draws}</p>

 <h3>Connect Four</h3>
 <p>Wins: ${connectScores.player}</p>
 <p>Losses: ${connectScores.ai}</p>
 <p>Draws: ${connectScores.draws}</p>

 <h3>Checkers</h3>
 <p>Wins: ${checkersScores.player}</p>
 <p>Losses: ${checkersScores.ai}</p>

  <h3>Chess</h3>
 <p>Wins: ${chessScores.wins}</p>
 <p>Losses: ${chessScores.losses}</p>
 <p>Draws: ${chessScores.draws}</p>

 <h3>Total Games Played</h3>
 <p>${totalGames}</p>
 </div>
 `;
}
function resetAllScores() {
 ticScores = {
 player: 0,
 ai: 0,
 draws: 0
 };

 connectScores = {
 player: 0,
 ai: 0,
 draws: 0
 };

 checkersScores = {
 player: 0,
 ai: 0
 };
 
 chessScores = {
  wins: 0,
  losses: 0,
  draws: 0
 };

 localStorage.setItem("ticScores", JSON.stringify(ticScores));
 localStorage.setItem("connectScores", JSON.stringify(connectScores));
 localStorage.setItem("checkersScores", JSON.stringify(checkersScores));
 localStorage.setItem("chessScores", JSON.stringify(chessScores));

 if (document.getElementById("ticScoreboard")) {
 updateTicScoreboard();
 }

 if (document.getElementById("connectScoreboard")) {
 updateConnectScoreboard();
 }

 if (document.getElementById("checkersScoreboard")) {
 updateCheckersScoreboard();
 }
 if (document.getElementById("chessScoreboard")) {
  updateChessScoreboard();
 }

 alert("All scores reset!");
}

//MAIN MENU
function startGame(game) {
  pendingGame = game;

  const menu =
    document.querySelector(".menu");

  const backButton =
    document.getElementById("backButton");

  menu.classList.remove("fade-out");
  void menu.offsetWidth;
  menu.classList.add("fade-out");

  setTimeout(() => {
    menu.classList.add("hidden");
    menu.classList.remove("fade-out");

    backButton.style.display = "inline-block";

    showModeSelectScreen();
  }, 300);
}

function showAppTitle() {
    document
      .getElementById("appTitle")
      .classList.remove("hidden-title");
}

function hideAppTitle() {
    document
      .getElementById("appTitle")
      .classList.add("hidden-title");
}

function showModeSelectScreen() {
 setGameAreaContent(`
 <h2>Select Mode</h2>

 <div class="mode-select-screen">
 <button onclick="selectGameMode('ai')">
 VS AI
 </button>

 <button onclick="selectGameMode('local')">
 VS Local
 </button>
 </div>
 `);
}
function selectGameMode(mode) {

  if (pendingGame === "tic") {
    ticGameMode = mode;
  }

  if (pendingGame === "connect4") {
    connectGameMode = mode;
  }

  if (pendingGame === "checkers") {
    checkersGameMode = mode;
  }

  if (pendingGame === "chess") {
    chessGameMode = mode;
  }

  if (
    mode === "ai" &&
    (
      pendingGame === "connect4" ||
      pendingGame === "checkers" ||
      pendingGame === "chess"
    )
  ) {
    showDifficultyScreen();

  } else {
    launchPendingGame();
  }
}

function showDifficultyScreen() {
 setGameAreaContent(`
 <h2>Select Difficulty</h2>

 <div class="mode-select-screen">

 <button
 onclick="selectDifficulty('easy')">

 Easy

 </button>

 <button
 onclick="selectDifficulty('medium')">

 Medium

 </button>

 <button
 onclick="selectDifficulty('hard')">

 Hard

 </button>

 </div>
 `);
}

function selectDifficulty(difficulty) {

 if (pendingGame === "checkers") {

 checkersDifficulty = difficulty;

 localStorage.setItem(
 "checkersDifficulty",
 difficulty
 );
 }

 if (pendingGame === "connect4") {

 connectDifficulty = difficulty;

 localStorage.setItem(
 "connectDifficulty",
 difficulty
 );
 }

 if (pendingGame === "chess") {
  chessDifficulty = difficulty;

  localStorage.setItem(
    "chessDifficulty",
    difficulty
  );
}

 launchPendingGame();
}

function launchPendingGame() {

if (pendingGame === "tic") {
  loadTicTacToe();
} else if (pendingGame === "connect4") {
  loadConnectFour();
} else if (pendingGame === "checkers") {
  loadCheckers();
} else if (pendingGame === "chess") {
  loadChess();
}
}

function setGameAreaContent(html) {
  const gameArea =
    document.getElementById("gameArea");

  gameArea.classList.remove("page-enter");

  void gameArea.offsetWidth;

  gameArea.innerHTML = html;

  requestAnimationFrame(() => {
    gameArea.classList.add("page-enter");
  });
}

function showMenu() {
showAppTitle();
 document.querySelector(".menu").classList.remove("hidden");
 document.getElementById("backButton").style.display = "none";

 setGameAreaContent(`
  `);
}

//SYSTEM SETTINGS
function showSettings() {
  document.getElementById("settingsOverlay")
    .classList.remove("hidden");

  document.body.classList.add("overlay-open");

  updateProfileDisplay();
}

function hideSettings() {
  document.getElementById("settingsOverlay")
    .classList.add("hidden");

  document.body.classList.remove("overlay-open");
}

function toggleSound() {
 soundEnabled = !soundEnabled;

 localStorage.setItem(
 "soundEnabled",
 JSON.stringify(soundEnabled)
 );

 updateSoundButton();
}

function updateSoundButton() {
 const soundToggle =
 document.getElementById("soundToggle");

 if (!soundToggle) {
 return;
 }

 soundToggle.textContent =
 soundEnabled ? "Sound: On" : "Sound: Off";
}
function setTheme(theme) {
 document.body.className = "";
 document.body.classList.add(theme + "-theme");

 localStorage.setItem("theme", theme);
}

const savedTheme = localStorage.getItem("theme");

if (savedTheme) {
 setTheme(savedTheme);
} else {
 setTheme("dark");
updateSoundButton();
}

function toggleThemeMenu() {
  document.getElementById("themeMenu")
    .classList.toggle("open");
}

function capitalize(word) {
 return word.charAt(0).toUpperCase() + word.slice(1);
}