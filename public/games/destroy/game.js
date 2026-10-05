/* 摧毁本站 · Destroy my website
 * 架构参考 ychisbest/destroy-any-website（服务端代理→同源 iframe→DOM 破坏），
 * 碎裂效果思路参考 MIT 的 komlanKodoh/website-breaker。
 * 这里目标与游戏同源（同一博客），无需任何后端。
 */
(() => {
"use strict";

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const wrap = $("wrap"), stage = $("stage"), target = $("target"), fx = $("fx"),
      loading = $("loading"), player = $("player"), gun = $("gun"),
      progressFill = $("progressFill"), progressText = $("progressText"), countText = $("countText"),
      intro = $("intro"), startBtn = $("startBtn"), winScreen = $("win"), winStats = $("winStats"),
      againBtn = $("againBtn"), touchBox = $("touch");
const wslots = [...document.querySelectorAll(".wslot")];
const ctx = fx.getContext("2d");

// ---------- 状态 ----------
const WEAPONS = {
  1: { name: "手枪",   rate: 300, speed: 17, auto: false, color: "#ffd23e", size: 5 },
  2: { name: "冲锋枪", rate: 95,  speed: 19, auto: true,  color: "#7ee787", size: 4 },
  3: { name: "手雷",   rate: 650, speed: 11, auto: false, color: "#ff5c5c", size: 8, lob: true },
};
const S = {
  started: false, over: false,
  px: innerWidth / 2, py: 0, vx: 0, vy: 0, onGround: true, face: 1,
  aimX: innerWidth * 0.6, aimY: innerHeight * 0.3,
  weapon: 1, lastShot: 0, firing: false,
  bullets: [], parts: [], pops: [],
  total: 0, destroyed: 0,
  shake: 0, muted: false,
  scrollDir: 0, scrollAcc: 0,
  t0: 0, shots: 0,
  keys: {},
};
const GROUND_TOP = () => innerHeight - 112;   // 地面（floor 顶）的 y
const FLOOR_Y = () => innerHeight - 56 - 42;  // 玩家脚底站的 y

// ---------- 音效（WebAudio 现场合成，零资源） ----------
let actx = null;
const ac = () => actx || (actx = new (window.AudioContext || window.webkitAudioContext)());
function sfx(kind) {
  if (S.muted) return;
  try {
    const a = ac(), t = a.currentTime;
    if (kind === "shoot") {
      const o = a.createOscillator(), g = a.createGain();
      o.type = "square"; o.frequency.setValueAtTime(720, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.09);
      g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.11);
    } else if (kind === "boom") {
      const n = a.createBufferSource(), len = a.sampleRate * 0.5, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
      n.buffer = buf;
      const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900;
      const g = a.createGain(); g.gain.setValueAtTime(0.55, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      n.connect(f).connect(g).connect(a.destination); n.start(t);
    } else if (kind === "hit") {
      const o = a.createOscillator(), g = a.createGain();
      o.type = "triangle"; o.frequency.setValueAtTime(260, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.12);
      g.gain.setValueAtTime(0.14, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
      o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.14);
    } else if (kind === "win") {
      [523, 659, 784, 1046].forEach((fq, i) => {
        const o = a.createOscillator(), g = a.createGain();
        o.type = "square"; o.frequency.value = fq;
        g.gain.setValueAtTime(0.0001, t + i * 0.14); g.gain.linearRampToValueAtTime(0.12, t + i * 0.14 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.14 + 0.3);
        o.connect(g).connect(a.destination); o.start(t + i * 0.14); o.stop(t + i * 0.14 + 0.32);
      });
    }
  } catch (e) { /* 无声也罢 */ }
}

// ---------- 目标文档 ----------
const doc = () => { try { return target.contentDocument; } catch (e) { return null; } };

function isDestroyable(el) {
  if (!el || el.nodeType !== 1 || el.__destroyed) return false;
  const t = el.tagName.toLowerCase();
  if (["html", "body", "head", "script", "style", "link", "meta", "noscript", "title", "br", "path", "svg"].includes(t)) return false;
  const d = doc();
  const vw = d.documentElement.clientWidth, vh = d.documentElement.clientHeight;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return false;
  if (r.width * r.height > vw * vh * 0.55) return false;   // 全屏级容器不算靶子
  return true;
}

function enumerate() {
  const d = doc();
  if (!d || !d.body) { S.total = 0; return; }
  S.total = 0;
  d.querySelectorAll("*").forEach((el) => { if (isDestroyable(el)) S.total++; });
  updateProgress();
}

function updateProgress() {
  const pct = S.total ? Math.min(100, Math.round((S.destroyed / S.total) * 100)) : 0;
  progressFill.style.width = pct + "%";
  progressText.textContent = pct + "%";
  countText.textContent = S.total ? `(${S.destroyed}/${S.total} 个元素)` : "";
  if (S.started && !S.over && S.total && S.destroyed / S.total >= 0.65) winGame();
}

// ---------- 破坏 ----------
function iframeRect() { return target.getBoundingClientRect(); }

function hitTest(gx, gy) {
  const ir = iframeRect();
  const ix = gx - ir.left, iy = gy - ir.top;
  if (ix < 0 || iy < 0 || ix > ir.width || iy > ir.height) return null;
  const d = doc();
  if (!d || !d.body) return null;
  const stack = d.elementsFromPoint(ix, iy);
  for (const el of stack) if (isDestroyable(el)) return el;
  return null;
}

function makeShards(el, r) {
  const d = doc();
  if (!d || !d.body) return;
  const tag = el.tagName.toLowerCase();
  if (tag === "iframe" || tag === "img" || tag === "svg") { /* 这些做整块碎裂太重，交给 crumble 动画 */ return; }
  const n = Math.max(3, Math.min(5, Math.round(Math.min(r.width, r.height) / 22)));
  const sx = d.defaultView.scrollX, sy = d.defaultView.scrollY;
  for (let i = 0; i < n; i++) {
    const c = el.cloneNode(el.children.length <= 6);
    c.classList.remove("dm-gone");
    c.removeAttribute("id");
    c.style.cssText += `;position:absolute;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;margin:0;box-sizing:border-box;pointer-events:none;`;
    const x0 = (i / n) * 100, x1 = ((i + 1) / n) * 100;
    c.style.clipPath = `polygon(${x0}% 0%, ${x1}% 0%, ${x1 - (Math.random() * 14 - 7)}% 100%, ${x0 + (Math.random() * 14 - 7)}% 100%)`;
    c.classList.add("dm-shard");
    d.body.appendChild(c);
    const dx = (Math.random() - 0.5) * 220, dy = 120 + Math.random() * 260, rot = (Math.random() - 0.5) * 90;
    const anim = c.animate(
      [{ transform: "translate(0,0) rotate(0deg)", opacity: 1 },
       { transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`, opacity: 0 }],
      { duration: 550 + Math.random() * 450, easing: "cubic-bezier(.2,.55,.35,1)", fill: "forwards" }
    );
    anim.onfinish = () => c.remove();
  }
}

function destroyEl(el, hitX, hitY) {
  if (!el || el.__destroyed) return false;
  el.__destroyed = 1;
  const r = el.getBoundingClientRect();
  makeShards(el, r);
  el.classList.add("dm-gone");
  setTimeout(() => { try { el.remove(); } catch (e) {} }, 420);
  S.destroyed++;
  const ar = iframeRect();
  burst(hitX, hitY, 10, "#ffb14a");
  pops.push({ x: hitX, y: hitY, txt: "+1", life: 1 });
  sfx("hit");
  updateProgress();
  return true;
}

function boom(gx, gy) {
  sfx("boom");
  S.shake = 14;
  burst(gx, gy, 34, "#ff8a3a");
  burst(gx, gy, 16, "#ffe08a");
  const R = 115, seen = new Set();
  let n = 0;
  for (let a = 0; a < Math.PI * 2 && n < 14; a += Math.PI / 10) {
    for (const rad of [40, 85, 115]) {
      const el = hitTest(gx + Math.cos(a) * rad, gy + Math.sin(a) * rad);
      if (el && !seen.has(el)) {
        seen.add(el);
        const r = el.getBoundingClientRect(), ir = iframeRect();
        destroyEl(el, ir.left + r.left + r.width / 2, ir.top + r.top + r.height / 2);
        n++;
        break;
      }
    }
  }
}

// ---------- 粒子 / 飘字 ----------
function burst(x, y, n, color) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 5.5;
    S.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.6, life: 0.6 + Math.random() * 0.5, color, size: 2 + Math.random() * 3.5 });
  }
}

// ---------- 武器 / 射击 ----------
function muzzle() {
  const pr = player.getBoundingClientRect();
  const mx = pr.left + pr.width / 2 + S.face * 20, my = pr.top + 14;
  return { x: mx, y: my };
}
function setWeapon(w) {
  S.weapon = w;
  wslots.forEach((b) => b.classList.toggle("active", +b.dataset.w === w));
}
function shoot() {
  if (S.over) return;
  const w = WEAPONS[S.weapon], now = performance.now();
  if (now - S.lastShot < w.rate) return;
  S.lastShot = now;
  S.shots++;
  const m = muzzle();
  const ang = Math.atan2(S.aimY - m.y, S.aimX - m.x);
  if (w.lob) {
    S.bullets.push({ grenade: true, x: m.x, y: m.y, vx: Math.cos(ang) * w.speed, vy: Math.sin(ang) * w.speed - 5.5, r: w.size, t: 0 });
  } else {
    S.bullets.push({ x: m.x, y: m.y, vx: Math.cos(ang) * w.speed, vy: Math.sin(ang) * w.speed, size: w.size, color: w.color });
  }
  S.parts.push({ x: m.x, y: m.y, vx: Math.cos(ang) * 3, vy: Math.sin(ang) * 3, life: 0.12, color: "#fff", size: 5 });
  sfx("shoot");
}

// ---------- 主循环 ----------
let lastT = 0;
function loop(t) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
  lastT = t;
  if (!S.started) { draw(); return; }

  // 玩家移动
  const L = S.keys["a"] || S.keys["arrowleft"], R = S.keys["d"] || S.keys["arrowright"];
  S.vx += ((R ? 1 : 0) - (L ? 1 : 0)) * 0.9;
  S.vx *= 0.82;
  S.px = Math.max(24, Math.min(innerWidth - 24, S.px + S.vx));
  if (S.face * S.vx < 0 && Math.abs(S.vx) > 0.3) { S.face *= -1; player.classList.toggle("flip", S.face < 0); }
  S.vy += 0.55;
  S.py += S.vy;
  if (S.py >= 0) { S.py = 0; S.vy = 0; S.onGround = true; }
  player.style.left = S.px - 15 + "px";
  player.style.bottom = 56 - S.py + "px";

  // 瞄准
  const m = muzzle();
  gun.style.transform = `rotate(${Math.atan2(S.aimY - m.y, S.aimX - m.x)}rad)`;

  // 滚动目标
  if (S.scrollDir) {
    const d = doc();
    if (d) d.documentElement.scrollBy(0, S.scrollDir * 14);
  }

  // 连发
  if (S.firing && WEAPONS[S.weapon].auto) shoot();

  // 子弹
  for (let i = S.bullets.length - 1; i >= 0; i--) {
    const b = S.bullets[i];
    if (b.grenade) {
      b.t += dt; b.vy += 0.32; b.x += b.vx; b.y += b.vy;
      if (b.y >= GROUND_TOP() - 6 || b.y < -4 || b.x < -30 || b.x > innerWidth + 30 || b.t > 3) {
        S.bullets.splice(i, 1); boom(b.x, Math.min(b.y, GROUND_TOP() - 6)); continue;
      }
    } else {
      b.x += b.vx; b.y += b.vy;
      const ir = iframeRect();
      const inside = b.x >= ir.left && b.x <= ir.right && b.y >= ir.top && b.y <= ir.bottom;
      if (inside) {
        const el = hitTest(b.x, b.y);
        if (el) { destroyEl(el, b.x, b.y); S.bullets.splice(i, 1); continue; }
      }
      if (b.y < -20 || b.y > innerHeight + 20 || b.x < -20 || b.x > innerWidth + 20) { S.bullets.splice(i, 1); continue; }
    }
  }

  // 粒子 / 飘字
  for (let i = S.parts.length - 1; i >= 0; i--) {
    const p = S.parts[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.14; p.life -= dt;
    if (p.life <= 0) S.parts.splice(i, 1);
  }
  for (let i = S.pops.length - 1; i >= 0; i--) {
    const p = S.pops[i]; p.y -= 0.9; p.life -= dt * 1.4;
    if (p.life <= 0) S.pops.splice(i, 1);
  }
  if (S.shake > 0) S.shake *= 0.86;

  draw();
}

function draw() {
  ctx.clearRect(0, 0, fx.width, fx.height);
  ctx.save();
  if (S.shake > 0.5) ctx.translate((Math.random() - 0.5) * S.shake, (Math.random() - 0.5) * S.shake);

  for (const p of S.parts) {
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  for (const b of S.bullets) {
    if (b.grenade) {
      ctx.fillStyle = "#ff5c5c"; ctx.fillRect(b.x - 5, b.y - 5, 10, 10);
      ctx.fillStyle = "#222"; ctx.fillRect(b.x - 5, b.y - 2, 10, 2);
    } else {
      ctx.fillStyle = b.color; ctx.fillRect(b.x - b.size / 2, b.y - b.size / 2, b.size, b.size);
      ctx.globalAlpha = 0.4; ctx.fillRect(b.x - b.vx * 1.2, b.y - b.vy * 1.2, b.size * 0.7, b.size * 0.7); ctx.globalAlpha = 1;
    }
  }
  ctx.font = "700 13px " + getComputedStyle(document.body).fontFamily;
  ctx.textAlign = "center";
  for (const p of S.pops) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = "#ffd23e";
    ctx.fillText(p.txt, p.x, p.y);
  }
  ctx.globalAlpha = 1;
  // 准星
  if (S.started && !S.over) {
    ctx.strokeStyle = "rgba(255,92,92,.9)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(S.aimX, S.aimY, 9, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(S.aimX - 14, S.aimY); ctx.lineTo(S.aimX - 5, S.aimY);
    ctx.moveTo(S.aimX + 5, S.aimY); ctx.lineTo(S.aimX + 14, S.aimY);
    ctx.moveTo(S.aimX, S.aimY - 14); ctx.lineTo(S.aimX, S.aimY - 5);
    ctx.moveTo(S.aimX, S.aimY + 5); ctx.lineTo(S.aimX, S.aimY + 14);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------- 输入 ----------
addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
  S.keys[k] = true;
  if (!S.started || S.over) return;
  if (k === "w" || k === " ") { if (S.onGround) { S.vy = -11.5; S.onGround = false; } }
  if (k === "arrowup") S.scrollDir = -1;
  if (k === "arrowdown") S.scrollDir = 1;
  if (k === "1") setWeapon(1);
  if (k === "2") setWeapon(2);
  if (k === "3") setWeapon(3);
  if (k === "m") { S.muted = !S.muted; }
});
addEventListener("keyup", (e) => {
  const k = e.key.toLowerCase();
  S.keys[k] = false;
  if (k === "arrowup" && S.scrollDir < 0) S.scrollDir = 0;
  if (k === "arrowdown" && S.scrollDir > 0) S.scrollDir = 0;
});
addEventListener("mousemove", (e) => { S.aimX = e.clientX; S.aimY = e.clientY; });
addEventListener("mousedown", (e) => {
  if (!S.started || S.over) return;
  if (e.target.closest("#hud, #touch, #win")) return;
  S.aimX = e.clientX; S.aimY = e.clientY;
  S.firing = true;
  if (!WEAPONS[S.weapon].auto) shoot();
});
addEventListener("mouseup", () => { S.firing = false; });
addEventListener("contextmenu", (e) => { if (S.started && !e.target.closest("#hud, #win")) e.preventDefault(); });
addEventListener("wheel", (e) => {
  if (!S.started || S.over) return;
  setWeapon(((S.weapon - 1 + (e.deltaY > 0 ? 1 : 2)) % 3) + 1);
}, { passive: true });
addEventListener("resize", () => { fx.width = innerWidth; fx.height = innerHeight; });
fx.width = innerWidth; fx.height = innerHeight;

// 触屏
if ("ontouchstart" in window) touchBox.hidden = false;
const hold = (el, on, off) => {
  el.addEventListener("touchstart", (e) => { e.preventDefault(); on(); }, { passive: false });
  el.addEventListener("touchend", (e) => { e.preventDefault(); off(); }, { passive: false });
};
hold($("tLeft"), () => { S.keys["a"] = true; }, () => { S.keys["a"] = false; });
hold($("tRight"), () => { S.keys["d"] = true; }, () => { S.keys["d"] = false; });
hold($("tJump"), () => { if (S.onGround) { S.vy = -11.5; S.onGround = false; } }, () => {});
let touchFiring = 0;
hold($("tFire"), () => {
  touchFiring = setInterval(() => {
    const ir = iframeRect();
    S.aimX = ir.left + ir.width * (0.25 + Math.random() * 0.5);
    S.aimY = ir.top + ir.height * (0.2 + Math.random() * 0.6);
    if (!WEAPONS[S.weapon].auto) shoot();
  }, 140);
}, () => { clearInterval(touchFiring); });

// 武器槽点击
wslots.forEach((b) => b.addEventListener("click", () => setWeapon(+b.dataset.w)));

// ---------- 开局 / 胜利 ----------
function startGame() {
  if (startBtn.disabled) return;
  S.started = true; S.t0 = performance.now();
  try { ac().resume(); } catch (e) {}
  intro.style.display = "none";
  setWeapon(1);
}
startBtn.addEventListener("click", startGame);

function winGame() {
  S.over = true;
  const secs = Math.round((performance.now() - S.t0) / 1000);
  winStats.textContent = `破坏率 100% 视觉达成 · 实耗 ${secs} 秒 · ${S.shots} 发弹药 · ${S.destroyed}/${S.total} 个元素灰飞烟灭`;
  winScreen.hidden = false;
  sfx("win");
  burst(innerWidth / 2, innerHeight / 3, 60, "#ffd23e");
}
againBtn.addEventListener("click", () => {
  winScreen.hidden = true;
  S.over = false; S.destroyed = 0; S.shots = 0; S.t0 = performance.now();
  loading.classList.remove("done");
  target.src = "/?r=" + Date.now();
});

// iframe 就绪
target.addEventListener("load", () => {
  setTimeout(() => {
    enumerate();
    loading.classList.add("done");
    if (startBtn.disabled) {
      startBtn.disabled = false;
      startBtn.textContent = "开 炸";
    }
  }, 400);
});

requestAnimationFrame(loop);
})();
