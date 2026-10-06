// Run with: node --test tests/chess-polish.test.cjs
// Exercise the real game scripts with a controllable DOM/animation adapter.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function fixture({ cellSize = 50, audio = false } = {}) {
  const audioVoices = [];
  const audioGains = [];
  class AudioContext {
    constructor() { this.state = 'suspended'; this.destination = {}; }
    resume() { this.state = 'running'; return Promise.resolve(); }
    decodeAudioData(data) { return Promise.resolve({ data }); }
    createBufferSource() {
      const voice = { connect() {}, disconnect() {}, start() { this.started = true; } };
      audioVoices.push(voice); return voice;
    }
    createGain() {
      const gain = { gain: { value: 1 }, connect() {}, disconnect() {} };
      audioGains.push(gain); return gain;
    }
  }
  const animations = [];
  class Element {
    constructor(tag = 'div') {
      this.tagName = tag;
      this.children = [];
      this.dataset = {};
      this.attributes = {};
      this.style = { setProperty(key, value) { this[key] = value; } };
      const classes = new Set();
      this.classList = {
        add: (...names) => names.forEach(name => classes.add(name)),
        remove: (...names) => names.forEach(name => classes.delete(name)),
        contains: name => classes.has(name),
        toggle: (name, force = !classes.has(name)) => force ? classes.add(name) : classes.delete(name)
      };
      this.classes = classes;
    }
    set className(value) { this.classes.clear(); this.classList.add(...value.split(' ')); }
    set innerHTML(value) { this.children = []; this.html = value; }
    get innerHTML() { return this.html || ''; }
    appendChild(element) { element.parentElement = this; this.children.push(element); return element; }
    setAttribute(key, value) { this.attributes[key] = value; }
    getAttribute(key) { return this.attributes[key] || null; }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    querySelectorAll(selector) {
      const matches = [];
      for (const child of this.children) {
        if (selector.startsWith('.') && child.classList.contains(selector.slice(1))) matches.push(child);
        matches.push(...child.querySelectorAll(selector));
      }
      return matches;
    }
    getBoundingClientRect() {
      const square = this.dataset.row === undefined ? this.parentElement?.parentElement : this;
      return { left: Number(square?.dataset.col || 0) * cellSize, top: Number(square?.dataset.row || 0) * cellSize, width: 44, height: 44 };
    }
    cloneNode() { const clone = new Element(this.tagName); clone.attributes = { ...this.attributes }; clone.className = [...this.classes].join(' '); return clone; }
    remove() { const list = this.parentElement?.children; if (list) list.splice(list.indexOf(this), 1); }
    animate(keyframes, options) {
      let resolve;
      const finished = new Promise(done => { resolve = done; });
      const animation = { element: this, keyframes, options, finished, finish: resolve, cancel: resolve };
      animations.push(animation);
      return animation;
    }
  }
  const elements = new Map();
  const body = new Element('body');
  for (const id of ['chessBoard', 'moveHistoryList', 'capturedWhite', 'capturedBlack', 'chessStatus', 'promotionOverlay', 'promotionChoices', 'player1Time', 'player2Time', 'gameArea', 'themeMenu', 'soundToggle', 'profileButton', 'appTitle', 'backButton', 'settingsOverlay']) {
    const element = new Element(); elements.set(id, element); body.appendChild(element);
  }
  for (const name of ['dark', 'neon', 'retro', 'wood', 'forest']) {
    const button = new Element('button'); button.dataset.theme = name; elements.get('themeMenu').appendChild(button);
  }
  const document = {
    body,
    getElementById: id => elements.get(id) || null,
    createElement: tag => new Element(tag),
    querySelectorAll: selector => selector === '#themeMenu button' ? elements.get('themeMenu').children : [],
    querySelector: () => new Element(),
    addEventListener() {}
  };
  class Audio {
    constructor(src) { this.src = src; this.volume = 1; }
    load() {}
    play() { return Promise.resolve(); }
    cloneNode() { return new Audio(this.src); }
  }
  let now = 100;
  const storage = new Map();
  const context = vm.createContext({
    document, Audio, Image: class {}, Worker: class { postMessage() {} terminate() {} },
    window: { matchMedia: () => ({ matches: false }), AudioContext: audio ? AudioContext : undefined },
    fetch: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) }),
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key) },
    performance: { now: () => now },
    setTimeout: () => 1, clearTimeout() {}, setInterval: () => 1, clearInterval() {},
    requestAnimationFrame: callback => callback(), console
  });
  const run = code => vm.runInContext(code, context);
  for (const file of ['state.js', 'ui.js', 'stockfishAI.js', 'chess.js', 'script.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context, { filename: file });
  }
  run('chessGameMode = "local"; chessTimeMinutes = 0; loadChess();');
  function start(from, to) {
    const coords = square => [8 - Number(square[1]), square.charCodeAt(0) - 97];
    const [fr, fc] = coords(from); const [tr, tc] = coords(to);
    return run(`selectedChessPiece = {row:${fr},col:${fc}}; moveChessPiece(${tr},${tc})`);
  }
  async function move(from, to) {
    const result = start(from, to);
    animations.forEach(animation => animation.finish());
    await result;
  }
  function position(pieces, color = 'white') {
    run('cancelChessAnimation(); chessBoard = Array.from({length:8}, () => Array(8).fill(null)); lastChessMove = null; chessMoveHistory = []; stockfishMoveHistory = []; capturedWhite = []; capturedBlack = []; pendingPromotion = null; chessPositionHistory = {}; chessHalfMoveClock = 0; chessGameActive = true; chessClockStarted = true; chessTimeMinutes = 0; selectedChessPiece = null; highlightedChessMoves = [];');
    run(`chessCurrentPlayer = ${JSON.stringify(color)};`);
    for (const [square, type, color, hasMoved = false] of pieces) {
      run(`chessBoard[${8 - Number(square[1])}][${square.charCodeAt(0) - 97}] = ${JSON.stringify({ type, color, hasMoved })};`);
    }
    run('renderChessBoard();');
  }
  return { run, move, start, position, animations, elements, body, storage, audioVoices, audioGains, setNow(value) { now = value; } };
}
const kings = [['e1', 'king', 'white'], ['e8', 'king', 'black']];
const history = f => JSON.parse(f.run('JSON.stringify(chessMoveHistory)'));

