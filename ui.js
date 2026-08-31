let confirmationAction = null;
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
function showProfileView(viewId) {
  document.querySelectorAll(".profile-view").forEach(view => {
    view.classList.add("hidden");
  });

  document.getElementById(viewId).classList.remove("hidden");
}

function updateProfileButton() {
  const profileButton =
    document.getElementById("profileButton");

  if (profileButton) {
    profileButton.textContent =
      getProfileDisplayName();
  }
}

function getProfileDisplayName() {
  return `${profiles[currentProfile].avatar} ${currentProfile}`;
}

function getShortProfileName() {
  return `${currentProfile}`;
}

function getEditProfileName() {
     document.getElementById("editProfileName").textContent = 
     `${getShortProfileName()}`;
}

function selectAvatar(avatar) {
  selectedAvatar = avatar;

  document.querySelectorAll(".avatar-option")
    .forEach(button => {
      button.classList.toggle(
        "selected-avatar",
        button.dataset.avatar === avatar
      );
    });
}

function initializeAvatarPicker() {
  document.querySelectorAll(".avatar-option")
    .forEach(button => {
      button.addEventListener("click", () => {
        selectAvatar(button.dataset.avatar);
      });
    });

  selectAvatar(selectedAvatar);
}

function openEditProfile() {
  const profile = profiles[currentProfile];

  document.getElementById("editProfileInput").value = currentProfile;

  editSelectedAvatar = profile.avatar;

  document.querySelectorAll("#editProfileView .avatar-option")
    .forEach(button => {
      button.classList.toggle(
        "selected-avatar",
        button.dataset.avatar === editSelectedAvatar
      );
    });
document.getElementById("editProfilePin").value =
  profiles[currentProfile].pin || "";
  showProfileView("editProfileView");
}

function selectEditAvatar(avatar) {
  editSelectedAvatar = avatar;

  document.querySelectorAll("#editProfileView .avatar-option")
    .forEach(button => {
      button.classList.toggle(
        "selected-avatar",
        button.dataset.avatar === avatar
      );
    });
}

function updateProfileFromDrawer() {
  const newName =
    document.getElementById("editProfileInput").value.trim();

  if (!newName) {
    return;
  }

  const oldName = currentProfile;
  const profileData = profiles[oldName];
    profileData.avatar = editSelectedAvatar;
    profileData.pin = document.getElementById("editProfilePin").value.trim();

  if (newName !== oldName && profiles[newName]) {
    showSmokeSignal(`"${newName}" already exists and it is not you.`);
    return;
  }

  if (newName !== oldName) {
    profiles[newName] = profileData;
    delete profiles[oldName];

    currentProfile = newName;
    localStorage.setItem("currentProfile", currentProfile);
  }

  saveProfiles();
  loadCurrentProfileScores();

  updateProfileButton();
  updateDrawerProfileDisplay();
  renderProfileList();

  showProfileView("profileMainView");
}

function updateProfilePin() {
  document.getElementById("editProfileInput").classList.remove("hidden");
 
  document.getElementById("editProfilePin").classList.add("hidden");
  
  const newPin =
  document.getElementById("editProfilePin").value.trim();

if (!/^\d{3}$/.test(newPin)) {
  showSmokeSignal("THOSE WERE NOT DIGITS.");
  profileData.pin = newPin;;
}
}

