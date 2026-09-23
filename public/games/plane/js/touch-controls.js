/* bt's arcade: 手机虚拟摇杆 + 按钮（合成键盘事件走游戏原有输入管线） */
(function () {
  if (!('ontouchstart' in window)) return;

  function press(code) {
    document.dispatchEvent(new KeyboardEvent('keydown', { code: code, key: code }));
  }
  function release(code) {
    document.dispatchEvent(new KeyboardEvent('keyup', { code: code, key: code }));
  }

  window.addEventListener('DOMContentLoaded', function () {
    var joy = document.createElement('div');
    joy.className = 'tc-joystick';
    var knob = document.createElement('div');
    knob.className = 'tc-knob';
    joy.appendChild(knob);

    var fire = document.createElement('div');
    fire.className = 'tc-btn tc-fire';
    fire.textContent = '开火';
    var bomb = document.createElement('div');
    bomb.className = 'tc-btn tc-bomb';
    bomb.textContent = '炸弹';
    var pause = document.createElement('div');
    pause.className = 'tc-btn tc-pause';
    pause.textContent = '⏸';

    document.body.appendChild(joy);
    document.body.appendChild(fire);
    document.body.appendChild(bomb);
    document.body.appendChild(pause);

    var R = 56, DEAD = 14;
    var activeKey = null;

    function center() {
      var r = joy.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    function handleJoy(t) {
      var c = center();
      var dx = t.clientX - c.x, dy = t.clientY - c.y;
      var len = Math.sqrt(dx * dx + dy * dy);
      if (len > R) { dx = dx / len * R; dy = dy / len * R; }
      knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      var key = null;
      if (len > DEAD) {
        key = Math.abs(dx) > Math.abs(dy)
          ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft')
          : (dy > 0 ? 'ArrowDown' : 'ArrowUp');
      }
      if (key !== activeKey) {
        if (activeKey) release(activeKey);
        if (key) press(key);
        activeKey = key;
      }
    }
    function resetJoy() {
      knob.style.transform = 'translate(0,0)';
      if (activeKey) { release(activeKey); activeKey = null; }
    }

    joy.addEventListener('touchstart', function (e) { e.preventDefault(); handleJoy(e.touches[0]); }, { passive: false });
    joy.addEventListener('touchmove', function (e) { e.preventDefault(); handleJoy(e.touches[0]); }, { passive: false });
    joy.addEventListener('touchend', function (e) { e.preventDefault(); resetJoy(); }, { passive: false });
    joy.addEventListener('touchcancel', function (e) { e.preventDefault(); resetJoy(); }, { passive: false });

    function bindHold(el, key) {
      el.addEventListener('touchstart', function (e) { e.preventDefault(); press(key); }, { passive: false });
      el.addEventListener('touchend', function (e) { e.preventDefault(); release(key); }, { passive: false });
      el.addEventListener('touchcancel', function (e) { e.preventDefault(); release(key); }, { passive: false });
    }
    bindHold(fire, 'Space');
    bindHold(bomb, 'KeyF');
    pause.addEventListener('touchend', function (e) { e.preventDefault(); press('KeyP'); release('KeyP'); }, { passive: false });
  });
})();
