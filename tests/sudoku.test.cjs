const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');const fs=require('node:fs');
const ctx={document:{addEventListener(){}},console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('sudoku.js','utf8')+';globalThis.engine=sudoku;',ctx);
for(const level of ['easy','medium','hard','expert']) test(level+' puzzles are reproducible and uniquely solvable',()=>{
 for(let day=1;day<=15;day++) {
  const seed='andy-v1:2026-10-'+day+':'+level;
  const a=ctx.engine.generate(seed,level), b=ctx.engine.generate(seed,level);
  assert.deepEqual(a,b);assert.equal(ctx.engine.countSolutions(a.puzzle.slice()),1);
  for(let r=0;r<9;r++) assert.equal(new Set(a.solution.slice(r*9,r*9+9)).size,9);
  for(let c=0;c<9;c++) assert.equal(new Set(a.solution.filter((_,i)=>i%9===c)).size,9);
  a.puzzle.forEach((n,i)=>{if(n)assert.equal(n,a.solution[i]);});
 }
});
test('daily date follows local calendar',()=>assert.equal(ctx.engine.dateKey(new Date(2026,9,14)), '2026-10-14'));
test('notes, undo, resume and completion stay with the owning profile',()=>{
 const elements=new Map(); const el=id=>{if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',style:{},classList:{add(){},remove(){}}});return elements.get(id);};
 const profiles={Andy:{},Moose:{}};let saves=0;
 const c={document:{addEventListener(){},getElementById:el,querySelector:el},profiles,currentProfile:'Andy',requirePlayerProfile:()=>true,pendingGame:null,hideAppTitle(){},setGameAreaContent(){},saveProfiles(){saves++;},setInterval(){return 1;},clearInterval(){},playGameResultSound(){},showConfirmation(_,fn){fn();}};
 vm.createContext(c);vm.runInContext(fs.readFileSync('sudoku.js','utf8')+';globalThis.engine=sudoku;',c);
 const e=c.engine;e.choose('daily');e.begin('easy');const key=Object.keys(profiles.Andy.sudokuData.sessions)[0],s=profiles.Andy.sudokuData.sessions[key];const i=s.puzzle.findIndex(n=>!n);
 e.select(i);e.toggleNotes();e.input(4);assert.equal(s.notes[i][0],4);e.undo();assert.equal(s.notes[i].length,0);e.toggleNotes();e.input(s.solution[i]);e.stop();e.choose('daily');e.begin('easy');assert.equal(s.values[i],s.solution[i]);
 c.currentProfile='Moose';e.stop();assert.equal(profiles.Moose.sudokuData,undefined);c.currentProfile='Andy';e.choose('daily');e.begin('easy');
 for(let j=0;j<81;j++)if(!s.puzzle[j]){e.select(j);e.input(s.solution[j]);}
 assert.equal(s.done,true);assert.ok(profiles.Andy.sudokuData.completed[key]);const done=JSON.stringify(profiles.Andy.sudokuData.completed);e.input(0);assert.equal(JSON.stringify(profiles.Andy.sudokuData.completed),done);assert.ok(saves>0);
});
