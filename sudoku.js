/* THE Andy Update: deterministic daily puzzles, unique solutions, device-local progress. */
const sudoku = (() => {
  const levels = { easy: 42, medium: 34, hard: 28, expert: 24 };
  let sessionStore;
  let session, selected = -1, notesMode = false, history = [], timer, mode = 'daily';
  function random(seed) {
    let h = 2166136261;
    for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    return () => { h += 0x6D2B79F5; let t = Math.imul(h ^ h >>> 15, 1 | h); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }

  function shuffle(a, rng) { for (let i=a.length-1;i>0;i--) { const j=Math.floor(rng()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

  function candidates(board, i) {
    const r=Math.floor(i/9), c=i%9, used=new Set();
    for(let k=0;k<9;k++) { used.add(board[r*9+k]); used.add(board[k*9+c]); used.add(board[(Math.floor(r/3)*3+Math.floor(k/3))*9+Math.floor(c/3)*3+k%3]); }
    return [1,2,3,4,5,6,7,8,9].filter(n=>!used.has(n));
  }

  function countSolutions(board, limit=2) {
    const rows=Array(9).fill(0),cols=Array(9).fill(0),boxes=Array(9).fill(0);
    const box=i=>Math.floor(i/27)*3+Math.floor(i%9/3);
    for(let i=0;i<81;i++) if(board[i]) { const bit=1<<board[i],r=Math.floor(i/9),c=i%9,b=box(i); if((rows[r]|cols[c]|boxes[b])&bit)return 0;rows[r]|=bit;cols[c]|=bit;boxes[b]|=bit; }

    function solve(cap) {
      let index=-1,mask=0,best=10;
      for(let i=0;i<81;i++) if(!board[i]) { const m=1022&~(rows[Math.floor(i/9)]|cols[i%9]|boxes[box(i)]);if(!m)return 0;let n=0;for(let x=m;x;x&=x-1)n++;if(n<best){best=n;index=i;mask=m;if(n===1)break;} }
      if(index<0)return 1;
      const r=Math.floor(index/9),c=index%9,b=box(index);let total=0;
      for(let m=mask;m;m&=m-1){const bit=m&-m;board[index]=Math.log2(bit);rows[r]|=bit;cols[c]|=bit;boxes[b]|=bit;total+=solve(cap-total);rows[r]^=bit;cols[c]^=bit;boxes[b]^=bit;if(total>=cap)break;}
      board[index]=0;return total;
    }
    return solve(limit);
  }

  function generate(seed, difficulty) {
    const rng=random(seed), order=()=>shuffle([0,1,2],rng);
    const groups=()=>order().flatMap(g=>order().map(x=>g*3+x));
    const rows=groups(), cols=groups(), digits=shuffle([1,2,3,4,5,6,7,8,9],rng);
    const solution=rows.flatMap(r=>cols.map(c=>digits[(r*3+Math.floor(r/3)+c)%9]));
    const puzzle=solution.slice(); let clues=81;
    for(const i of shuffle(Array.from({length:81},(_,i)=>i),rng)) {
      if(clues<=levels[difficulty]) break;
      const n=puzzle[i]; puzzle[i]=0;
      if(countSolutions(puzzle.slice())!==1) puzzle[i]=n; else clues--;
    }
    return { puzzle, solution };
  }

  function dateKey(d=new Date()) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  
  function data() { return profiles[currentProfile].sudokuData ||= { sessions:{}, completed:{}, freeCompleted:0 }; }
  
  function save() { if(session) { sessionStore.sessions[session.key]=session; saveProfiles(); } }
  
  function stop() { clearInterval(timer); timer=null; save(); session=null; sessionStore=null; }
  
  function choose(nextMode) {
    if(!requirePlayerProfile()) return;
    stop(); mode=nextMode; pendingGame='sudoku';
    document.querySelector('.menu').classList.add('hidden');
    document.getElementById('backButton').style.display='inline-block'; hideAppTitle();
    const completed=data().completed;
    setGameAreaContent(`<section class="sudoku-game"><h2>${mode==='daily'?'Daily Sudoku · Andy':'Sudoku · Free Play'}</h2><p>${mode==='daily'?dateKey()+' · One puzzle per difficulty each day.':'A fresh puzzle whenever you want.'}</p><p>Choose your difficulty</p><div class="game-grid">${Object.keys(levels).map(l=>`<button class="game-card" onclick="sudoku.begin('${l}')"><h2>${l[0].toUpperCase()+l.slice(1)}</h2>${mode==='daily'&&completed[dateKey()+':'+l]?'✓ Completed':'Play'}</button>`).join('')}</div><p>Difficulty increases as starting clues decrease. Harder puzzles may need advanced techniques.</p></section>`);
  }

  function begin(difficulty, fresh=false) {
    if(!levels[difficulty]) return;
    stop(); const day=dateKey(), key=mode==='daily'?day+':'+difficulty:'free:'+difficulty;
    sessionStore=data();
    session=!fresh && sessionStore.sessions[key];
    if(!session) { const seed=mode==='daily'?'andy-v1:'+key:'free:'+Date.now()+':'+Math.random(); const g=generate(seed,difficulty); session={...g, key, mode, difficulty, day, values:g.puzzle.slice(), notes:Array.from({length:81},()=>[]), seconds:0, hints:0, done:false}; }
    selected=-1; notesMode=false; history=[];
    setGameAreaContent(`<section class="sudoku-game"><h2>${mode==='daily'?'Daily Sudoku · Andy':'Sudoku'}</h2><p>${difficulty[0].toUpperCase()+difficulty.slice(1)}${mode==='daily'?' · '+session.day:''}</p><p id="sudokuStatus" role="status" aria-live="polite"></p><div id="sudokuBoard" class="sudoku-board" role="group" aria-label="Sudoku board"></div><div class="sudoku-keypad">${[1,2,3,4,5,6,7,8,9].map(n=>`<button onclick="sudoku.input(${n})">${n}</button>`).join('')}</div><div class="sudoku-tools"><button onclick="sudoku.input(0)">Erase</button><button id="sudokuNotes" onclick="sudoku.toggleNotes()">Notes: Off</button><button onclick="sudoku.undo()">Undo</button><button onclick="sudoku.check()">Check</button><button onclick="sudoku.hint()">Hint</button><button onclick="sudoku.choose('${mode}')">Difficulty</button>${mode==='free'?`<button onclick="sudoku.newPuzzle()">New Puzzle</button>`:''}</div><p>Tap a cell, then a number. Keyboard: 1–9, arrows, Backspace, N for notes.</p><p>Progress saves automatically. Returning to menu pauses your puzzle.</p></section>`);
    
if (
  mode === "daily" &&
  session.done &&
  session.hints > 0
) {
  const retryButton = document.createElement("button");
  retryButton.textContent = "Retry Without Hints";
  retryButton.onclick = retryDailyClean;

  document.querySelector(".sudoku-tools")
    .appendChild(retryButton);
}

    render(); save(); timer=setInterval(()=> { if(session && !session.done && !document.hidden) { session.seconds++; status(); if(session.seconds%10===0) save(); } },1000);
  }

  
function status(message = '') {
  const el = document.getElementById('sudokuStatus');
  if (!el || !session) return;

  let result = "";

  if (session.done) {
    result = session.hints > 0
      ? "💡 Assisted Complete!"
      : "🏆 Clean Complete!";
  } else if (session.hints > 0) {
    result = "💡 Assisted Run";
  }

  const time = `${Math.floor(session.seconds / 60)}:${String(session.seconds % 60).padStart(2, '0')}`;

  el.textContent =
    `${result}${message ? " · " + message : ""} · ${time} · Hints: ${session.hints}`;
}


  function render() {
    const board=document.getElementById('sudokuBoard'); if(!board || !session) return;
    board.innerHTML=session.values.map((v,i)=> { const r=Math.floor(i/9),c=i%9, sr=Math.floor(selected/9),sc=selected%9;
      const related=selected>=0&&(r===sr||c===sc||(Math.floor(r/3)===Math.floor(sr/3)&&Math.floor(c/3)===Math.floor(sc/3)));
      const duplicate=v&&session.values.some((x,j)=>j!==i&&x===v&&(Math.floor(j/9)===r||j%9===c||(Math.floor(j/27)===Math.floor(r/3)&&Math.floor(j%9/3)===Math.floor(c/3))));
      return `<button class="sudoku-cell ${session.puzzle[i]?'given':''} ${related?'related':''} ${i===selected?'selected':''} ${duplicate?'conflict':''}" style="${c===2||c===5?'border-right-width:3px;':''}${r===2||r===5?'border-bottom-width:3px;':''}" aria-label="Row ${r+1}, column ${c+1}, ${v||'empty'}${session.puzzle[i]?', given':''}" aria-pressed="${i===selected}" onclick="sudoku.select(${i})">${v||`<span class="sudoku-pencil">${[1,2,3,4,5,6,7,8,9].map(n=>`<span>${session.notes[i].includes(n)?n:''}</span>`).join('')}</span>`}</button>`;
    }).join(''); status();
  }

  function select(i) { selected=i; render(); }
  
  function snapshot() { history.push({values:session.values.slice(),notes:session.notes.map(n=>n.slice())}); }
  
  function input(n) {
    if(!session || session.done || selected<0 || session.puzzle[selected]) return;
    snapshot();
    if(notesMode&&n) { const a=session.notes[selected], i=a.indexOf(n); if(i<0)a.push(n);else a.splice(i,1); session.values[selected]=0; }
    else { session.values[selected]=n; session.notes[selected]=[]; }
    if(session.values.every((v,i)=>v===session.solution[i])) {
      session.done=true; const d=sessionStore;
      
if (session.mode === "daily") {
  const previous = d.completed[session.key];

  const everAssisted =
    (previous && (previous.hints > 0 || previous.everAssisted)) ||
    session.hints > 0;

  const newRecord = {
    seconds: session.seconds,
    hints: session.hints,
    everAssisted: Boolean(everAssisted)
  };

  // Record first completion, or upgrade an assisted solve
  // to a clean solve without counting it twice.
  if (
    !previous ||
    (session.hints === 0 && previous.hints !== 0) ||
    (session.hints === 0 &&
      previous.hints === 0 &&
      session.seconds < previous.seconds)
  ) {
    d.completed[session.key] = newRecord;
  }

  unlockAchievement("andy-approved");
  checkDailyDuoAchievement(session.day);

} else {
  d.freeCompleted++;

  // Free Play personal bests require zero hints.
  if (session.hints === 0) {
    d.freeBests ||= {};

    const previousBest = d.freeBests[session.difficulty];

    if (
      !Number.isFinite(previousBest) ||
      session.seconds < previousBest
    ) {
      d.freeBests[session.difficulty] = session.seconds;
    }
  }
}


      playGameResultSound('ai','win');
    }
    save();
    if (session?.done && !session.achievementRecorded) {
      session.achievementRecorded = true;
      save();
      recordAchievementGame("sudoku");
    }
    render();
  }

  function toggleNotes() { notesMode=!notesMode; const el=document.getElementById('sudokuNotes'); if(el)el.textContent='Notes: '+(notesMode?'On':'Off'); }
  
  function undo() { if(!session||session.done||!history.length)return; Object.assign(session,history.pop());save();render(); }
  
  function check() { if(!session)return; const wrong=session.values.filter((v,i)=>v&&v!==session.solution[i]).length; status(wrong?`${wrong} incorrect ${wrong===1?'entry':'entries'}`:'No incorrect entries so far'); }
  
  function hint() { if(!session||session.done)return; const i=selected>=0&&!session.puzzle[selected]&&session.values[selected]!==session.solution[selected]?selected:session.values.findIndex((v,i)=>v!==session.solution[i]); if(i<0)return; selected=i; notesMode=false; session.hints++; input(session.solution[i]); document.getElementById('sudokuNotes').textContent='Notes: Off'; }
  

function retryDailyClean() {
  if (
    !session ||
    session.mode !== "daily" ||
    !session.done ||
    session.hints === 0
  ) return;

  const difficulty = session.difficulty;

  showConfirmation(
    "Retry this daily Sudoku without hints? Your assisted completion will remain recorded until you finish.",
    () => begin(difficulty, true)
  );
}

  function newPuzzle() { showConfirmation('Replace this free-play puzzle with a new one?',()=>begin(session.difficulty,true)); }
  document.addEventListener('keydown',e=> {
    if(!session||pendingGame!=='sudoku'||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||document.body.classList.contains('overlay-open')) return;
    if(/^[1-9]$/.test(e.key)) { e.preventDefault();input(Number(e.key)); }
    else if(['Backspace','Delete','0'].includes(e.key)) {e.preventDefault();input(0);}
    else if(e.key.toLowerCase()==='n')toggleNotes();
    else if(e.key.startsWith('Arrow')) {e.preventDefault();const i=selected<0?0:selected,r=Math.floor(i/9),c=i%9; select(e.key==='ArrowRight'?r*9+(c+1)%9:e.key==='ArrowLeft'?r*9+(c+8)%9:e.key==='ArrowDown'?((r+1)%9)*9+c:((r+8)%9)*9+c);}
  });
  return {choose,begin,stop,input,select,toggleNotes,undo,check,hint,newPuzzle,generate,countSolutions,dateKey};
})();

function startSudoku(mode) { sudoku.choose(mode); }
