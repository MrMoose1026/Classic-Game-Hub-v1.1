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

  stop() {
    clearTimeout(this.timer);
    this.timer = null;
    this.active = false;
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
      this.revealed &&
      !(this.mode === "ai" && this.turn === 1)
    );
  },

  choose(index) {
    if (!this.canAct()) return;

    this.selected = index;
    this.render();
  },

  play(index, side) {
    const legal = this.options().some(
      move => move.index === index && move.side === side
    );

    if (!this.active || !legal) return;

    const tile = this.hands[this.turn]
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

        playDominoSound(dominoTileSound);
    this.passes = 0;

    if (!this.hands[this.turn].length) {
      this.finish(this.turn);
      return;
    }

    this.next();
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

  if (
    winner >= 0 &&
    (this.mode === "local" || winner === 0)
  ) {
    playDominoSound(winSound);
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

    setGameAreaContent(`
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
              ? this.chain.map(tile => `
                  <span
                    class="domino-tile"
                    aria-label="${tile[0]}–${tile[1]}"
                  >
                    ${this.tile(tile)}
                  </span>
                `).join("")
              : "<p>Play any tile to begin.</p>"
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
                  onclick="dominoes.place('left')"
                  ${canPlace("left") ? "" : "disabled"}
                >
                  Play left
                </button>

                <button
                  onclick="dominoes.place('right')"
                  ${canPlace("right") ? "" : "disabled"}
                >
                  ${this.chain.length ? "Play right" : "Play tile"}
                </button>

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
            Select a highlighted tile, then choose an end.
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
    `);
  }
};

function loadDominoes() {
  hideAppTitle();
  dominoes.start();
}