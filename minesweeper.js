/* Classic Games Hub: free-play and deterministic daily Minesweeper. */
const minesweeper = (function MinesweeperFactory() {
  const levels = {
    easy: { rows: 9, cols: 9, mines: 10 },
    medium: { rows: 16, cols: 16, mines: 40 },
    hard: { rows: 16, cols: 30, mines: 99 }
  };
  let mode = "free";
  let session = null;
  let sessionStore = null;
  let timer = null;
  let tool = "reveal";
  let pressTimer = null;
  let longPressed = false;
  let pressIndex = -1;

  function dateKey() {
    return sudoku.dateKey();
  }
  function random(seed) {
    let h = 2166136261;
    for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return () => {
      h += 0x6d2b79f5;
      let t = Math.imul(h ^ h >>> 15, 1 | h);
      t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function shuffle(array, rng) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
  function generateMines(seed, rows, cols, count) {
    return shuffle(Array.from({ length: rows * cols }, (_, i) => i), random(seed)).slice(0, count).sort((a, b) => a - b);
  }
  function neighbors(i, s) {
    const r = Math.floor(i / s.cols), c = i % s.cols, result = [];
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < s.rows && nc >= 0 && nc < s.cols) result.push(nr * s.cols + nc);
    }
    return result;
  }
  // The daily seed fixes the initial minefield. A deterministic relocation
  // protects the first revealed cell and its neighbors on every new attempt.
  function protectFirstClick(s, i) {
    const safe = new Set([i, ...neighbors(i, s)]);
    const mines = new Set(s.mineCells);
    const displaced = [...mines].filter(index => safe.has(index));
    for (const index of displaced) mines.delete(index);
    const candidates = shuffle(
      Array.from({ length: s.rows * s.cols }, (_, index) => index).filter(index => !safe.has(index) && !mines.has(index)),
      random(s.seed + ":safe:" + i)
    );
    for (let j = 0; j < displaced.length; j++) mines.add(candidates[j]);
    s.mineCells = [...mines].sort((a, b) => a - b);
  }
  function countAdjacent(i, s, mines = new Set(s.mineCells)) {
    return neighbors(i, s).filter(n => mines.has(n)).length;
  }
  function data() {
    const profile = profiles[currentProfile];
    profile.minesweeperData ||= { sessions: {}, completed: {}, freeCompleted: 0 };
    profile.minesweeperData.sessions ||= {};
    profile.minesweeperData.completed ||= {};
    return profile.minesweeperData;
  }
  function save() {
    if (session && sessionStore) {
      sessionStore.sessions[session.key] = session;
      saveProfiles();
    }
  }
  function stop() {
    clearInterval(timer);
    timer = null;
    clearTimeout(pressTimer);
    pressTimer = null;
    save();
    session = null;
    sessionStore = null;
  }
  function choose(nextMode) {
    if (!["daily", "free"].includes(nextMode) || !requirePlayerProfile()) return;
    stop();
    mode = nextMode;
    pendingGame = "minesweeper";
    document.querySelector(".menu").classList.add("hidden");
    document.getElementById("backButton").style.display = "inline-block";
    hideAppTitle();
    const complete = data().completed;
    setGameAreaContent(`<section class="mines-game">
      <h2>${mode === "daily" ? "Daily Minesweeper" : "Minesweeper · Free Play"}</h2>
      <p>${mode === "daily" ? dateKey() + " · One daily minefield per difficulty. Retries allowed." : "Unlimited minefields. Start with any difficulty."}</p>
      <p>Choose your difficulty</p>
      <div class="game-grid mines-levels">${Object.entries(levels).map(([key, config]) =>
        `<button type="button" class="game-card" onclick="minesweeper.begin('${key}')"><h2>${key[0].toUpperCase() + key.slice(1)}</h2>${config.cols} × ${config.rows} · ${config.mines} mines${mode === "daily" && complete[dateKey() + ":" + key] ? "<span>✓ Completed</span>" : ""}</button>`
      ).join("")}</div>
      <p>Reveal every safe square to win. No need to flag every mine.</p>
    </section>`);
  }
  function begin(difficulty, fresh = false) {
    if (!levels[difficulty] || !requirePlayerProfile()) return;
    stop();
    const config = levels[difficulty], day = dateKey();
    const key = mode === "daily" ? day + ":" + difficulty : "free:" + difficulty;
    sessionStore = data();
    const previous = sessionStore.sessions[key];
    session = !fresh && previous && previous.mode === mode && previous.difficulty === difficulty ? previous : null;
    if (!session) {
      const seed = mode === "daily" ? "cgh-mines-v1:" + key : "cgh-mines-free:" + Date.now() + ":" + Math.random();
      session = {
        key, mode, difficulty, day, seed, ...config,
        mineCells: generateMines(seed, config.rows, config.cols, config.mines),
        revealed: [], flags: [], started: false, done: false, won: false,
        exploded: -1, seconds: 0, failures: previous?.failures || 0
      };
    }
    tool = "reveal";
    setGameAreaContent(`<section class="mines-game">
      <h2>${mode === "daily" ? "Daily " : ""}Minesweeper</h2>
      <p>${difficulty[0].toUpperCase() + difficulty.slice(1)} · ${session.cols} × ${session.rows}${mode === "daily" ? " · " + session.day : ""}</p>
      <p id="minesStatus" role="status" aria-live="polite"></p>
      <div class="mines-scroll" tabindex="0" aria-label="Minesweeper board; scroll to view more columns">
        <div id="minesBoard" class="mines-board" role="group" aria-label="Minesweeper cells" style="--mines-cols:${session.cols};--mines-cell:${session.cols > 16 ? "32px" : session.cols > 9 ? "35px" : "38px"}"></div>
      </div>
      <div class="mines-tools" role="group" aria-label="Tap action">
        <button id="minesReveal" type="button" onclick="minesweeper.setTool('reveal')">🔎 Reveal</button>
        <button id="minesFlag" type="button" onclick="minesweeper.setTool('flag')">🚩 Flag</button>
      </div>
      <div class="mines-actions">
        <button type="button" onclick="minesweeper.choose('${mode}')">Difficulty</button>
        ${mode === "free" ? '<button type="button" onclick="minesweeper.newPuzzle()">New Puzzle</button>' : ""}
        <button id="minesRetry" class="${session.done && !session.won ? "" : "hidden"}" type="button" onclick="minesweeper.retry()">Retry</button>
      </div>
      <p>Desktop: left-click to reveal, right-click to flag. Mobile: tap with the Reveal/Flag buttons below the board, or long-press to flag.</p>
      <p>First reveal is safe. Your progress is saved when you return to the menu.</p>
    </section>`);
    const board = document.getElementById("minesBoard");
    board.addEventListener("click", event => {
      const cell = event.target.closest(".mines-cell");
      if (!cell || !board.contains(cell)) return;
      if (longPressed) { longPressed = false; return; }
      const i = Number(cell.dataset.index);
      if (tool === "flag") toggleFlag(i);
      else reveal(i);
    });
    board.addEventListener("contextmenu", event => {
      const cell = event.target.closest(".mines-cell");
      if (!cell || !board.contains(cell)) return;
      event.preventDefault();
      if (longPressed) return;
      clearTimeout(pressTimer);
      toggleFlag(Number(cell.dataset.index));
    });
    board.addEventListener("pointerdown", event => {
      if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
      const cell = event.target.closest(".mines-cell");
      if (!cell) return;
      clearTimeout(pressTimer);
      longPressed = false;
      pressIndex = Number(cell.dataset.index);
      pressTimer = setTimeout(() => {
        if (session && !session.done) {
          longPressed = true;
          toggleFlag(pressIndex);
        }
        pressTimer = null;
      }, 480);
    });
    for (const type of ["pointerup", "pointercancel", "pointerleave"]) {
      board.addEventListener(type, () => { clearTimeout(pressTimer); pressTimer = null; });
    }
    document.getElementById("minesRetry").classList.toggle("hidden", !session.done || session.won);
    render();
    save();
    timer = setInterval(() => {
      if (!session || session.done || !session.started || document.hidden) return;
      session.seconds++;
      status();
      if (session.seconds % 10 === 0) save();
    }, 1000);
  }
  function status() {
    const el = document.getElementById("minesStatus");
    if (!el || !session) return;
    const s = session;
    const heading = s.done ? (s.won ? "🏆 Minefield cleared! · " : "💥 Mine hit! · ") : "";
    el.textContent = heading + `Mines: ${s.mines} · Flags: ${s.flags.length} · Time: ${Math.floor(s.seconds / 60)}:${String(s.seconds % 60).padStart(2, "0")}` + (s.mode === "daily" && s.failures ? ` · Attempts lost: ${s.failures}` : "");
  }
  function setTool(next) {
    if (!["reveal", "flag"].includes(next)) return;
    tool = next;
    const revealButton = document.getElementById("minesReveal"), flagButton = document.getElementById("minesFlag");
    if (revealButton && flagButton) {
      revealButton.setAttribute("aria-pressed", String(tool === "reveal"));
      flagButton.setAttribute("aria-pressed", String(tool === "flag"));
      revealButton.classList.toggle("selected", tool === "reveal");
      flagButton.classList.toggle("selected", tool === "flag");
    }
  }
  function render() {
    const board = document.getElementById("minesBoard");
    if (!board || !session) return;
    const s = session, mineSet = new Set(s.mineCells), shown = new Set(s.revealed), flagged = new Set(s.flags);
    board.innerHTML = Array.from({ length: s.rows * s.cols }, (_, i) => {
      const open = shown.has(i), mine = mineSet.has(i);
      const showMine = s.done && !s.won && mine;
      const wrongFlag = s.done && !s.won && flagged.has(i) && !mine;
      const count = open && !mine ? countAdjacent(i, s, mineSet) : 0;
      const label = wrongFlag ? "✕" : (flagged.has(i) && !open ? "🚩" : showMine || (open && mine) ? "💣" : count || "");
      const classes = [
        "mines-cell", open ? "opened" : "covered",
        (flagged.has(i) && !open) ? "flagged" : "",
        (s.done && i === s.exploded) ? "exploded" : "",
        (open && count) ? "n" + count : "",
        wrongFlag ? "wrong-flag" : ""
      ].filter(Boolean).join(" ");
      const readable = wrongFlag ? "incorrect flag" : showMine ? "mine" : flagged.has(i) ? "flagged" : open ? (count ? `${count} adjacent mines` : "clear") : "hidden";
      return `<button type="button" class="${classes}" data-index="${i}" aria-label="Row ${Math.floor(i / s.cols) + 1}, column ${i % s.cols + 1}, ${readable}">${label}</button>`;
    }).join("");
    setTool(tool);
    document.getElementById("minesRetry")?.classList.toggle("hidden", !s.done || s.won);
    status();
  }
  function toggleFlag(i) {
    if (!session || session.done || session.revealed.includes(i)) return;
    const flags = new Set(session.flags);
    if (flags.has(i)) flags.delete(i);
    else flags.add(i);
    session.flags = [...flags].sort((a, b) => a - b);
    save();
    render();
  }
  function reveal(i) {
    if (!session || session.done || session.flags.includes(i)) return;
    const s = session;
    if (s.revealed.includes(i)) {
      const number = countAdjacent(i, s);
      if (!number) return;
      const near = neighbors(i, s);
      if (near.filter(n => s.flags.includes(n)).length === number) {
        for (const n of near) {
          if (s.done) break;
          if (!s.flags.includes(n) && !s.revealed.includes(n)) reveal(n);
        }
      }
      return;
    }
    if (!s.started) {
      protectFirstClick(s, i);
      s.started = true;
    }
    const mines = new Set(s.mineCells);
    if (mines.has(i)) {
      s.done = true;
      s.won = false;
      s.exploded = i;
      s.failures++;
      playGameResultSound("ai", "loss");
    } else {
      const shown = new Set(s.revealed), flags = new Set(s.flags), stack = [i];
      while (stack.length) {
        const next = stack.pop();
        if (shown.has(next) || flags.has(next) || mines.has(next)) continue;
        shown.add(next);
        if (countAdjacent(next, s, mines) === 0) {
          for (const near of neighbors(next, s)) if (!shown.has(near) && !flags.has(near)) stack.push(near);
        }
      }
      s.revealed = [...shown].sort((a, b) => a - b);
      if (s.revealed.length === s.rows * s.cols - s.mines) {
        s.done = true;
        s.won = true;
        s.flags = [...mines].sort((a, b) => a - b);
        if (s.mode === "daily") {
          sessionStore.completed[s.key] ||= { seconds: s.seconds, failures: s.failures };
          unlockAchievement("daily-deminer");
          checkDailyDuoAchievement(s.day);
        } else {
          sessionStore.freeCompleted++;
        }
        unlockAchievement("first-sweep");
        playGameResultSound("ai", "win");
      }
    }
    save();
    render();
  }
  function newPuzzle() {
    if (!session || mode !== "free") return;
    if (session.done) { begin(session.difficulty, true); return; }
    showConfirmation("Replace your current free-play minefield?", () => begin(session.difficulty, true));
  }
  function retry() {
    if (session && session.done && !session.won) begin(session.difficulty, true);
  }
  document.addEventListener("keydown", event => {
    if (pendingGame !== "minesweeper" || !session || !event.target?.classList?.contains("mines-cell")) return;
    if (event.key.toLowerCase() === "f") {
      event.preventDefault();
      toggleFlag(Number(event.target.dataset.index));
    }
  });
  return { choose, begin, stop, setTool, reveal, toggleFlag, newPuzzle, retry, generateMines, protectFirstClick, neighbors };
})();
function startMinesweeper(mode) { minesweeper.choose(mode); }