test('opening SAN and paired move numbers', async () => {
  const f = fixture();
  await f.move('e2', 'e4'); await f.move('e7', 'e5'); await f.move('g1', 'f3'); await f.move('b8', 'c6');
  assert.deepEqual(history(f), ['e4', 'e5', 'Nf3', 'Nc6']);
  assert.deepEqual(f.elements.get('moveHistoryList').children.map(row => row.children.map(cell => cell.textContent)), [['1.', 'e4', 'e5'], ['2.', 'Nf3', 'Nc6']]);
});

test('consecutive captures animate before commit and ignore rendering/input races', async () => {
  const f = fixture();
  await f.move('e2', 'e4'); await f.move('d7', 'd5');
  const count = f.animations.length;
  const moving = f.start('e4', 'd5');
  assert.equal(f.animations.length, count + 1);
  assert.equal(f.run('chessBoard[4][4].type'), 'pawn');
  assert.equal(f.run('chessBoard[3][3].color'), 'black');
  f.run('renderChessBoard(); handleChessClick(6, 0);');
  assert.equal(f.run('selectedChessPiece.col'), 4);
  assert.equal(f.elements.get('chessBoard').children[36].querySelector('.chess-piece').style.visibility, 'hidden');
  f.animations.at(-1).finish(); await moving;
  await f.move('d8', 'd5');
  assert.deepEqual(history(f), ['e4', 'd5', 'exd5', 'Qxd5']);
  assert.equal(f.run('capturedBlack.length'), 1);
  assert.equal(f.run('capturedWhite.length'), 1);
  assert.equal(f.body.querySelectorAll('.chess-moving-piece').length, 0);
});

