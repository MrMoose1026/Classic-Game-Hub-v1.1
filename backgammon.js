// BACKGAMMON — single games, no doubling cube.
// Positive points = Ivory; negative points = Charcoal.
const bgRules = {
  initial() {
    const points = Array(24).fill(0);

    [
      [23, 2], [12, 5], [7, 3], [5, 5],
      [0, -2], [11, -5], [16, -3], [18, -5]
    ].forEach(([point, count]) => {
      points[point] = count;
    });

    return { points, bar: [0, 0], off: [0, 0] };
  },

  clone(s) {
    return {
      points: s.points.slice(),
      bar: s.bar.slice(),
      off: s.off.slice()
    };
  },

  distance(point, player) {
    return player === 0 ? point + 1 : 24 - point;
  },

  count(s, point, player) {
    return Math.max(
      0,
      s.points[point] * (player === 0 ? 1 : -1)
    );
  },

  home(s, player) {
    return !s.bar[player] && s.points.every(
      (_, p) =>
        !this.count(s, p, player) ||
        this.distance(p, player) <= 6
    );
  },

  moves(s, player, die) {
    const sign = player === 0 ? 1 : -1;

    const origins = s.bar[player]
      ? [-1]
      : s.points
          .map((_, p) => p)
          .filter(p => this.count(s, p, player));

    const moves = [];

    for (const from of origins) {
      const to = from === -1
        ? player === 0 ? 24 - die : die - 1
        : from - sign * die;

      if (to >= 0 && to < 24) {
        if (s.points[to] * sign >= -1) {
          moves.push({ from, to, die });
        }
      } else if (from !== -1 && this.home(s, player)) {
        const distance = this.distance(from, player);

        const higher = s.points.some(
          (_, p) =>
            this.count(s, p, player) &&
            this.distance(p, player) > distance
        );

        if (
          die === distance ||
          (die > distance && !higher)
        ) {
          moves.push({ from, to: 24, die });
        }
      }
    }

    return moves;
  },

  apply(s, player, move) {
    const next = this.clone(s);
    const sign = player === 0 ? 1 : -1;

    if (move.from === -1) {
      next.bar[player]--;
    } else {
      next.points[move.from] -= sign;
    }

    if (move.to === 24) {
      next.off[player]++;
    } else {
      if (next.points[move.to] === -sign) {
        next.points[move.to] = 0;
        next.bar[1 - player]++;
      }

      next.points[move.to] += sign;
    }

    return next;
  },

  // Look through complete turns to enforce maximum dice usage.
  turns(s, player, dice) {
    const memo = new Map();

    const visit = (state, remaining) => {
      if (!remaining.length || state.off[player] === 15) {
        return [{ moves: [], state }];
      }

      const key = JSON.stringify([
        state,
        remaining.slice().sort()
      ]);

      if (memo.has(key)) return memo.get(key);

      let choices = [];

      for (const die of new Set(remaining)) {
        const rest = remaining.slice();
        rest.splice(rest.indexOf(die), 1);

        for (const move of this.moves(state, player, die)) {
          const next = this.apply(state, player, move);

          for (const tail of visit(next, rest)) {
            choices.push({
              moves: [move, ...tail.moves],
              state: tail.state
            });
          }
        }
      }

      if (!choices.length) {
        choices = [{ moves: [], state }];
      }

      const maximum = Math.max(
        ...choices.map(c => c.moves.length)
      );

      choices = choices.filter(
        c => c.moves.length === maximum
      );

      const unique = new Map();

      for (const choice of choices) {
        unique.set(
          JSON.stringify([choice.moves[0], choice.state]),
          choice
        );
      }

      choices = [...unique.values()];
      memo.set(key, choices);
      return choices;
    };

    let turns = visit(s, dice);

    if (
      dice.length === 2 &&
      dice[0] !== dice[1] &&
      turns[0].moves.length === 1
    ) {
      const high = Math.max(
        ...turns.map(t => t.moves[0].die)
      );

      turns = turns.filter(
        t => t.moves[0].die === high
      );
    }

    return turns;
  },

  pips(s, player) {
    return 25 * s.bar[player] +
      s.points.reduce(
        (sum, _, p) =>
          sum +
          this.count(s, p, player) *
          this.distance(p, player),
        0
      );
  },

  victory(s, winner) {
    const loser = 1 - winner;

    if (s.off[loser]) return "Single";

    const inWinnerHome = s.points.some(
      (_, p) =>
        this.count(s, p, loser) &&
        this.distance(p, winner) <= 6
    );

    if (s.bar[loser] || inWinnerHome) {
      return "Backgammon";
    }

    return "Gammon";
  }
};

