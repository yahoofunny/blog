/* 摧毁本站 v16 · Destroy my website
 * 架构：同源 iframe 拉伸为整页高 → 世界坐标 = 文档坐标 → 相机跟随 clawd。
 * 破坏：只有"带文字的元素"和"图片"是靶子/台阶（背景不可破坏、不可踩）。
 * 28px 瓦片粒度：每发子弹打掉一小格，该格内的字符逐字飞散（保持原色原字体）。
 * 平台碰撞：未摧毁的瓦片可站立，打掉脚下就往下掉——像走楼梯一样下潜。
 * 参考：ychisbest/destroy-any-website、MIT komlanKodoh/website-breaker、
 *       spritefusion destroy（表现）。无后端，无依赖。
 */
(() => {
"use strict";
window.addEventListener("error", (e) => {
  window.__fatal = (e.message || "") + " @ " + (e.filename || "").split("/").pop() + ":" + e.lineno;
});

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const wrap = $("wrap"), stage = $("stage"), world = $("world"), target = $("target"), fx = $("fx"),
      loading = $("loading"), player = $("player"), sprite = $("sprite"), gun = $("gun"), jetpack = $("jetpack"), floorEl = $("floor"),
      progressFill = $("progressFill"), progressText = $("progressText"), countText = $("countText"),
      intro = $("intro"), startBtn = $("startBtn"), touchBox = $("touch");
const wslots = () => [...document.querySelectorAll(".wslot")];
const ctx = fx.getContext("2d");

// ---------- 目标就绪（load 监听 + 轮询双保险，防竞态） ----------
let targetInited = false;
function initTarget() {
  if (targetInited) return true;
  const d = doc();
  if (!d || !d.body || d.readyState !== "complete") return false;
  if (d.location.href === "about:blank") return false;
  targetInited = true;
  d.querySelectorAll('details:not([open])').forEach((x) => { x.open = true; });
  S.docH = Math.max(600, d.documentElement.scrollHeight);
  target.style.height = S.docH + "px";
  S.worldH = S.docH + GROUND_H;
  world.style.height = S.worldH + "px";
  fx.style.top = -SKY + "px";
  fx.height = S.worldH + SKY;
  floorEl.style.top = (S.docH + 40) + "px";
  buildTiles();
  fx.width = S.worldW = innerWidth;
  S.camY = -SKY;
  S.px = innerWidth / 2;
  S.py = -SKY + 80; S.vy = 0; S.onGround = false;
  player.style.left = S.px - 14 + "px";
  player.style.top = S.py - HH + "px";
  loading.classList.add("done");
  if (startBtn.disabled) { startBtn.disabled = false; startBtn.textContent = "开 炸"; }
  return true;
}
target.addEventListener("load", () => setTimeout(initTarget, 300));
const readyPoll = setInterval(() => { if (initTarget()) clearInterval(readyPoll); }, 150);

// ---------- 常量 ----------
const CELL = 28;
const GROUND_H = 96;
const SKY = 600;
const MAX_PARTS = 650;
const HW = 13, HH = 20;       // clawd 碰撞半宽/半高

// ---------- 武器（像素枪型在 gunSVG 里定义） ----------
const WEAPONS = [
  { id: 1, name: "手枪",   rate: 260, auto: false, kind: "bullet",  speed: 17, color: "#ffd23e", size: 5,  trail: 26 },
  { id: 2, name: "冲锋枪", rate: 85,  auto: true,  kind: "bullet",  speed: 19, color: "#7ee787", size: 4,  trail: 30 },
  { id: 3, name: "霰弹枪", rate: 750, auto: false, kind: "shotgun", pellets: 6, spread: 0.2, speed: 15, color: "#ffb14a", size: 4, trail: 18 },
  { id: 4, name: "狙击枪", rate: 950, auto: false, kind: "hitscan", color: "#9fd0ff", pierce: 3 },
  { id: 5, name: "手雷",   rate: 650, auto: false, kind: "lob",     speed: 11, color: "#ff5c5c", size: 8, aoe: 95 },
  { id: 6, name: "火箭筒", rate: 1100, auto: false, kind: "rocket", speed: 13, color: "#ff8a3a", size: 9, aoe: 145 },
  { id: 7, name: "激光枪", rate: 0,   auto: true,  kind: "beam",    color: "#ff4dd2", range: 900 },
  { id: 8, name: "BFG",   rate: 1800, auto: false, kind: "bfg",     speed: 9,  color: "#b14bff", size: 14, aoe: 190 },
];

// ---------- 状态 ----------
const S = {
  started: false, over: false,
  px: innerWidth / 2, py: -SKY + 80, vx: 0, vy: 0, onGround: false, face: 1,
  camY: -SKY,
  aimX: innerWidth * 0.6, aimScreenY: 200, aimY: 200,
  weapon: 0, lastShot: 0, beamAcc: 0, firing: false,
  bullets: [], parts: [], pops: [], beams: [],
  worldW: innerWidth, worldH: 1000, docH: 600,
  totalTiles: 0, destroyedTiles: 0, totalEls: 0, destroyedEls: 0,
  shake: 0, muted: false, t0: 0, shots: 0,
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
    }
  } catch (e) { /* 无声也罢 */ }
}