for (const [color, rank, side, destination, rookFrom, rookTo, san] of [
  ['white', '1', 'kingside', 'g', 'h', 'f', 'O-O'],
  ['white', '1', 'queenside', 'c', 'a', 'd', 'O-O-O'],
  ['black', '8', 'kingside', 'g', 'h', 'f', 'O-O'],
  ['black', '8', 'queenside', 'c', 'a', 'd', 'O-O-O']
]) {
  test(`${color} ${side} records SAN and animates king/rook together`, async () => {
    const f = fixture();
    f.position([...kings, [rookFrom + rank, 'rook', color]], color);
    const moving = f.start('e' + rank, destination + rank);
    assert.equal(f.animations.length, 2);
    assert.equal(f.run(`chessBoard[${8 - Number(rank)}][4].type`), 'king');
    f.animations.forEach(animation => animation.finish()); await moving;
    assert.equal(history(f)[0], san);
    assert.equal(f.run(`chessBoard[${8 - Number(rank)}][${rookTo.charCodeAt(0) - 97}].type`), 'rook');
  });
}

test('en passant captures and SAN', async () => {
  const f = fixture();
  for (const [from, to] of [['e2','e4'],['a7','a6'],['e4','e5'],['d7','d5'],['e5','d6']]) await f.move(from, to);
  assert.equal(history(f).at(-1), 'exd6');
  assert.equal(f.run('chessBoard[3][3]'), null);
  assert.equal(f.run('capturedBlack.length'), 1);
});

test('check and checkmate suffixes', async () => {
  const f = fixture();
  for (const [from, to] of [['f2','f3'],['e7','e5'],['g2','g4'],['d8','h4']]) await f.move(from, to);
  assert.equal(history(f).at(-1), 'Qh4#');
  assert.equal(f.run('chessGameActive'), false);
  const g = fixture();
  g.position([['e1','king','white'],['e8','king','black'],['a1','rook','white']]);
  await g.move('a1','a8'); assert.equal(history(g)[0], 'Ra8+');
});

test('human promotion records once after selection with check suffix', async () => {
  const f = fixture();
  f.position([['e1','king','white'],['h8','king','black'],['c7','pawn','white'],['d8','rook','black']]);
  await f.move('c7','d8');
  assert.deepEqual(history(f), []);
  assert.equal(f.run('pendingPromotion.color'), 'white');
  f.run('completePromotion("queen"); completePromotion("queen");');
  assert.deepEqual(history(f), ['cxd8=Q+']);
  assert.equal(f.run('stockfishMoveHistory[0]'), 'c7d8q');
});

test('SAN disambiguates files, ranks and full squares, excluding pinned alternatives', () => {
  const f = fixture();
  function san(pieces, from, to) {
    f.position(pieces);
    const fr = 8 - Number(from[1]), fc = from.charCodeAt(0) - 97;
    const tr = 8 - Number(to[1]), tc = to.charCodeAt(0) - 97;
    return f.run(`buildChessSAN({fromRow:${fr},fromCol:${fc},row:${tr},col:${tc}}, chessBoard[${fr}][${fc}])`);
  }
  assert.equal(san([...kings,['b1','knight','white'],['f1','knight','white']], 'b1','d2'), 'Nbd2');
  assert.equal(san([...kings,['a1','rook','white'],['a3','rook','white']], 'a1','a2'), 'R1a2');
  assert.equal(san([...kings,['b1','knight','white'],['b3','knight','white'],['f1','knight','white']], 'b1','d2'), 'Nb1d2');
  assert.equal(san([['e1','king','white'],['a8','king','black'],['e8','rook','black'],['e2','knight','white'],['b1','knight','white']], 'b1','c3'), 'Nc3');
});

test('Stockfish captures use the same animation path', async () => {
  const f = fixture();
  await f.move('e2','e4'); await f.move('d7','d5'); await f.move('e4','d5');
  f.run('chessGameMode = "ai"; chessDifficulty = "expert"; stockfishRequest = {history:stockfishMoveHistory.join(" "),board:JSON.stringify(chessBoard)};');
  const count = f.animations.length;
  const moving = f.run('receiveStockfishMove("d8d5")');
  assert.equal(f.animations.length, count + 1);
  assert.equal(f.run('chessBoard[0][3].type'), 'queen');
  f.animations.at(-1).finish(); await moving;
  assert.equal(history(f).at(-1), 'Qxd5');
});

