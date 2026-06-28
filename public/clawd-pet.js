(function(){
  var pet=document.createElement('div');
  pet.id='clawd-pet';pet.className='clawd-pet';pet.title='Clawd - 拖我！双击戳我';
  pet.innerHTML='<img src="/clawd-hero.gif" style="width:80px;height:80px" draggable="false"/>';
  var bubble=document.createElement('div');
  bubble.id='clawd-speech';bubble.className='clawd-speech';
  document.body.appendChild(pet);document.body.appendChild(bubble);

  var state='idle',lastActive=Date.now(),activityLevel=0;
  var pageViews=parseInt(localStorage.getItem('clawd_views')||0)+1;
  localStorage.setItem('clawd_views',pageViews);
  var cur=location.pathname;

  function setState(s){
    if(state===s)return;state=s;
    if(s==='sleeping'){pet.style.opacity='0.4';pet.style.filter='grayscale(0.6) drop-shadow(0 4px 8px rgba(0,0,0,0.4))';}
    else{pet.style.opacity='1';pet.style.filter='drop-shadow(0 4px 8px rgba(0,0,0,0.4))';}
  }
  function updateActivity(){if(state==='sleeping'||state==='happy')return;if(activityLevel>5)setState('active');else if(activityLevel>2)setState('reading');else setState('idle');}
  function boost(){activityLevel=Math.min(10,activityLevel+3);lastActive=Date.now();if(state==='sleeping'){setState('idle');activityLevel=5;}updateActivity();}

  setInterval(function(){if(state!=='sleeping'){activityLevel=Math.max(0,activityLevel-1);updateActivity();}},5000);
  setInterval(function(){if((Date.now()-lastActive)/1000>300&&state!=='sleeping')setState('sleeping');},30000);
  ['mousemove','keydown','scroll','click'].forEach(function(e){document.addEventListener(e,boost);});

  function getQuip(){
    if(state==='sleeping')return['zzzZZZ...','💤'][Math.floor(Math.random()*2)];
    if(cur==='/')return['首页又来看我了','金鳞岂是池中物','今天想学点啥','博客越来越漂亮了'][Math.floor(Math.random()*4)];
    if(cur.indexOf('posts')>=0)return['这篇文章不错哦','看完了记得评论','你认真阅读的样子真帅'][Math.floor(Math.random()*3)];
    if(cur.indexOf('radio')>=0)return['Lo-fi好心情','Claude FM 24/7'][Math.floor(Math.random()*2)];
    if(pageViews%10===0)return['第'+pageViews+'次访问了！','你是最忠实的读者'][Math.floor(Math.random()*2)];
    return['Hello!','今天过得咋样','写代码了吗','早点睡别熬夜','bt最棒'][Math.floor(Math.random()*5)];
  }
  function speak(t){
    bubble.textContent=t;bubble.style.opacity='1';
    var r=pet.getBoundingClientRect();
    bubble.style.left=Math.max(10,r.left-50)+'px';bubble.style.top=Math.max(10,r.top-36)+'px';
    clearTimeout(bubble._t);bubble._t=setTimeout(function(){bubble.style.opacity='0';},3000);
  }

  var dragging=false,sx=0,sy=0,ox=0,oy=0;
  function onStart(e){e.preventDefault();dragging=true;var t=e.touches?e.touches[0]:e;sx=t.clientX;sy=t.clientY;var r=pet.getBoundingClientRect();ox=r.left;oy=r.top;pet.style.animation='none';}
  function onMove(e){if(!dragging)return;e.preventDefault();var t=e.touches?e.touches[0]:e;pet.style.left=(ox+t.clientX-sx)+'px';pet.style.top=(oy+t.clientY-sy)+'px';pet.style.bottom='auto';pet.style.right='auto';}
  function onEnd(){if(dragging){dragging=false;setTimeout(function(){pet.style.animation='clawd-float 3s ease-in-out infinite';},300);}}
  pet.addEventListener('mousedown',onStart);pet.addEventListener('touchstart',onStart,{passive:false});
  document.addEventListener('mousemove',onMove);document.addEventListener('touchmove',onMove,{passive:false});
  document.addEventListener('mouseup',onEnd);document.addEventListener('touchend',onEnd);

  function showHappy(){setState('happy');speak(getQuip());setTimeout(function(){setState('idle');updateActivity();},3000);}
  pet.addEventListener('dblclick',showHappy);
  var lt=0;pet.addEventListener('touchend',function(e){var n=Date.now();if(n-lt<300&&!dragging)showHappy();lt=n;});

  setInterval(function(){if(document.hidden||state==='sleeping')return;if(Math.random()<0.3)speak(getQuip());},150000);
  if(pageViews===1)setTimeout(function(){speak('bt的Blog！我是Clawd');},3000);
})();
