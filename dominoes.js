// Shared double-six engine: Classic Draw and single-spinner All Fives.

const dominoes = {
  mode: "ai",
  difficulty: "medium",
  variant: "classic",
  targetScore: 150,
  points: [0, 0],
  round: 1,
  roundOver: false,
  spinner: null,
  arms: { top: [], bottom: [] },
  lastScore: null,
  scoreTimer: null,
  hands: [[], []],
  stock: [],
  chain: [],
  turn: 0,
  selected: null,
  active: false,
  passes: 0,
  timer: null,
  revealed: true,

  animating: false,
  moveVersion: 0,
  flight: null,

  stop() {
    clearTimeout(this.timer);
    clearTimeout(this.scoreTimer);
    this.timer = null;
    this.lastScore = null;
    this.active = false;
    this.moveVersion++;
    this.animating = false;

    if (this.flight) {
      this.flight.animation.cancel();
      this.flight.layer.remove();
      this.flight = null;
    }
  },

  // The first double is the only spinner. Extra arms open only once
  // both sides of that double have been covered on the main line.
  spinnerIndex(layout = this) {
    return layout.spinner === null ? -1 : layout.chain.findIndex(
      tile => tile[0] === layout.spinner && tile[1] === layout.spinner
    );
  },

  openEnds(layout = this) {
    if (!layout.chain.length) return [];
    const ends = [
      { side: "left", number: layout.chain[0][0] },
      { side: "right", number: layout.chain.at(-1)[1] }
    ];
    const index = this.spinnerIndex(layout);
    if (this.variant === "allfives" && index > 0 && index < layout.chain.length - 1) {
      for (const side of ["top", "bottom"]) {
        ends.push({ side, number: layout.arms[side].at(-1)?.[1] ?? layout.spinner });
      }
    }
    return ends;
  },

  options(hand = this.hands[this.turn], layout = this) {
    const moves = [];
    hand.forEach((tile, index) => {
      if (!layout.chain.length) {
        moves.push({ index, side: "right" });
      } else {
        for (const end of this.openEnds(layout)) {
          if (tile.includes(end.number)) moves.push({ index, side: end.side });
        }
      }
    });
    return moves;
  },

  applyTile(original, side, layout = this) {
    const tile = original.slice();
    if (!layout.chain.length) {
      layout.chain.push(tile);
    } else if (side === "left") {
      if (tile[1] !== layout.chain[0][0]) tile.reverse();
      layout.chain.unshift(tile);
    } else if (side === "right") {
      if (tile[0] !== layout.chain.at(-1)[1]) tile.reverse();
      layout.chain.push(tile);
    } else {
      const arm = layout.arms[side];
      const match = arm.at(-1)?.[1] ?? layout.spinner;
      if (tile[0] !== match) tile.reverse();
      arm.push(tile);
    }
    if (this.variant === "allfives" && layout.spinner === null && tile[0] === tile[1]) {
      layout.spinner = tile[0];
    }
  },

  preview(tile, side, layout = this) {
    const copy = {
      chain: layout.chain.map(tile => tile.slice()),
      spinner: layout.spinner,
      arms: {
        top: layout.arms.top.map(tile => tile.slice()),
        bottom: layout.arms.bottom.map(tile => tile.slice())
      }
    };
    this.applyTile(tile, side, copy);
    return copy;
  },

  scoringEnds(layout = this) {
    const chain = layout.chain;
    if (!chain.length) return [];
    if (chain.length === 1) return [chain[0][0] + chain[0][1]];
    const count = (tile, outward) => tile[0] === tile[1] ? 2 * outward : outward;
    const ends = [];
    const spinner = this.spinnerIndex(layout);
    if (spinner !== 0) ends.push(count(chain[0], chain[0][0]));
    if (spinner !== chain.length - 1) ends.push(count(chain.at(-1), chain.at(-1)[1]));
    // An uncovered side keeps the spinner's two halves in the total.
    if (spinner === 0 || spinner === chain.length - 1) ends.push(layout.spinner * 2);
    for (const side of ["top", "bottom"]) {
      const tile = layout.arms[side].at(-1);
      // Unstarted extra arms are playable but do not contribute pips.
      if (tile) ends.push(count(tile, tile[1]));
    }
    return ends;
  },

  scoringTotal(layout = this) {
    return this.scoringEnds(layout).reduce((sum, value) => sum + value, 0);
  },

  movePoints(layout = this) {
    const total = this.scoringTotal(layout);
    return total > 0 && total % 5 === 0 ? total : 0;
  },

  playerLabel(player) {
    return this.mode === "ai" ? (player === 0 ? "You" : "AI") : `Player ${player + 1}`;
  },

  start() {
    this.stop();
    this.scoreProfile = currentProfile;
    getDominoesScores(this.scoreProfile);
    this.points = [0, 0];
    this.round = 0;
    this.nextStarter = null;
    this.deal();
  },

  deal() {
    this.stop();
    this.active = true;
    this.roundOver = false;
    this.round++;
    this.spinner = null;
    this.arms = { top: [], bottom: [] };
    const deck = [];

    for (let a = 0; a <= 6; a++) {
      for (let b = a; b <= 6; b++) {
        deck.push([a, b]);
      }
    }

    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    this.hands = [
      deck.splice(0, 7),
      deck.splice(0, 7)
    ];

    this.stock = deck;
    this.chain = [];
    this.selected = null;
    this.passes = 0;
    this.result = "";

    // Player holding the highest double starts.
    // Without doubles, use the highest pip total.
    const rank = tile =>
      tile[0] === tile[1]
        ? 100 + tile[0]
        : tile[0] + tile[1];

    this.turn =
      Math.max(...this.hands[1].map(rank)) >
      Math.max(...this.hands[0].map(rank))
        ? 1
        : 0;

    if (this.variant === "allfives") {
      this.turn = this.nextStarter ?? Math.floor(Math.random() * 2);
    }
    this.revealed = this.mode === "ai";

    this.render();
    this.schedule();
  },

  canAct() {
    return (
      this.active &&
      !this.roundOver &&
      !this.animating &&
      this.revealed &&
      !(this.mode === "ai" && this.turn === 1)
    );
  },

  choose(index) {
    if (!this.canAct()) return;

    this.selected = index;
    this.render();
  },

  async play(index, side) {
    const legal = this.options().some(
      move => move.index === index && move.side === side
    );

    if (!this.active || this.roundOver || this.animating || !legal) return;

    const version = ++this.moveVersion;
    const player = this.turn;

    // Capture the starting position before updating the hand.
    // The AI's tile comes from near its hidden-hand message.
    const source = document.querySelectorAll(
      "#gameArea .domino-hand .domino-tile"
    )[index];

    const sourceRect = source?.getBoundingClientRect();
    const chainRect = document.querySelector(
      "#gameArea .domino-chain"
    )?.getBoundingClientRect();

    this.animating = true;
    this.selected = null;

    const tile = this.hands[player]
      .splice(index, 1)[0]
      .slice();

    this.applyTile(tile, side);

    this.passes = 0;

    // Reserve the actual landing position before the tile flies.
    this.render();

    const tiles = document.querySelectorAll(
      side === "top" || side === "bottom"
        ? `#gameArea .domino-arm-${side} .domino-tile`
        : "#gameArea .domino-main-line .domino-tile"
    );
    const target = side === "left" ? tiles[0] : tiles[tiles.length - 1];

    try {
      await this.animateTile(target, sourceRect, chainRect);
    } catch (error) {
      if (version === this.moveVersion && this.active) {
        console.error("Domino animation failed:", error);
      }
    }

    if (version !== this.moveVersion || !this.active) return;

    this.animating = false;
    playDominoSound(dominoTileSound);

    if (this.variant === "allfives") {
      this.awardPoints(player, this.movePoints());
      if (this.points[player] >= this.targetScore) {
        this.finishMatch(player);
        return;
      }
    }
    if (!this.hands[player].length) {
      this.finish(player);
    } else {
      this.next();
    }
  },

  async animateTile(target, sourceRect, chainRect) {
    if (!target || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || typeof target.animate !== "function") {
      return;
    }

    const destination = target.getBoundingClientRect();

    const startX = sourceRect
      ? sourceRect.left + sourceRect.width / 2
      : destination.left + destination.width / 2;

    const startY = sourceRect
      ? sourceRect.top + sourceRect.height / 2
      : (chainRect?.bottom ?? destination.bottom) + 70;

    const dx = startX -
      (destination.left + destination.width / 2);

    const dy = startY -
      (destination.top + destination.height / 2);

    // Use the placed tile's orientation throughout the flight.
    const ghost = target.cloneNode(true);
    ghost.removeAttribute("aria-label");
    ghost.classList.remove("domino-selected", "domino-playable");
    ghost.classList.add("domino-flying");

    Object.assign(ghost.style, {
      position: "fixed",
      left: `${destination.left}px`,
      top: `${destination.top}px`,
      width: `${destination.width}px`,
      height: `${destination.height}px`,
      boxSizing: "border-box",
      margin: "0"
    });

    const layer = document.createElement("div");
    layer.className = "domino-game domino-flight-layer";
    layer.setAttribute("aria-hidden", "true");
    layer.appendChild(ghost);
    document.body.appendChild(layer);

    target.style.visibility = "hidden";

    const animation = ghost.animate(
      [
        {
          transform: `translate(${dx}px, ${dy}px)
                      rotate(0deg) scale(1)`,
          offset: 0
        },
        {
          transform: `translate(${dx * 0.85}px, ${dy - 28}px)
                      rotate(40deg) scale(1.08)`,
          offset: 0.2
        },
        {
          transform: `translate(${dx * 0.35}px, ${dy * 0.35 - 35}px)
                      rotate(240deg) scale(1.06)`,
          offset: 0.65
        },
        {
          transform: "translate(0, 0) rotate(360deg) scale(1)",
          offset: 1
        }
      ],
      {
        duration: 580,
        easing: "ease-in-out",
        fill: "forwards"
      }
    );

    const flight = { animation, layer };
    this.flight = flight;

    try {
      await animation.finished;
    } finally {
      target.style.visibility = "";
      layer.remove();

      if (this.flight === flight) {
        this.flight = null;
      }
    }
  },

  place(side) {
    if (this.canAct() && this.selected !== null) {
      this.play(this.selected, side);
    }
  },

  draw() {
    if (
      !this.canAct() ||
      this.options().length ||
      !this.stock.length
    ) {
      return;
    }

    this.hands[this.turn].push(this.stock.pop());
    this.selected = null;

    this.render();
  },

  pass() {
    if (
      !this.canAct() ||
      this.options().length ||
      this.stock.length
    ) {
      return;
    }

    this.doPass();
  },

  doPass() {
    this.passes++;

    if (this.passes >= 2) {
      const sums = this.hands.map(hand =>
        hand.reduce(
          (total, tile) => total + tile[0] + tile[1],
          0
        )
      );

      const winner =
        sums[0] === sums[1]
          ? -1
          : sums[0] < sums[1]
            ? 0
            : 1;

      this.finish(winner, true);
    } else {
      this.next();
    }
  },

  next() {
    this.turn = 1 - this.turn;
    this.selected = null;
    this.revealed = this.mode === "ai";

    this.render();
    this.schedule();
  },

  schedule() {
    clearTimeout(this.timer);

    if (
      this.active &&
      !this.roundOver &&
      this.mode === "ai" &&
      this.turn === 1
    ) {
      this.timer = setTimeout(() => this.ai(), 650);
    }
  },

  ai() {
    if (
      !this.active ||
      this.roundOver ||
      this.animating ||
      this.mode !== "ai" ||
      this.turn !== 1
    ) {
      return;
    }

    let moves = this.options();

    while (!moves.length && this.stock.length) {
      this.hands[1].push(this.stock.pop());
      moves = this.options();
    }

    if (!moves.length) {
      this.doPass();
      return;
    }

    let move;

    if (this.difficulty === "easy") {
      move = moves[
        Math.floor(Math.random() * moves.length)
      ];
    } else if (this.variant === "allfives") {
      const score = candidate => {
        const tile = this.hands[1][candidate.index];
        const layout = this.preview(tile, candidate.side);
        const points = this.movePoints(layout);
        if (this.points[1] + points >= this.targetScore) return 100000;
        const remaining = this.hands[1].filter((_, index) => index !== candidate.index);
        let value = points * 10 + tile[0] + tile[1];
        if (!remaining.length) value += 25;
        if (this.difficulty === "hard") {
          // Evaluate public, unseen tiles rather than looking at the human hand.
          const known = [...this.chain, ...this.arms.top, ...this.arms.bottom, ...this.hands[1]];
          const unknown = [];
          for (let a = 0; a <= 6; a++) {
            for (let b = a; b <= 6; b++) {
              if (!known.some(t => (t[0] === a && t[1] === b) || (t[0] === b && t[1] === a))) {
                unknown.push([a, b]);
              }
            }
          }
          const replies = this.options(unknown, layout);
          const risk = replies.reduce((best, reply) => Math.max(
            best, this.movePoints(this.preview(unknown[reply.index], reply.side, layout))
          ), 0);
          value -= risk * 7;
          if (this.points[0] + risk >= this.targetScore) value -= 1000;
          value += this.options(remaining, layout).length * 2;
        }
        return value;
      };
      move = moves.reduce((best, candidate) => score(candidate) > score(best) ? candidate : best);
    } else {
      const score = candidate => {
        const tile = this.hands[1][candidate.index];
        let value = tile[0] + tile[1];

        if (this.difficulty === "hard") {
          const remaining = this.hands[1].filter(
            (_, index) => index !== candidate.index
          );

          let ends;

          if (!this.chain.length) {
            ends = tile;
          } else {
            const left = this.chain[0][0];
            const right =
              this.chain[this.chain.length - 1][1];

            const match =
              candidate.side === "left" ? left : right;

            const outward =
              tile[0] === match ? tile[1] : tile[0];

            ends =
              candidate.side === "left"
                ? [outward, right]
                : [left, outward];
          }

          value += remaining.filter(
            other =>
              other.includes(ends[0]) ||
              other.includes(ends[1])
          ).length * 3;

          if (tile[0] === tile[1]) {
            value += 2;
          }
        }

        return value;
      };

      move = moves.reduce(
        (best, candidate) =>
          score(candidate) > score(best)
            ? candidate
            : best
      );
    }

    return this.play(move.index, move.side);
  },

  finish(winner, blocked = false) {
  if (!this.active || this.roundOver) return;
  if (this.variant === "allfives") {
    this.finishRound(winner, blocked);
    return;
  }

  this.active = false;

  recordDominoesResult(
    winner,
    this.mode,
    this.scoreProfile,
    this.variant
  );

    if (winner >= 0) {
    if (this.mode === "ai" && winner === 1) {
      playDominoSound(dominoLossSound);
    } else {
      playDominoSound(winSound);
    }
  }
    clearTimeout(this.timer);
    this.revealed = true;

    const sums = this.hands.map(hand =>
      hand.reduce(
        (total, tile) => total + tile[0] + tile[1],
        0
      )
    );

    const label = player =>
      this.mode === "ai"
        ? player === 0 ? "You" : "AI"
        : `Player ${player + 1}`;

    if (winner < 0) {
      this.result =
        `Draw! Both hands have ${sums[0]} pips.`;
    } else {
      const verb =
        winner === 0 && this.mode === "ai"
          ? "win"
          : "wins";

      this.result =
        `${label(winner)} ${verb}! ` +
        (blocked
          ? "Blocked round — lowest pip total wins. "
          : "") +
        `${sums[1 - winner]} points.`;
    }

    this.render();
  },

  awardPoints(player, points, reason = "Open ends") {
    if (!points) return;
    this.points[player] += points;
    this.lastScore = { player, points, reason };
    clearTimeout(this.scoreTimer);
    this.scoreTimer = setTimeout(() => {
      this.lastScore = null;
      document.querySelector("#gameArea .domino-score-pop")?.remove();
    }, 2400);
  },

  pipTotals() {
    return this.hands.map(hand => hand.reduce((total, tile) => total + tile[0] + tile[1], 0));
  },

  finishRound(winner, blocked) {
    clearTimeout(this.timer);
    const sums = this.pipTotals();
    const bonus = winner < 0 ? 0 : Math.round(sums[1 - winner] / 5) * 5;
    if (winner >= 0) this.awardPoints(winner, bonus, "Round bonus");
    if (winner >= 0 && this.points[winner] >= this.targetScore) {
      this.finishMatch(winner);
      return;
    }
    playGameResultSound(this.mode, winner < 0 ? "draw" : winner === 0 ? "win" : "loss");
    this.roundOver = true;
    this.revealed = true;
    this.nextStarter = blocked ? null : winner;
    this.result = winner < 0
      ? `Round drawn — both hands have ${sums[0]} pips. No bonus.`
      : `${this.playerLabel(winner)} ${this.mode === "ai" && winner === 0 ? "win" : "wins"} round ${this.round}! ` +
        (blocked ? "Blocked board — lowest pip total wins. " : "") +
        `Round bonus: ${bonus} points (${sums[1 - winner]} remaining pips, rounded to five).`;
    this.render();
  },

  nextRound() {
    if (this.variant === "allfives" && this.active && this.roundOver) this.deal();
  },

  finishMatch(winner) {
    if (!this.active) return;
    this.active = false;
    this.roundOver = false;
    clearTimeout(this.timer);
    this.revealed = true;
    recordDominoesResult(winner, this.mode, this.scoreProfile, this.variant);
    playGameResultSound(this.mode, winner === 0 ? "win" : "loss");
    this.result = `${this.playerLabel(winner)} ${this.mode === "ai" && winner === 0 ? "win" : "wins"} the match! ${this.points[0]}–${this.points[1]} · Target ${this.targetScore}.`;
    this.render();
  },

  restartMatch() {
    if (!this.active) return this.start();
    showConfirmation("Restarting this match will count as a loss. Start a new match?", () => {
      if (this.active) {
        recordDominoesResult(1, this.mode, this.scoreProfile, this.variant);
      }
      this.start();
    });
  },

  boardTile(tile, spinner = false) {
    return `<span class="domino-tile ${tile[0] === tile[1] ? "domino-double" : ""} ${spinner ? "domino-spinner" : ""}"
      aria-label="${tile[0]}–${tile[1]}${spinner ? ", spinner" : ""}">${this.tile(tile)}</span>`;
  },

  endButton(side) {
    const canPlace = this.canAct() && this.options().some(move => move.index === this.selected && move.side === side);
    return `<button class="domino-end" onclick="dominoes.place('${side}')"
      aria-label="Place selected tile at the ${side} end" ${canPlace ? "" : "disabled"}>＋</button>`;
  },

  boardHTML() {
    if (!this.chain.length) {
      return `<div class="domino-main-line"> <button class="domino-end domino-start"
        onclick="dominoes.place('right')" ${this.canAct() && this.selected !== null ? "" : "disabled"}>
        ${this.selected === null ? "Select a tile to begin" : "Place tile here"}</button></div>`;
    }
    const spinner = this.spinnerIndex();
    const extra = this.openEnds().some(end => end.side === "top");
    const arm = side => `<div class="domino-arm domino-arm-${side}">
      <small>${side === "top" ? "Upper" : "Lower"} spinner arm</small>
      <div class="domino-arm-tiles">
        ${this.arms[side].map(tile => this.boardTile(tile)).join("")}
        ${this.endButton(side)}
      </div></div>`;
    return `${extra ? arm("top") : ""}
      <div class="domino-main-line">
        ${this.endButton("left")}
        ${this.chain.map((tile, index) => this.boardTile(tile, index === spinner)).join("")}
        ${this.endButton("right")}
      </div>
      ${extra ? arm("bottom") : ""}`;
  },

  scoreHTML() {
    if (this.variant !== "allfives") return "";
    return `<div class="domino-scoreboard" aria-label="Match score">
      ${this.points.map((points, player) => `<div class="domino-score ${this.lastScore?.player === player ? "domino-score-earned" : ""}">
        <span>${this.playerLabel(player)}</span><strong>${points}</strong>
      </div>`).join("")}
      <small>Round ${this.round} · First to ${this.targetScore}</small>
    </div>
    ${this.lastScore ? `<p class="domino-score-pop ${this.lastScore.points >= 20 ? "domino-score-big" : ""}" role="status">
      ${this.playerLabel(this.lastScore.player)} +${this.lastScore.points} points · ${this.lastScore.reason}
    </p>` : ""}`;
  },

  half(number) {
    const positions = {
      0: [],
      1: [4],
      2: [0, 8],
      3: [0, 4, 8],
      4: [0, 2, 6, 8],
      5: [0, 2, 4, 6, 8],
      6: [0, 2, 3, 5, 6, 8]
    };

    return `
      <span class="domino-half" aria-hidden="true">
        ${Array.from({ length: 9 }, (_, index) => `
          <i class="${
            positions[number].includes(index)
              ? "pip"
              : ""
          }"></i>
        `).join("")}
      </span>
    `;
  },

  tile(tile) {
    return this.half(tile[0]) + this.half(tile[1]);
  },

  render() {
    const aiTurn =
      this.active &&
      !this.roundOver &&
      this.mode === "ai" &&
      this.turn === 1;

    const label =
      this.mode === "ai"
        ? this.turn === 0
          ? "Your turn"
          : "AI is thinking…"
        : `Player ${this.turn + 1}'s turn`;

    const moves = this.options();
    const playable = new Set(
      moves.map(move => move.index)
    );

    const hide =
      this.active && !this.roundOver && (aiTurn || !this.revealed);

    const gameArea = document.getElementById("gameArea");
    gameArea.classList.remove("page-enter");

    gameArea.innerHTML = `
      <section class="domino-game">
        <h2>Dominoes — ${this.variant === "allfives" ? "All Fives" : "Classic"}</h2>
        ${this.scoreHTML()}

        <p class="domino-status" role="status">
          ${this.active && !this.roundOver ? label : this.result}
        </p>

        <p>
          Boneyard: ${this.stock.length} ·
          ${this.mode === "ai" ? "Your tiles" : "Player 1"}:
          ${this.hands[0].length} ·
          ${this.mode === "ai" ? "AI tiles" : "Player 2"}:
          ${this.hands[1].length}
        </p>

        <div class="domino-chain" aria-label="Played tiles">
          ${this.boardHTML()}
        </div>
        ${this.chain.length ? `
          <p>Open ends: ${this.openEnds().map(end => `<strong>${end.number}</strong> (${end.side})`).join(" · ")}</p>
          ${this.variant === "allfives" ? `<p class="domino-end-total">Scoring ends: ${this.scoringEnds().join(" + ")} =
            <strong>${this.scoringTotal()}</strong>${this.movePoints() ? " · Multiple of five" : ""}</p>` : ""}
        ` : ""}

        ${
          hide
            ? aiTurn
              ? "<p>The AI’s hand is hidden.</p>"
              : `
                <p>
                  Pass the device to Player ${this.turn + 1}.
                </p>
                <button onclick="
                  dominoes.revealed = true;
                  dominoes.render();
                ">
                  Show my hand
                </button>
              `
            : `
              <div class="domino-hand" aria-label="Current hand">
                ${
                  this.hands[this.turn].map((tile, index) => `
                    <button
                      class="domino-tile
                        ${
                          this.selected === index
                            ? "domino-selected"
                            : ""
                        }
                        ${
                          playable.has(index)
                            ? "domino-playable"
                            : ""
                        }"
                      aria-label="${tile[0]}–${tile[1]}${
                        playable.has(index) ? ", playable" : ""
                      }"
                      aria-pressed="${this.selected === index}"
                      onclick="dominoes.choose(${index})"
                      ${this.canAct() ? "" : "disabled"}
                    >
                      ${this.tile(tile)}
                    </button>
                  `).join("")
                }
              </div>
            `
        }

        ${
          this.canAct()
            ? `
              <div class="domino-actions">

                <button
                  onclick="dominoes.draw()"
                  ${
                    moves.length || !this.stock.length
                      ? "disabled"
                      : ""
                  }
                >
                  Draw tile
                </button>

                <button
                  onclick="dominoes.pass()"
                  ${
                    moves.length || this.stock.length
                      ? "disabled"
                      : ""
                  }
                >
                  Pass
                </button>
              </div>
            `
            : ""
        }

        <div class="domino-match-actions">
          ${this.variant === "allfives"
            ? `${this.roundOver ? `<button onclick="dominoes.nextRound()">Next round</button>` : ""}
               <button onclick="dominoes.restartMatch()">${this.active ? "Restart match" : "New match"}</button>`
            : `<button onclick="dominoes.start()">New round</button>`}
        </div>

        <details>
          <summary>How to play</summary>
          <p>
            Each player gets seven tiles.
            ${this.variant === "allfives"
              ? "The first lead is random; the player who empties their hand leads the next round. After a blocked round, the lead is random."
              : "The player holding the highest double starts; without doubles, the highest pip total starts."}
            Match a tile to any open end.
            Select a highlighted tile, then tap a highlighted
plus at an open end of the chain.
            When you cannot play, draw until you can.
            Pass only when the boneyard is empty.
            ${this.variant === "allfives" ? "Empty your hand to win the round." : "Empty your hand to win."}
            If both players pass, the lowest pip total wins;
            equal totals draw.
            ${this.variant === "allfives" ? `
              After each play, total the scoring ends. A positive multiple of five scores that many points.
              Exposed doubles count both halves; a lone opening tile counts both ends once.
              The first double is the spinner. Cover its left and right sides before starting upper or lower arms.
              Once both sides are covered, the spinner itself stops counting. Extra arms count only after a tile is played there.
              The round winner adds the opponent’s remaining pips, rounded to the nearest five.
              A blocked tie gives no bonus. Points carry between rounds.
              First to ${this.targetScore} wins immediately, even during a round.
              Match results count once in your profile; individual rounds do not.
            ` : "The winner earns the opponent’s remaining pips. Each round starts fresh."}
          </p>
        </details>
      </section>
    `;
  }
};

function loadDominoes() {
  hideAppTitle();
  dominoes.start();
}