test('Stockfish underpromotion survives the asynchronous animation', async () => {
  const f = fixture();
  f.position([['e1','king','white'],['h8','king','black'],['a2','pawn','black']], 'black');
  f.run('chessGameMode = "ai"; chessDifficulty = "expert"; stockfishRequest = {history:"",board:JSON.stringify(chessBoard)};');
  const moving = f.run('receiveStockfishMove("a2a1n")');
  f.animations.at(-1).finish(); await moving;
  assert.deepEqual(history(f), ['a1=N']);
  assert.equal(f.run('stockfishMoveHistory[0]'), 'a2a1n');
  assert.equal(f.run('stockfishPromotionType'), null);
});

test('restart or navigation during animation cancels stale commits', async () => {
  const f = fixture();
  const moving = f.start('e2','e4');
  f.run('showChessTimeScreen();'); await moving;
  assert.deepEqual(history(f), []);
  assert.equal(f.run('chessBoard[6][4].type'), 'pawn');
  assert.equal(f.run('chessAnimationRunning'), false);
  assert.equal(f.body.querySelectorAll('.chess-moving-piece').length, 0);
  f.run('loadChess();'); await f.move('d2','d4');
  assert.deepEqual(history(f), ['d4']);
});

test('visual animation consumes no clock time or duplicate increments', async () => {
  const f = fixture();
  f.run('chessTimeMinutes = 5; chessIncrementSeconds = 2; player1Time = 300; player2Time = 300; startClock(1);');
  const moving = f.start('e2','e4');
  f.setNow(350); f.run('syncChessClock();');
  assert.equal(f.run('player1Time'), 300);
  f.animations.at(-1).finish(); await moving;
  assert.equal(f.run('player1Time'), 302);
  assert.equal(f.run('activePlayer'), 2);
  f.setNow(1350); f.run('syncChessClock();');
  assert.equal(f.run('player2Time'), 299);
});

test('reduced motion commits without animated flights', async () => {
  const f = fixture();
  f.run('window.matchMedia = () => ({matches:true});');
  await f.move('e2','e4');
  assert.equal(f.animations.length, 0);
  assert.deepEqual(history(f), ['e4']);
});

test('theme persistence and switching preserve overlay state and existing themes', () => {
  const f = fixture();
  f.body.classList.add('overlay-open');
  for (const theme of ['wood','forest','neon','retro','dark']) {
    f.run(`setTheme(${JSON.stringify(theme)})`);
    assert.equal(f.storage.get('theme'), theme);
    assert.equal(f.body.classList.contains('overlay-open'), true);
    assert.equal(f.body.classList.contains(theme + '-theme'), true);
    assert.equal(f.elements.get('themeMenu').children.filter(button => button.getAttribute('aria-pressed') === 'true').length, 1);
  }
  f.run('setTheme("invalid")'); assert.equal(f.storage.get('theme'), 'dark');
});


test('animation distance follows actual square size on narrow boards', async () => {
  const f = fixture({ cellSize: 36 });
  const moving = f.start('e2','e4');
  assert.equal(f.animations[0].keyframes[1].transform, 'translate(0px, -72px)');
  f.animations[0].finish(); await moving;
});

test('decoded audio is reused, respects mute, and preserves sound volumes', async () => {
  const f = fixture({ audio: true });
  await f.run('Promise.all([...gameAudioLoads.values()])');
  assert.equal(f.run('gameAudioBuffers.size'), 8);
  await f.run('unlockGameAudio();');
  f.run('playQuietBlockSound(); playCaptureSound(); playDominoSound(dominoTileSound);');
  assert.deepEqual(f.audioGains.map(gain => gain.gain.value), [0.10, 0.50, 0.35]);
  assert.equal(f.audioVoices.every(voice => voice.started), true);
  f.run('soundEnabled = false; playSound(winSound); playWrongSound();');
  assert.equal(f.audioVoices.length, 3);
});
