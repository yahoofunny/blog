/* 摧毁本站 v11 · Destroy my website
 * 架构：同源 iframe 拉伸为整页高度 → 世界坐标 = 文档坐标 → 相机跟随玩家。
 * 破坏：28px 瓦片网格（打砖块式）——叶子元素与带背景的容器各占若干格，
 * 每发子弹只打掉一格；一格=像素粒子+弹坑；元素的格子全毁才整体隐藏。
 * 参考：ychisbest/destroy-any-website（同源 iframe 方案）、
 *       MIT komlanKodoh/website-breaker（碎裂）、spritefusion destroy（表现）。
 * 无后端，无依赖。
 */
(() => {
"use strict";

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const wrap = $("wrap"), stage = $("stage"), world = $("world"), target = $("target"), fx = $("fx"),
      loading = $("loading"), player = $("player"), gun = $("gun"), jetpack = $("jetpack"),
      progressFill = $("progressFill"), progressText = $("progressText"), countText = $("countText"),
      intro = $("intro"), startBtn = $("startBtn"), winScreen = $("win"), winStats = $("winStats"),
      againBtn = $("againBtn"), touchBox = $("touch"), floorEl = $("floor");
const wslots = () => [...document.querySelectorAll(".wslot")];
const ctx = fx.getContext("2d");

// ---------- 常量 ----------
const CELL = 28;              // 瓦片边长
const GROUND_H = 96;          // 地面高度（世界底部）
const WIN_RATIO = 0.55;
const MAX_PARTS = 600;

// ---------- 武器 ----------
const WEAPONS = [
  { id: 1, name: "手枪",   rate: 260, auto: false, kind: "bullet",  speed: 17, color: "#ffd23e", size: 5, trail: 26 },
  { id: 2, name: "冲锋枪", rate: 85,  auto: true,  kind: "bullet",  speed: 19, color: "#7ee787", size: 4, trail: 30 },
  { id: 3, name: "霰弹枪", rate: 750, auto: false, kind: "shotgun", pellets: 6, spread: 0.2, speed: 15, color: "#ffb14a", size: 4, trail: 18 },
  { id: 4, name: "狙击枪", rate: 950, auto: false, kind: "hitscan", color: "#9fd0ff", pierce: 3 },
  { id: 5, name: "手雷",   rate: 650, auto: false, kind: "lob",     speed: 11, color: "#ff5c5c", size: 8, aoe: 95 },
  { id: 6, name: "火箭筒", rate: 1100, auto: false, kind: "rocket", speed: 13, color: "#ff8a3a", size: 9, aoe: 145 },
  { id: 7, name: "激光枪", rate: 60,  auto: true,  kind: "beam",    color: "#ff4dd2", range: 900 },
  { id: 8, name: "BFG",   rate: 1800, auto: false, kind: "bfg",     speed: 9,  color: "#b14bff", size: 14, aoe: 190 },
];

// ---------- 状态 ----------
const S = {
  started: false, over: false,
  px: innerWidth / 2, py: 0,        // 玩家世界坐标（中心）
  vx: 0, vy: 0, onGround: true, face: 1,
  camY: 0,                          // 相机（世界 y 偏移）
  aimX: innerWidth * 0.6, aimScreenY: 200, aimY: 200, // 瞄准点（世界坐标）
  weapon: 1, lastShot: 0, firing: false,
  bullets: [], parts: [], pops: [], beams: [],
  worldW: innerWidth, worldH: 1000, docH: 600,
  totalTiles: 0, destroyedTiles: 0, totalEls: 0, destroyedEls: 0,
  shake: 0, muted: false,
  t0: 0, shots: 0,
  keys: {},
};

// ---------- 音效 ----------
let actx = null;
const ac = () => actx || (actx = new (window.AudioContext || window.webkitAudioContext)());
function sfx(kind) {
  if (S.muted) return;
  try {
    const a = ac(), t = a.currentTime;
    const osc = (type, f0, f1, dur, vol) => {
      const o = a.createOscillator(), g = a.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t);
      if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
    };
    const noise = (dur, vol, freq) => {
      const len = a.sampleRate * dur, buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
      const n = a.createBufferSource(); n.buffer = buf;
      const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = freq;
      const g = a.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      n.connect(f).connect(g).connect(a.destination); n.start(t);
    };
    switch (kind) {
      case "shoot":  osc("square", 720, 140, 0.09, 0.1); break;
      case "smg":    osc("square", 560, 160, 0.06, 0.07); break;
      case "shotgun": noise(0.22, 0.35, 1400); osc("square", 300, 60, 0.18, 0.14); break;
      case "sniper": osc("sawtooth", 1400, 100, 0.22, 0.16); noise(0.1, 0.2, 3000); break;
      case "rocket": noise(0.3, 0.25, 800); break;
      case "boom":   noise(0.5, 0.5, 900); osc("sine", 120, 40, 0.4, 0.3); break;
      case "laser":  osc("sawtooth", 980, 900, 0.06, 0.05); break;
      case "bfg":    osc("sine", 90, 45, 0.5, 0.3); noise(0.4, 0.3, 500); break;
      case "hit":    osc("triangle", 260, 90, 0.12, 0.1); break;
      case "win":    [523, 659, 784, 1046].forEach((fq, i) => {
        const o = a.createOscillator(), g = a.createGain();
        o.type = "square"; o.frequency.value = fq;
        g.gain.setValueAtTime(0.0001, t + i * 0.14); g.gain.linearRampToValueAtTime(0.1, t + i * 0.14 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.14 + 0.3);
        o.connect(g).connect(a.destination); o.start(t + i * 0.14); o.stop(t + i * 0.14 + 0.32);
      }); break;
    }
  } catch (e) { /* 无声也罢 */ }
}

// ---------- 目标文档 ----------
const doc = () => { try { return target.contentDocument; } catch (e) { return null; } };

const SKIP_TAGS = new Set(["html", "body", "head", "script", "style", "link", "meta",
  "noscript", "title", "br", "path", "svg", "template", "input", "textarea", "select", "label", "iframe"]);
const BLOCK_SEL = "div,main,header,footer,section,article,aside,nav,ul,ol,li,table,thead,tbody,tr,form,fieldset,blockquote,template,details,summary";

// ---------- 瓦片网格 ----------
const grid = new Map();     // "c,r" → tile
const elTiles = new Map();  // element → Set(keys)
let holes = [];             // {x,y,w,h,color}

function effBg(d, el) {
  let cur = el;
  while (cur && cur !== d.documentElement) {
    const c = d.defaultView.getComputedStyle(cur).backgroundColor;
    if (c && !/rgba?\(\s*\d+,\s*\d+,\s*\d+\s*,\s*0\s*\)/.test(c) && c !== "transparent") return c;
    cur = cur.parentElement;
  }
  return d.defaultView.getComputedStyle(d.body).backgroundColor || "#0b0b10";
}

function isLeafTarget(el) {
  if (!el || el.nodeType !== 1 || el.__destroyed) return false;
  if (SKIP_TAGS.has(el.tagName.toLowerCase())) return false;
  if (el.querySelector(BLOCK_SEL)) return false;
  if (el.checkVisibility && !el.checkVisibility({ contentVisibilityAuto: true, visibility: true })) return false;
  const r = el.getBoundingClientRect();
  if (r.width < 6 || r.height < 6) return false;
  if (r.width * r.height > S.worldW * S.docH * 0.06) return false;
  return true;
}
function isBgSurface(el) {
  if (!el || el.nodeType !== 1 || el.__destroyed) return false;
  if (SKIP_TAGS.has(el.tagName.toLowerCase())) return false;
  const cs = doc().defaultView.getComputedStyle(el);
  if (!cs.backgroundColor || /rgba?\(\s*\d+,\s*\d+,\s*\d+\s*,\s*0\s*\)/.test(cs.backgroundColor) || cs.backgroundColor === "transparent") return false;
  const r = el.getBoundingClientRect();
  if (r.width < CELL || r.height < CELL) return false;
  if (r.width * r.height > S.worldW * S.docH * 0.5) return false;
  return true;
}

function buildTiles() {
  try {
  const d = doc();
  grid.clear(); elTiles.clear(); holes = [];
  S.totalTiles = 0; S.destroyedTiles = 0; S.totalEls = 0; S.destroyedEls = 0;
  if (!d || !d.body) { window.__buildErr = "no doc"; return; }
  const cols = Math.ceil(S.worldW / CELL), rows = Math.ceil(S.docH / CELL);
  const claim = (el, fg, isLeaf) => {
    const r = el.getBoundingClientRect();
    const c0 = Math.max(0, Math.floor(r.left / CELL)), c1 = Math.min(cols - 1, Math.floor((r.left + r.width - 1) / CELL));
    const r0 = Math.max(0, Math.floor(r.top / CELL)), r1 = Math.min(rows - 1, Math.floor((r.top + r.height - 1) / CELL));
    const bg = effBg(d, el.parentElement);
    const mine = new Set();
    for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) {
      const k = cc + "," + rr;
      if (grid.has(k)) continue;
      grid.set(k, { el, fg, bg, destroyed: false, leaf: isLeaf, key: k });
      mine.add(k); S.totalTiles++;
    }
    if (mine.size) { elTiles.set(el, mine); S.totalEls++; }
  };
  // 第一轮：叶子元素（后出现的覆盖先出现的）
  d.body.querySelectorAll("*").forEach((el) => {
    if (!isLeafTarget(el)) return;
    const cs = d.defaultView.getComputedStyle(el);
    claim(el, cs.color || "#ddd", true);
  });
  // 第二轮：带可见背景的容器，只认领空格子
  d.body.querySelectorAll("*").forEach((el) => {
    if (!isBgSurface(el)) return;
    claim(el, d.defaultView.getComputedStyle(el).color || "#aaa", false);
  });
  updateProgress();
  } catch (e) { window.__buildErr = e.message + " @ " + (e.stack || "").split("\n")[1]; }
  window.__buildDone = true;
}