const backgammonDiceSound = new Audio("img/dice.wav");
backgammonDiceSound.preload = "auto";
backgammonDiceSound.volume = 0.35;

const backgammon = {
  mode: "ai",
  difficulty: "medium",
  active: false,
  timer: null,
  version: 0,
  state: null,
  turn: 0,
  dice: [],
  rolled: false,
  opening: true,
  selected: null,
  selectedDie: null,
  choices: [],
  message: "",
  history: [],
  rulesOpen: false,
  rolling: false,
  rollPreview: [],

  escape(value) {
    const replacements = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return String(value).replace(
      /[&<>"']/g,
      c => replacements[c]
    );
  },

  name(player) {
    return player === 0
      ? this.playerName
      : this.mode === "ai" ? "AI" : "Player 2";
  },

  human() {
    return this.mode === "local" || this.turn === 0;
  },

  stop() {
  clearTimeout(this.timer);
  this.timer = null;
  this.active = false;
  this.rolling = false;
  this.rollPreview = [];
  this.version++;
  backgammonDiceSound.pause();
  backgammonDiceSound.currentTime = 0;
},

  start() {
    this.stop();

    this.scoreProfile = currentProfile;
    this.playerName = getShortProfileName();
    getBackgammonScores(this.scoreProfile);

    this.state = bgRules.initial();
    this.turn = 0;
    this.dice = [];
    this.lastRoll = [];
    this.rolled = false;
    this.opening = true;
    this.selected = null;
    this.selectedDie = null;
    this.choices = [];
    this.legal = [];
    this.history = [];
    this.message = "Roll to decide who starts.";
    this.active = true;

    this.render();
  },

  later(action, delay = 500) {
    clearTimeout(this.timer);
    const version = this.version;

    this.timer = setTimeout(() => {
      if (this.active && version === this.version) {
        action();
      }
    }, delay);
  },

  die() {
    return 1 + Math.floor(Math.random() * 6);
  },

  async roll(auto = false) {
  if (
    !this.active ||
    this.rolled ||
    this.rolling ||
    (!auto && !this.human() && !this.opening)
  ) return;

  const version = this.version;
  let a = this.die();
  let b = this.die();

  if (this.opening) {
    while (a === b) {
      a = this.die();
      b = this.die();
    }
  }

  this.rolling = true;
  this.selected = null;
  this.selectedDie = null;
  this.message = "Rolling…";
  if (soundEnabled) {
  backgammonDiceSound.currentTime = 0;
  backgammonDiceSound.play().catch(() => {});
}

const frameDelay =
  Number.isFinite(backgammonDiceSound.duration) &&
  backgammonDiceSound.duration > 0
    ? backgammonDiceSound.duration * 1000 / 9
    : 65;

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  if (!reducedMotion) {
    for (let frame = 0; frame < 9; frame++) {
      if (!this.active || version !== this.version) return;

      this.rollPreview = [
        1 + Math.floor(Math.random() * 6),
        1 + Math.floor(Math.random() * 6)
      ];

      this.render();
      await new Promise(resolve => setTimeout(resolve, frameDelay));
    }
  }

  if (!this.active || version !== this.version) return;

  this.rolling = false;
  this.rollPreview = [];

  if (this.opening) {
    this.turn = a > b ? 0 : 1;
    this.message =
      `Opening roll: Ivory ${a}, Charcoal ${b}. ` +
      `${this.name(this.turn)} starts.`;
    this.opening = false;
  } else {
    this.message = `${this.name(this.turn)} rolled ${a} and ${b}.`;
  }

  this.lastRoll = [a, b];
  this.dice = a === b ? [a, a, a, a] : [a, b];
  this.rolled = true;

  this.refresh();
  this.render();

  if (!this.human()) this.later(() => this.ai());
},

  refresh() {
    this.choices = this.rolled
      ? bgRules.turns(this.state, this.turn, this.dice)
      : [];

    const firsts = this.choices
      .map(c => c.moves[0])
      .filter(Boolean);

    this.legal = [
      ...new Map(
        firsts.map(m => [
          `${m.from}/${m.to}/${m.die}`,
          m
        ])
      ).values()
    ];

    if (
      this.selectedDie &&
      !this.legal.some(m => m.die === this.selectedDie)
    ) {
      this.selectedDie = null;
    }
  },

  pickDie(die) {
    if (!this.active || !this.human() || !this.rolled) {
      return;
    }

    this.selectedDie =
      this.selectedDie === die ? null : die;

    this.render();
  },

  click(point) {
    if (!this.active || !this.human() || !this.rolled) {
      return;
    }

    const moves = this.legal.filter(
      m => !this.selectedDie || m.die === this.selectedDie
    );

    const move = moves.find(
      m => m.from === this.selected && m.to === point
    );

    if (move) {
      this.play(move);
      return;
    }

    if (moves.some(m => m.from === point)) {
      this.selected = point;

      this.message = point === -1
        ? "Choose a highlighted point to re-enter from the bar."
        : "Choose a highlighted destination.";
    } else {
      this.selected = null;

      this.message = this.state.bar[this.turn]
        ? "Re-enter your bar checkers first."
        : "Select one of your checkers that can use the remaining dice.";
    }

    this.render();
  },

  play(move) {
    const legal = this.legal.some(
      m =>
        m.from === move.from &&
        m.to === move.to &&
        m.die === move.die
    );

    if (!this.active || !legal) return;

    const hit = move.to !== 24 &&
      this.state.points[move.to] ===
        (this.turn === 0 ? -1 : 1);

    this.state = bgRules.apply(
      this.state,
      this.turn,
      move
    );

    this.dice.splice(this.dice.indexOf(move.die), 1);

    this.history.push(
      `${this.name(this.turn)}: ` +
      `${move.from === -1 ? "bar" : move.from + 1} → ` +
      `${move.to === 24 ? "off" : move.to + 1}` +
      `${hit ? " (hit)" : ""} [${move.die}]`
    );

    this.selected = null;
    this.selectedDie = null;
    playQuietBlockSound();

    if (this.state.off[this.turn] === 15) {
      this.finish(this.turn);
      return;
    }

    this.refresh();

    this.message = this.legal.length
      ? "Choose a checker for your next die."
      : "No more legal moves. End your turn.";

    this.render();
  },

  end(auto = false) {
    if (
      !this.active ||
      !this.rolled ||
      this.legal.length ||
      (!auto && !this.human())
    ) return;

    this.turn = 1 - this.turn;
    this.dice = [];
    this.rolled = false;
    this.selected = null;
    this.selectedDie = null;
    this.choices = [];
    this.legal = [];

    this.message =
      `${this.name(this.turn)}: roll the dice.`;

    this.render();

    if (!this.human()) {
      this.later(() => this.roll(true));
    }
  },

  evaluate(s) {
    if (s.off[1] === 15) return 100000;

    let score =
      bgRules.pips(s, 0) -
      bgRules.pips(s, 1) +
      s.off[1] * 15 +
      (s.bar[0] - s.bar[1]) * 22;

    let prime = 0;

    for (let p = 0; p < 24; p++) {
      const own = bgRules.count(s, p, 1);

      if (own >= 2) {
        prime++;
        score += 4 + (p >= 18 ? 7 : 0) + prime * 2;
      } else {
        prime = 0;
      }

      if (own === 1) {
        score -= 2;

        if (this.difficulty === "hard") {
          let threats = 0;

          for (let q = 0; q < p; q++) {
            if (bgRules.count(s, q, 0)) {
              const distance = p - q;

              if (distance <= 6) threats += 2;
              else if (distance <= 12) threats += 0.5;
            }
          }

          if (s.bar[0] && p >= 18) threats += 3;

          score -=
            Math.min(threats, 10) * (p < 18 ? 5 : 3);
        }
      }

      if (own > 5) score -= (own - 5) * 2;
    }

    return score;
  },

  ai() {
    if (!this.active || this.human() || !this.rolled) {
      return;
    }

    if (!this.legal.length) {
      this.end(true);
      return;
    }

    let choice;

    if (this.difficulty === "easy") {
      choice = this.choices[
        Math.floor(Math.random() * this.choices.length)
      ];
    } else {
      choice = this.choices.reduce(
        (best, c) =>
          !best ||
          this.evaluate(c.state) > this.evaluate(best.state)
            ? c
            : best,
        null
      );
    }

    this.play(choice.moves[0]);

    if (this.active) {
      this.later(() => this.ai(), 400);
    }
  },

  finish(winner, forfeit = false) {
    if (!this.active) return;

    const kind = forfeit
      ? "Forfeit"
      : bgRules.victory(this.state, winner);

    this.stop();

    recordBackgammonResult(
      winner,
      this.mode,
      this.scoreProfile
    );

    playGameResultSound(
      this.mode,
      winner === 0 ? "win" : "loss"
    );

    this.message = `${this.name(winner)} wins! ${kind}.`;
    this.render();
  },

  restart() {
    if (this.active) {
      showConfirmation(
        "Starting a new game mid game will be a loss. Are you sure?",
        () => {
          this.finish(1, true);
          this.start();
        }
      );
    } else {
      this.start();
    }
  },

  diceHTML(value) {
    const dots = {
      1: [5],
      2: [1, 9],
      3: [1, 5, 9],
      4: [1, 3, 7, 9],
      5: [1, 3, 5, 7, 9],
      6: [1, 3, 4, 6, 7, 9]
    };

    return Array.from(
      { length: 9 },
      (_, i) => `
        <span class="bg-pip ${
          dots[value].includes(i + 1) ? "bg-pip-on" : ""
        }"></span>
      `
    ).join("");
  },

  pointHTML(point, top) {
    const n = this.state.points[point];
    const player = n > 0 ? 0 : 1;
    const count = Math.abs(n);

    const choices = (this.legal || []).filter(
      m => !this.selectedDie || m.die === this.selectedDie
    );

    const target = this.active && this.human() &&
      choices.some(
        m => m.from === this.selected && m.to === point
      );

    const source = this.active && this.human() &&
      choices.some(m => m.from === point);

    const stack = Array.from(
      { length: Math.min(5, count) },
      () => `
        <span class="bg-checker ${
          player === 0 ? "bg-ivory" : "bg-charcoal"
        }"></span>
      `
    ).join("");

    return `
      <button
        type="button"
        class="bg-point
          ${top ? "bg-top" : "bg-bottom"}
          ${point % 2 ? "bg-triangle-dark" : "bg-triangle-light"}
          ${target ? "bg-target" : ""}
          ${this.selected === point ? "bg-selected" : ""}
          ${source ? "bg-source" : ""}"
        onclick="backgammon.click(${point})"
        aria-label="Point ${point + 1},
          ${count} ${player === 0 ? "Ivory" : "Charcoal"} checkers
          ${target ? ", legal destination" : ""}"
      >
        <span class="bg-number">${point + 1}</span>
        <span class="bg-stack">
          ${stack}
          ${count > 5 ? `<span class="bg-count">${count}</span>` : ""}
        </span>
      </button>
    `;
  },

  render() {
    const area = document.getElementById("gameArea");
    const old = area.querySelector(".bg-guide");
    if (old) this.rulesOpen = old.open;

    const human = this.human();
    const moving = this.active && this.rolled && human;

    const choices = (this.legal || []).filter(
      m => !this.selectedDie || m.die === this.selectedDie
    );

    const canOff = moving && choices.some(
      m => m.from === this.selected && m.to === 24
    );

    const bar = player => `
      <button
        type="button"
        class="bg-bar-checker ${
          this.selected === -1 && this.turn === player
            ? "bg-selected" : ""
        }"
        onclick="backgammon.click(-1)"
        ${
          !moving ||
          this.turn !== player ||
          !this.state.bar[player]
            ? "disabled" : ""
        }
      >
        <span class="bg-checker ${
          player === 0 ? "bg-ivory" : "bg-charcoal"
        }"></span>
        <span>Bar: ${this.state.bar[player]}</span>
      </button>
    `;

    const dice = (
  this.rolling
    ? this.rollPreview
    : this.rolled
      ? this.dice
      : this.lastRoll || []
).map(d => `
      <button
        type="button"
        class="bg-die ${
          this.selectedDie === d ? "bg-selected" : ""
        }"
        onclick="backgammon.pickDie(${d})"
        aria-label="Die ${d}"
        ${!moving ? "disabled" : ""}
      >${this.diceHTML(d)}</button>
    `).join("");

    const row = (points, top) => points
      .map(p => this.pointHTML(p, top))
      .join("");

    area.innerHTML = `
      <section class="bg-game">
        <h2>Backgammon</h2>

        <p class="bg-status" role="status">
          ${this.escape(this.message)}
        </p>

        <p class="bg-direction">
          Ivory: 24 → 1 · Charcoal: 1 → 24 ·
          ${
            this.mode === "ai"
              ? `AI: ${this.escape(this.difficulty)}`
              : "Local play"
          }
        </p>

        <div class="bg-toolbar">
          <button
            onclick="backgammon.roll()"
            ${
!this.active || this.rolled || this.rolling || (!human && !this.opening)
                ? "disabled" : ""
            }
          >${this.opening ? "Opening Roll" : "Roll Dice"}</button>

          <div class="bg-dice">${dice}</div>

          <button
            onclick="backgammon.end()"
            ${
              !this.active ||
              !this.rolled ||
              !human ||
              (this.legal || []).length
                ? "disabled" : ""
            }
          >End Turn</button>
        </div>

        <div class="bg-scoreline">
          <span>
            ${this.escape(this.name(0))} · Ivory ·
            ${bgRules.pips(this.state, 0)} pips ·
            ${this.state.off[0]}/15 off
          </span>
          <span>
            ${this.escape(this.name(1))} · Charcoal ·
            ${bgRules.pips(this.state, 1)} pips ·
            ${this.state.off[1]}/15 off
          </span>
        </div>

        <div class="bg-board">
          <div class="bg-half">
            ${row([12, 13, 14, 15, 16, 17], true)}
            ${row([11, 10, 9, 8, 7, 6], false)}
          </div>

          <div class="bg-bar">
            ${bar(1)}
            <span>BAR</span>
            ${bar(0)}
          </div>

          <div class="bg-half">
            ${row([18, 19, 20, 21, 22, 23], true)}
            ${row([5, 4, 3, 2, 1, 0], false)}
          </div>
        </div>

        <button
          class="bg-bear ${canOff ? "bg-target" : ""}"
          onclick="backgammon.click(24)"
          ${!canOff ? "disabled" : ""}
        >
          Bear Off ${this.turn === 0 ? "Ivory" : "Charcoal"} →
        </button>

        <p class="bg-hint">
          ${
            this.active && this.rolled && !this.legal.length
              ? "No playable dice remain: press End Turn."
              : "Click a checker, then a highlighted point. Click a die to choose its value."
          }
        </p>

        <button onclick="backgammon.restart()">New Game</button>

        <details
          class="bg-guide"
          ${this.rulesOpen ? "open" : ""}
          ontoggle="backgammon.rulesOpen=this.open"
        >
          <summary>How to play</summary>

          <p>
            Race all 15 checkers into your home board, then
            remove them. Ivory’s home is 1–6; Charcoal’s is
            19–24. The first to remove all 15 wins.
          </p>

          <ul>
            <li>
              Each die is a separate move. You can move two
              checkers, or move one twice through legal
              intermediate points.
            </li>
            <li>
              Two or more enemy checkers block a point.
              Landing on a single enemy checker sends it
              to the bar.
            </li>
            <li>
              Checkers on the bar must re-enter first.
              Ivory enters at 25 minus the die; Charcoal
              enters at the die.
            </li>
            <li>
              Use both dice whenever possible. If only one
              can be used and either works, use the higher.
              Doubles give four moves. The highlights
              enforce these rules.
            </li>
            <li>
              Bear off only when all your remaining checkers
              are home and none are on the bar. An oversized
              die can remove only your farthest checker.
            </li>
            <li>
              The opening roll uses one die per player;
              the higher starts using both dice. Ties
              are rerolled.
            </li>
          </ul>

          <p>
            This mode plays single games without a doubling
            cube. A gammon means the loser removed none;
            a backgammon adds a loser’s checker on the bar
            or in the winner’s home board. Every completed
            game records one win or loss.
          </p>
        </details>

        <details class="bg-guide">
          <summary>Recent moves</summary>
          <ol>
            ${
              this.history.slice(-12)
                .map(h => `<li>${this.escape(h)}</li>`)
                .join("")
            }
          </ol>
        </details>
      </section>
    `;
  }
};

function loadBackgammon() {
  hideAppTitle();
  backgammon.start();
}