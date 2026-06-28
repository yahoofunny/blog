(function(){
  // Create pet elements
  var pet = document.createElement('div');
  pet.id = 'clawd-pet';
  pet.className = 'clawd-pet';
  pet.title = '拖我！双击戳我';
  pet.innerHTML = '<svg id="clawd-svg" width="52" height="52" viewBox="0 0 100 100" fill="none"><ellipse cx="50" cy="55" rx="22" ry="18" fill="#D9743B" stroke="#B85A2A" stroke-width="2"/><circle cx="42" cy="48" r="4" fill="#1a1a1a"/><circle cx="58" cy="48" r="4" fill="#1a1a1a"/><circle cx="43" cy="47" r="1.5" fill="#fff"/><circle cx="59" cy="47" r="1.5" fill="#fff"/><path d="M44 58 Q50 64 56 58" stroke="#1a1a1a" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M10 50 Q5 40 15 30 Q25 20 35 25" stroke="#D9743B" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M90 50 Q95 40 85 30 Q75 20 65 25" stroke="#D9743B" stroke-width="3" fill="none" stroke-linecap="round"/><line x1="15" y1="48" x2="8" y2="42" stroke="#D9743B" stroke-width="2" stroke-linecap="round"/><line x1="85" y1="48" x2="92" y2="42" stroke="#D9743B" stroke-width="2" stroke-linecap="round"/><line x1="25" y1="72" x2="18" y2="82" stroke="#D9743B" stroke-width="2.5" stroke-linecap="round"/><line x1="35" y1="72" x2="28" y2="84" stroke="#D9743B" stroke-width="2" stroke-linecap="round"/><line x1="75" y1="72" x2="82" y2="82" stroke="#D9743B" stroke-width="2.5" stroke-linecap="round"/><line x1="65" y1="72" x2="72" y2="84" stroke="#D9743B" stroke-width="2" stroke-linecap="round"/></svg>';

  var bubble = document.createElement('div');
  bubble.id = 'clawd-speech';
  bubble.className = 'clawd-speech';

  document.body.appendChild(pet);
  document.body.appendChild(bubble);

  var pageLoadTime = Date.now();
  var lastActive = Date.now();
  var pageViews = parseInt(localStorage.getItem('clawd_views')||0) + 1;
  localStorage.setItem('clawd_views', pageViews);
  var currentPath = location.pathname;

  function getQuip(){
    var idle = Math.floor((Date.now()-lastActive)/1000);
    var onPage = Math.floor((Date.now()-pageLoadTime)/1000);
    if(currentPath==='/') return ['首页又来看我了','金鳞岂是池中物','今天想学点啥','博客越来越漂亮了'][Math.floor(Math.random()*4)];
    if(currentPath.indexOf('posts')>=0) return ['这篇文章不错哦','看完了记得评论','你认真阅读的样子真帅'][Math.floor(Math.random()*3)];
    if(currentPath.indexOf('radio')>=0) return ['Lo-fi 好心情','音乐陪你码代码','Claude FM 24/7'][Math.floor(Math.random()*3)];
    if(currentPath.indexOf('about')>=0) return ['想了解博主吗','bt的技术博客'][Math.floor(Math.random()*2)];
    if(currentPath.indexOf('asmr')>=0) return ['好治愈啊...','zzZZZ 困了'][Math.floor(Math.random()*2)];
    if(idle>120) return ['你离开好久...想你','还在吗','我无聊到数螃蟹了'][Math.floor(Math.random()*3)];
    if(onPage>600) return ['看这么久不累吗','该起来走走啦','喝口水休息下'][Math.floor(Math.random()*3)];
    if(pageViews%10===0) return ['第'+pageViews+'次访问了！','你是最忠实的读者'][Math.floor(Math.random()*2)];
    return ['Hello!','今天过得咋样','写代码了吗','早点睡别熬夜','我在监视你哦','bt最棒'][Math.floor(Math.random()*6)];
  }

  function speak(txt){
    bubble.textContent = txt;
    bubble.style.opacity = '1';
    bubble.style.left = (pet.offsetLeft-60)+'px';
    bubble.style.top = (pet.offsetTop-40)+'px';
    setTimeout(function(){bubble.style.opacity='0';}, 2500);
  }

  // Eye tracking
  var eyes;
  function findEyes(){
    eyes = document.querySelectorAll('#clawd-svg circle');
  }
  setTimeout(findEyes, 500);

  document.addEventListener('mousemove', function(e){
    if(!eyes||eyes.length<6) return;
    var rect = pet.getBoundingClientRect();
    var cx = rect.left+rect.width/2, cy = rect.top+rect.height/2;
    var dx = (e.clientX-cx)/80, dy = (e.clientY-cy)/80;
    dx = dx>3?3:dx<-3?-3:dx; dy = dy>3?3:dy<-3?-3:dy;
    eyes[3].setAttribute('cx', 43+dx); eyes[3].setAttribute('cy', 47+dy);
    eyes[4].setAttribute('cx', 59+dx); eyes[4].setAttribute('cy', 47+dy);
  });

  // Drag
  var dragging=false, ox=0, oy=0;
  pet.addEventListener('mousedown', function(e){dragging=true;ox=e.clientX-pet.offsetLeft;oy=e.clientY-pet.offsetTop;pet.style.animation='none';e.preventDefault();});
  pet.addEventListener('touchstart', function(e){dragging=true;ox=e.touches[0].clientX-pet.offsetLeft;oy=e.touches[0].clientY-pet.offsetTop;pet.style.animation='none';e.preventDefault();});
  document.addEventListener('mousemove', function(e){if(!dragging)return;pet.style.left=(e.clientX-ox)+'px';pet.style.top=(e.clientY-oy)+'px';pet.style.bottom='auto';pet.style.right='auto';});
  document.addEventListener('touchmove', function(e){if(!dragging)return;pet.style.left=(e.touches[0].clientX-ox)+'px';pet.style.top=(e.touches[0].clientY-oy)+'px';pet.style.bottom='auto';pet.style.right='auto';});
  document.addEventListener('mouseup', function(){if(dragging){dragging=false;pet.style.animation='clawd-float 3s ease-in-out infinite';}});
  document.addEventListener('touchend', function(){if(dragging){dragging=false;pet.style.animation='clawd-float 3s ease-in-out infinite';}});

  // Double click
  pet.addEventListener('dblclick', function(){speak(getQuip());});

  // Idle detection
  document.addEventListener('mousemove', function(){lastActive=Date.now();});
  document.addEventListener('keydown', function(){lastActive=Date.now();});
  document.addEventListener('scroll', function(){lastActive=Date.now();});
  document.addEventListener('click', function(){lastActive=Date.now();});

  // Periodic quips
  setInterval(function(){
    if(document.hidden) return;
    var idle = Math.floor((Date.now()-lastActive)/1000);
    if(idle>180 && Math.random()<0.3) speak('你已经'+Math.floor(idle/60)+'分钟没动了...');
    else if(Math.random()<0.4) speak(getQuip());
  }, 90000);

  if(pageViews===1) setTimeout(function(){speak('欢迎来到 bt 的 Blog！我是 Clawd');}, 3000);
})();
