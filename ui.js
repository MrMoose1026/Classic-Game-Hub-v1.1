let confirmationAction = null; 
const clickSound = new Audio("img/click.mp3");
const winSound = new Audio("img/win.mp3");
const dropSound = new Audio("img/drop.mp3");
const blockSound = new Audio("img/block.mp3");
const tapSound = new Audio("img/tap.mp3");
const wrongSound = new Audio("img/wrong.mp3");
const boomSound = new Audio("img/boom.mp3");
const achievementSound = new Audio("img/achieve.mp3");
achievementSound.volume = 0.55;
boomSound.volume = 0.5;

// Preload reusable sound players.
const gameSoundPools = new Map();
let gameSoundsWarmed = false;

function preloadGameSound(source) {
  if (gameSoundPools.has(source)) {
    return gameSoundPools.get(source);
  }

  const pool = [
    source,
    source.cloneNode(),
    source.cloneNode()
  ].map(sound => {
    sound.preload = "auto";
    sound.load();
    return { sound, warming: false };
  });

  gameSoundPools.set(source, pool);
  return pool;
}

function getReadySound(source) {
  const pool = preloadGameSound(source);
  const voice = pool.find(v =>
    !v.warming && (v.sound.paused || v.sound.ended)
  ) || pool[0];

  voice.warming = false;
  voice.sound.muted = false;
  voice.sound.volume = source.volume;
  voice.sound.currentTime = 0;
  return voice.sound;
}

function warmGameSounds() {
  if (gameSoundsWarmed) return;
  gameSoundsWarmed = true;

  for (const pool of gameSoundPools.values()) {
    for (const voice of pool) {
      if (!voice.sound.paused) continue;

      voice.warming = true;
      voice.sound.muted = true;

      const finish = () => {
        if (!voice.warming) return;
        voice.sound.pause();
        voice.sound.currentTime = 0;
        voice.sound.muted = false;
        voice.warming = false;
      };

      voice.sound.play().then(finish, finish);
    }
  }
}

[
  clickSound, winSound, dropSound,
  blockSound, tapSound, wrongSound, boomSound, achievementSound
].forEach(preloadGameSound);

document.addEventListener("pointerdown", warmGameSounds, {
  once: true,
  capture: true
});

document.addEventListener("keydown", warmGameSounds, {
  once: true,
  capture: true
});

function playWrongSound() {
  if (!soundEnabled) {
    return;
  }
  const sound = getReadySound(wrongSound);
  sound.volume = 0.20;
  sound.currentTime = 0;
  sound.play().catch(() => {});
}

function playSound(source) {
  if (!soundEnabled) return;
  getReadySound(source).play().catch(() => {});
}

function playCaptureSound() {
 if (!soundEnabled) {
 return;
 }

 const sound = getReadySound(blockSound);
 sound.volume = 0.50;
 sound.play().catch(() => {});
}

function playQuietBlockSound() {
  if (!soundEnabled) {
    return;
  }

  const sound = getReadySound(blockSound);
  sound.volume = 0.10;
  sound.play().catch(() => {});
}

//PROFILE MANAGEMENT
function hasPlayerProfile() {
  const profile = profiles[currentProfile];
  return !!(currentProfile && currentProfile.trim() && profile &&
    (currentProfile !== "Player 1" || profile.setupComplete));
}

function requirePlayerProfile() {
  if (hasPlayerProfile()) return true;
  showProfileDrawer();
  const placeholder = currentProfile === "Player 1" && profiles[currentProfile];
  if (placeholder) openEditProfile();
  else showProfileView("switchProfileView");
  document.getElementById("profileSetupNotice")?.classList.remove("hidden");
  return false;
}

function finishProfileSetup() {
  document.getElementById("profileSetupNotice")?.classList.add("hidden");
  hideProfileDrawer();
}

