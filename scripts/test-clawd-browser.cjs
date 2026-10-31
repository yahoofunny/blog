/* Requires Playwright; PLAYWRIGHT_MODULE may point to an existing install.
   Runs its own static server; no writes to player profiles or project dependencies. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../public'),artifacts=process.env.CLAWD_TEST_OUTPUT;
const fixture='<!doctype html><style>body{margin:0}#host,#second{width:360px;height:300px;position:relative}</style><div id="host"></div><div id="second"></div><script>window.CLAWD_PET_NO_AUTO=true;</script><script src="/clawd-engine.js"></script>';
const server=http.createServer((req,res)=>{
 if(req.url.startsWith('/__pet-test')){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(fixture);}
 const file=path.join(root,decodeURIComponent(req.url.split('?')[0]));
 const resolved=fs.existsSync(file)&&fs.statSync(file).isDirectory()?path.join(file,'index.html'):file;
 if(!resolved.startsWith(root)||!fs.existsSync(resolved)){res.statusCode=404;return res.end();}
 const ext=path.extname(resolved);res.setHeader('Content-Type',ext==='.js'?'text/javascript':ext==='.html'?'text/html; charset=utf-8':'application/octet-stream');
 res.end(fs.readFileSync(resolved));
});
let browser,passed=0,base;const errors=[],at=new Date('2026-10-31T12:00:00+08:00');
async function test(name,fn){if(process.env.CLAWD_BROWSER_FILTER&&!new RegExp(process.env.CLAWD_BROWSER_FILTER).test(name))return;await fn();console.log('PASS '+name);passed++;}
async function mount(page,key,opts={}){
 await page.goto(base+'/__pet-test');
 await page.evaluate(({key,opts})=>{window.pet=ClawdPet.mount({container:document.getElementById('host'),storageKey:key,sound:false,sleepWindow:false,...opts});},{key,opts});
}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;
 const exe=process.env.CLAWD_BROWSER||['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(p=>fs.existsSync(p));
 browser=await chromium.launch({headless:true,...(exe?{executablePath:exe}:{})});
 const context=await browser.newContext({viewport:{width:1320,height:1050},timezoneId:'Asia/Shanghai'});
 context.on('page',p=>p.on('pageerror',e=>errors.push(String(e))));
 const page=await context.newPage();await page.clock.install({time:at});
 await test('new egg hatches naturally after 60 seconds and survives reload',async()=>{
   await mount(page,'egg-natural');await page.clock.runFor(61000);
   assert.equal(await page.evaluate(()=>pet.eng.tama.hatched),true);
   await page.reload();await page.evaluate(()=>window.pet=ClawdPet.mount({container:document.getElementById('host'),storageKey:'egg-natural',sound:false}));
   assert.equal(await page.evaluate(()=>pet.eng.tama.hatched),true);
 });
 await test('seven actual pointer taps accelerate hatch and write it immediately',async()=>{
   await mount(page,'egg-taps');
   for(let i=0;i<7;i++){
     await page.locator('.cw-hit').dispatchEvent('pointerdown',{pointerId:1,clientX:120,clientY:120});
     await page.locator('.cw-hit').dispatchEvent('pointerup',{pointerId:1,clientX:120,clientY:120});
     await page.clock.runFor(80);
   }
   assert.equal(await page.evaluate(()=>pet.eng.tama.hatched),true);
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage['egg-taps_tama']).hatched),true);
 });
 await test('hidden pet still hatches and destroy removes heartbeat',async()=>{
   await mount(page,'egg-hidden');await page.evaluate(()=>pet.hide());await page.clock.runFor(61000);
   assert.equal(await page.evaluate(()=>pet.eng.tama.hatched),true);
   await page.evaluate(()=>pet.destroy());
   assert.equal(await page.evaluate(()=>Object.keys(JSON.parse(localStorage['egg-hidden_hb'])).length),0);
 });
 await test('RAF watchdog hatches egg even when animation frames never fire',async()=>{
   const p=await context.newPage();await p.clock.install({time:at});await p.goto(base+'/__pet-test');
   await p.evaluate(()=>{window.requestAnimationFrame=()=>123;window.pet=ClawdPet.mount({container:document.getElementById('host'),storageKey:'egg-no-raf',sound:false});});
   await p.clock.runFor(62000);assert.equal(await p.evaluate(()=>pet.eng.tama.hatched),true);await p.close();
 });
 await test('old egg catches up on return and sick adult respects gentle health floor',async()=>{
   await page.goto(base+'/__pet-test');
   await page.evaluate(()=>{
     const now=Date.now();
     localStorage.setItem('old-egg_tama',JSON.stringify({v:3,lastSim:now-86400000,birth:now-86400000,hatched:false,hatchP:.2,stage:'egg'}));
     window.pet=ClawdPet.mount({container:document.getElementById('host'),storageKey:'old-egg',sleepWindow:false,sound:false});
     localStorage.setItem('old-sick_tama',JSON.stringify({v:3,lastSim:now-86400000,birth:now-86400000,hatched:true,stage:'adult',health:21,illnessLevel:3,fullness:0,happiness:0,cleanliness:0,energy:0}));
     window.sick=ClawdPet.mount({container:document.getElementById('second'),storageKey:'old-sick',sleepWindow:false,sound:false});
   });
   assert.equal(await page.evaluate(()=>pet.eng.tama.hatched),true);
   assert.equal(await page.evaluate(()=>sick.eng.tama.health),20);
   assert.ok(await page.evaluate(()=>pet.eng.tama.protectH>=11));
   assert.deepEqual(await page.evaluate(()=>window.__clawdErrors||[]),[]);
 });
 await test('two instances keep independent sleep settings',async()=>{
   await page.clock.setSystemTime(new Date('2026-10-31T23:00:00+08:00'));
   await page.goto(base+'/__pet-test');
   await page.evaluate(()=>{
     for(const key of ['night','actor'])localStorage.setItem(key+'_tama',JSON.stringify({v:3,lastSim:Date.now()-2000,hatched:true,stage:'adult'}));
     window.pet=ClawdPet.mount({container:document.getElementById('host'),storageKey:'night',sleepWindow:true,sound:false});
     window.actor=ClawdPet.mount({container:document.getElementById('second'),storageKey:'actor',sleepWindow:false,sound:false});
   });
   await page.clock.runFor(3000);
   assert.equal(await page.evaluate(()=>pet.eng.tama.clockSleep),true);
   assert.equal(await page.evaluate(()=>actor.eng.tama.clockSleep),false);
   await page.clock.setSystemTime(at);
 });
 await test('viewer takes over latest hatched save when original tab closes',async()=>{
   const a=await context.newPage(),b=await context.newPage();
   console.log('takeover: clock');await a.clock.install({time:at});
   console.log('takeover: navigate');await a.goto(base+'/__pet-test');await b.goto(base+'/__pet-test');
   await a.evaluate(()=>{crypto.randomUUID=()=> 'a';window.pet=ClawdPet.mount({container:document.getElementById('host'),storageKey:'takeover',sound:false});});
   await b.evaluate(()=>{crypto.randomUUID=()=> 'b';window.pet=ClawdPet.mount({container:document.getElementById('host'),storageKey:'takeover',sound:false});});
   console.log('takeover: run leader');await a.bringToFront();await a.clock.fastForward(65000);console.log('takeover: leader hatched');
   const current=await a.evaluate(()=>Date.now());console.log('takeover: close leader');await b.clock.setSystemTime(current);await a.close();await b.bringToFront();console.log('takeover: closed');
   await b.clock.runFor(11000);
   assert.equal(await b.evaluate(()=>pet.eng.tama.hatched),true);
   await b.evaluate(()=>pet.eng.tama.name='接管成功');await b.clock.runFor(22000);
   assert.equal(await b.evaluate(()=>JSON.parse(localStorage.takeover_tama).name),'接管成功');
   await b.close();
 });
 for(const outcome of ['run','sparrow','shy','sleepy','jackpot','kept']){
   await test('animated outcome '+outcome+' settles correctly and replay stays locked',async()=>{
     const c=await browser.newContext({viewport:{width:1320,height:1100},timezoneId:'Asia/Shanghai'});
     const p=await c.newPage();p.on('pageerror',e=>errors.push(String(e)));await p.clock.install({time:at});
     await p.addInitScript(outcome=>{
       localStorage.setItem('clawd_arcade',JSON.stringify({tokens:9,won:0,prizes:[],pendingPrize:{uid:'browser-event',id:'poem',name:'念诗',outcome,resolving:false,knocks:0}}));
     },outcome);
     await p.goto(base+'/games/clawd-machine/');await p.click('#b-take');await p.clock.runFor(1400);
     if(artifacts){fs.mkdirSync(artifacts,{recursive:true});await p.screenshot({path:path.join(artifacts,outcome+'.png'),fullPage:true});}
     if(outcome==='shy'){
       assert.equal(await p.evaluate(()=>__MACHINE.phase),'shy');
       await p.click('#b-knock');await p.click('#b-knock');await p.click('#b-knock');
     }
     await p.clock.runFor(4000);
     const result=await p.evaluate(()=>JSON.parse(localStorage.clawd_arcade));
     assert.equal(result.won,['run','sparrow'].includes(outcome)?0:1);
     assert.equal(result.tokens,['run','sparrow'].includes(outcome)?9:outcome==='jackpot'?13:11);
     if(result.won){
       await p.locator('#pet-stage .cw-hit').dispatchEvent('pointerdown',{pointerId:1,clientX:100,clientY:100});
       assert.equal(await p.evaluate(()=>__CLAWD_LAST__.clawd.trick.def.id),'poem');
       await p.locator('#pet-stage .cw-hit').dispatchEvent('contextmenu');
       assert.equal(await p.evaluate(()=>!!__CLAWD_LAST__.eng.radialOpen),false);
       assert.ok(!/ech0/i.test(await p.locator('#pet-stage').innerText()));
       await p.setViewportSize({width:390,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
     }
     await c.close();
   });
 }
 await test('collection buttons select only unlocked prize actions',async()=>{
   const c=await browser.newContext(),p=await c.newPage();await p.clock.install({time:at});
   await p.addInitScript(()=>localStorage.setItem('clawd_arcade',JSON.stringify({tokens:10,won:2,
     prizes:[{id:'poem',name:'念诗',count:1},{id:'sprint',name:'冲刺跑',count:1}],selectedId:'poem'})));
   await p.goto(base+'/games/clawd-machine/');
   await p.locator('.prize-item').filter({hasText:'冲刺跑'}).click();
   assert.equal(await p.evaluate(()=>__CLAWD_LAST__.clawd.trick.def.id),'sprint');
   await p.locator('#pet-stage .cw-hit').dispatchEvent('pointerdown',{pointerId:1,clientX:100,clientY:100});
   assert.equal(await p.evaluate(()=>__CLAWD_LAST__.clawd.trick.def.id),'sprint');
   await c.close();
 });
 for(const mode of [{name:'desktop',width:1280,height:1000,dpr:1},{name:'mobile',width:390,height:844,dpr:2},{name:'paused RAF',width:390,height:844,dpr:2,noRaf:true}]){
   await test('visible performance '+mode.name+' has changing canvas pixels after capsule click',async()=>{
     const c=await browser.newContext({viewport:{width:mode.width,height:mode.height},deviceScaleFactor:mode.dpr});
     const p=await c.newPage();p.on('pageerror',e=>errors.push(String(e)));await p.clock.install({time:at});
     await p.addInitScript(noRaf=>{
       if(noRaf)window.requestAnimationFrame=()=>123;
       localStorage.setItem('clawd_arcade',JSON.stringify({tokens:9,won:0,prizes:[],pendingPrize:{uid:'click-show',id:'poem',name:'念诗',outcome:'kept',resolving:false}}));
     },mode.noRaf);
     await p.goto(base+'/games/clawd-machine/');
     const box=await p.locator('#machine').boundingBox();
     await p.locator('#machine').click({position:{x:box.width*145/520,y:box.height*455/560}});
     await p.clock.runFor(4100);
     assert.equal(await p.locator('#performance-dialog').isVisible(),true);
     const bounds=await p.locator('#performance-dialog').boundingBox();
     assert.ok(bounds.y>=0&&bounds.y+bounds.height<=mode.height+1,'performance must be inside viewport');
     const pixels=()=>p.evaluate(()=>{
       const c=document.querySelector('#pet-stage .cw-canvas'),data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
       let hash=2166136261;for(let i=0;i<data.length;i++)hash=Math.imul(hash^data[i],16777619);return hash>>>0;
     });
     const a=await pixels();await p.clock.runFor(450);const b=await pixels();
     assert.notEqual(a,b,'animation must change rendered pixels, not only trick id');
     assert.equal(await p.evaluate(()=>__CLAWD_LAST__.clawd.trick.def.id),'poem');
     assert.deepEqual(await p.evaluate(()=>window.__clawdErrors||[]),[]);
     if(artifacts)await p.screenshot({path:path.join(artifacts,'performance-'+mode.name.replace(/ /g,'-')+'.png'),fullPage:true});
     await p.click('#b-replay');await p.clock.runFor(200);
     assert.equal(await p.evaluate(()=>__CLAWD_LAST__.clawd.trick.def.id),'poem');
     const saved=await p.evaluate(()=>JSON.parse(localStorage.clawd_arcade));assert.equal(saved.tokens,11);assert.equal(saved.won,1);
     await p.click('#b-close-show');assert.equal(await p.locator('#performance-dialog').isVisible(),false);
     assert.equal(await p.locator('.side #pet-stage').count(),1);
     await c.close();
   });
 }
 assert.deepEqual(errors,[]);console.log('\n'+passed+' browser scenarios passed. Zero page errors.');
 await browser.close();server.close();
})().catch(async e=>{console.error(e);if(browser)await browser.close();server.close();process.exitCode=1;});