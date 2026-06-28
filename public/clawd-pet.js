(function(){
  var pet=document.createElement('div');
  pet.id='clawd-pet';pet.className='clawd-pet';pet.title='拖我！双击戳我';
  var img=document.createElement('img');
  img.src='/clawd-hero.gif';img.style.width='64px';img.style.height='64px';img.draggable=false;
  pet.appendChild(img);

  var bubble=document.createElement('div');
  bubble.id='clawd-speech';bubble.className='clawd-speech';
  document.body.appendChild(pet);document.body.appendChild(bubble);

  var pageLoadTime=Date.now(),lastActive=Date.now();
  var pageViews=parseInt(localStorage.getItem('clawd_views')||0)+1;
  localStorage.setItem('clawd_views',pageViews);
  var currentPath=location.pathname,state='idle';

  function getQuip(){
    var idle=Math.floor((Date.now()-lastActive)/1000);
    var onPage=Math.floor((Date.now()-pageLoadTime)/1000);
    if(state==='sleeping')return['zzzZZZ...','💤','呼...'][Math.floor(Math.random()*3)];
    if(currentPath==='/')return['首页又来看我了','金鳞岂是池中物','今天想学点啥','博客越来越漂亮了'][Math.floor(Math.random()*4)];
    if(currentPath.indexOf('posts')>=0)return['这篇文章不错哦','看完了记得评论','你认真阅读的样子真帅'][Math.floor(Math.random()*3)];
    if(currentPath.indexOf('radio')>=0)return['Lo-fi好心情','音乐陪你码代码','Claude FM 24/7'][Math.floor(Math.random()*3)];
    if(currentPath.indexOf('about')>=0)return['想了解博主吗','bt的技术博客'][Math.floor(Math.random()*2)];
    if(idle>120)return['你离开好久...想你','还在吗','我无聊到数螃蟹了'][Math.floor(Math.random()*3)];
    if(onPage>600)return['看这么久不累吗','该起来走走啦','喝口水休息下'][Math.floor(Math.random()*3)];
    if(pageViews%10===0)return['第'+pageViews+'次访问了！','你是最忠实的读者'][Math.floor(Math.random()*2)];
    return ['Hello!','今天过得咋样','写代码了吗','早点睡别熬夜','bt最棒'][Math.floor(Math.random()*5)];
  }

  function speak(txt){
    bubble.textContent=txt;bubble.style.opacity='1';
    var r=pet.getBoundingClientRect();
    bubble.style.left=Math.max(10,r.left-50)+'px';bubble.style.top=Math.max(10,r.top-36)+'px';
    clearTimeout(bubble._t);bubble._t=setTimeout(function(){bubble.style.opacity='0';},3000);
  }

  // Drag
  var dragging=false,sx=0,sy=0,ox=0,oy=0;
  function onStart(e){
    e.preventDefault();dragging=true;
    var t=e.touches?e.touches[0]:e;sx=t.clientX;sy=t.clientY;
    var r=pet.getBoundingClientRect();ox=r.left;oy=r.top;
    pet.style.animation='none';pet.style.transition='none';
  }
  function onMove(e){
    if(!dragging)return;e.preventDefault();
    var t=e.touches?e.touches[0]:e;
    pet.style.left=(ox+t.clientX-sx)+'px';pet.style.top=(oy+t.clientY-sy)+'px';
    pet.style.bottom='auto';pet.style.right='auto';
  }
  function onEnd(){
    if(dragging){dragging=false;pet.style.transition='transform 0.3s';
    setTimeout(function(){pet.style.animation='clawd-float 3s ease-in-out infinite';},300);}
  }
  pet.addEventListener('mousedown',onStart);pet.addEventListener('touchstart',onStart,{passive:false});
  document.addEventListener('mousemove',onMove);document.addEventListener('touchmove',onMove,{passive:false});
  document.addEventListener('mouseup',onEnd);document.addEventListener('touchend',onEnd);

  // Double tap
  pet.addEventListener('dblclick',function(){speak(getQuip());});
  var lt=0;pet.addEventListener('touchend',function(e){var n=Date.now();if(n-lt<300&&!dragging)speak(getQuip());lt=n;});

  // Idle
  ['mousemove','keydown','scroll','click','touchstart'].forEach(function(ev){
    document.addEventListener(ev,function(){lastActive=Date.now();if(state==='sleeping'){state='idle';pet.style.opacity='1';pet.style.filter='drop-shadow(0 4px 8px rgba(0,0,0,0.4))';}});
  });

  setInterval(function(){
    var idle=Math.floor((Date.now()-lastActive)/1000);
    if(idle>300&&state!=='sleeping'){state='sleeping';pet.style.opacity='0.5';pet.style.filter='grayscale(0.5) drop-shadow(0 4px 8px rgba(0,0,0,0.4))';}
  },30000);

  // Periodic quips
  setInterval(function(){if(document.hidden||state==='sleeping')return;if(Math.random()<0.35)speak(getQuip());},120000);
  if(pageViews===1)setTimeout(function(){speak('欢迎来到bt的Blog！我是Clawd');},3000);
})();
