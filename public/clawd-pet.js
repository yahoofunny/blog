(function(){
  var p=document.getElementById('clawd-pet');
  var s=document.getElementById('clawd-speech');
  if(!p||!s)return;

  var pageLoadTime=Date.now();
  var lastActive=Date.now();
  var pageViews=parseInt(localStorage.getItem('clawd_views')||0)+1;
  localStorage.setItem('clawd_views',pageViews);
  var currentPath=location.pathname;

  function getQuip(){
    var idle=Math.floor((Date.now()-lastActive)/1000);
    var onPage=Math.floor((Date.now()-pageLoadTime)/1000);
    if(currentPath==='/') return ['首页又来看我了','金鳞岂是池中物','今天想学点啥','博客越来越漂亮了'][Math.floor(Math.random()*4)];
    if(currentPath.indexOf('posts')>=0) return ['这篇文章不错哦','看完了记得评论','你认真阅读的样子真帅'][Math.floor(Math.random()*3)];
    if(currentPath.indexOf('radio')>=0) return ['Lo-fi 好心情','音乐陪你码代码','Claude FM 24/7'][Math.floor(Math.random()*3)];
    if(currentPath.indexOf('about')>=0) return ['想了解博主吗','bt的技术博客'][Math.floor(Math.random()*2)];
    if(currentPath.indexOf('asmr')>=0) return ['好治愈啊...','zzzZZZ 困了'][Math.floor(Math.random()*2)];
    if(idle>120) return ['你离开好久...想你','还在吗','我无聊到数螃蟹了'][Math.floor(Math.random()*3)];
    if(onPage>600) return ['看这么久不累吗','该起来走走啦','喝口水休息下'][Math.floor(Math.random()*3)];
    if(pageViews%10===0) return ['第'+pageViews+'次访问了！','你是最忠实的读者'][Math.floor(Math.random()*2)];
    return ['Hello!','今天过得咋样','写代码了吗','早点睡别熬夜','我在监视你哦','bt最棒'][Math.floor(Math.random()*6)];
  }

  function speak(txt){
    s.textContent=txt;s.style.opacity='1';
    s.style.left=(p.offsetLeft-60)+'px';s.style.top=(p.offsetTop-40)+'px';
    setTimeout(function(){s.style.opacity='0';},2500);
  }

  // Eye tracking
  var eyes=document.querySelectorAll('#clawd-svg circle');
  document.addEventListener('mousemove',function(e){
    if(eyes.length<4)return;
    var rect=p.getBoundingClientRect();
    var cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
    var dx=(e.clientX-cx)/80,dy=(e.clientY-cy)/80;
    dx=Math.max(-3,Math.min(3,dx));dy=Math.max(-3,Math.min(3,dy));
    eyes[3].setAttribute('cx',43+dx);eyes[3].setAttribute('cy',47+dy);
    eyes[4].setAttribute('cx',59+dx);eyes[4].setAttribute('cy',47+dy);
  });

  // Drag
  var dragging=false,ox=0,oy=0;
  p.addEventListener('mousedown',function(e){dragging=true;ox=e.clientX-p.offsetLeft;oy=e.clientY-p.offsetTop;p.style.animation='none';e.preventDefault();});
  p.addEventListener('touchstart',function(e){dragging=true;ox=e.touches[0].clientX-p.offsetLeft;oy=e.touches[0].clientY-p.offsetTop;p.style.animation='none';e.preventDefault();});
  document.addEventListener('mousemove',function(e){if(!dragging)return;p.style.left=(e.clientX-ox)+'px';p.style.top=(e.clientY-oy)+'px';p.style.bottom='auto';p.style.right='auto';});
  document.addEventListener('touchmove',function(e){if(!dragging)return;p.style.left=(e.touches[0].clientX-ox)+'px';p.style.top=(e.touches[0].clientY-oy)+'px';p.style.bottom='auto';p.style.right='auto';});
  document.addEventListener('mouseup',function(){if(dragging){dragging=false;p.style.animation='clawd-float 3s ease-in-out infinite';}});
  document.addEventListener('touchend',function(){if(dragging){dragging=false;p.style.animation='clawd-float 3s ease-in-out infinite';}});

  // Double click
  p.addEventListener('dblclick',function(){speak(getQuip());});

  // Idle detection
  document.addEventListener('mousemove',function(){lastActive=Date.now();});
  document.addEventListener('keydown',function(){lastActive=Date.now();});
  document.addEventListener('scroll',function(){lastActive=Date.now();});
  document.addEventListener('click',function(){lastActive=Date.now();});

  // Periodic quips
  setInterval(function(){
    if(document.hidden)return;
    var idle=Math.floor((Date.now()-lastActive)/1000);
    if(idle>180&&Math.random()<0.3)speak('你已经'+Math.floor(idle/60)+'分钟没动了...');
    else if(Math.random()<0.4)speak(getQuip());
  },90000);

  if(pageViews===1)setTimeout(function(){speak('欢迎来到 bt 的 Blog！我是 Clawd');},3000);
})();