// ---------- 目标文档 ----------
const doc = () => { try { return target.contentDocument; } catch (e) { return null; } };

const SKIP_TAGS = new Set(["html", "body", "head", "script", "style", "link", "meta",
  "noscript", "title", "br", "path", "svg", "template", "input", "textarea", "select", "label", "iframe"]);
const BLOCK_SEL = "div,main,header,footer,section,article,aside,nav,ul,ol,table,thead,tbody,tr,form,fieldset,blockquote,template,details";

// ---------- 瓦片网格（只有文字/图片是靶子与台阶；背景不可破坏不可踩） ----------
const grid = new Map();
const elTiles = new Map();
let holes = [];

function tileAt(wx, wy) {
  if (wy < 0 || wy >= S.docH || wx < 0 || wx >= S.worldW) return null;
  const t = grid.get(Math.floor(wx / CELL) + "," + Math.floor(wy / CELL));
  return t && !t.destroyed ? t : null;
}
function solidAt(wx, wy) {
  if (wy >= S.worldH - 56) return wy <= S.worldH;   // 世界底部地面
  if (wy < 0 || wy >= S.docH || wx < 0 || wx >= S.worldW) return false;
  const t = grid.get(Math.floor(wx / CELL) + "," + Math.floor(wy / CELL));
  return !!(t && !t.destroyed);
}

