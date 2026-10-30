/*!
 * Clawd × bt 的 Blog —— 桥接层
 * 依赖 /clawd-engine.js（Canvas 像素 Clawd 引擎）。
 * 把旧版 GIF 桌宠（Base.astro 内联脚本）的行为全部迁移过来：
 *   - 博客专属台词池 + 路由感知 + 访问计数（沿用 localStorage 键 "cv"）
 *   - 活动度系统：300 秒没人理 → 睡觉；有动静就醒
 *   - 每 2~3 分钟随机来一段「思考/敲码/施工/杂技」小剧场（替代旧版随机换 GIF）
 *   - 色盘联动：壳色自动跟随站点主题色 --wm-primary（亮 #3a63d0 / 暗 #6e6eff）
 * 交互（纯桌宠，无页面跳转）：
 *   单击 = 摸摸头（爱心 + 咕噜声 + 钉住菜单）；双击 = 喂饼干；Enter/Space = 摸摸头
 */
(function () {
  'use strict';
  if (!window.ClawdPet || window.__CLAWD_BLOG__) return;
  window.__CLAWD_BLOG__ = true;

  var api = window.ClawdPet.mount({
    sound: false,        // 博客默认静音，菜单里 🔊 可开
    autoSleep: false     // 睡觉由桥接层的活动度系统控制（300 秒），不用引擎默认的 22 秒
  });

  /* ---------- 台词：bt 的 Blog 专属池（承接旧版 25 条） ---------- */
  api.setLines({
    greet: ['Hello！我是Clawd', '欢迎来到bt的网站', 'bt等你很久了', '钳会！我是Clawd～'],
    idle: [
      '今天过得咋样', '写代码了吗', '早点睡别熬夜', 'bt最棒', '🦞',
      '金鳞岂是池中物', '你是bt的朋友吗', '一起加油呀', '有什么需要帮忙的吗',
      '这个博客真不错', '我喜欢这里的音乐', '好久不见呀', 'bt今天又更新博客了吗',
      'bt是个有趣的灵魂', '跟着bt学数据结构', 'bt写代码的样子很帅',
      '这里永远是bt的精神自留地', 'bt的朋友就是我的朋友', '有问题尽管问bt',
      'bt的电路笔记超详细', 'bt说早点睡别熬夜'
    ]
  });

  /* ---------- 访问计数（沿用旧键名 "cv"） ---------- */
  var pv = parseInt(localStorage.getItem('cv') || 0, 10) + 1;
  localStorage.setItem('cv', pv);

  /* ---------- 路由感知的开场白 ---------- */
  var cur = location.pathname;
  function pick(a) { return a[(Math.random() * a.length) | 0]; }
  setTimeout(function () {
    if (pv === 1) { api.say('bt的Blog！我是Clawd', 4200); return; }
    if (cur === '/' || cur.indexOf('/posts') === 0 && cur.length < 8) api.say('首页又来看我了', 2600);
    else if (cur.indexOf('/posts') >= 0) api.say(pick(['这篇文章不错哦', '慢慢看，不着急', '你认真阅读的样子真帅']), 2600);
    else if (cur.indexOf('/radio') >= 0) api.say('Lo-fi好心情 · Claude FM 24/7', 2600);
    else if (pv % 10 === 0) api.say('第' + pv + '次访问了！你是最忠实的读者', 3200);
  }, 2200);

  /* ---------- 键盘无障碍：Enter/Space = 摸摸头 ---------- */
  var hit = api.eng.hit;
  if (hit) {
    hit.setAttribute('tabindex', '0');
    hit.setAttribute('role', 'button');
    hit.setAttribute('aria-label', 'Clawd，按回车摸摸头，可拖拽');
    hit.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); api.pet(); }
    });
  }

  /* ---------- 活动度系统（旧版：300 秒没动静就睡着） ---------- */
  var lastActive = Date.now();
  var wasAsleep = false;
  function boost() {
    lastActive = Date.now();
    if (wasAsleep) {
      wasAsleep = false;
      api.clearStatus();
      api.say(pick(['醒啦！钳力满满！', '咔？我打了个盹？']), 2200);
    }
  }
  ['mousemove', 'keydown', 'scroll', 'click'].forEach(function (evName) {
    document.addEventListener(evName, boost, { passive: true });
  });
  setInterval(function () {
    if ((Date.now() - lastActive) / 1000 > 300 && !wasAsleep) {
      wasAsleep = true;
      api.setStatus('sleep');
    }
  }, 15000);

  /* ---------- 小剧场：随机来一段状态演出（替代旧版随机换 GIF） ---------- */
  var MOODS = ['thinking', 'typing', 'building', 'juggling'];
  setInterval(function () {
    if (document.hidden || wasAsleep || api.eng.forced) return;
    if (Math.random() > 0.5) return;
    var mood = MOODS[(Math.random() * MOODS.length) | 0];
    api.setStatus(mood, 'Clawd 自娱自乐中');
    setTimeout(function () {
      if (api.eng.forced && api.eng.forced.state === mood) api.clearStatus();
    }, 16000 + Math.random() * 9000);
  }, 150000);

  /* ---------- 色盘联动：壳色跟随站点主题色 --wm-primary ---------- */
  function syncTheme() {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue('--wm-primary').trim();
      if (/^#[0-9a-fA-F]{6}$/.test(v)) api.setColors({ body: v });
    } catch (e) { /* 忽略 */ }
  }
  syncTheme();
  new MutationObserver(syncTheme).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  });
})();