function showProfileView(viewId) {
  if (!hasPlayerProfile() && viewId === "profileMainView") {
    requirePlayerProfile();
    return;
  }
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
  const profile = profiles[currentProfile];
  return profile ? `${profile.avatar} ${currentProfile}` : "Choose Profile";
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

  if (!newName || ["__proto__", "constructor", "prototype"].includes(newName)) {
    showSmokeSignal("Please enter a profile name.");
    return;
  }

  const pin = document.getElementById("editProfilePin").value.trim();
  if (!/^\d{3}$/.test(pin)) {
    showSmokeSignal("Please enter a 3-digit PIN.");
    return;
  }

  const oldName = currentProfile;
  const profileData = profiles[oldName];
  if (newName !== oldName && Object.hasOwn(profiles, newName)) {
    showSmokeSignal(`"${newName}" already exists and it is not you.`);
    return;
  }
  profileData.avatar = editSelectedAvatar || "♟️";
  profileData.pin = pin;
  profileData.setupComplete = true;

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
  finishProfileSetup();
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
  if (!hasPlayerProfile()) return;
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
  if (!currentProfile || !profiles[currentProfile]) {
    summary.textContent = "Choose a profile to view your stats.";
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

  if (!name || ["__proto__", "constructor", "prototype"].includes(name)) {
    showSmokeSignal("Please enter a profile name.");
    return;
  }

  if (Object.hasOwn(profiles, name)) {
    showSmokeSignal(`"${name}" already exists and it is not you.`);
    return;
  }

  currentProfile = name;

  ensureProfileExists(currentProfile);

  profiles[currentProfile].avatar = selectedAvatar;
  profiles[currentProfile].pin = pin;
  profiles[currentProfile].setupComplete = true;
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
  finishProfileSetup();
}

function openStatisticsFromProfile() {
  hideProfileDrawer();
  showStatistics();
}

function ensureProfileExists(name) {
 if (!name) return;

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
      win: old.player || old.wins || 0,
      loss: old.ai || old.losses || 0,
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
// ACHIEVEMENTS — milestones and dates live with the player's existing stats.
const achievementDefinitions = {
  "andy-approved": { title: "Andy Approved", description: "Complete your first daily Sudoku.", icon: "🧩", group: "Challenges" },
  "first-sweep": { title: "Minefield Rookie", description: "Clear your first Minesweeper minefield.", icon: "💣", group: "Challenges" },
  "daily-deminer": { title: "Daily Deminer", description: "Complete a daily Minesweeper challenge.", icon: "🚩", group: "Challenges" },
  "daily-double": { title: "Double Duty", description: "Complete daily Sudoku and Minesweeper on the same day.", icon: "🏆", group: "Challenges" },
  "cgh-grandmaster": { title: "CGH Grandmaster", description: "Defeat Stockfish on Expert difficulty in Chess.", icon: "👑", group: "Challenges" }
};

const achievementGameRegistry = new Map();
const achievementTiers = [
  { count: 10, label: "Rookie", icon: "🥉" },
  { count: 50, label: "Experienced", icon: "🥈" },
  { count: 100, label: "Veteran", icon: "🥇" },
  { count: 500, label: "Master", icon: "💎" },
  { count: 1000, label: "Legend", icon: "👑" }
];

// Register a future game with an ID, title, and getCompleted(profile, name).
// Milestones are derived from the game's real saved results, not a second counter.
function registerAchievementGame(config) {
  if (!config || !/^[a-z0-9-]+$/.test(config.id) || !config.title ||
      achievementGameRegistry.has(config.id)) return false;
  const getCompleted = typeof config.getCompleted === "function"
    ? config.getCompleted
    : (profile, name) => config.puzzle
      ? getPuzzleStats(config.id, name).played
      : countCompletedGames(profile[config.scoresKey]);
  const game = { id: config.id, title: config.title, icon: config.icon || "🎮", getCompleted };
  achievementGameRegistry.set(config.id, game);
  for (const tier of achievementTiers) {
    achievementDefinitions[config.id + "-" + tier.label.toLowerCase()] = {
      title: config.title + " " + tier.label,
      description: "Complete " + tier.count.toLocaleString() + " " + config.title + " games. Wins, losses, and draws all count.",
      icon: tier.icon,
      group: "Experience",
      target: tier.count,
      current: (profile, name) => game.getCompleted(profile, name)
    };
  }
  return true;
}

[
  ["tic", "Tic-Tac-Toe", "❌", "ticScores"],
  ["connect4", "Connect Four", "🔴", "connectScores"],
  ["checkers", "Checkers", "🔴", "checkersScores"],
  ["chess", "Chess", "♟️", "chessScores"],
  ["dominoes", "Dominoes", "🁫", "dominoesScores"],
  ["backgammon", "Backgammon", "🎲", "backgammonScores"]
].forEach(([id, title, icon, scoresKey]) =>
  registerAchievementGame({ id, title, icon, scoresKey })
);
registerAchievementGame({ id: "sudoku", title: "Sudoku", icon: "🔢", puzzle: true });
registerAchievementGame({ id: "minesweeper", title: "Minesweeper", icon: "💣", puzzle: true });

achievementDefinitions["well-rounded"] = {
  title: "Well Rounded",
  description: "You’ve experienced everything CGH has to offer (for now…)",
  icon: "🌎",
  group: "Exploration",
  target: () => achievementGameRegistry.size,
  current: (profile, name) => [...achievementGameRegistry.values()].filter(
    game => game.getCompleted(profile, name) > 0
  ).length
};

[
  [3, "Getting Started", "🔥"],
  [7, "One Week Wonder", "🔥"],
  [10, "Double Digits", "🔥"],
  [30, "CGH Devotee", "🏆"]
].forEach(([days, title, icon]) => {
  achievementDefinitions["streak-" + days] = {
    title, icon, group: "Dedication",
    description: "Complete at least one game on " + days + " consecutive days.",
    target: days,
    current: profile => getAchievementStreaks(profile).best
  };
});

function localAchievementDay(date = new Date()) {
  return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") +
    "-" + String(date.getDate()).padStart(2, "0");
}

function achievementDayNumber(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const [year, month, day] = key.split("-").map(Number);
  const utc = Date.UTC(year, month - 1, day);
  const parsed = new Date(utc);
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() + 1 !== month ||
      parsed.getUTCDate() !== day) return null;
  return Math.floor(utc / 86400000);
}

// Dated daily puzzle completions predate this feature. Recover their days
// while leaving prior saved scores and unlocked achievements untouched.
function backfillAchievementDays(profile) {
  const previous = Array.isArray(profile.achievementDays) ? profile.achievementDays : [];
  const days = new Set(previous.filter(day => achievementDayNumber(day) !== null));
  for (const key of ["sudokuData", "minesweeperData"]) {
    for (const entry of Object.keys(profile[key]?.completed || {})) {
      const day = entry.split(":")[0];
      if (achievementDayNumber(day) !== null) days.add(day);
    }
  }
  const next = [...days].sort();
  if (next.length === previous.length && next.every((day, i) => day === previous[i])) return false;
  profile.achievementDays = next;
  return true;
}

function getAchievementStreaks(profile) {
  const days = (profile.achievementDays || []).map(achievementDayNumber)
    .filter(day => day !== null).sort((a, b) => a - b);
  let best = 0, run = 0, previous = null;
  for (const day of days) {
    if (day === previous) continue;
    run = day === previous + 1 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = day;
  }
  const today = achievementDayNumber(localAchievementDay());
  return { best, current: previous === today || previous === today - 1 ? run : 0 };
}

function unlockAchievement(id, name = currentProfile, options = {}) {
  if (!Object.hasOwn(achievementDefinitions, id)) return false;
  const profile = profiles[name];
  if (!profile) return false;
  profile.achievements ||= {};
  if (Object.hasOwn(profile.achievements, id)) return false;
  profile.achievements[id] = { unlockedAt: new Date().toISOString() };
  saveProfiles();
  if (!options.silent && name === currentProfile) showAchievementNotification(id);
  return true;
}

function checkDailyDuoAchievement(day) {
  const profile = profiles[currentProfile];
  if (!profile || !day) return;
  const completed = data => Object.keys(data?.completed || {}).some(key => key.startsWith(day + ":"));
  if (completed(profile.sudokuData) && completed(profile.minesweeperData)) unlockAchievement("daily-double");
}

function achievementProgress(id, def, profile, name) {
  const earned = Object.hasOwn(profile.achievements || {}, id);
  const target = typeof def.target === "function" ? def.target(profile, name) : def.target || 1;
  const current = typeof def.current === "function" ? def.current(profile, name) : (earned ? 1 : 0);
  return { target, current: Math.max(0, Number(current) || 0), earned };
}

function syncProfileAchievements(name = currentProfile, silent = true) {
  const profile = profiles[name];
  if (!profile) return;
  let changed = backfillAchievementDays(profile);
  if (!profile.achievements || typeof profile.achievements !== "object") {
    profile.achievements = {};
    changed = true;
  }
  const sudokuKeys = Object.keys(profile.sudokuData?.completed || {});
  const minesKeys = Object.keys(profile.minesweeperData?.completed || {});
  const existing = {
    "andy-approved": sudokuKeys.length > 0,
    "daily-deminer": minesKeys.length > 0,
    "daily-double": sudokuKeys.some(s => minesKeys.some(m => m.split(":")[0] === s.split(":")[0])),
    "first-sweep": getPuzzleStats("minesweeper", name).wins > 0
  };
  for (const [id, def] of Object.entries(achievementDefinitions)) {
    if (Object.hasOwn(profile.achievements, id)) continue;
    const { target, current } = achievementProgress(id, def, profile, name);
    if (!(existing[id] || (typeof def.current === "function" && target > 0 && current >= target))) continue;
    profile.achievements[id] = { unlockedAt: new Date().toISOString() };
    changed = true;
    if (!silent && name === currentProfile) showAchievementNotification(id);
  }
  if (changed) saveProfiles();
}

// Record actual finished results, including losses/draws/forfeits. Called only
// after the game's usual stats are saved, never just on starting a session.
function recordAchievementGame(id, name = currentProfile) {
  const profile = profiles[name];
  if (!profile || !achievementGameRegistry.has(id)) return;
  profile.achievementDays ||= [];
  const today = localAchievementDay();
  if (!profile.achievementDays.includes(today)) {
    profile.achievementDays.push(today);
    saveProfiles(); // Save the day even when no achievement unlocks.
  }
  syncProfileAchievements(name, false);
}

const achievementToastQueue = [];
let achievementToastTimer;

function showAchievementNotification(id) {
  if (!achievementDefinitions[id]) return;
  achievementToastQueue.push(id);
  if (!achievementToastTimer) displayNextAchievementToast();
}

function displayNextAchievementToast() {
  const id = achievementToastQueue.shift();
  if (!id) { achievementToastTimer = null; return; }
  const achievement = achievementDefinitions[id];
  let toast = document.getElementById("achievementToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "achievementToast";
    toast.className = "achievement-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.setAttribute("aria-atomic", "true");
    document.body.appendChild(toast);
  }
  toast.hidden = false;
  toast.classList.remove("fading");
  toast.textContent = achievement.icon + " Achievement unlocked!\n" +
    achievement.title + "\n" + achievement.description;
  playSound(achievementSound);
  achievementToastTimer = setTimeout(() => {
    toast.classList.add("fading");
    achievementToastTimer = setTimeout(() => {
      toast.hidden = true;
      achievementToastTimer = null;
      displayNextAchievementToast();
    }, 900);
  }, 3600);
}

function showAchievementsView() {
  if (!requirePlayerProfile()) return;
  syncProfileAchievements(currentProfile, true);
  const profile = profiles[currentProfile];
  const definitions = Object.entries(achievementDefinitions);
  const list = document.getElementById("achievementsList");
  list.replaceChildren();
  for (const group of ["Dedication", "Exploration", "Challenges", "Experience"]) {
    const section = document.createElement("section");
    section.className = "achievement-group";
    const heading = document.createElement("h3");
    heading.textContent = group;
    section.appendChild(heading);
    for (const [id, achievement] of definitions.filter(([, def]) => (def.group || "Challenges") === group)) {
      const { target, current, earned } = achievementProgress(id, achievement, profile, currentProfile);
      const card = document.createElement("article");
      card.className = "achievement-card " + (earned ? "unlocked" : "locked");
      const title = document.createElement("h4");
      title.textContent = achievement.icon + " " + achievement.title;
      const description = document.createElement("p");
      description.textContent = achievement.description;
      const bar = document.createElement("progress");
      bar.className = "achievement-progress";
      bar.max = Math.max(1, target);
      bar.value = Math.min(target, current);
      bar.setAttribute("aria-label", achievement.title + " progress");
      const progressText = document.createElement("p");
      progressText.className = "achievement-progress-text";
      progressText.textContent = Math.min(target, current).toLocaleString() + " / " + target.toLocaleString();
      const status = document.createElement("p");
      status.className = "achievement-status";
      if (earned) {
        const when = profile.achievements[id]?.unlockedAt;
        const date = when && !Number.isNaN(Date.parse(when)) ? new Date(when).toLocaleDateString() : "";
        status.textContent = "🏆 Unlocked" + (date ? " · " + date : "");
      } else {
        status.textContent = "🔒 Locked";
      }
      card.append(title, description, bar, progressText, status);
      section.appendChild(card);
    }
    list.appendChild(section);
  }
  const unlocked = definitions.filter(([id]) => Object.hasOwn(profile.achievements, id)).length;
  const streak = getAchievementStreaks(profile);
  document.getElementById("achievementsSummary").textContent =
    "🏆 " + unlocked + " / " + definitions.length + " unlocked · 🔥 " +
    streak.current + "-day streak (best: " + streak.best + ")";
  showProfileView("achievementsView");
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
 if (!currentProfile || !profiles[currentProfile]) return;
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
for (const name of Object.keys(profiles)) syncProfileAchievements(name, true);

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
  if (pendingGame === "sudoku" || pendingGame === "minesweeper") returnToMainMenu();
  delete profiles[currentProfile];

  saveProfiles();
  currentProfile = null; 
  localStorage.removeItem("currentProfile");

  renderProfileList();
  showProfileView("switchProfileView");
  document.getElementById("profileSetupNotice")?.classList.remove("hidden");
}

function switchProfile(name) {
  if (pendingGame === "sudoku" || pendingGame === "minesweeper") returnToMainMenu();
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
  if (hasPlayerProfile()) finishProfileSetup();
  else requirePlayerProfile();
}


function getPuzzleStats(game, profileName = currentProfile) {
  const profile = profiles[profileName] || {};
  const data = profile[`${game}Data`] || {};

  const dailyTotal = Object.keys(data.completed || {}).length;
  const freeTotal = Number(data.freeCompleted) || 0;

  // Minesweeper already saves failed attempts in its sessions.
  const lossesTotal = game === "minesweeper"
    ? Object.values(data.sessions || {}).reduce(
        (total, session) => total + (Number(session.failures) || 0),
        0
      )
    : 0;

  // Baselines will let us reset statistics later
  // without deleting daily completion history.
  const baseline = data.statsBaseline || {};

  const daily = Math.max(0, dailyTotal - (baseline.daily || 0));
  const free = Math.max(0, freeTotal - (baseline.free || 0));
  const losses = Math.max(0, lossesTotal - (baseline.losses || 0));

  const wins = daily + free;

  return {
    daily,
    free,
    wins,
    losses,
    played: wins + losses
  };
}


function getGamesPlayed() {
  const classicGames = getStatGames().reduce(
    (total, [, scores]) => total + countCompletedGames(scores),
    0
  );

  const sudokuGames = getPuzzleStats("sudoku").played;
  const minesweeperGames = getPuzzleStats("minesweeper").played;

  return classicGames + sudokuGames + minesweeperGames;
}



function getFavoriteGame() {
  let favorite = "None";
  let mostPlayed = 0;

  for (const [name, scores] of getStatGames()) {
    const played = countCompletedGames(scores);

    if (played > mostPlayed) {
      mostPlayed = played;
      favorite = name;
    }
  }

  for (const [name, game] of [
    ["Sudoku", "sudoku"],
    ["Minesweeper", "minesweeper"]
  ]) {
    const played = getPuzzleStats(game).played;

    if (played > mostPlayed) {
      mostPlayed = played;
      favorite = name;
    }
  }

  return favorite;
}



//STATISTICS


function getPuzzleStatsCardHTML(game) {
  const stats = getPuzzleStats(game);
  const isMinesweeper = game === "minesweeper";
  const name = isMinesweeper ? "Minesweeper" : "Sudoku";
  const data = profiles[currentProfile]?.[`${game}Data`] || {};

  const difficulties = isMinesweeper
    ? ["easy", "medium", "hard"]
    : ["easy", "medium", "hard", "expert"];

  const best = {};
  const records = Object.entries(data.completed || {});

  let cleanDaily = 0;
  let assistedDaily = 0;

  for (const [key, record] of records) {
    if (!record) continue;

    const difficulty = key.split(":").pop();
    const seconds = Number(record.seconds);

    if (!isMinesweeper) {
      if (Number(record.hints) === 0) {
        cleanDaily++;
      } else if (Number(record.hints) > 0) {
        assistedDaily++;
      }

      // A hint-assisted or previously assisted
      // daily puzzle cannot set a personal best.
      if (
        Number(record.hints) !== 0 ||
        record.everAssisted
      ) continue;
    }

    if (
      !difficulties.includes(difficulty) ||
      !Number.isFinite(seconds) ||
      seconds < 0
    ) continue;

    if (
      best[difficulty] === undefined ||
      seconds < best[difficulty]
    ) {
      best[difficulty] = seconds;
    }
  }

  const formatTime = seconds =>
    seconds === undefined
      ? "—"
      : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  const winRate = stats.played
    ? Math.round(stats.wins / stats.played * 100)
    : 0;

  return `
    <div class="stat-card">
      <h3>${name}</h3>

      <p>${isMinesweeper
        ? "Minefields cleared"
        : "Puzzles solved"}: ${stats.wins}</p>

      ${isMinesweeper ? `
        <p>Minefields lost: ${stats.losses}</p>
        <p>Total attempts: ${stats.played}</p>
        <p>Win rate: ${winRate}%</p>
      ` : `
        <p>Daily clean completions: ${cleanDaily}</p>
        <p>Daily assisted completions: ${assistedDaily}</p>
      `}

      <div class="stat-matchups">
        <div class="stat-matchup">
          <h4>Daily</h4>
          <p>Completed: ${stats.daily}</p>
        </div>
        <div class="stat-matchup">
          <h4>Free Play</h4>
          <p>Completed: ${stats.free}</p>
        </div>
      </div>

      <h4>${isMinesweeper
  ? "Best Daily Times"
  : "Best Clean Daily Times"}</h4>

${difficulties.map(difficulty => `
  <p>${capitalize(difficulty)}:
    ${formatTime(best[difficulty])}
  </p>
`).join("")}

<h4>${isMinesweeper
  ? "Best Free Play Times"
  : "Best Clean Free Play Times"}</h4>

${difficulties.map(difficulty => `
  <p>${capitalize(difficulty)}:
    ${Number.isFinite(data.freeBests?.[difficulty])
      ? formatTime(data.freeBests[difficulty])
      : "—"}
  </p>
`).join("")}

      ${!isMinesweeper ? `
        <small>
          Only hint-free, never-assisted daily puzzles
          qualify for personal bests.
        </small>
      ` : ""}
    </div>
  `;
}


function showStatistics() {
  showAppTitle();

  document.querySelector(".menu").classList.add("hidden");
  document.getElementById("backButton").style.display =
    "inline-block";

  const cards = getStatGames().map(([name, scores]) => `
    <div class="stat-card">
      <h3>${name}</h3>
      ${name === "Dominoes" ? `
        <div class="domino-stats-tabs" role="group" aria-label="Dominoes statistics">
          ${[["overall", "Overall"], ["classic", "Classic"], ["allfives", "All Fives"]].map(([variant, label]) => `
            <button type="button" data-variant="${variant}"
              aria-pressed="${variant === "overall"}"
              onclick="selectDominoesStats('${variant}')">${label}</button>
          `).join("")}
        </div>
        <div id="dominoStatsMatchups" aria-live="polite">
          ${getStatsMatchupsHTML(scores, true)}
        </div>
      ` : getStatsMatchupsHTML(scores)}
    </div>
  `).join("");

  const puzzleCards = ["sudoku", "minesweeper"]
    .map(getPuzzleStatsCardHTML)
    .join("");

  setGameAreaContent(`
    <h2><span id="statisticsProfileName"></span>'s Statistics</h2>

    <div class="stats-panel">
      <h3>Total Games Played</h3>
      <p>${getGamesPlayed()}</p>

      <div class="stat-grid">
        ${cards}
        ${puzzleCards}
      </div>
    </div>
  `);

  document.getElementById("statisticsProfileName").textContent =
    getProfileDisplayName();
}

function getStatsMatchupsHTML(scores, playerOne = false) {
  return `<div class="stat-matchups">
    <div class="stat-matchup">
      <h4>VS AI</h4>
      <p>Wins: ${scores.ai.win}</p>
      <p>Losses: ${scores.ai.loss}</p>
      <p>Draws: ${scores.ai.draw}</p>
    </div>
    <div class="stat-matchup">
      <h4>VS Player</h4>
      <p>Wins: ${scores.local.win}</p>
      <p>Losses: ${scores.local.loss}</p>
      <p>Draws: ${scores.local.draw}</p>
      ${playerOne ? "<small>Results for Player 1</small>" : ""}
    </div>
  </div>`;
}

function selectDominoesStats(variant) {
  if (!["overall", "classic", "allfives"].includes(variant)) return;
  const panel = document.getElementById("dominoStatsMatchups");
  if (!panel) return;
  const scores = getDominoesScores();
  panel.innerHTML = getStatsMatchupsHTML(variant === "overall" ? scores : scores.variants[variant], true);
  document.querySelectorAll(".domino-stats-tabs button").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.variant === variant));
  });
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
profiles[currentProfile].dominoesScores = {
  ai: { win: 0, loss: 0, draw: 0 },
  local: { win: 0, loss: 0, draw: 0 }
};
profiles[currentProfile].backgammonScores = {
  ai: { win: 0, loss: 0, draw: 0 },
  local: { win: 0, loss: 0, draw: 0 }
};