function buildTiles() {
  try {
    const d = doc();
    grid.clear(); elTiles.clear(); holes = [];
    S.totalTiles = 0; S.destroyedTiles = 0; S.totalEls = 0; S.destroyedEls = 0;
    if (!d || !d.body) return;
    const cols = Math.ceil(S.worldW / CELL), rows = Math.ceil(S.docH / CELL);
    // 叶子靶子：自底向上判定——孩子已是靶子的元素视为容器（不算靶子）。
    // 这样"包着多个 span 的外层 div"不会变成隐形平台，clawd 只能站在真正的文字/图片上。
    const allEls = [...d.body.querySelectorAll("*")];
    const candSet = new Set();
    for (let i = allEls.length - 1; i >= 0; i--) {
      const el = allEls[i];
      if (!el || el.nodeType !== 1 || SKIP_TAGS.has(el.tagName.toLowerCase())) continue;
      const isImg = el.tagName === "IMG";
      const text = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (!isImg && !text) continue;
      let childCand = false;
      for (const c of el.children) { if (candSet.has(c)) { childCand = true; break; } }
      if (childCand) continue;
      candSet.add(el);
    }
    const targets = [];
    for (const el of candSet) {
      if (el.checkVisibility && !el.checkVisibility({ contentVisibilityAuto: true, visibility: true })) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) continue;
      if (r.width * r.height > S.worldW * S.docH * 0.06) continue;
      const isImg = el.tagName === "IMG";
      const text = (el.textContent || "").replace(/\s+/g, " ").trim();
      targets.push({ el, r, isImg, text, font: `${d.defaultView.getComputedStyle(el).fontWeight} ${d.defaultView.getComputedStyle(el).fontSize} ${d.defaultView.getComputedStyle(el).fontFamily}`, fg: d.defaultView.getComputedStyle(el).color, hole: effBg(d, el.parentElement) });
    }
    // 认领格子
    for (const t of targets) {
      const r = t.r.getBoundingClientRect ? t.r : t.r; // t.r 已是 rect
      const rect = t.r;
      const c0 = Math.max(0, Math.floor(rect.left / CELL)), c1 = Math.min(cols - 1, Math.floor((rect.left + rect.width - 1) / CELL));
      const r0 = Math.max(0, Math.floor(rect.top / CELL)), r1 = Math.min(rows - 1, Math.floor((rect.top + rect.height - 1) / CELL));
      const mine = new Set();
      for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) {
        const k = cc + "," + rr;
        if (grid.has(k)) continue;
        grid.set(k, { el: t.el, fg: t.fg, hole: t.hole, text: t.text, font: t.font, isImg: t.isImg, destroyed: false, key: k });
        mine.add(k); S.totalTiles++;
      }
      if (mine.size) { elTiles.set(t.el, mine); S.totalEls++; }
    }
  } catch (e) { window.__buildErr = e.message; }
  updateProgress();
}

function effBg(d, el) {
  let cur = el;
  while (cur && cur !== d.documentElement) {
    const c = d.defaultView.getComputedStyle(cur).backgroundColor;
    if (c && !/rgba?\(\s*\d+,\s*\d+,\s*\d+\s*,\s*0\s*\)/.test(c) && c !== "transparent") return c;
    cur = cur.parentElement;
  }
  return d.defaultView.getComputedStyle(d.body).backgroundColor || "#0b0b10";
}

function updateProgress() {
  try {
    const pct = S.totalTiles ? Math.min(100, Math.round((S.destroyedTiles / S.totalTiles) * 100)) : 0;
    progressFill.style.width = pct + "%";
    progressText.textContent = pct + "%";
    countText.textContent = S.totalTiles ? `(${S.destroyedTiles}/${S.totalTiles} 块瓦片 · ${S.destroyedEls}/${S.totalEls} 个元素)` : "";
  } catch (e) { /* HUD 无关紧要 */ }
}