function tileAt(wx, wy) {
  if (wy < 0 || wy >= S.docH || wx < 0 || wx >= S.worldW) return null;
  const t = grid.get(Math.floor(wx / CELL) + "," + Math.floor(wy / CELL));
  return t && !t.destroyed ? t : null;
}

function updateProgress() {
  try {
    const pct = S.totalTiles ? Math.min(100, Math.round((S.destroyedTiles / S.totalTiles) * 100)) : 0;
    progressFill.style.width = pct + "%";
    progressText.textContent = pct + "%";
    countText.textContent = S.totalTiles ? `(${S.destroyedTiles}/${S.totalTiles} 块瓦片 · ${S.destroyedEls}/${S.totalEls} 个元素)` : "";
    if (window.__upLog !== undefined && window.__upLog.length < 30) window.__upLog.push(`up(${S.destroyedTiles}/${S.totalTiles})`);
  } catch (e) { window.__upErr = e.message; }
  if (S.started && !S.over && S.totalTiles && S.destroyedTiles / S.totalTiles >= WIN_RATIO) winGame();
}

// ---------- 破坏 ----------
function chipTile(tile, hitX, hitY) {
  if (!tile || tile.destroyed) return false;
  tile.destroyed = true;
  S.destroyedTiles++;
  const cx = (Math.floor(hitX / CELL)) * CELL + CELL / 2;
  const cy = (Math.floor(hitY / CELL)) * CELL + CELL / 2;
  holes.push({ x: tile.key.split(",")[0] * CELL, y: tile.key.split(",")[1] * CELL, w: CELL, h: CELL, color: tile.bg });
  // 粒子：瓦片自身颜色 + 文字色混合
  const n = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    if (S.parts.length > MAX_PARTS) break;
    const a = Math.random() * Math.PI * 2, sp = 1.2 + Math.random() * 4.5;
    S.parts.push({
      type: "sq", x: cx + (Math.random() - 0.5) * CELL, y: cy + (Math.random() - 0.5) * CELL,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.2,
      life: 0.7 + Math.random() * 0.7, max: 1.4,
      color: Math.random() < 0.55 ? tile.fg : tile.bg,
      size: 2.5 + Math.random() * 4, rot: 0, vr: 0, g: 0.16,
    });
  }
  // 元素所有瓦片毁完 → 整体隐藏 + 大爆发
  const set = elTiles.get(tile.el);
  if (set) {
    set.delete(tile.key);
    if (set.size === 0 && !tile.el.__done) {
      tile.el.__done = 1;
      tile.el.classList.add("dm-done");
      S.destroyedEls++;
      const r = tile.el.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, 16, tile.fg);
    }
  }
  sfx("hit");
  updateProgress();
  return true;
}

