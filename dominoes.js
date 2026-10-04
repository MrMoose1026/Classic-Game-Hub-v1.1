// Two-player double-six Draw Dominoes.
// Each game is one round.

const dominoes = {
  mode: "ai",
  difficulty: "medium",
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
    this.timer = null;
    this.active = false;
    this.moveVersion++;
    this.animating = false;

    if (this.flight) {
      this.flight.animation.cancel();
      this.flight.layer.remove();
      this.flight = null;
    }
  },

  options(hand = this.hands[this.turn]) {
    const moves = [];

    hand.forEach((tile, index) => {
      if (!this.chain.length) {
        moves.push({ index, side: "right" });
        return;
      }

      const left = this.chain[0][0];
      const right = this.chain[this.chain.length - 1][1];

      if (tile.includes(left)) {
        moves.push({ index, side: "left" });
      }

      if (tile.includes(right)) {
        moves.push({ index, side: "right" });
      }
    });

    return moves;
  },

  start() {
    this.stop();
this.active = true;
this.scoreProfile = currentProfile;
getDominoesScores(this.scoreProfile);

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

    this.revealed = this.mode === "ai";

    this.render();
    this.schedule();
  },

    canAct() {
    return (
      this.active &&
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

    if (!this.active || this.animating || !legal) return;

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

    if (!this.chain.length) {
      this.chain.push(tile);
    } else if (side === "left") {
      if (tile[1] !== this.chain[0][0]) {
        tile.reverse();
      }

      this.chain.unshift(tile);
    } else {
      const right = this.chain[this.chain.length - 1][1];

      if (tile[0] !== right) {
        tile.reverse();
      }

      this.chain.push(tile);
    }

    this.passes = 0;

    // Reserve the actual landing position before the tile flies.
    this.render();

    const chainTiles = document.querySelectorAll(
      "#gameArea .domino-chain .domino-tile"
    );

    const target = side === "left"
      ? chainTiles[0]
      : chainTiles[chainTiles.length - 1];

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

    if (!this.hands[player].length) {
      this.finish(player);
    } else {
      this.next();
    }
  },

  async animateTile(target, sourceRect, chainRect) {
        if (!target || typeof target.animate !== "function") {
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
      this.mode === "ai" &&
      this.turn === 1
    ) {
      this.timer = setTimeout(() => this.ai(), 650);
    }
  },

  ai() {
    if (
      !this.active ||
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

    this.play(move.index, move.side);
  },

finish(winner, blocked = false) {
  if (!this.active) return;

  this.active = false;

  recordDominoesResult(
    winner,
    this.mode,
    this.scoreProfile
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
      this.active && (aiTurn || !this.revealed);

    const canPlace = side =>
      moves.some(
        move =>
          move.index === this.selected &&
          move.side === side
      );

    const gameArea = document.getElementById("gameArea");
    gameArea.classList.remove("page-enter");

    gameArea.innerHTML = `
      <section class="domino-game">
        <h2>Dominoes</h2>

        <p class="domino-status" role="status">
          ${this.active ? label : this.result}
        </p>

        <p>
          Boneyard: ${this.stock.length} ·
          ${this.mode === "ai" ? "Your tiles" : "Player 1"}:
          ${this.hands[0].length} ·
          ${this.mode === "ai" ? "AI tiles" : "Player 2"}:
          ${this.hands[1].length}
        </p>

                <div class="domino-chain" aria-label="Played tiles">
          ${
            this.chain.length
              ? `
                <button
                  class="domino-end"
                  onclick="dominoes.place('left')"
                  aria-label="Place selected tile at the left end"
                  ${this.canAct() && canPlace("left") ? "" : "disabled"}
                >＋</button>

                ${this.chain.map(tile => `
                  <span
                    class="domino-tile"
                    aria-label="${tile[0]}–${tile[1]}"
                  >
                    ${this.tile(tile)}
                  </span>
                `).join("")}

                <button
                  class="domino-end"
                  onclick="dominoes.place('right')"
                  aria-label="Place selected tile at the right end"
                  ${this.canAct() && canPlace("right") ? "" : "disabled"}
                >＋</button>
              `
              : `
                <button
                  class="domino-end domino-start"
                  onclick="dominoes.place('right')"
                  ${this.canAct() && canPlace("right") ? "" : "disabled"}
                >
                  ${
                    this.selected === null
                      ? "Select a tile to begin"
                      : "Place tile here"
                  }
                </button>
              `
          }
        </div>

        ${
          this.chain.length
            ? `
              <p>
                Open ends:
                <strong>${this.chain[0][0]}</strong>
                and
                <strong>${
                  this.chain[this.chain.length - 1][1]
                }</strong>
              </p>
            `
            : ""
        }

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
                      ${this.active ? "" : "disabled"}
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

        <button onclick="dominoes.start()">
          New round
        </button>

        <details>
          <summary>How to play</summary>
          <p>
            Each player gets seven tiles.
            The player holding the highest double starts;
            without doubles, the highest pip total starts.
            Match a tile to either open end.
            Select a highlighted tile, then tap a highlighted
plus at an open end of the chain.
            When you cannot play, draw until you can.
            Pass only when the boneyard is empty.
            Empty your hand to win.
            If both players pass, the lowest pip total wins;
            equal totals draw.
            The winner earns the opponent’s remaining pips.
            Each round starts fresh.
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