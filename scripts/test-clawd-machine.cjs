/* node scripts/test-clawd-machine.cjs — deterministic physics, rewards and event tests. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'../public/games/clawd-machine');
const code=fs.readFileSync(path.join(root,'machine.js'),'utf8'),physics=fs.readFileSync(path.join(root,'physics.js'),'utf8');
let passed=0;
function test(name,fn){fn();console.log('PASS '+name);passed++;}
function machine(initial,engine=true){
 let now=1800000000000,raf=[],timers=[],seed=173,opts;
 const els={},events={},calls=[],data={};
 if(initial!==undefined)data.clawd_arcade=typeof initial==='string'?initial:JSON.stringify(initial);
 const ctx=new Proxy({}, {get(_,key){return(...args)=>{
   assert.ok(!args.some(a=>typeof a==='number'&&!Number.isFinite(a)),'non-finite canvas '+String(key));
 };},set(){return true;}});
 function el(id){return els[id]||=( {id,tagName:'BUTTON',dataset:{},disabled:false,hidden:false,style:{},textContent:'',listeners:{},
   classList:{toggle(){}},setAttribute(){},setPointerCapture(){},getContext(){return ctx;},appendChild(){},
   addEventListener(t,f){(this.listeners[t]||=[]).push(f);},
   click(){if(!this.disabled)(this.listeners.click||[]).forEach(f=>f.call(this,{target:this,preventDefault(){}}));}});}
 class Clock extends Date{static now(){return now;}}
 const math=Object.create(Math);math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const pet={eng:{tama:{},wrap:{style:{}}},clawd:{},playTrick:id=>calls.push(id)};
 const window={devicePixelRatio:1,addEventListener(t,f){(events[t]||=[]).push(f);}};
 if(engine)window.ClawdPet={tricks:Array.from({length:100},(_,i)=>({id:'t'+i,name:'动作'+i})),mount(o){opts=o;return pet;}};
 const sandbox={window,document:{getElementById:el,createElement:el,addEventListener(t,f){(events[t]||=[]).push(f);}},
   localStorage:{getItem:k=>data[k]||null,setItem:(k,v)=>data[k]=v},Date:Clock,Math:math,console,
   requestAnimationFrame:f=>raf.push(f),setInterval:(fn,d)=>timers.push({fn,d})};
 vm.createContext(sandbox);vm.runInContext(physics,sandbox);vm.runInContext(code,sandbox);
 function advance(ms,background=false){
   for(const end=now+ms;now<end;){now+=Math.min(40,end-now);
     if(background)timers.forEach(t=>t.fn());else{const q=raf;raf=[];q.forEach(f=>f(now));}}
 }
 return {S:window.__MACHINE,click:id=>el(id).click(),advance,calls,timers,els,data,pet,opts,
   saved:()=>JSON.parse(data.clawd_arcade||'{"tokens":10,"prizes":[]}'),
   event(type,key){(events[type]||[]).forEach(f=>f({key,target:{tagName:'BODY'},preventDefault(){}}));}};
}
function pending(outcome='kept',extra={}){return {tokens:9,won:0,prizes:[],pendingPrize:{uid:'capsule-test',id:'t1',name:'动作1',outcome,resolving:false,knocks:0},...extra};}
function win(m){
 m.advance(4000);m.click('b-coin');
 m.S.clawX=m.S.balls.filter(b=>b.row===0).sort((a,b)=>a.y-b.y)[0].x;
 m.click('b-drop');m.advance(8500);assert.equal(m.S.phase,'won');
}
test('capsules form a gravity pile without visible penetration',()=>{
 const m=machine();m.advance(8000);assert.equal(m.S.balls.length,22);
 assert.ok(Math.max(...m.S.balls.map(b=>b.y))-Math.min(...m.S.balls.map(b=>b.y))>40);
 for(const a of m.S.balls)for(const b of m.S.balls){
   if(a!==b&&a.row===b.row)assert.ok(Math.hypot(a.x-b.x,a.y-b.y)>30.5,'unresolved overlap');
   assert.ok(Number.isFinite(a.x)&&Number.isFinite(a.y)&&a.x>=192&&a.x<=354);
 }
});
test('physical contact stops claw, captures capsule and routes it to exit',()=>{
 const m=machine();win(m);assert.ok(m.S.contacts>0);assert.equal(m.S.balls.length,21);
 assert.ok(m.saved().pendingPrize);assert.ok(Math.abs(m.S.grabbed.y-455)<1);
});
test('one paid attempt, asynchronous reveal then atomic reward exactly once',()=>{
 const m=machine(pending());m.click('b-take');assert.equal(m.saved().won,0);
 m.click('b-take');m.advance(4000);assert.equal(m.saved().won,1);assert.equal(m.saved().tokens,11);
 assert.equal(m.S.phase,'off');assert.equal(m.calls.length,1);assert.equal(m.saved().prizes[0].id,'t1');
});
test('both losing events remove only this pending prize and award nothing',()=>{
 for(const type of ['run','sparrow']){
   const m=machine(pending(type,{prizes:[{id:'t2',name:'动作2',count:1}]}));
   m.click('b-take');m.advance(4000);assert.equal(m.saved().won,0);assert.equal(m.saved().tokens,9);
   assert.equal(m.saved().prizes.length,1);assert.equal(m.saved().pendingPrize,null);
 }
});
test('outcome cannot be rerolled by refresh mid-animation',()=>{
 const m=machine(pending('sparrow'));m.click('b-take');m.advance(800);
 const reloaded=machine(m.saved());assert.equal(reloaded.S.phase,'scene');reloaded.advance(4000);
 assert.equal(reloaded.saved().won,0);assert.equal(reloaded.saved().pendingPrize,null);
});
test('shy resident has a genuinely free three-knock option',()=>{
 const m=machine(pending('shy'));m.click('b-take');assert.equal(m.S.phase,'shy');
 m.click('b-knock');m.click('b-knock');assert.equal(m.S.phase,'shy');
 const next=machine(m.saved());assert.equal(next.S.phase,'shy');next.click('b-knock');next.advance(4000);
 assert.equal(next.saved().tokens,11);assert.equal(next.saved().won,1);
});
test('bribe costs one coin once, including refresh after payment',()=>{
 const m=machine(pending('shy'));m.click('b-take');m.click('b-bribe');assert.equal(m.saved().tokens,8);
 const next=machine(m.saved());next.advance(4000);assert.equal(next.saved().tokens,10);assert.equal(next.saved().won,1);
});
test('zero coins cannot bribe; releasing shy prize grants no reward',()=>{
 const m=machine(pending('shy',{tokens:0}));m.click('b-take');m.click('b-bribe');assert.equal(m.S.phase,'shy');
 m.click('b-release');assert.equal(m.saved().pendingPrize,null);assert.equal(m.saved().won,0);assert.equal(m.saved().tokens,0);
});
test('sleepy and jackpot scenes settle their explicit rewards',()=>{
 for(const [outcome,coins] of [['sleepy',11],['jackpot',13]]){
   const m=machine(pending(outcome));m.click('b-take');m.advance(4000);
   assert.equal(m.saved().tokens,coins);assert.equal(m.saved().won,1);
 }
});
test('prize clicks replay selected unlocked action instead of random moves',()=>{
 const m=machine(pending());m.opts.onTap();assert.equal(m.calls.length,0);
 m.click('b-take');m.advance(4000);m.opts.onTap();m.opts.onDoubleTap();
 assert.deepEqual(m.calls,['t1','t1','t1']);assert.equal(m.opts.prizeMode,true);
 assert.equal(m.pet.clawd.skinKey,'crail');assert.equal(m.opts.storageKey,'clawd_arcade_performer');
});
test('empty claw consumes attempt and returns to waiting',()=>{
 const m=machine();m.advance(4000);m.click('b-coin');m.S.balls=[];
 m.click('b-drop');m.advance(8000);assert.equal(m.S.phase,'off');assert.equal(m.saved().tokens,9);
 assert.equal(m.saved().pendingPrize,null);
});
test('timer expires into automatic drop and reset cannot buy extra time',()=>{
 const m=machine();m.click('b-coin');m.advance(3000);m.click('b-reset');assert.ok(m.S.timer<28);
 m.advance(27500);assert.notEqual(m.S.phase,'ready');assert.equal(m.saved().tokens,9);
});
test('zero coins and daily supply limits are enforced',()=>{
 const m=machine({tokens:0,won:0,prizes:[]});m.click('b-coin');assert.equal(m.S.phase,'off');
 m.click('b-refill');m.click('b-refill');assert.equal(m.saved().tokens,10);
});
test('keyboard row depth and movement limits follow labels and stop on blur',()=>{
 const m=machine();m.click('b-coin');m.click('b-up');assert.equal(m.S.row,1);
 m.click('b-down');assert.equal(m.S.row,0);m.event('keydown','ArrowRight');m.advance(3000);assert.equal(m.S.clawX,354);
 m.event('blur');m.advance(500);assert.equal(m.S.clawX,354);
});
test('one fallback timer advances state without RAF and never accumulates',()=>{
 const m=machine(pending());m.click('b-take');m.advance(4000,true);assert.equal(m.saved().won,1);
 m.advance(10000);assert.equal(m.timers.length,1);
});
test('corrupt saves, legacy collection migration and missing engine are safe',()=>{
 const m=machine('{broken',false);m.click('b-coin');assert.equal(m.saved().tokens,9);
 const n=machine({tokens:-2,prizes:['★ 动作12']});n.click('b-coin');
 assert.equal(n.saved().tokens,9);assert.equal(n.saved().prizes[0].id,'t12');
});
console.log('\n'+passed+' scenarios passed.');