function chipArea(cx, cy, radius) {
  const c0 = Math.floor((cx - radius) / CELL), c1 = Math.floor((cx + radius) / CELL);
  const r0 = Math.floor((cy - radius) / CELL), r1 = Math.floor((cy + radius) / CELL);
  for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) {
    const t = grid.get(cc + "," + rr);
    if (!t || t.destroyed) continue;
    const dx = cc * CELL + CELL / 2 - cx, dy = rr * CELL + CELL / 2 - cy;
    if (dx * dx + dy * dy <= radius * radius) chipTile(t, cc * CELL + CELL / 2, rr * CELL + CELL / 2);
  }
}

function burst(x, y, n, color) {
  for (let i = 0; i < n; i++) {
    if (S.parts.length > MAX_PARTS) return;
    const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 5.5;
    S.parts.push({ type: "sq", x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.6, life: 0.6 + Math.random() * 0.5, max: 1.1, color, size: 2 + Math.random() * 3.5, rot: 0, vr: 0, g: 0.14 });
  }
}

// ---------- 武器 / 射击 ----------
function muzzle() { return { x: S.px + S.face * 20, y: S.py - 6 }; }
function setWeapon(w) {
  S.weapon = w;
  wslots().forEach((b) => b.classList.toggle("active", +b.dataset.w === w));
}
function shoot() {
  if (S.over || !S.started) return;
  const w = WEAPONS[S.weapon - 1], now = performance.now();
  if (now - S.lastShot < w.rate) return;
  S.lastShot = now;
  S.shots++;
  const m = muzzle();
  const ang = Math.atan2(S.aimY - m.y, S.aimX - m.x);
  if (w.kind === "bullet") {
    S.bullets.push({ x: m.x, y: m.y, vx: Math.cos(ang) * w.speed, vy: Math.sin(ang) * w.speed, size: w.size, color: w.color, trail: w.trail, chip: 1 });
    sfx("shoot");
  } else if (w.kind === "shotgun") {
    for (let i = 0; i < w.pellets; i++) {
      const a = ang + (Math.random() - 0.5) * w.spread;
      S.bullets.push({ x: m.x, y: m.y, vx: Math.cos(a) * w.speed * (0.85 + Math.random() * 0.3), vy: Math.sin(a) * w.speed * (0.85 + Math.random() * 0.3), size: w.size, color: w.color, trail: w.trail, chip: 1 });
    }
    sfx("shotgun"); S.shake = 6;
  } else if (w.kind === "hitscan") {
    const dx = Math.cos(ang), dy = Math.sin(ang);
    let hit = null, d = 0;
    for (d = 0; d <= 1400 && !hit; d += 10) {
      const t = tileAt(m.x + dx * d, m.y + dy * d);
      if (t) hit = { x: m.x + dx * d, y: m.y + dy * d, tile: t };
    }
    S.beams.push({ x1: m.x, y1: m.y, x2: hit ? hit.x : m.x + dx * 1400, y2: hit ? hit.y : m.y + dy * 1400, life: 0.12, color: w.color, width: 3 });
    if (hit) {
      chipTile(hit.tile, hit.x, hit.y);
      const c0 = Math.floor(hit.x / CELL), r0 = Math.floor(hit.y / CELL);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
        if (!a && !b) continue;
        const t = grid.get((c0 + a) + "," + (r0 + b));
        if (t && !t.destroyed && Math.random() < 0.6) chipTile(t, c0 * CELL + CELL / 2, r0 * CELL + CELL / 2);
      }
      burst(hit.x, hit.y, 10, w.color);
    }
    S.shake = 5; sfx("sniper");
  } else if (w.kind === "lob") {
    S.bullets.push({ grenade: true, x: m.x, y: m.y, vx: Math.cos(ang) * w.speed, vy: Math.sin(ang) * w.speed - 5.5, r: w.size, t: 0, aoe: w.aoe, color: w.color });
    sfx("shoot");
  } else if (w.kind === "rocket") {
    S.bullets.push({ rocket: true, x: m.x, y: m.y, vx: Math.cos(ang) * w.speed, vy: Math.sin(ang) * w.speed, size: w.size, aoe: w.aoe, color: w.color, t: 0 });
    sfx("rocket");
  } else if (w.kind === "beam") {
    // 持续光束在 loop 里处理（每帧融化一格）
  } else if (w.kind === "bfg") {
    S.bullets.push({ bfg: true, x: m.x, y: m.y, vx: Math.cos(ang) * w.speed, vy: Math.sin(ang) * w.speed, size: w.size, aoe: w.aoe, color: w.color, t: 0 });
    sfx("bfg");
  }
}