// ---------- 破坏 ----------
function chipTile(tile, hitX, hitY) {
  if (!tile || tile.destroyed) return false;
  tile.destroyed = true;
  S.destroyedTiles++;
  const cxx = Math.floor(hitX / CELL) * CELL, cyy = Math.floor(hitY / CELL) * CELL;
  holes.push({ x: cxx, y: cyy, w: CELL, h: CELL, color: tile.hole });
  // 文字：该格内的字符逐字飞散
  if (!tile.isImg && tile.text && roomFor(14)) {
    const d = doc();
    const r = tile.el.getBoundingClientRect();
    ctx.save();
    ctx.font = tile.font;
    const chars = [...tile.text];
    const widths = chars.map((c) => ctx.measureText(c).width);
    ctx.restore();
    const total = widths.reduce((a, b) => a + b, 0) || 1;
    const scale = Math.min(1, r.width / total);
    let x = r.left + Math.max(0, (r.width - total * scale) / 2);
    for (let i = 0; i < chars.length; i++) {
      const w = widths[i] * scale;
      const chx = x + w / 2, chy = r.top + r.height / 2;
      if (chx >= cxx && chx < cxx + CELL && chy >= cyy && chy < cyy + CELL && roomFor(1)) {
        S.parts.push({
          type: "char", ch: chars[i], x: chx - iframeOff().x, y: chy - iframeOff().y,
          vx: (Math.random() - 0.5) * 5.5, vy: -1.5 - Math.random() * 4,
          rot: 0, vr: (Math.random() - 0.5) * 0.3, life: 1.2 + Math.random() * 0.8, max: 2,
          size: parseFloat(tile.font) || 14, color: tile.fg, font: tile.font, g: 0.16,
        });
      }
      x += w;
    }
  }
  // 图片：该格内的纹理块飞散
  if (tile.isImg && tile.el.complete && tile.el.naturalWidth && roomFor(6)) {
    const r = tile.el.getBoundingClientRect();
    const cols = r.width > r.height ? 4 : 3, rows = 3;
    const cw = r.width / cols, chh = r.height / rows;
    const c0 = Math.floor(cxx / CELL), r0 = Math.floor(cyy / CELL);
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const px = r.left + i * cw + cw / 2, py = r.top + j * chh + chh / 2;
      if (px < cxx || px >= cxx + CELL || py < cyy || py >= cyy + CELL) continue;
      if (!roomFor(1)) break;
      S.parts.push({
        type: "img", img: tile.el,
        sx: (i / cols) * tile.el.naturalWidth, sy: (j / rows) * tile.el.naturalHeight,
        sw: tile.el.naturalWidth / cols, sh: tile.el.naturalHeight / rows,
        w: cw, h: chh,
        x: px - iframeOff().x, y: py - iframeOff().y,
        vx: (Math.random() - 0.5) * 6, vy: -1 - Math.random() * 4,
        rot: 0, vr: (Math.random() - 0.5) * 0.3, life: 1 + Math.random() * 0.7, max: 1.7, g: 0.2,
      });
    }
  }
  // 火花
  for (let i = 0; i < 5; i++) {
    if (!roomFor(1)) break;
    const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 4;
    S.parts.push({ type: "sq", x: hitX, y: hitY, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.2, life: 0.5 + Math.random() * 0.4, max: 0.9, color: "#ffb14a", size: 2 + Math.random() * 3, rot: 0, vr: 0, g: 0.14 });
  }
  sfx("hit");
  // 元素所有格子毁完 → 彻底隐藏
  const set = elTiles.get(tile.el);
  if (set) {
    set.delete(tile.key);
    if (set.size === 0 && !tile.el.__done) {
      tile.el.__done = 1;
      tile.el.classList.add("dm-done");
      S.destroyedEls++;
    }
  }
  return true;
}

function iframeOff() {
  // iframe 世界原点即文档 (0,0)，相机位移不影响世界坐标
  return { x: 0, y: 0 };
}

function burst(x, y, n, color) {
  for (let i = 0; i < n; i++) {
    if (!roomFor(1)) return;
    const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 5.5;
    S.parts.push({ type: "sq", x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.6, life: 0.6 + Math.random() * 0.5, max: 1.1, color, size: 2 + Math.random() * 3.5, rot: 0, vr: 0, g: 0.14 });
  }
}