updateProfileSummary();

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

 const statsPanel = document.querySelector(".stats-panel");
  if (statsPanel) {
    showStatistics();
  }
}

//MAIN MENU
function startGame(game) {
  if (!requirePlayerProfile()) return;
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

    if (game === "dominoes") {
      showDominoesVariantScreen();
    } else {
      showModeSelectScreen();
    }
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

function showDominoesVariantScreen() {
  dominoes.stop();
  hideAppTitle();
  const template = document.getElementById("dominoesVariantTemplate");
  setGameAreaContent(template.innerHTML);
}

function selectDominoesVariant(variant) {
  if (!["classic", "allfives"].includes(variant)) return;
  dominoes.variant = variant;
  showModeSelectScreen();
}

function showDominoesTargetScreen() {
  setGameAreaContent(`
    <h2>All Fives — Winning Score</h2>
    <p>Points carry over between rounds. First to the target wins.</p>
    <div class="mode-select-screen domino-targets">
      <button onclick="startDominoesMatch(100)">100 · Quick</button>
      <button onclick="startDominoesMatch(150)">150 · Standard</button>
      <button onclick="startDominoesMatch(200)">200 · Extended</button>
    </div>
    <div class="domino-setup-back">
      <button onclick="${dominoes.mode === "ai" ? "showDifficultyScreen()" : "showModeSelectScreen()"}">Back</button>
    </div>
  `);
}

function startDominoesMatch(target) {
  if (![100, 150, 200].includes(target)) return;
  dominoes.targetScore = target;
  launchPendingGame();
}

function showModeSelectScreen() {
 setGameAreaContent(`
 <h2>${pendingGame === "dominoes" ? `Dominoes — ${dominoes.variant === "allfives" ? "All Fives" : "Classic"}` : "Select Mode"}</h2>

 <div class="mode-select-screen">
 <button onclick="selectGameMode('ai')">
 VS AI
 </button>

 <button onclick="selectGameMode('local')">
 ${pendingGame === "dominoes" ? "VS Player" : "VS Local"}
 </button>
 </div>
 ${pendingGame === "dominoes" ? `<div class="domino-setup-back"><button onclick="showDominoesVariantScreen()">Back to variations</button></div>` : ""}
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

  if (pendingGame === "dominoes") {
    dominoes.mode = mode;
  }
  if (pendingGame === "backgammon") {
  backgammon.mode = mode;
}

  if (
  mode === "ai" &&
  (
    pendingGame === "backgammon" ||
    pendingGame === "dominoes" ||
    pendingGame === "connect4" ||
    pendingGame === "checkers" ||
    pendingGame === "chess"
  )
) {
  showDifficultyScreen();
} else if (pendingGame === "chess") {
  showChessTimeScreen();
} else if (pendingGame === "dominoes" && dominoes.variant === "allfives") {
  showDominoesTargetScreen();
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

${pendingGame === "checkers"
  ? `<button onclick="selectDifficulty('adaptive')">
       Adaptive
     </button>`
  : ""}

  ${pendingGame === "chess"
  ? `<button onclick="selectDifficulty('expert')">
       Expert — Stockfish
     </button>`
  : ""}

 </div>
 ${pendingGame === "dominoes" ? `<div class="domino-setup-back"><button onclick="showModeSelectScreen()">Back to opponents</button></div>` : ""}
 `);
}

function selectDifficulty(difficulty) {
  if (pendingGame === "checkers") {
    checkersDifficulty = difficulty;
    localStorage.setItem("checkersDifficulty", difficulty);
  }

  if (pendingGame === "connect4") {
    connectDifficulty = difficulty;
    localStorage.setItem("connectDifficulty", difficulty);
  }

  if (pendingGame === "chess") {
    chessDifficulty = difficulty;
    localStorage.setItem("chessDifficulty", difficulty);
  }

  if (pendingGame === "dominoes") {
    dominoes.difficulty = difficulty;
  }
  if (pendingGame === "backgammon") {
  backgammon.difficulty = difficulty;
}

  if (pendingGame === "chess") {
    showChessTimeScreen();
  } else if (pendingGame === "dominoes" && dominoes.variant === "allfives") {
    showDominoesTargetScreen();
  } else {
    launchPendingGame();
  }
}

function showChessTimeScreen() {
  cancelStockfishSearch();
  stopChessClock();
  chessClockStarted = false;
  chessGameActive = false;

  hideAppTitle();

  setGameAreaContent(`
    <h2>Select Time Control</h2>

    <p>
      ${chessGameMode === "ai"
        ? `Vs AI • ${capitalize(chessDifficulty)}`
        : "Vs Local Player"}
    </p>

    <div class="mode-select-screen"
         style="flex-direction:column;align-items:center;gap:18px;">

      ${chessGameMode === "ai" ? `
        <label for="chessColorSelect">Play as</label>
        <select id="chessColorSelect">
          ${["white", "black", "random"].map(color => `
            <option value="${color}" ${color === chessColorChoice ? "selected" : ""}>
              ${capitalize(color)}
            </option>
          `).join("")}
        </select>
      ` : ""}

      <label for="chessTimeSelect">
        Time per player
      </label>

      <select id="chessTimeSelect"
              onchange="document.getElementById('chessIncrementSelect').disabled = this.value === '0'">
        ${[3, 5, 10, 30, 0].map(minutes => `
          <option value="${minutes}"
            ${minutes === chessTimeMinutes ? "selected" : ""}>
            ${minutes === 0
              ? "Unlimited"
              : `${minutes} minutes`}
          </option>
        `).join("")}
      </select>

      <label for="chessIncrementSelect">
        Seconds added after each move
      </label>

      <select id="chessIncrementSelect"
              ${chessTimeMinutes === 0 ? "disabled" : ""}>
        ${[0, 1, 2, 3, 5, 10].map(seconds => `
          <option value="${seconds}"
            ${seconds === chessIncrementSeconds ? "selected" : ""}>
            ${seconds === 0
              ? "No increment"
              : `${seconds} seconds`}
          </option>
        `).join("")}
      </select>

       <button id="chessStartButton"
        onclick="startSelectedChessGame()">
  Start Game
</button>

      <button onclick="${
        chessGameMode === "ai"
          ? "showDifficultyScreen()"
          : "showModeSelectScreen()"
      }">
        Back
      </button>
    </div>
  `);
}

function launchPendingGame() {
  if (!requirePlayerProfile()) return;
  if (pendingGame === "tic") {
    loadTicTacToe();
  } else if (pendingGame === "connect4") {
    loadConnectFour();
  } else if (pendingGame === "checkers") {
    loadCheckers();
  } else if (pendingGame === "chess") {
    loadChess();
  } else if (pendingGame === "dominoes") {
    loadDominoes();
  } else if (pendingGame === "backgammon") {
    loadBackgammon();
  }
}

function setGameAreaContent(html) {
  cancelChessAnimation();
  const gameArea =
    document.getElementById("gameArea");

  gameArea.classList.remove("page-enter");

  void gameArea.offsetWidth;

  gameArea.innerHTML = html;

  requestAnimationFrame(() => {
    gameArea.classList.add("page-enter");
  });
}

function hasActiveMenuGame(game = pendingGame) {
  const area = document.getElementById("gameArea");
  if (!area) return false;

  switch (game) {
    case "tic":
      return !!area.querySelector(".board") && gameActive;
    case "connect4":
      return !!area.querySelector("#connectBoard") && connectGameActive;
    case "checkers":
      return !!area.querySelector("#checkersBoard") && checkersGameActive;
    case "chess":
      return !!area.querySelector("#chessBoard") && chessGameActive;
    case "dominoes":
      return !!area.querySelector(".domino-game") && dominoes.active;
    case "backgammon":
      return !!area.querySelector(".bg-game") && backgammon.active;
    default:
      return false;
  }
}

function showMenu() {
  const game = pendingGame;
  if (game === "sudoku") { sudoku.stop(); returnToMainMenu(); return; }
  if (game === "minesweeper") { minesweeper.stop(); returnToMainMenu(); return; }

  if (!hasActiveMenuGame(game)) {
    returnToMainMenu();
    return;
  }

  showConfirmation(
    "Returning to menu mid game will be a loss. Are you sure?",
    () => {
      if (pendingGame !== game) return;

      // Avoid a second result if the match ended during the dialog.
      if (hasActiveMenuGame(game)) {
        switch (game) {
          case "tic":
            gameActive = false;
            recordTicResult("loss");
            break;

          case "connect4":
            connectGameActive = false;
            recordConnectResult("loss");
            break;

          case "checkers":
            checkersGameActive = false;
            recordCheckersResult("loss");
            break;

          case "chess":
            chessGameActive = false;
            cancelChessAnimation();
            cancelStockfishSearch();
            stopChessClock();
            pendingPromotion = null;
            document.getElementById("promotionOverlay")
              .classList.add("hidden");
            recordChessResult("loss");
            break;

          case "dominoes":
            dominoes.stop();
            recordDominoesResult(
              1,
              dominoes.mode,
              dominoes.scoreProfile,
              dominoes.variant
            );
            playGameResultSound(dominoes.mode, "loss");
            break;

          case "backgammon":
            backgammon.finish(1, true);
             break;
        }
      }

      returnToMainMenu();
    }
  );
}

function returnToMainMenu() {
  if (typeof sudoku !== "undefined") sudoku.stop();
  if (typeof minesweeper !== "undefined") minesweeper.stop();
  gameActive = false;
  connectGameActive = false;
  checkersGameActive = false;
  dominoes.stop();
  backgammon.stop();
  cancelStockfishSearch();
  stopChessClock();
  chessClockStarted = false;
  chessGameActive = false;
  pendingPromotion = null;

  document.getElementById("promotionOverlay")
    .classList.add("hidden");

  pendingGame = null;
  showAppTitle();

  document.querySelector(".menu")
    .classList.remove("hidden");

  document.getElementById("backButton")
    .style.display = "none";

  setGameAreaContent("");
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
const availableThemes = ["dark", "neon", "retro", "wood", "forest", "lawn"];

function setTheme(theme) {
  if (!availableThemes.includes(theme)) theme = "dark";
  document.body.classList.remove(...availableThemes.map(name => name + "-theme"));
  document.body.classList.add(theme + "-theme");
  localStorage.setItem("theme", theme);
  document.querySelectorAll("#themeMenu button").forEach(button => {
    button.setAttribute("aria-pressed", String(button.dataset.theme === theme));
  });
  document.getElementById("themeMenu")?.classList.remove("open");
}

setTheme(localStorage.getItem("theme") || "dark");
updateSoundButton();

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
// Wait for every game script before calculating the profile summary.
setTimeout(requirePlayerProfile, 0);

// DOMINOES STATS AND SOUNDS
const dominoTileSound = new Audio("img/tile-soft.mp3");
dominoTileSound.volume = 0.35;

const dominoLossSound = new Audio("img/loss.mp3");
dominoLossSound.volume = 0.5;
[dominoTileSound, dominoLossSound].forEach(preloadGameSound);

// Keep one gesture-unlocked context and decoded buffers for round/match results.
// A new buffer source is created per result, so completed players are never reused.
let gameResultAudioContext = null;
const gameResultSoundBuffers = new Map();

function loadGameResultBuffer(source, context) {
  const key = source.src;
  if (gameResultSoundBuffers.has(key)) return gameResultSoundBuffers.get(key);
  const pending = fetch(key)
    .then(response => {
      if (!response.ok) throw new Error("Result sound could not be loaded");
      return response.arrayBuffer();
    })
    .then(bytes => context.decodeAudioData(bytes))
    .catch(() => {
      gameResultSoundBuffers.delete(key);
      return null;
    });
  gameResultSoundBuffers.set(key, pending);
  return pending;
}

function unlockGameResultAudio() {
  if (!soundEnabled) return;
  const Context = window.AudioContext || window.webkitAudioContext;
  if (!Context) return;
  try {
    if (!gameResultAudioContext || gameResultAudioContext.state === "closed") {
      gameResultAudioContext = new Context();
      const silent = gameResultAudioContext.createBufferSource();
      silent.buffer = gameResultAudioContext.createBuffer(1, 1, gameResultAudioContext.sampleRate);
      silent.connect(gameResultAudioContext.destination);
      silent.onended = () => silent.disconnect();
      silent.start();
    }
    if (gameResultAudioContext.state !== "running") {
      gameResultAudioContext.resume().catch(() => {});
    }
    [winSound, dominoLossSound].forEach(source => loadGameResultBuffer(source, gameResultAudioContext));
  } catch (error) {
    gameResultAudioContext = null;
  }
}

// Resume again on later gestures if Safari interrupts audio after an app switch.
["pointerdown", "click", "keydown"].forEach(event => {
  document.addEventListener(event, unlockGameResultAudio, { capture: true });
});

async function playGameResultSound(mode, result) {
  if (!soundEnabled || result === "draw") return;
  const source = mode === "ai" && result === "loss" ? dominoLossSound : winSound;
  const context = gameResultAudioContext;
  if (context && context.state !== "closed") {
    try {
      if (context.state !== "running") await context.resume();
      const buffer = await loadGameResultBuffer(source, context);
      if (!soundEnabled) return;
      if (buffer && context.state === "running") {
        const voice = context.createBufferSource();
        const gain = context.createGain();
        voice.buffer = buffer;
        gain.gain.value = source.volume;
        voice.connect(gain);
        gain.connect(context.destination);
        voice.onended = () => { voice.disconnect(); gain.disconnect(); };
        voice.start();
        return;
      }
    } catch (error) {
      // Use the original, warmed HTML player if Web Audio is unavailable.
    }
  }
  if (!soundEnabled) return;
  const primary = preloadGameSound(source)[0];
  primary.warming = false;
  source.pause();
  source.currentTime = 0;
  source.muted = false;
  try {
    await source.play();
  } catch (error) {
    console.warn("Game result sound could not play:", error);
  }
}

function playDominoSound(source) {
  if (!soundEnabled) return;

  const sound = getReadySound(source);
  sound.volume = source.volume;
  sound.play().catch(() => {});
}

function getDominoesScores(name = currentProfile) {
  ensureProfileExists(name);

  if (!profiles[name].dominoesScores) {
    profiles[name].dominoesScores = {
      ai: { win: 0, loss: 0, draw: 0 },
      local: { win: 0, loss: 0, draw: 0 }
    };

    saveProfiles();
  }

  const scores = profiles[name].dominoesScores;
  if (!scores.variants) {
    scores.variants = {
      classic: { ai: { ...scores.ai }, local: { ...scores.local } },
      allfives: {
        ai: { win: 0, loss: 0, draw: 0 },
        local: { win: 0, loss: 0, draw: 0 }
      }
    };
    saveProfiles();
  }
  return scores;
}

function recordDominoesResult(winner, mode, name, variant = "classic") {
  const scores = getDominoesScores(name);
  const result = winner < 0
    ? "draw"
    : winner === 0 ? "win" : "loss";

  scores[mode][result]++;
  scores.variants[variant][mode][result]++;
  saveProfiles();
  recordAchievementGame("dominoes", name);
  updateProfileSummary();
}

function getStatGames() {
  return [
    ["Tic-Tac-Toe", ticScores],
    ["Connect Four", connectScores],
    ["Checkers", checkersScores],
    ["Chess", chessScores],
    ["Dominoes", getDominoesScores()],
    ["Backgammon", getBackgammonScores()]
  ];
}

function countCompletedGames(scores) {
  return ["ai", "local"].reduce((total, mode) => {
    const results = scores?.[mode] || {};
    return total + ["win", "loss", "draw"].reduce(
      (sum, result) => sum + Math.max(0, Number(results[result]) || 0), 0
    );
  }, 0);
}

// BACKGAMMON STATS
function getBackgammonScores(name = currentProfile) {
  ensureProfileExists(name);

  if (!profiles[name].backgammonScores) {
    profiles[name].backgammonScores = {
      ai: { win: 0, loss: 0, draw: 0 },
      local: { win: 0, loss: 0, draw: 0 }
    };
  }

  return profiles[name].backgammonScores;
}

function recordBackgammonResult(winner, mode, name) {
  const scores = getBackgammonScores(name);
  scores[mode][winner === 0 ? "win" : "loss"]++;

  saveProfiles();
  recordAchievementGame("backgammon", name);
  updateProfileSummary();
}