// 光束/穿透弹的瓦片处理
function chipAlong(b) {
  const t = tileAt(b.x, b.y);
  if (t) { chipTile(t, b.x, b.y); burst(b.x, b.y, 5, b.color); return true; }
  return false;
}
function explode(x, y, radius, color) {
  sfx("boom"); S.shake = Math.max(S.shake, 16);
  burst(x, y, 34, "#ff8a3a"); burst(x, y, 16, "#ffe08a"); burst(x, y, 12, color);
  chipArea(x, y, radius);
}

// ---------- 主循环 ----------
let lastT = 0;
function loop(t) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
  lastT = t;
  if (!S.started) { draw(); return; }

  // 玩家：喷气飞行
  const L = S.keys["a"] || S.keys["arrowleft"], R = S.keys["d"] || S.keys["arrowright"];
  S.vx += ((R ? 1 : 0) - (L ? 1 : 0)) * 0.9;
  S.vx *= 0.85;
  S.px = Math.max(20, Math.min(S.worldW - 20, S.px + S.vx));
  if (S.face * S.vx < 0 && Math.abs(S.vx) > 0.3) { S.face *= -1; player.classList.toggle("flip", S.face < 0); }
  const jet = S.keys["w"] || S.keys[" "] || S.keys["arrowup"];
  if (jet) { S.vy -= 0.62; player.classList.add("flying"); } else player.classList.remove("flying");
  if (S.keys["s"] || S.keys["arrowdown"]) S.vy += 0.4;
  S.vy += 0.42; S.vy = Math.max(-8, Math.min(9, S.vy));
  S.py += S.vy;
  const floorTop = S.worldH - 56 - 21;
  if (S.py >= floorTop) { S.py = floorTop; S.vy = 0; S.onGround = true; } else S.onGround = false;
  S.py = Math.max(30, S.py);
  player.style.left = S.px - 15 + "px";
  player.style.top = S.py - 21 + "px";

  // 相机跟随
  const viewH = innerHeight;
  const targetCam = Math.max(0, Math.min(S.worldH - viewH, S.py - viewH * 0.5));
  S.camY += (targetCam - S.camY) * 0.12;
  world.style.transform = `translateY(${-S.camY}px)`;

  // 瞄准（屏幕 → 世界）
  S.aimY = S.aimScreenY + S.camY;
  const m = muzzle();
  gun.style.transform = `rotate(${Math.atan2(S.aimY - m.y, S.aimX - m.x)}rad)`;

  // 连发 / 光束
  const w = WEAPONS[S.weapon - 1];
  if (S.firing && w.auto) shoot();
  if (w.kind === "beam" && S.firing) {
    const ang = Math.atan2(S.aimY - m.y, S.aimX - m.x);
    const dx = Math.cos(ang), dy = Math.sin(ang);
    let hit = null;
    for (let d = 10; d <= w.range && !hit; d += 12) {
      const tt = tileAt(m.x + dx * d, m.y + dy * d);
      if (tt) hit = { x: m.x + dx * d, y: m.y + dy * d, tile: tt };
    }
    const ex = hit ? hit.x : m.x + dx * w.range, ey = hit ? hit.y : m.y + dy * w.range;
    S.beams.push({ x1: m.x, y1: m.y, x2: ex, y2: ey, life: 0.06, color: w.color, width: 2.5 });
    if (hit && t - S.lastShot > 70) { S.lastShot = t; chipTile(hit.tile, hit.x, hit.y); burst(hit.x, hit.y, 4, w.color); S.shots++; }
    if (Math.random() < 0.3) sfx("laser");
  }

  // 子弹
  for (let i = S.bullets.length - 1; i >= 0; i--) {
    const b = S.bullets[i];
    if (b.grenade) {
      b.t += dt; b.vy += 0.3; b.x += b.vx; b.y += b.vy;
      if (b.y >= S.worldH - 56 - 6 || b.y < -4 || b.x < -30 || b.x > S.worldW + 30 || b.t > 3) {
        S.bullets.splice(i, 1); explode(b.x, Math.min(b.y, S.worldH - 56 - 6), b.aoe, b.color); continue;
      }
    } else if (b.rocket || b.bfg) {
      b.t += dt; if (b.rocket) b.vy += 0.04;
      b.x += b.vx; b.y += b.vy;
      const hitTile = chipAlong(b);
      const out = b.y < -30 || b.y > S.worldH + 30 || b.x < -30 || b.x > S.worldW + 30;
      if (hitTile && b.rocket) { S.bullets.splice(i, 1); explode(b.x, b.y, b.aoe, b.color); continue; }
      if (out || b.t > 4) {
        S.bullets.splice(i, 1);
        explode(Math.min(Math.max(b.x, 0), S.worldW), Math.min(Math.max(b.y, 0), S.worldH), b.aoe, b.color);
        continue;
      }
      if (b.bfg && Math.random() < 0.6) burst(b.x, b.y, 3, b.color);
    } else {
      b.x += b.vx; b.y += b.vy;
      const t = tileAt(b.x, b.y);
      if (t) { chipTile(t, b.x, b.y); S.bullets.splice(i, 1); continue; }
      if (b.y < -20 || b.y > S.worldH + 20 || b.x < -20 || b.x > S.worldW + 20) { S.bullets.splice(i, 1); continue; }
    }
  }

  // 粒子 / 飘字 / 光束
  for (let i = S.parts.length - 1; i >= 0; i--) {
    const p = S.parts[i];
    p.x += p.vx; p.y += p.vy; p.vy += (p.g ?? 0.16); if (p.vr) p.rot += p.vr; p.life -= dt;
    if (p.life <= 0) S.parts.splice(i, 1);
  }
  for (let i = S.beams.length - 1; i >= 0; i--) {
    S.beams[i].life -= dt;
    if (S.beams[i].life <= 0) S.beams.splice(i, 1);
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

  // 弹坑（只画视口范围内的）
  const camT = S.camY - 40, camB = S.camY + innerHeight + 40;
  for (const h of holes) {
    if (h.y + h.h < camT || h.y > camB) continue;
    ctx.fillStyle = h.color;
    ctx.fillRect(h.x, h.y, h.w, h.h);
  }

  // 光束
  for (const b of S.beams) {
    ctx.globalAlpha = Math.max(0, b.life / 0.12);
    ctx.strokeStyle = b.color; ctx.lineWidth = b.width;
    ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
    ctx.globalAlpha = Math.max(0, b.life / 0.12) * 0.4; ctx.lineWidth = b.width * 2.4;
    ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // 粒子
  for (const p of S.parts) {
    const a = Math.max(0, Math.min(1, p.life / (p.max || 1)));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(p.x, p.y);
    if (p.rot) ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    ctx.restore();
  }

  // 子弹（带曳光）
  for (const b of S.bullets) {
    if (b.grenade) {
      ctx.fillStyle = b.color; ctx.fillRect(b.x - 5, b.y - 5, 10, 10);
      ctx.fillStyle = "#222"; ctx.fillRect(b.x - 5, b.y - 2, 10, 2);
    } else if (b.rocket || b.bfg) {
      ctx.save(); ctx.translate(b.x, b.y);
      ctx.fillStyle = b.color; ctx.fillRect(-b.size / 2, -b.size / 2, b.size, b.size);
      ctx.globalAlpha = 0.35;
      ctx.fillRect(-b.vx * 1.6 - b.size / 2, -b.vy * 1.6 - b.size / 2, b.size, b.size);
      ctx.restore(); ctx.globalAlpha = 1;
    } else {
      // 曳光：渐隐尾巴 + 亮头
      const tx = b.x - b.vx * (b.trail / 18), ty = b.y - b.vy * (b.trail / 18);
      const grad = ctx.createLinearGradient(tx, ty, b.x, b.y);
      grad.addColorStop(0, "rgba(255,255,255,0)");
      grad.addColorStop(1, b.color);
      ctx.strokeStyle = grad; ctx.lineWidth = b.size * 0.8;
      ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.fillRect(b.x - 1.5, b.y - 1.5, 3, 3);
    }
  }

  // 飘字
  ctx.font = "700 13px " + getComputedStyle(document.body).fontFamily;
  ctx.textAlign = "center";
  for (const p of S.pops) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = "#ffd23e";
    ctx.fillText(p.txt, p.x, p.y);
  }
  ctx.globalAlpha = 1;

  // 准星（屏幕坐标 → 世界）
  if (S.started && !S.over) {
    const cx = S.aimX, cy = S.aimScreenY;
    ctx.strokeStyle = "rgba(255,92,92,.9)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 14, cy); ctx.lineTo(cx - 5, cy);
    ctx.moveTo(cx + 5, cy); ctx.lineTo(cx + 14, cy);
    ctx.moveTo(cx, cy - 14); ctx.lineTo(cx, cy - 5);
    ctx.moveTo(cx, cy + 5); ctx.lineTo(cx, cy + 14);
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
  const num = parseInt(k, 10);
  if (num >= 1 && num <= WEAPONS.length) setWeapon(num);
  if (k === "m") S.muted = !S.muted;
});
addEventListener("keyup", (e) => { S.keys[e.key.toLowerCase()] = false; });
addEventListener("mousemove", (e) => { S.aimX = e.clientX; S.aimScreenY = e.clientY; });
addEventListener("mousedown", (e) => {
  if (!S.started || S.over) return;
  const t = e.target;
  if (t && t.closest && t.closest("#hud, #touch, #win")) return;
  S.aimX = e.clientX; S.aimScreenY = e.clientY;
  S.firing = true;
  const w = WEAPONS[S.weapon - 1];
  if (!w.auto) shoot();
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
  setWeapon(((S.weapon - 1 + (e.deltaY > 0 ? 1 : WEAPONS.length - 1)) % WEAPONS.length) + 1);
}, { passive: true });
addEventListener("resize", () => { fx.width = S.worldW = innerWidth; });

