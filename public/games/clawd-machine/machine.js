(function(){
  'use strict';
  const cv=document.getElementById('machine'),g=cv.getContext('2d');
  const DPR=Math.min(window.devicePixelRatio||1,2);
  cv.width=520*DPR;cv.height=560*DPR;g.setTransform(DPR,0,0,DPR,0,0);
  const el=id=>document.getElementById(id);
  const TRICKS=window.ClawdPet?.tricks||[];
  const COLORS=['#d9766b','#6b94bb','#81a782','#e0b15e','#a58fbb','#ecebdf','#6eb4b1'];
  const OUTCOMES=['kept','run','sparrow','shy','sleepy','jackpot'];
  const save={version:2,tokens:10,won:0,prizes:[],pendingPrize:null,supplyAt:0,selectedId:null,lastEvent:''};
  try{
    const raw=JSON.parse(localStorage.getItem('clawd_arcade')||'null');
    if(raw&&typeof raw==='object'){
      for(const k of ['tokens','won','supplyAt'])if(Number.isSafeInteger(raw[k])&&raw[k]>=0)save[k]=Math.min(raw[k],k==='supplyAt'?Number.MAX_SAFE_INTEGER:1000000);
      if(Array.isArray(raw.prizes))save.prizes=raw.prizes.slice(0,100).map(p=>{
        if(typeof p==='string'){
          const clean=p.replace(/^[★⭐]\s*/,'');
          const t=TRICKS.find(t=>clean===t.name);
          return {id:t?.id||null,name:t?.name||p.replace(/^[★⭐]\s*/,''),count:1};
        }
        const t=TRICKS.find(t=>t.id===p?.id);
        return t?{id:t.id,name:t.name,count:Math.max(1,Math.min(999,Number(p.count)||1))}:null;
      }).filter(Boolean);
      if(raw.pendingPrize&&typeof raw.pendingPrize.id==='string'&&typeof raw.pendingPrize.name==='string'){
        const p=raw.pendingPrize;
        save.pendingPrize={id:p.id,name:p.name,uid:p.uid||'legacy',outcome:OUTCOMES.includes(p.outcome)?p.outcome:'kept',
          resolving:!!p.resolving,knocks:Math.min(3,Math.max(0,Number(p.knocks)||0))};
      }
      if(save.prizes.some(p=>p.id===raw.selectedId))save.selectedId=raw.selectedId;
      save.lastEvent=typeof raw.lastEvent==='string'?raw.lastEvent:'';
    }
  }catch(_){}
  function persist(){try{localStorage.setItem('clawd_arcade',JSON.stringify(save));}catch(_){}}
  let pet=null,actorReady=false;
  function selected(){return save.prizes.find(p=>p.id&&p.id===save.selectedId);}
  function replaySelected(){
    const p=selected();
    if(!p){el('reveal').textContent='先把一个 Clawd 带回家，才能解锁它的专属动作。';return;}
    if(pet)pet.playTrick(p.id);
    el('reveal').textContent='「'+p.name+'」已收藏 · 点击 Clawd 只会重播这个动作。';
  }
  try{
    if(window.ClawdPet){
      pet=window.ClawdPet.mount({container:el('pet-stage'),storageKey:'clawd_arcade_performer',
        prizeMode:true,onTap:replaySelected,onDoubleTap:replaySelected,autoSleep:false,sleepWindow:false,sound:false});
      Object.assign(pet.eng.tama,{hatched:true,hatchP:1,stage:'adult',stageElapsed:0,retired:false,illnessLevel:0,health:100,lastSim:Date.now()});
      pet.clawd.skinKey='crail';pet.eng.customBody='#DE886D';
      pet.eng.wrap.style.opacity='0';actorReady=true;
    }
  }catch(_){el('reveal').textContent='表演位暂时离线，收藏会正常保留。';}
  let pool=[],serial=0,activeListKey='',soundOn=false,AC=null;
  function nextTrick(){
    if(!pool.length){
      pool=TRICKS.filter(t=>!save.prizes.some(p=>p.id===t.id));
      if(!pool.length)pool=TRICKS.slice();
      for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
    }
    return pool.pop()||{id:'offline',name:'岸边招呼'};
  }
  const S={phase:'off',phaseAt:Date.now(),clawX:270,clawY:200,fromX:270,fromY:200,row:0,
    depth:0,open:1,timer:30,grabbed:null,contact:null,balls:[],animT:0,msg:'INSERT COIN',
    shake:0,swing:0,contacts:0,event:null,particles:[],lastAt:Date.now(),outcome:null};
  window.__MACHINE=S;
  const keys={left:false,right:false};
  function refill(){
    while(S.balls.length<22){
      const row=S.balls.filter(b=>!b.row).length<=S.balls.filter(b=>b.row).length?0:1;
      S.balls.push({uid:'c'+Date.now()+'-'+serial++,row,x:215+Math.random()*125,y:210-Math.random()*150,
        vx:(Math.random()-.5)*40,vy:0,angle:Math.random()*.8,color:COLORS[Math.floor(Math.random()*COLORS.length)],
        action:nextTrick(),star:Math.random()<.2});
    }
  }
  function phase(name){S.phase=name;S.phaseAt=Date.now();S.fromX=S.clawX;S.fromY=S.clawY;renderUI();}
  function tone(f,d=.1,type='triangle'){
    if(!soundOn)return;
    try{
      AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume();
      const o=AC.createOscillator(),v=AC.createGain(),t=AC.currentTime;
      o.type=type;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(Math.max(40,f*.6),t+d);
      v.gain.setValueAtTime(.045,t);v.gain.exponentialRampToValueAtTime(.0001,t+d);
      o.connect(v);v.connect(AC.destination);o.start(t);o.stop(t+d);
    }catch(_){}
  }
  function burst(x,y,n=10,color='#e7bc70'){
    for(let i=0;i<n;i++)S.particles.push({x,y,vx:(Math.random()-.5)*140,vy:-30-Math.random()*120,t:0,color});
  }
  function insertCoin(){
    if(S.phase!=='off'||save.tokens<1)return;
    save.tokens--;persist();S.clawX=270;S.clawY=200;S.row=0;S.open=1;
    S.contact=null;S.grabbed=null;S.timer=30;S.msg='TIME 30';keys.left=keys.right=false;phase('ready');tone(900);
  }
  function moveClaw(d){if(S.phase==='ready')S.clawX=Math.max(186,Math.min(354,S.clawX+d));}
  function switchRow(d){if(S.phase!=='ready')return;S.row=Math.max(0,Math.min(1,S.row+d));tone(320,.04);renderUI();}
  function dropClaw(){
    if(S.phase!=='ready')return;keys.left=keys.right=false;S.contact=null;S.msg='LOWERING';phase('drop');tone(180,.2);
  }
  function rollOutcome(){
    const r=Math.random();
    return r<.64?'kept':r<.74?'run':r<.82?'sparrow':r<.92?'shy':r<.96?'sleepy':'jackpot';
  }
  function beginPrizeScene(){
    const p=save.pendingPrize;if(!p||S.phase!=='won')return;
    p.resolving=true;persist();
    S.event={type:p.outcome,at:Date.now(),x:150,y:444};
    phase(p.outcome==='shy'?'shy':'scene');
    el('reveal').textContent=({run:'它偷偷看了一眼出口…',sparrow:'窗外好像有扑棱声…',shy:'它抱住胶囊：不出来！再给我 1 枚代币…',
      sleepy:'这位住客居然睡着了…',jackpot:'咔哒！胶囊里藏着一份潮汐礼物。',kept:'胶囊打开了，看看是谁来报到。'})[p.outcome];
  }
  function finishScene(){
    const p=save.pendingPrize;if(!p)return;
    const lost=p.outcome==='run'||p.outcome==='sparrow';
    if(lost){
      save.lastEvent=p.outcome==='run'?'Clawd 溜走了，这枚胶囊没有收藏成功。':'Clawd 被麻雀叼走了，奖品没了！它没带走以前的收藏。';
    }else{
      let owned=save.prizes.find(x=>x.id===p.id);
      if(owned)owned.count++;else save.prizes.unshift({id:p.id,name:p.name,count:1});
      save.won++;save.tokens+=p.outcome==='jackpot'?4:2;save.selectedId=p.id;
      save.lastEvent=p.outcome==='jackpot'?'双倍潮汐！收藏「'+p.name+'」，获得 4 枚代币。':
        p.outcome==='sleepy'?'它抱着胶囊睡着了。已收藏「'+p.name+'」，醒来继续陪你。':'已收藏「'+p.name+'」，获得 2 枚代币。';
    }
    save.pendingPrize=null;persist();S.event=null;S.grabbed=null;S.msg=lost?'GONE FISHING':'WELCOME HOME';
    phase('off');refill();el('reveal').textContent=save.lastEvent;
    if(!lost){showSelected();if(p.outcome!=='sleepy')replaySelected();else pet?.clawd.setState?.('sleep');}
    el('reveal').textContent=save.lastEvent;
  }
  function coax(pay){
    const p=save.pendingPrize;if(S.phase!=='shy'||!p)return;
    if(pay){
      if(save.tokens<1){el('reveal').textContent='代币不够也没关系，轻敲三下，它会自己出来。';return;}
      save.tokens--;p.bribed=true;
    }else{
      p.knocks=(p.knocks||0)+1;S.shake=5;tone(400,.06);persist();
      if(p.knocks<3){el('reveal').textContent='轻敲 '+p.knocks+'/3：它探出钳子，又缩了回去。';renderUI();return;}
    }
    p.outcome='kept';persist();S.event={type:'kept',at:Date.now()};phase('scene');
    el('reveal').textContent=pay?'成交！它把代币抱紧，终于愿意出来了。':'你耐心等到了它，它自己推开了胶囊。';
  }
  function releaseShy(){
    if(S.phase!=='shy')return;
    save.pendingPrize=null;save.lastEvent='你把害羞的 Clawd 送回了海里，这次没有收藏。';persist();
    S.event=null;S.grabbed=null;phase('off');refill();el('reveal').textContent=save.lastEvent;
  }
  function resetMachine(){
    if(S.phase!=='off')return;S.balls=[];refill();S.clawX=270;S.clawY=200;S.open=1;S.msg='FRESH SUPPLY';renderUI();
  }
  function showSelected(){
    if(!selected()&&save.prizes.some(p=>p.id))save.selectedId=save.prizes.find(p=>p.id).id;
    if(pet){pet.eng.wrap.style.opacity=selected()?'1':'0';pet.eng.wrap.style.visibility=selected()?'visible':'hidden';}
    el('pet-empty').hidden=!!selected();
    if(selected())el('selected-prize').textContent='当前奖品 · '+selected().name;
  }
  function renderUI(){
    el('s-tokens').textContent=save.tokens;el('s-won').textContent=save.won;
    for(const id of ['b-left','b-right','b-up','b-down','b-drop'])el(id).disabled=S.phase!=='ready';
    el('b-coin').disabled=S.phase!=='off'||save.tokens<=0;el('b-reset').disabled=S.phase!=='off';
    el('b-take').disabled=S.phase!=='won';el('b-take').classList.toggle('glow',S.phase==='won');
    el('b-refill').disabled=Date.now()-save.supplyAt<86400000;
    el('shy-choices').hidden=S.phase!=='shy';
    el('b-knock').textContent='耐心敲敲 · '+(save.pendingPrize?.knocks||0)+'/3';
    const labels={off:save.lastEvent||'胶囊会自然堆落 · 对准堆顶，留意真正的出口',
      ready:'移动机械爪 · '+(S.row?'后层':'前层')+' · '+Math.ceil(S.timer)+' 秒',
      drop:'吊索下降 · 爪尖碰到胶囊就会停顿',contact:'碰到胶囊了 · 周围胶囊被挤开',close:'机械爪合拢…',
      rise:'吊索提升 · 抓偏了可能会滑落',carry:'移向左侧落奖口…',release:'顺着透明通道滚入领取舱…',
      won:'胶囊已到出口 · 点击领取，看它愿不愿意留下',scene:'胶囊正在打开…',shy:'它不肯出来 · 可请客，也可以免费耐心敲敲'};
    const msg=labels[S.phase]||'';if(el('machine-status').textContent!==msg)el('machine-status').textContent=msg;
    const key=JSON.stringify([save.prizes,save.selectedId]);
    if(key!==activeListKey){
      activeListKey=key;el('plist').textContent='';
      for(const p of save.prizes){
        const li=document.createElement('li'),button=document.createElement('button');button.className='prize-item';
        button.textContent=(p.id===save.selectedId?'● ':'')+p.name+(p.count>1?' ×'+p.count:'');
        button.disabled=!p.id;button.setAttribute('aria-pressed',String(p.id===save.selectedId));
        button.addEventListener('click',()=>{save.selectedId=p.id;persist();showSelected();renderUI();replaySelected();});
        li.appendChild(button);el('plist').appendChild(li);
      }
      if(!save.prizes.length){const li=document.createElement('li');li.textContent='收藏架还空着，下一位住客正在等你。';el('plist').appendChild(li);}
    }
  }
  // World physics always uses small fixed substeps, independent of render cadence.
  let remainder=0,lastRender=Date.now();
  function step(){
    const now=Date.now(),dt=Math.max(0,Math.min(.15,(now-S.lastAt)/1000));S.lastAt=now;S.animT=now/1000;
    S.depth+=(S.row-S.depth)*Math.min(1,dt*8);S.shake*=Math.exp(-dt*9);S.swing*=Math.exp(-dt*4);
    remainder+=dt;
    while(remainder>=1/120){
      const fingers=['drop','contact','close'].includes(S.phase)?{x:S.clawX,y:S.clawY,open:S.open,row:S.row,contacts:0}:null;
      window.ClawPhysics.step(S.balls,1/120,fingers);S.contacts+=fingers?.contacts||0;remainder-=1/120;
    }
    const elapsed=(now-S.phaseAt)/1000;
    if(S.phase==='ready'){
      S.timer=Math.max(0,30-elapsed);S.msg='TIME '+Math.ceil(S.timer);
      if(keys.left)moveClaw(-140*dt);if(keys.right)moveClaw(140*dt);
      if(S.timer<=0)dropClaw();
    }else if(S.phase==='drop'){
      const nextY=S.clawY+105*dt;let contact=null,top=380;
      for(const b of S.balls){
        if(b.row!==S.row||Math.abs(b.x-S.clawX)>22)continue;
        const surface=b.y-Math.sqrt(Math.max(0,16*16-Math.min(16,Math.abs(b.x-S.clawX))**2))-22;
        if(surface>=S.clawY-7&&surface<=nextY&&surface<top){contact=b;top=surface;}
      }
      if(contact){
        S.clawY=top;S.contact=contact;contact.vy+=60;contact.vx+=(contact.x-S.clawX)*2;
        S.contacts++;S.shake=3;S.swing=.1;burst(S.clawX,top+25,5,'#acc5bd');tone(120,.08);phase('contact');
      }else{S.clawY=nextY;if(S.clawY>=326){S.clawY=326;phase('close');}}
    }else if(S.phase==='contact'){
      S.clawY=S.fromY-Math.sin(Math.min(1,elapsed/.24)*Math.PI)*3;
      if(elapsed>=.24)phase('close');
    }else if(S.phase==='close'){
      S.open=Math.max(0,1-elapsed/.52);
      if(elapsed>=.52){
        const b=S.contact;
        if(b&&S.balls.includes(b)&&Math.abs(b.x-S.clawX)<20&&Math.abs(b.y-(S.clawY+25))<32){
          S.gripOffset=b.x-S.clawX;S.grabbed=b;S.balls.splice(S.balls.indexOf(b),1);tone(650,.12);
        }
        phase('rise');
      }
    }else if(S.phase==='rise'){
      const k=Math.min(1,elapsed/1.25),ease=1-(1-k)**2;
      S.clawY=S.fromY+(200-S.fromY)*ease;S.swing=Math.sin(k*Math.PI*3)*.06;
      if(S.grabbed&&Math.abs(S.gripOffset)>15&&k>.35){
        const b=S.grabbed;b.vx=S.gripOffset*6;b.vy=20;S.balls.push(b);S.grabbed=null;
        S.msg='SLIPPED';S.shake=3;tone(190,.16);
      }
      attach();if(k>=1)phase('carry');
    }else if(S.phase==='carry'){
      const k=Math.min(1,elapsed/1.3),ease=k*k*(3-2*k);
      S.clawX=S.fromX+(145-S.fromX)*ease;S.swing=Math.sin(k*Math.PI*2)*.12;attach();
      if(k>=1){
        S.open=1;
        if(S.grabbed){
          save.pendingPrize={id:S.grabbed.action.id,name:S.grabbed.action.name,uid:S.grabbed.uid,outcome:rollOutcome(),resolving:false,knocks:0};
          persist();S.msg='TO THE EXIT';phase('release');
        }else{S.msg='EMPTY CLAW';phase('off');refill();}
      }
    }else if(S.phase==='release'){
      const k=Math.min(1,elapsed/1.65);
      if(S.grabbed){S.grabbed.x=145+Math.sin(k*Math.PI*2)*4;S.grabbed.y=226+229*k*k;S.grabbed.angle+=dt*5;}
      if(k>=1){S.msg='OPEN CAPSULE';tone(800,.15);phase('won');}
    }else if(S.phase==='scene'){
      if(elapsed>3.6)finishScene();
    }
    for(const p of S.particles){p.t+=dt;p.vy+=150*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}
    S.particles=S.particles.filter(p=>p.t<1.2);
    renderUI();
  }
  function attach(){if(S.grabbed){S.grabbed.x=S.clawX+Math.sin(S.animT*7)*3;S.grabbed.y=S.clawY+25;}}
  function poly(points,fill,stroke){
    g.beginPath();g.moveTo(...points[0]);points.slice(1).forEach(p=>g.lineTo(...p));g.closePath();g.fillStyle=fill;g.fill();
    if(stroke){g.strokeStyle=stroke;g.lineWidth=1.8;g.stroke();}
  }
  function panel(x,y,w,h,r,fill,stroke){
    g.beginPath();g.roundRect(x,y,w,h,r);g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=1.7;g.stroke();}
  }
  function label(t,x,y,size=11,color='#27444e',align='left'){
    g.textAlign=align;g.font='600 '+size+'px "Courier Prime","Microsoft YaHei",sans-serif';g.fillStyle=color;g.fillText(t,x,y);
  }
  function drawBall(b){
    g.save();g.translate(b.x,b.y);g.rotate(b.angle||0);
    g.fillStyle='rgba(22,57,61,.15)';g.beginPath();g.ellipse(2,15,16,4,0,0,Math.PI*2);g.fill();
    g.beginPath();g.arc(0,0,16,0,Math.PI*2);g.fillStyle=b.color||'#de886d';g.fill();
    g.save();g.clip();g.fillStyle='#f6e8ce';g.fillRect(-17,1,34,16);
    g.fillStyle='rgba(21,56,64,.12)';g.fillRect(8,-17,10,34);g.restore();
    g.strokeStyle='#476068';g.lineWidth=1.1;g.stroke();g.beginPath();g.moveTo(-15,1);g.lineTo(15,1);g.stroke();
    g.fillStyle='rgba(255,255,255,.65)';g.beginPath();g.ellipse(-5,-7,5,3,-.6,0,Math.PI*2);g.fill();
    label(b.star?'★':'·',0,12,11,'#b27b3c','center');g.restore();
  }
  function crab(x,y,scale=1,pose='idle',t=0){
    g.save();g.translate(x,y);g.scale(scale,scale);
    if(pose==='run')g.rotate(Math.sin(t*22)*.09);
    if(pose==='sleep')g.scale(1.1,.75);
    g.fillStyle='#DE886D';g.fillRect(-17,-15,34,23);
    for(const side of [-1,1]){
      g.save();g.scale(side,1);
      g.fillRect(17,-5+Math.sin(t*12)*2,7,6);g.fillRect(22,-9+Math.sin(t*12)*2,5,6);
      for(let i=0;i<3;i++){const a=pose==='run'?Math.sin(t*22+i*2)*4:Math.sin(t*5+i)*1;g.fillRect(3+i*5,7+a,3,8);}
      g.restore();
    }
    g.fillStyle='#142d34';
    if(pose==='sleep'){g.fillRect(-10,-5,6,2);g.fillRect(4,-5,6,2);}
    else{g.fillRect(-10,-9,3,7);g.fillRect(7,-9,3,7);}
    g.restore();
  }
  function bird(x,y,t){
    g.save();g.translate(x,y);g.rotate(-.16);
    g.fillStyle='#79684c';g.beginPath();g.ellipse(0,0,19,11,0,0,Math.PI*2);g.fill();
    const flap=Math.sin(t*22);
    poly([[-8,-1],[-23,-15-flap*17],[8,-3]],'#b3a07a','#75674f');
    poly([[-15,1],[-33,-7],[-27,7]],'#5e6154');
    g.fillStyle='#4a4c42';g.beginPath();g.arc(13,-5,8,0,Math.PI*2);g.fill();
    poly([[20,-7],[29,-4],[20,0]],'#dfb267');
    g.fillStyle='#fbf4dd';g.beginPath();g.arc(15,-8,1.8,0,Math.PI*2);g.fill();
    g.strokeStyle='#a57f46';g.lineWidth=2;g.beginPath();g.moveTo(-3,8);g.lineTo(-3,22);g.moveTo(6,8);g.lineTo(6,22);g.stroke();g.restore();
  }
  function drawClaw(){
    const x=S.clawX,y=S.clawY,spread=8+S.open*14;
    g.save();g.translate(x,y);g.rotate(S.swing);
    panel(-10,-23,20,22,5,'#7d9699','#31505b');
    panel(-8,-22,6,18,3,'#d5e0d9');
    for(const side of [-1,1]){
      g.strokeStyle='#35535f';g.lineWidth=6;g.beginPath();g.moveTo(side*5,-3);g.lineTo(side*spread,15);g.lineTo(side*(spread-4),26);g.stroke();
      g.strokeStyle='#b7c9c6';g.lineWidth=3;g.beginPath();g.moveTo(side*5,-3);g.lineTo(side*spread,15);g.lineTo(side*(spread-4),26);g.stroke();
      g.fillStyle='#e4bb7e';g.beginPath();g.arc(side*5,-3,3,0,Math.PI*2);g.fill();
    }
    g.strokeStyle='#5c7a82';g.lineWidth=3;g.beginPath();g.moveTo(0,0);g.lineTo(1,23);g.lineTo(-4,27);g.stroke();
    g.restore();
  }
  function sceneDrawing(){
    if(!S.event)return;
    const t=(Date.now()-S.event.at)/1000,k=Math.min(1,t/3.6),type=S.event.type;
    const open=Math.min(1,t*2.2);
    // Half-shell and foreground action keep the coral silhouette readable.
    g.fillStyle='#f2e7d3';g.beginPath();g.arc(148,449,16,0,Math.PI);g.fill();
    g.strokeStyle='#5d7779';g.lineWidth=1;g.stroke();
    g.save();g.translate(148,449);g.rotate(-open*.8);g.fillStyle='#de886d';g.beginPath();g.arc(0,0,16,Math.PI,Math.PI*2);g.fill();g.restore();
    if(type==='shy'){
      crab(149,450+Math.sin(t*6)*2,.62,'idle',t);
      label('不出来！请我吃点好的…',256,396,12,'#31505b','center');return;
    }
    let x=150,y=438-Math.sin(Math.min(1,t)*Math.PI)*22,pose='idle';
    if(type==='run'){
      x=150+Math.max(0,t-.65)*150;y=450+Math.min(1,t/.65)*62-Math.abs(Math.sin(t*13))*7;pose='run';
      if(t>.9)for(let i=0;i<4;i++)panel(x-35-i*9,471,5,2,1,'#c0b8a0');
      label('钳子一抖，溜了！',255,398,13,'#31505b','center');
    }else if(type==='sparrow'){
      const bx=t<1.1?490-(t/1.1)*340:150+(t-1.1)*165;
      const by=t<1.1?260+(t/1.1)*215:475-(t-1.1)*105;
      bird(bx,by,t);
      if(t>=1.1){x=bx;y=by+31;pose='run';}else y=450+Math.min(1,t/.8)*62;
      label(t<1.1?'谁在扑棱翅膀？':'麻雀把 Clawd 叼走了！',255,398,13,'#31505b','center');
    }else if(type==='sleepy'){
      y=452;pose='sleep';label('抱着胶囊睡着了…',260,396,12,'#31505b','center');
      for(let i=0;i<3;i++)label('z',x+18+i*7,y-14-i*9-Math.sin(t*2+i)*3,10,'#4c7983');
    }else if(type==='jackpot'){
      x=150+Math.min(1,t)*65;y=450+Math.min(1,t)*60-Math.abs(Math.sin(t*8))*18;
      for(let i=0;i<18;i++){
        const a=i*2.4+t;const r=20+(t*25+i*3)%65;
        g.fillStyle=i%2?'#e7bb61':'#71a99d';g.fillRect(x+Math.cos(a)*r,y-20+Math.sin(a)*r,3,6);
      }
      label('双倍潮汐 · 额外 2 枚代币',264,396,12,'#31505b','center');
    }else{
      x=150+Math.min(1,t)*62;y=450+Math.min(1,t)*62-Math.abs(Math.sin(t*7))*10;pose='run';
      label('新住客，欢迎靠岸',260,396,13,'#31505b','center');
    }
    crab(x,y,.9,pose,t);
  }
  function render(){
    g.clearRect(0,0,520,560);g.lineCap='round';
    const shake=S.shake*Math.sin(S.animT*65);g.save();g.translate(shake,0);
    poly([[65,490],[370,526],[481,457],[180,438]],'#bacbc5');
    poly([[90,147],[390,147],[456,106],[157,106]],'#f8e8cf','#27444e');
    poly([[390,147],[456,106],[456,455],[390,496]],'#b96953','#27444e');
    panel(90,147,300,349,9,'#de886d','#27444e');
    poly([[400,172],[444,144],[444,337],[400,365]],'#9ac3bf','#27444e');
    poly([[405,178],[414,173],[440,255],[440,286]],'rgba(255,255,255,.26)');
    poly([[403,394],[443,370],[443,415],[403,439]],'#244652');label('018',416,412,15,'#f3dfbd');
    poly([[127,112],[355,112],[416,74],[187,74]],'#faf3de','#27444e');
    poly([[355,112],[416,74],[416,112],[355,150]],'#d17c62','#27444e');
    panel(127,99,228,50,7,'#274b56','#27444e');label('TIDE / CLAW',241,128,24,'#fae9c9','center');
    for(let i=0;i<8;i++){g.beginPath();g.arc(145+i*28,142,2.5,0,Math.PI*2);g.fillStyle=Math.floor(S.animT*3+i)%4===0?'#ffe4a1':'#91aaa2';g.fill();}
    panel(107,165,266,217,5,'#bdd3cc','#27444e');
    poly([[180,346],[373,346],[373,382],[180,382]],'#6c9998');
    poly([[180,346],[203,325],[373,325],[373,346]],'#8eafaa');
    // Actual open port and a continuous cutaway chute to the prize hatch.
    panel(117,304,57,130,16,'#294c58','#f2d9b5');
    panel(123,310,45,121,12,'#467380');
    for(let y=321;y<429;y+=20){g.strokeStyle='#769b9e';g.lineWidth=2;g.beginPath();g.moveTo(126,y);g.lineTo(164,y+8);g.stroke();}
    g.beginPath();g.ellipse(145,305,25,10,0,0,Math.PI*2);g.fillStyle='#17343f';g.fill();g.strokeStyle='#e7d6b6';g.lineWidth=4;g.stroke();
    label('落奖口',145,288,11,'#294d58','center');
    S.balls.slice().sort((a,b)=>b.row-a.row||a.y-b.y).forEach(drawBall);
    g.save();g.translate(0,-S.depth*10);
    g.fillStyle='#2d535c';g.fillRect(115,162,250,7);
    panel(S.clawX-13,154,26,13,3,'#f0d4a2','#27444e');g.restore();
    g.strokeStyle='#41616a';g.lineWidth=2;g.beginPath();g.moveTo(S.clawX,169-S.depth*10);g.lineTo(S.clawX,S.clawY-23);g.stroke();
    drawClaw();
    if(S.grabbed&&['rise','carry','release','won'].includes(S.phase))drawBall(S.grabbed);
    // Glass highlights do not occlude the moving capsule.
    poly([[115,178],[123,178],[164,266],[155,266]],'rgba(255,255,255,.25)');
    g.strokeStyle='#f6e7cd';g.lineWidth=5;g.strokeRect(105,163,270,221);
    // Visible cutaway below the glass and a hinged exit flap.
    panel(115,386,61,49,7,'#244955','#eacaa7');
    g.strokeStyle='#91b8b6';g.lineWidth=3;g.beginPath();g.moveTo(145,387);g.lineTo(145,430);g.stroke();
    panel(107,425,86,57,8,'#244650','#27444e');
    panel(116,436,68,36,4,'#132f39');
    const flap=['won','scene','shy'].includes(S.phase)?-.75:Math.sin(S.phase==='release'?(Date.now()-S.phaseAt)/180:0)*.12;
    g.save();g.translate(115,434);g.rotate(flap);panel(0,0,70,5,2,'#b9c9bc','#385b65');g.restore();
    label('领取出口',151,422,10,'#29444d','center');
    if(S.grabbed&&['release','won'].includes(S.phase)){
      g.save();g.beginPath();g.rect(119,307,52,162);g.clip();drawBall(S.grabbed);g.restore();
    }
    panel(215,407,157,36,5,'#23454c','#27444e');label(S.msg.slice(0,18),293,430,12,'#bfe7ba','center');
    label(S.row?'DEPTH / BACK':'DEPTH / FRONT',217,461,10,'#263f47');
    label('TIDE SUPPLY CO.',218,480,10,'#67493d');
    panel(108,497,26,12,3,'#27444e');panel(348,497,26,12,3,'#27444e');
    for(const [x,y] of [[99,395],[381,395],[99,485],[381,485]]){g.beginPath();g.arc(x,y,2,0,Math.PI*2);g.fillStyle='#704d43';g.fill();}
    sceneDrawing();
    for(const p of S.particles){g.globalAlpha=1-p.t/1.2;g.fillStyle=p.color;g.fillRect(p.x,p.y,3,3);}g.globalAlpha=1;
    label('拾起胶囊，也可能遇见意外',260,543,10,'#577577','center');g.restore();
  }
  for(const [id,fn] of Object.entries({'b-coin':insertCoin,'b-left':()=>moveClaw(-12),'b-right':()=>moveClaw(12),
    'b-up':()=>switchRow(1),'b-down':()=>switchRow(-1),'b-drop':dropClaw,'b-take':beginPrizeScene,
    'b-reset':resetMachine,'b-bribe':()=>coax(true),'b-knock':()=>coax(false),'b-release':releaseShy})){
    el(id).addEventListener('click',fn);
  }
  el('b-refill').addEventListener('click',()=>{if(Date.now()-save.supplyAt<86400000)return;save.tokens+=10;save.supplyAt=Date.now();persist();renderUI();});
  el('b-sound').addEventListener('click',()=>{soundOn=!soundOn;el('b-sound').textContent='声音 · '+(soundOn?'开':'关');el('b-sound').setAttribute('aria-pressed',String(soundOn));tone(500);});
  function editable(e){return /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)||e.target.isContentEditable;}
  document.addEventListener('keydown',e=>{
    if(editable(e)||e.target.closest?.('#pet-stage,#plist,#shy-choices'))return;
    if(e.key==='ArrowLeft')keys.left=true;else if(e.key==='ArrowRight')keys.right=true;
    else if(e.key==='ArrowUp')switchRow(1);else if(e.key==='ArrowDown')switchRow(-1);
    else if(e.key===' ')dropClaw();else if(e.key==='Enter'&&e.target.tagName!=='BUTTON')beginPrizeScene();else return;
    e.preventDefault();
  });
  document.addEventListener('keyup',e=>{if(e.key==='ArrowLeft')keys.left=false;if(e.key==='ArrowRight')keys.right=false;});
  function stop(){keys.left=keys.right=false;}
  window.addEventListener('blur',stop);document.addEventListener('visibilitychange',stop);
  for(const [id,key,d] of [['b-left','left',-1],['b-right','right',1]]){
    el(id).addEventListener('pointerdown',e=>{if(S.phase!=='ready')return;e.preventDefault();el(id).setPointerCapture(e.pointerId);moveClaw(d*7);keys[key]=true;});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])el(id).addEventListener(type,stop);
  }
  function tick(){step();render();}
  function loop(){tick();lastRender=Date.now();requestAnimationFrame(loop);}
  requestAnimationFrame(loop);
  setInterval(()=>{if(Date.now()-lastRender>150)tick();},120);
  refill();showSelected();
  if(save.pendingPrize){
    S.grabbed={x:145,y:455,color:'#de886d',action:save.pendingPrize};S.msg='OPEN CAPSULE';phase('won');
    if(save.pendingPrize.resolving)beginPrizeScene();
  }
  renderUI();render();
})();