// ---------- 武器 / 射击 ----------
function shoot() {
  if (S.over || !S.started) return;
  const w = WEAPONS[S.weapon - 1], now = performance.now();
  if (w.kind === "beam") return;                 // 激光在 loop 里持续处理
  if (now - S.lastShot < w.rate) return;
  S.lastShot = now;
  S.shots++;
  const m = { x: S.px + S.face * 14, y: S.py - 6 };
  const ang = Math.atan2(S.aimY - m.y, S.aimX - m.x);
  if (w.kind === "bullet") {
    S.bullets.push({ x: m.x + Math.cos(ang) * 14, y: m.y + Math.sin(ang) * 14, vx: Math.cos(ang) * w.speed, vy: Math.sin(ang) * w.speed, size: w.size, color: w.color, trail: w.trail });
    sfx("shoot");
  } else if (w.kind === "shotgun") {
    for (let i = 0; i < w.pellets; i++) {
      const a = ang + (Math.random() - 0.5) * w.spread;
      S.bullets.push({ x: m.x, y: m.y, vx: Math.cos(a) * w.speed * (0.85 + Math.random() * 0.3), vy: Math.sin(a) * w.speed * (0.85 + Math.random() * 0.3), size: w.size, color: w.color, trail: w.trail });
    }
    sfx("shotgun"); S.shake = 6;
  } else if (w.kind === "hitscan") {
    const dx = Math.cos(ang), dy = Math.sin(ang);
    let hit = null, chipped = 0;
    for (let d = 10; d <= 1400 && chipped < w.pierce; d += 10) {
      const t = tileAt(m.x + dx * d, m.y + dy * d);
      if (t) { chipTile(t, m.x + dx * d, m.y + dy * d); chipped++; burst(m.x + dx * d, m.y + dy * d, 8, w.color); }
    }
    S.beams.push({ x1: m.x, y1: m.y, x2: m.x + dx * 1400, y2: m.y + dy * 1400, life: 0.12, color: w.color, width: 3 });
    S.shake = 5; sfx("sniper");
  } else if (w.kind === "lob") {
    S.bullets.push({ grenade: true, x: m.x, y: m.y, vx: Math.cos(ang) * w.speed, vy: Math.sin(ang) * w.speed - 5.5, r: w.size, t: 0, aoe: w.aoe, color: w.color });
    sfx("shoot");
  } else if (w.kind === "rocket") {
    S.bullets.push({ rocket: true, x: m.x, y: m.y, vx: Math.cos(ang) * w.speed, vy: Math.sin(ang) * w.speed, size: w.size, aoe: w.aoe, color: w.color, t: 0 });
    sfx("rocket");
  } else if (w.kind === "bfg") {
    S.bullets.push({ bfg: true, x: m.x, y: m.y, vx: Math.cos(ang) * w.speed, vy: Math.sin(ang) * w.speed, size: w.size, aoe: w.aoe, color: w.color, t: 0 });
    sfx("bfg");
  }
}

function chipArea(cx, cy, radius) {
  const c0 = Math.floor((cx - radius) / CELL), c1 = Math.floor((cx + radius) / CELL);
  const r0 = Math.floor((cy - radius) / CELL), r1 = Math.floor((cy + radius) / CELL);
  for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) {
    const t = grid.get(cc + "," + rr);
    if (!t || t.destroyed) continue;
    const dx = cc * CELL + CELL / 2 - cx, dy = rr * CELL + CELL / 2 - cy;
    if (dx * dx + dy * dy <= radius * radius) {
      chipTile(t, cc * CELL + CELL / 2, rr * CELL + CELL / 2);
      if (S.parts.length > MAX_PARTS - 30) return;
    }
  }
}

function explode(x, y, radius, color) {
  sfx("boom"); S.shake = Math.max(S.shake, 16);
  burst(x, y, 34, "#ff8a3a"); burst(x, y, 16, "#ffe08a"); burst(x, y, 12, color);
  chipArea(x, y, radius);
}

function burst(x, y, n, color) {
  for (let i = 0; i < n; i++) {
    if (!roomFor(1)) return;
    const a = Math.random() * Math.PI * 2, sp = 1.5 + Math.random() * 5.5;
    S.parts.push({ type: "sq", x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1.6, life: 0.6 + Math.random() * 0.5, max: 1.1, color, size: 2 + Math.random() * 3.5, rot: 0, vr: 0, g: 0.14 });
  }
}
function roomFor(n) { return S.parts.length + n <= MAX_PARTS; }