// 触屏
if ("ontouchstart" in window) touchBox.hidden = false;
const hold = (el, on, off) => {
  el.addEventListener("touchstart", (e) => { e.preventDefault(); on(); }, { passive: false });
  el.addEventListener("touchend", (e) => { e.preventDefault(); off(); }, { passive: false });
};
hold($("tLeft"), () => { S.keys["a"] = true; }, () => { S.keys["a"] = false; });
hold($("tRight"), () => { S.keys["d"] = true; }, () => { S.keys["d"] = false; });
hold($("tJet"), () => { S.keys["w"] = true; }, () => { S.keys["w"] = false; });
let touchTimer = 0;
hold($("tFire"), () => {
  S.aimX = S.px + S.face * 200; S.aimScreenY = S.py - S.camY - 60;
  S.firing = true; shoot();
  touchTimer = setInterval(shoot, 160);
}, () => { S.firing = false; clearInterval(touchTimer); });

// 武器槽
function buildWeaponBar() {
  const bar = document.getElementById("weapons");
  bar.innerHTML = "";
  WEAPONS.forEach((w) => {
    const b = document.createElement("button");
    b.className = "wslot" + (w.id === 1 ? " active" : "");
    b.dataset.w = w.id;
    b.innerHTML = `<i>${w.id}</i>${w.name}`;
    b.addEventListener("click", () => setWeapon(w.id));
    bar.appendChild(b);
  });
}

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
  winStats.textContent = `耗时 ${secs} 秒 · ${S.shots} 发弹药 · ${S.destroyedTiles}/${S.totalTiles} 块瓦片 · ${S.destroyedEls}/${S.totalEls} 个元素化为粒子`;
  winScreen.hidden = false;
  sfx("win");
  burst(S.px, S.py - 40, 60, "#ffd23e");
}
againBtn.addEventListener("click", () => {
  winScreen.hidden = true;
  S.over = false; S.destroyedTiles = 0; S.destroyedEls = 0; S.shots = 0; S.t0 = performance.now();
  loading.classList.remove("done");
  target.src = "/?r=" + Date.now();
});

