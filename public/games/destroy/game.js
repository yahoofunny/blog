/* 摧毁本站 · Destroy my website
 * 架构参考 ychisbest/destroy-any-website（同源 iframe → DOM 破坏），
 * 碎裂思路参考 MIT 的 komlanKodoh/website-breaker。无后端，无依赖。
 *
 * 规则：只有"叶子级"小元素可被打碎（标题/链接/按钮/图片/标签等），
 * 容器永不直接销毁——页面是一块块被拆掉的，不是一枪全没。
 */
(() => {
"use strict";

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const wrap = $("wrap"), target = $("target"), fx = $("fx"),
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
const WIN_RATIO = 0.55;
const S = {
  started: false, over: false,
  px: innerWidth / 2, py: 0, vx: 0, vy: 0, onGround: true, face: 1,
  aimX: innerWidth * 0.6, aimY: innerHeight * 0.3,
  weapon: 1, lastShot: 0, firing: false,
  bullets: [], parts: [], pops: [],
  total: 0, destroyed: 0,
  shake: 0, muted: false,
  scrollDir: 0, t0: 0, shots: 0,
  keys: {},
};
const GROUND_TOP = () => innerHeight - 112;

// ---------- 音效 ----------
let actx = null;
const ac = () => actx || (actx = new (window.AudioContext || window.webkitAudioContext)());
function sfx(kind) {
  if (S.muted) return;
  try {
    const a = ac(), t = a.currentTime;
    if (kind === "shoot") {
      const o = a.createOscillator(), g = a.createGain();
      o.type = "square"; o.frequency.setValueAtTime(720, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.09);
      g.gain.setValueAtTime(0.1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.11);
    } else if (kind === "boom") {
      const len = a.sampleRate * 0.5, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
      const n = a.createBufferSource(); n.buffer = buf;
      const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900;
      const g = a.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      n.connect(f).connect(g).connect(a.destination); n.start(t);
    } else if (kind === "hit") {
      const o = a.createOscillator(), g = a.createGain();
      o.type = "triangle"; o.frequency.setValueAtTime(260, t); o.frequency.exponentialRampToValueAtTime(90, t + 0.12);
      g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
      o.connect(g).connect(a.destination); o.start(t); o.stop(t + 0.14);
    } else if (kind === "win") {
      [523, 659, 784, 1046].forEach((fq, i) => {
        const o = a.createOscillator(), g = a.createGain();
        o.type = "square"; o.frequency.value = fq;
        g.gain.setValueAtTime(0.0001, t + i * 0.14); g.gain.linearRampToValueAtTime(0.1, t + i * 0.14 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.14 + 0.3);
        o.connect(g).connect(a.destination); o.start(t + i * 0.14); o.stop(t + i * 0.14 + 0.32);
      });
    }
  } catch (e) { /* 无声也罢 */ }
}

// ---------- 目标文档 ----------
const doc = () => { try { return target.contentDocument; } catch (e) { return null; } };

const SKIP_TAGS = new Set(["html", "body", "head", "script", "style", "link", "meta",
  "noscript", "title", "br", "path", "svg", "template", "input", "textarea", "select", "label"]);
// 结构性容器：永不作为直接靶子（里面的叶子才是靶子）
const BLOCK_SEL = "div,main,header,footer,section,article,aside,nav,ul,ol,li,table,thead,tbody,tr,form,fieldset,blockquote,template";

function isTarget(el) {
  if (!el || el.nodeType !== 1 || el.__destroyed) return false;
  if (SKIP_TAGS.has(el.tagName.toLowerCase())) return false;
  if (el.querySelector(BLOCK_SEL)) return false;           // 有结构子元素 → 是容器
  // 不可见元素（如折叠抽屉里的内容）不参与命中
  if (el.checkVisibility && !el.checkVisibility({ contentVisibilityAuto: true, visibility: true })) return false;
  const d = doc();
  const vw = d.documentElement.clientWidth, vh = d.documentElement.clientHeight;
  const r = el.getBoundingClientRect();
  if (r.width < 6 || r.height < 6) return false;
  if (r.width * r.height > vw * vh * 0.12) return false;   // 只打小件（约 ≤ 1/8 屏）
  return true;
}

function enumerate() {
  const d = doc();
  if (!d || !d.body) { S.total = 0; return; }
  S.total = 0;
  d.querySelectorAll("*").forEach((el) => { if (isTarget(el)) S.total++; });
  updateProgress();
}

function updateProgress() {
  const pct = S.total ? Math.min(100, Math.round((S.destroyed / S.total) * 100)) : 0;
  progressFill.style.width = pct + "%";
  progressText.textContent = pct + "%";
  countText.textContent = S.total ? `(${S.destroyed}/${S.total} 个元素)` : "";
  if (S.started && !S.over && S.total && S.destroyed / S.total >= WIN_RATIO) winGame();
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
  for (const el of stack) if (isTarget(el)) return el;
  return null;
}

let liveShards = 0;
function makeShards(el, r) {
  const d = doc();
  if (!d || !d.body || liveShards > 36) return;
  const tag = el.tagName.toLowerCase();
  if (tag === "iframe") return;
  const n = Math.max(2, Math.min(4, Math.round(Math.min(r.width, r.height) / 26)));
  const sx = d.defaultView.scrollX, sy = d.defaultView.scrollY;
  const text = (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80);
  for (let i = 0; i < n; i++) {
    const c = d.createElement(el.tagName);
    c.className = "dm-shard";
    const cs = d.defaultView.getComputedStyle(el);
    c.style.cssText = `position:absolute;pointer-events:none;margin:0;border-radius:0;` +
      `left:${r.left + sx}px;top:${r.top + sy}px;width:${r.width}px;height:${r.height}px;` +
      `font:${cs.font};color:${cs.color};background:${cs.backgroundColor};` +
      `border:1px solid ${cs.color};overflow:hidden;white-space:nowrap;`;
    if (tag === "img") { c.setAttribute("src", el.getAttribute("src") || ""); }
    else if (text) { c.textContent = text; }
    // 竖切成条，每条错位飞出
    const x0 = (i / n) * 100, x1 = ((i + 1) / n) * 100;
    c.style.clipPath = `polygon(${x0}% 0%, ${x1}% 0%, ${x1}% 100%, ${x0}% 100%)`;
    d.body.appendChild(c);
    liveShards++;
    const dx = (i - (n - 1) / 2) * (30 + Math.random() * 50), dy = 90 + Math.random() * 220, rot = (Math.random() - 0.5) * 50;
    const anim = c.animate(
      [{ transform: "translate(0,0) rotate(0deg)", opacity: 1 },
       { transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`, opacity: 0 }],
      { duration: 480 + Math.random() * 380, easing: "cubic-bezier(.2,.55,.35,1)", fill: "forwards" }
    );
    anim.onfinish = () => { c.remove(); liveShards--; };
  }
}

function destroyEl(el, hitX, hitY) {
  if (!el || el.__destroyed) return false;
  el.__destroyed = 1;
  const r = el.getBoundingClientRect();
  makeShards(el, r);
  el.classList.add("dm-gone");
  setTimeout(() => { try { el.remove(); } catch (e) {} }, 400);
  S.destroyed++;
  pops.push({ x: hitX, y: hitY, txt: "+1", life: 1 });
  sfx("hit");
  updateProgress();
  return true;
}

function boom(gx, gy) {
  sfx("boom");
  S.shake = 13;
  burst(gx, gy, 30, "#ff8a3a");
  burst(gx, gy, 14, "#ffe08a");
  const R = 110, seen = new Set();
  let n = 0;
  for (let a = 0; a < Math.PI * 2 && n < 10; a += Math.PI / 12) {
    for (const rad of [45, 85, 110]) {
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
  return { x: pr.left + pr.width / 2 + S.face * 20, y: pr.top + 14 };
}
function setWeapon(w) {
  S.weapon = w;
  wslots.forEach((b) => b.classList.toggle("active", +b.dataset.w === w));
}
function shoot() {
  if (S.over || !S.started) return;
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

  const m = muzzle();
  gun.style.transform = `rotate(${Math.atan2(S.aimY - m.y, S.aimX - m.x)}rad)`;

  if (S.scrollDir) {
    const d = doc();
    if (d) d.documentElement.scrollBy(0, S.scrollDir * 14);
  }

  if (S.firing && WEAPONS[S.weapon].auto) shoot();

  for (let i = S.bullets.length - 1; i >= 0; i--) {
    const b = S.bullets[i];
    if (b.grenade) {
      b.t += dt; b.vy += 0.32; b.x += b.vx; b.y += b.vy;
      if (b.y >= GROUND_TOP() - 6 || b.y < -4 || b.x < -30 || b.x > innerWidth + 30 || b.t > 3) {
        S.bullets.splice(i, 1); boom(b.x, Math.min(b.y, GROUND_TOP() - 6)); continue;
      }
    } else {
      b.x += b.vx; b.y += b.vy;
      const el = hitTest(b.x, b.y);
      if (el) { destroyEl(el, b.x, b.y); S.bullets.splice(i, 1); continue; }
      if (b.y < -20 || b.y > innerHeight + 20 || b.x < -20 || b.x > innerWidth + 20) { S.bullets.splice(i, 1); continue; }
    }
  }

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
  if (k === "m") S.muted = !S.muted;
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
  const t = e.target;
  if (t && t.closest && t.closest("#hud, #touch, #win")) return;
  S.aimX = e.clientX; S.aimY = e.clientY;
  S.firing = true;
  if (!WEAPONS[S.weapon].auto) shoot();
});
addEventListener("mouseup", () => { S.firing = false; });
addEventListener("contextmenu", (e) => {
  if (!S.started || S.over) return;
  const t = e.target;
  if (t && t.closest && t.closest("#hud, #win")) return;
  e.preventDefault();
});
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
let touchTimer = 0;
hold($("tFire"), () => {
  const ir = iframeRect();
  S.aimX = ir.left + ir.width * 0.5; S.aimY = ir.top + ir.height * 0.4;
  S.firing = true;
  shoot();
  touchTimer = setInterval(shoot, 150);
}, () => { S.firing = false; clearInterval(touchTimer); });

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
  winStats.textContent = `耗时 ${secs} 秒 · ${S.shots} 发弹药 · ${S.destroyed}/${S.total} 个元素灰飞烟灭`;
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
    const d = doc();
    // 把折叠抽屉全部展开——整页铺开当靶场
    if (d) d.querySelectorAll('details:not([open])').forEach((x) => { x.open = true; });
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