// ---------- 像素枪模型（每把枪一个小像素图） ----------
const GUN_ART = {
  1: { w: 10, px: ["2,1,6,2,#3a3a4a", "6,3,2,3,#2a2a35", "1,1,1,1,#ffd23e"] },                       // 手枪
  2: { w: 12, px: ["0,1,8,2,#3a3a4a", "4,3,2,4,#2a2a35", "8,1,3,1,#7ee787", "0,0,1,1,#7ee787"] },    // 冲锋枪
  3: { w: 14, px: ["0,1,10,2,#4a3a3a", "0,2,10,1,#2a2a35", "10,1,3,2,#ffb14a", "3,3,2,2,#2a2a35"] }, // 霰弹枪
  4: { w: 16, px: ["0,2,12,1,#3a3a4a", "4,0,3,2,#22223a", "12,2,3,1,#9fd0ff", "5,3,2,3,#2a2a35"] },  // 狙击枪
  5: { w: 8,  px: ["2,1,4,4,#3a3a4a", "3,5,2,2,#ff5c5c"] },                                          // 手雷
  6: { w: 16, px: ["0,2,13,4,#3a3a4a", "13,2,3,4,#ff8a3a", "2,6,3,2,#2a2a35", "0,1,2,1,#ff5c5c"] },  // 火箭筒
  7: { w: 14, px: ["0,2,10,2,#3a3a4a", "10,1,2,4,#ff4dd2", "4,4,2,2,#2a2a35", "12,2,2,2,#ff4dd2"] }, // 激光枪
  8: { w: 18, px: ["0,1,14,6,#2f2f3f", "14,2,4,4,#b14bff", "2,7,4,2,#2a2a35", "0,2,2,4,#b14bff"] },  // BFG
};
function gunSVG(id) {
  const art = GUN_ART[id];
  if (!art) return "";
  const rects = art.px.map((p) => {
    const [x, y, w, h, c] = p.split(",");
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
  }).join("");
  return `<svg width="${art.w * 3}" height="24" viewBox="0 0 ${art.w} 8" shape-rendering="crispEdges" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`;
}

function setWeapon(w) {
  S.weapon = w;
  wslots().forEach((b) => b.classList.toggle("active", +b.dataset.w === w));
  gun.innerHTML = gunSVG(w);
}