// iframe 就绪：展开抽屉 → 拉伸为整页高 → 建瓦片世界
target.addEventListener("load", () => {
  setTimeout(() => {
    const d = doc();
    if (d) {
      d.querySelectorAll('details:not([open])').forEach((x) => { x.open = true; });
      S.docH = Math.max(600, d.documentElement.scrollHeight);
      target.style.height = S.docH + "px";
      S.worldH = S.docH + GROUND_H;
      world.style.height = S.worldH + "px";
      floorEl.style.top = (S.docH + 40) + "px";
      buildTiles();
      fx.width = S.worldW = innerWidth; fx.height = S.worldH;
      S.camY = S.worldH - innerHeight; // 从底部开始（能看到地面）
      S.py = S.worldH - 56 - 21;
      player.style.left = S.px - 15 + "px";
      player.style.top = S.py - 21 + "px";
    }
    loading.classList.add("done");
    if (startBtn.disabled) { startBtn.disabled = false; startBtn.textContent = "开 炸"; }
  }, 400);
});

// 武器栏初始化
buildWeaponBar();
setWeapon(1);
requestAnimationFrame(loop);

// 调试/状态钩子（控制台可用）
window.__S = S;
window.__hitTest = hitTest;
window.__destroyEl = destroyEl;
window.__chipTile = chipTile;
window.__tileAt = tileAt;
window.__upLog = [];
})();