function updateProfileDisplay() {
 const display =
 document.getElementById("profileNameDisplay");

 if (display) {
 display.textContent =
 `Current Profile: ${getProfileDisplayName()}`;
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
  `Current Profile: ${getProfileDisplayName()}`;
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
 const pin = 
   document.getElementById("newProfilePin").value.trim();

  if (!/^\d{3}$/.test(pin)) {
   showSmokeSignal("THOSE WERE NOT DIGITS.")
   return;
}

  const name =
    document.getElementById("newProfileInput").value.trim();

  if (profiles[name]) {
    showSmokeSignal(`"${name}" already exists and it is not you.`);
    return;
  }

  currentProfile = name;

  ensureProfileExists(currentProfile);

  profiles[currentProfile].avatar = selectedAvatar;
  profiles[currentProfile].pin = pin;
saveProfiles();
  loadCurrentProfileScores();
updateProfileButton()
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


  renderProfileList();

    document.getElementById("newProfileView")
    .classList.add("hidden");

  document.getElementById("profileMainView")
    .classList.remove("hidden");
}

function openStatisticsFromProfile() {
  hideProfileDrawer();
  showStatistics();
}

function ensureProfileExists(name) {

 if (!profiles[name]) {
 profiles[name] = {
  avatar: "♟️",
  pin: "123",
  ticScores: {
    ai: { win: 0, loss: 0, draw: 0 },
    local: { win: 0, loss: 0, draw: 0 }
  },

  connectScores: {
    ai: { win: 0, loss: 0, draw: 0 },
    local: { win: 0, loss: 0, draw: 0 }
  },

  checkersScores: {
    ai: { win: 0, loss: 0, draw: 0 },
    local: { win: 0, loss: 0, draw: 0 }
  },

  chessScores: {
    ai: { win: 0, loss: 0, draw: 0 },
    local: { win: 0, loss: 0, draw: 0 }
  }
 
}; }
if (!profiles[name].avatar) {
  profiles[name].avatar = "♟️";
}
if (!profiles[name].ticScores.local) {
  const old = profiles[name].ticScores;

  profiles[name].ticScores = {
    ai: {
      win: old.player || 0,
      loss: old.ai || 0,
      draw: old.draws || 0
    },

    local: {
      win: 0,
      loss: 0,
      draw: 0
    }
  };
}

if (!profiles[name].connectScores.local) {
  const old = profiles[name].connectScores;

  profiles[name].connectScores = {
    ai: {
      win: old.player || 0,
      loss: old.ai || 0,
      draw: old.draws || 0
    },

    local: {
      win: 0,
      loss: 0,
      draw: 0
    }
  };
}

if (!profiles[name].checkersScores.local) {
  const old = profiles[name].checkersScores;

  profiles[name].checkersScores = {
    ai: {
      win: old.player || 0,
      loss: old.ai || 0,
      draw: old.draws || 0
    },

    local: {
      win: 0,
      loss: 0,
      draw: 0
    }
  };
}

if (!profiles[name].chessScores.local) {
  const old = profiles[name].chessScores;

  profiles[name].chessScores = {
    ai: {
      win: old.player || 0,
      loss: old.ai || 0,
      draw: old.draws || 0
    },

    local: {
      win: 0,
      loss: 0,
      draw: 0
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
    button.textContent =
  `${profiles[profileName].avatar} ${profileName}`;

    if (profileName === currentProfile) {
      button.classList.add("active-profile");
    }

    button.onclick = () => {
  pendingProfileSwitch = profileName;

  document.getElementById("selectedProfileName").textContent =
    `Selected: ${profileName}`;

  document.getElementById("switchPinSection")
    .classList.remove("hidden");
};

    row.appendChild(button);

   /* if (profileName !== currentProfile) {
      row.appendChild(deleteButton);
    }
*/
    profileList.appendChild(row);
  });
}

function confirmProfileSwitch() {
  const enteredPin =
    document.getElementById("switchProfilePin").value;

  if (enteredPin !== profiles[pendingProfileSwitch].pin) {
    showSmokeSignal("NOPE 😈 Try again.");
    return;
  }

  switchProfile(pendingProfileSwitch);
  pendingProfileSwitch = null;
}

function deleteProfile(currentProfile) {
  if (Object.keys(profiles).length === 1) {
    showSmokeSignal("You cannot delete the last remaining profile.");
  return;
  }

  if (Object.keys(profiles).length > 1) {
    showConfirmation(
    `Delete profile "${currentProfile}"? This cannot be undone.`,
    () => actuallyDeleteProfile(currentProfile)
  );
}
}

function actuallyDeleteProfile(currentProfile) {
  delete profiles[currentProfile];

  saveProfiles();
  currentProfile = null; 
  localStorage.removeItem("currentProfile");

  renderProfileList();
  showProfileView("switchProfileView");
}

function switchProfile(name) {
  currentProfile = name;

  ensureProfileExists(currentProfile);
  loadCurrentProfileScores();
  updateProfileButton()
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
  
  pendingProfileSwitch = null;
  
  document.getElementById("switchPinSection")
    .classList.add("hidden");

  document.getElementById("switchProfileView")
    .classList.add("hidden");

  document.getElementById("profileMainView")
    .classList.remove("hidden");
}

function getGamesPlayed() {

 const ticGamesPlayed =
  ticScores.ai.win +
  ticScores.ai.loss +
  ticScores.ai.draw +
  ticScores.local.win +
  ticScores.local.loss +
  ticScores.local.draw;

 const connectGamesPlayed =
    connectScores.ai.win +
    connectScores.ai.loss +
    connectScores.ai.draw +
    connectScores.local.win +
    connectScores.local.loss +
    connectScores.local.draw;

   const checkersGamesPlayed =
    checkersScores.ai.win +
    checkersScores.ai.loss +
    checkersScores.ai.draw +
    checkersScores.local.win +
    checkersScores.local.loss +
    checkersScores.local.draw;

   const chessGamesPlayed =
    chessScores.ai.win +
    chessScores.ai.loss +
    chessScores.ai.draw +
    chessScores.local.win +
    chessScores.local.loss +
    chessScores.local.draw
  
  return ticGamesPlayed +
    connectGamesPlayed +
    checkersGamesPlayed +
    chessGamesPlayed;
}

function getFavoriteGame() {

  const gameTotals = {
    "Tic-Tac-Toe":
      ticScores.ai.win +
      ticScores.ai.loss +
      ticScores.ai.draw +
      ticScores.local.win +
      ticScores.local.loss +
      ticScores.local.draw,

    "Connect Four":
      connectScores.ai.win +
    connectScores.ai.loss +
    connectScores.ai.draw +
    connectScores.local.win +
    connectScores.local.loss +
    connectScores.local.draw,

    "Checkers":
    checkersScores.ai.win +
    checkersScores.ai.loss +
    checkersScores.ai.draw +
    checkersScores.local.win +
    checkersScores.local.loss +
    checkersScores.local.draw,
    
    "Chess":
    chessScores.ai.win +
    chessScores.ai.loss +
    chessScores.ai.draw +
    chessScores.local.win +
    chessScores.local.loss +
    chessScores.local.draw
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

 const totalGames = getGamesPlayed();

 document.getElementById("gameArea").innerHTML = `
 <h2>${getProfileDisplayName()}'s Statistics</h2>

 <div class="stats-panel">
 
 <h3>Total Games Played</h3>
 <p>${totalGames}</p>

 <div class="stat-grid">
 <div class="stat-card">
  <h3>Tic-Tac-Toe</h3>

  <div class="stat-matchups">
    <div class="stat-matchup">
      <h4>VS AI</h4>
      <p>Wins: ${ticScores.ai.win}</p>
      <p>Losses: ${ticScores.ai.loss}</p>
      <p>Draws: ${ticScores.ai.draw}</p>
    </div>

    <div class="stat-matchup">
      <h4>VS Player</h4>
      <p>Wins: ${ticScores.local.win}</p>
      <p>Losses: ${ticScores.local.loss}</p>
      <p>Draws: ${ticScores.local.draw}</p>
    </div>
  </div>
</div>

 <div class="stat-card">
  <h3>Connect Four</h3>
  <div class="stat-matchups">

    <div class="stat-matchup">
  <h4>VS AI</h4>
  <p>Wins: ${connectScores.ai.win}</p>
  <p>Losses: ${connectScores.ai.loss}</p>
  <p>Draws: ${connectScores.ai.draw}</p>
  </div>

    <div class="stat-matchup">
  <h4>VS Player</h4>
  <p>Wins: ${connectScores.local.win}</p>
  <p>Losses: ${connectScores.local.loss}</p>
  <p>Draws: ${connectScores.local.draw}</p>
</div>
</div>
</div>

 <div class="stat-card">
  <h3>Checkers</h3>
  <div class="stat-matchups">

    <div class="stat-matchup">
  <h4>VS AI</h4>
  <p>Wins: ${checkersScores.ai.win}</p>
  <p>Losses: ${checkersScores.ai.loss}</p>
  <p>Draws: ${checkersScores.ai.draw}</p>
</div>
<div class="stat-matchup">
  <h4>VS Player</h4>
  <p>Wins: ${checkersScores.local.win}</p>
  <p>Losses: ${checkersScores.local.loss}</p>
  <p>Draws: ${checkersScores.local.draw}</p>
</div>
</div>
</div>

 <div class="stat-card">
  <h3>Chess</h3>
  <div class="stat-matchups">

    <div class="stat-matchup">
      <h4>VS AI</h4>
      <p>Wins: ${chessScores.ai.win}</p>
      <p>Losses: ${chessScores.ai.loss}</p>
      <p>Draws: ${chessScores.ai.draw}</p>
    </div>

    <div class="stat-matchup">
      <h4>VS Player</h4>
  <p>Wins: ${chessScores.local.win}</p>
  <p>Losses: ${chessScores.local.loss}</p>
  <p>Draws: ${chessScores.local.draw}</p>
</div>
</div>
 </div>
 `;
}
function resetAllScores() {
 ticScores = {
    ai: { win: 0, loss: 0, draw: 0 },
    local: { win: 0, loss: 0, draw: 0 }
  },

  connectScores = {
    ai: { win: 0, loss: 0, draw: 0 },
    local: { win: 0, loss: 0, draw: 0 }
  },

  checkersScores = {
    ai: { win: 0, loss: 0, draw: 0 },
    local: { win: 0, loss: 0, draw: 0 }
  },

  chessScores = {
    ai: { win: 0, loss: 0, draw: 0 },
    local: { win: 0, loss: 0, draw: 0 }
  };

profiles[currentProfile].ticScores = ticScores;
profiles[currentProfile].connectScores = connectScores;
profiles[currentProfile].checkersScores = checkersScores;
profiles[currentProfile].chessScores = chessScores;

saveProfiles();

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

function showSmokeSignal(message) {
  document.getElementById("smokeSignalMessage").textContent = message;
  document.getElementById("smokeSignalOverlay").classList.remove("hidden");
  document.body.classList.add("overlay-open");
}

function smokeSignalAccept() {
  document.getElementById("smokeSignalOverlay").classList.add("hidden");
   const settingsOverlay =
    document.getElementById("settingsOverlay");

  const profileDrawer =
    document.getElementById("profileDrawer");

  const settingsOpen =
    !settingsOverlay.classList.contains("hidden");

  const profileOpen =
    profileDrawer.classList.contains("open");

  if (!settingsOpen && !profileOpen) {
    document.body.classList.remove("overlay-open");
  }
}

function showConfirmation(message, action) {
  confirmationAction = action;

  document.getElementById("confirmationMessage").textContent = message;
  document.getElementById("confirmationOverlay").classList.remove("hidden");
  document.body.classList.add("overlay-open");
}

function confirmAction() {
  if (confirmationAction) {
    confirmationAction();
  }
 
  confirmationAction = null;
  hideConfirmation();
}

function confirmResetAllScores() {
  showConfirmation("Are you sure you want to reset all scores?", resetAllScores);
}

function hideConfirmation() {
  document
    .getElementById("confirmationOverlay")
    .classList.add("hidden");

  const settingsOverlay =
    document.getElementById("settingsOverlay");

  const profileDrawer =
    document.getElementById("profileDrawer");

  const settingsOpen =
    !settingsOverlay.classList.contains("hidden");

  const profileOpen =
    profileDrawer.classList.contains("open");

  if (!settingsOpen && !profileOpen) {
    document.body.classList.remove("overlay-open");
  }

  confirmationAction = null;
}
initializeAvatarPicker();
updateProfileButton();