// ---------- 主循环 ----------
let lastT = 0;
function loop(t) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
  lastT = t;
  if (!S.started) { draw(); return; }

  // clawd：平台物理（瓦片 = 台阶）
  const L = S.keys["a"] || S.keys["arrowleft"], R = S.keys["d"] || S.keys["arrowright"];
  S.vx += ((R ? 1 : 0) - (L ? 1 : 0)) * 0.9;
  S.vx *= 0.85;
  const jet = S.keys["w"] || S.keys[" "] || S.keys["arrowup"];
  if (jet) { S.vy -= 0.62; player.classList.add("flying"); } else player.classList.remove("flying");
  if (S.keys["s"] || S.keys["arrowdown"]) S.vy += 0.4;
  // 站稳时不积累重力速度（消除落地抖动）；空中才施加重力
  if (!jet && S.onGround) S.vy = 0;
  else { S.vy += 0.42; S.vy = Math.max(-8, Math.min(9, S.vy)); }

  S.py += S.vy;
  if (S.vy >= 0) {
    const fy = S.py + HH;
    if (solidAt(S.px - HW + 3, fy + 1) || solidAt(S.px + HW - 3, fy + 1)) {
      S.py = Math.floor((fy + 1) / CELL) * CELL - HH;
      S.vy = 0; S.onGround = true;
    } else if (fy >= S.worldH - 56) {
      S.py = S.worldH - 56 - HH; S.vy = 0; S.onGround = true;
    } else S.onGround = false;
  } else {
    const hy = S.py - HH;
    if (solidAt(S.px - HW + 3, hy - 1) || solidAt(S.px + HW - 3, hy - 1)) {
      S.py = Math.floor((hy - 1) / CELL) * CELL + CELL + HH;
      S.vy = 0;
    }
  }

  S.px += S.vx;
  if (S.vx > 0) {
    const rx = S.px + HW;
    if (solidAt(rx, S.py - HH + 5) || solidAt(rx, S.py + HH - 5)) {
      S.px = Math.floor(rx / CELL) * CELL - HW; S.vx = 0;
    }
  } else if (S.vx < 0) {
    const lx = S.px - HW;
    if (solidAt(lx, S.py - HH + 5) || solidAt(lx, S.py + HH - 5)) {
      S.px = Math.floor(lx / CELL) * CELL + CELL + HW; S.vx = 0;
    }
  }
  S.px = Math.max(20, Math.min(S.worldW - 20, S.px));
  player.style.left = S.px - 14 + "px";
  player.style.top = S.py - HH + "px";

  // 朝向跟随鼠标；枪臂指向鼠标
  S.aimY = S.aimScreenY + S.camY;
  const adx = S.aimX - S.px, ady = S.aimY - S.py;
  const ang = Math.atan2(ady, adx);
  S.face = Math.cos(ang) >= 0 ? 1 : -1;
  player.classList.toggle("flip", S.face < 0);
  const flipV = Math.abs(ang) > Math.PI / 2 ? " scaleY(-1)" : "";
  gun.style.transform = `rotate(${ang}rad)${flipV}`;
  gun.style.left = "10px";
  gun.style.top = "8px";

  // 相机跟随
  const viewH = innerHeight;
  const targetCam = Math.max(-SKY, Math.min(S.worldH - viewH, S.py - viewH * 0.5));
  S.camY += (targetCam - S.camY) * 0.12;
  world.style.transform = `translateY(${-S.camY}px)`;

  const w = WEAPONS[S.weapon - 1];
  if (S.firing && w.auto && w.kind !== "beam") shoot();

  // 激光：按住持续融化（独立计时器，每 80ms 融一格）
  if (w.kind === "beam" && S.firing) {
    S.beamAcc += dt;
    const m = { x: S.px + S.face * 14, y: S.py - 6 };
    const ang2 = Math.atan2(S.aimY - m.y, S.aimX - m.x);
    const dx = Math.cos(ang2), dy = Math.sin(ang2);
    let hit = null;
    for (let d = 12; d <= w.range && !hit; d += 12) {
      const tt = tileAt(m.x + dx * d, m.y + dy * d);
      if (tt) hit = { x: m.x + dx * d, y: m.y + dy * d, tile: tt };
    }
    const ex = hit ? hit.x : m.x + dx * w.range, ey = hit ? hit.y : m.y + dy * w.range;
    S.beams.push({ x1: m.x, y1: m.y, x2: ex, y2: ey, life: 0.07, color: w.color, width: 2.5 });
    S.beamAcc = S.beamAcc || 0;
    if (hit && S.beamAcc >= 0.08) {
      S.beamAcc = 0;
      chipTile(hit.tile, hit.x, hit.y);
      burst(hit.x, hit.y, 4, w.color);
      S.shots++;
      if (Math.random() < 0.35) sfx("laser");
    }
  }

  // 子弹
  for (let i = S.bullets.length - 1; i >= 0; i--) {
    const b = S.bullets[i];
    if (b.grenade) {
      b.t += dt; b.vy += 0.3; b.x += b.vx; b.y += b.vy;
      if (b.y >= S.worldH - 56 - 6 || b.y < -30 || b.x < -30 || b.x > S.worldW + 30 || b.t > 3) {
        S.bullets.splice(i, 1); explode(b.x, Math.min(b.y, S.worldH - 56 - 6), b.aoe, b.color); continue;
      }
    } else if (b.rocket) {
      b.t += dt; b.vy += 0.04; b.x += b.vx; b.y += b.vy;
      if (b.t > 4 || b.x < -30 || b.x > S.worldW + 30 || b.y < -30 || b.y > S.worldH + 30) {
        S.bullets.splice(i, 1); explode(b.x, b.y, b.aoe, b.color); continue;
      }
      const t = tileAt(b.x, b.y);
      if (t) { chipTile(t, b.x, b.y); S.bullets.splice(i, 1); explode(b.x, b.y, b.aoe, b.color); continue; }
      if (Math.random() < 0.5) burst(b.x, b.y, 2, b.color);
    } else if (b.bfg) {
      b.t += dt; b.x += b.vx; b.y += b.vy;
      const t = tileAt(b.x, b.y);
      if (t) chipTile(t, b.x, b.y);   // BFG 沿途持续融化
      if (Math.random() < 0.7) burst(b.x, b.y, 3, b.color);
      if (b.t > 4 || b.x < -40 || b.x > S.worldW + 40 || b.y < -40 || b.y > S.worldH + 40) {
        S.bullets.splice(i, 1); explode(b.x, b.y, b.aoe, b.color); continue;
      }
    } else {
      b.x += b.vx; b.y += b.vy;
      const t = tileAt(b.x, b.y);
      if (t) { chipTile(t, b.x, b.y); S.bullets.splice(i, 1); continue; }
      if (b.y < -40 || b.y > S.worldH + 40 || b.x < -40 || b.x > S.worldW + 40) { S.bullets.splice(i, 1); continue; }
    }
  }

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
  ctx.translate(0, SKY); // 画布顶端在世界 y=-SKY

  // 弹坑（只有被炸掉的字/图区域）
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
    ctx.globalAlpha = Math.max(0, b.life / 0.12) * 0.4; ctx.lineWidth = b.width * 2.6;
    ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // 粒子（字符 / 图片块 / 方块）
  for (const p of S.parts) {
    const a = Math.max(0, Math.min(1, p.life / (p.max || 1)));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(p.x, p.y);
    if (p.rot) ctx.rotate(p.rot);
    if (p.type === "char") {
      ctx.fillStyle = p.color;
      ctx.font = p.font;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.ch, 0, 0);
    } else if (p.type === "img") {
      try {
        ctx.drawImage(p.img, p.sx, p.sy, p.sw, p.sh, -p.w / 2, -p.h / 2, p.w, p.h);
        ctx.strokeStyle = "rgba(0,0,0,.3)"; ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);
      } catch (e) { /* 跨域图片：跳过 */ }
    } else {
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    }
    ctx.restore();
  }

  // 子弹（曳光）
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

  // 准星
  if (S.started && !S.over) {
    const cx = S.aimX, cy = S.aimScreenY + S.camY;
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
  if (!S.started) return;
  const num = parseInt(k, 10);
  if (num >= 1 && num <= WEAPONS.length) setWeapon(num);
  if (k === "m") S.muted = !S.muted;
});
addEventListener("keyup", (e) => { S.keys[e.key.toLowerCase()] = false; });
addEventListener("mousemove", (e) => { S.aimX = e.clientX; S.aimScreenY = e.clientY; });
addEventListener("mousedown", (e) => {
  if (!S.started || S.over) return;
  const t = e.target;
  if (t && t.closest && t.closest("#hud, #touch")) return;
  S.aimX = e.clientX; S.aimScreenY = e.clientY;
  S.firing = true;
  const w = WEAPONS[S.weapon - 1];
  if (!w.auto) shoot();
});
addEventListener("mouseup", () => { S.firing = false; });
addEventListener("contextmenu", (e) => {
  if (!S.started) return;
  const t = e.target;
  if (t && t.closest && t.closest("#hud")) return;
  e.preventDefault();
});
addEventListener("wheel", (e) => {
  if (!S.started) return;
  setWeapon(((S.weapon - 1 + (e.deltaY > 0 ? 1 : WEAPONS.length - 1)) % WEAPONS.length) + 1);
}, { passive: true });
addEventListener("resize", () => { fx.width = S.worldW = innerWidth; });
fx.width = innerWidth; fx.height = S.worldH + SKY; fx.style.top = -SKY + "px";

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

// 武器栏
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

// ---------- 开局 ----------
function startGame() {
  if (startBtn.disabled) return;
  S.started = true; S.t0 = performance.now();
  try { ac().resume(); } catch (e) {}
  intro.style.display = "none";
  setWeapon(1);
}
startBtn.addEventListener("click", startGame);

// 武器栏 + 状态钩子
buildWeaponBar();
setWeapon(1);
requestAnimationFrame(loop);
window.__S = S;
window.__hitTile = tileAt;
})();
