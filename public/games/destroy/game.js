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
gun.style.top = "8px";   // 旧版每帧重写，这里一次到位（保持与旧视觉一致）
const POPS_FONT = "700 13px " + getComputedStyle(document.body).fontFamily; // 飘字字体只取一次，避免每帧强制样式计算

// 书签模式：?url=<绝对地址> → 页面经 /api/mirror/ 同源镜像（点 iframe 内链接也不会离开游戏）
// 站内模式（默认）：直接嵌入站内页面，最快。
function targetSrc() {
  const p = new URLSearchParams(location.search);
  const u = p.get("url");
  if (u && /^https?:\/\//i.test(u)) {
    try {
      const b = btoa(unescape(encodeURIComponent(u))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      return "/api/mirror/" + b;
    } catch (e) {}
  }
  return "/";
}
target.src = targetSrc();

// ---------- 目标就绪（load 监听 + 轮询双保险，防竞态） ----------
let targetInited = false;
function initTarget() {
  if (targetInited) return true;
  const d = doc();
  if (!d || !d.body || d.readyState !== "complete") return false;
  if (d.location.href === "about:blank") return false;
  targetInited = true;
  d.querySelectorAll('details:not([open])').forEach((x) => { x.open = true; });
  // 同源 iframe 才能把隐藏样式打进目标文档（game.js 是外层脚本，样式规则不会自动穿透）
  if (!d.getElementById("dm-style")) {
    const st = d.createElement("style");
    st.id = "dm-style";
    st.textContent = ".dm-done{visibility:hidden !important;}";
    (d.head || d.documentElement).appendChild(st);
  }
  S.docH = Math.max(600, d.documentElement.scrollHeight);
  target.style.height = S.docH + "px";
  S.worldH = S.docH + GROUND_H;
  world.style.height = S.worldH + "px";
  floorEl.style.top = (S.docH + 40) + "px";
  sizeFx();
  buildTiles();            // 异步分帧构建（"拆解中…"），完成时才隐藏 loading、启用开始按钮
  S.camY = -SKY;
  S.px = innerWidth / 2;
  S.py = -SKY + 80; S.vy = 0; S.onGround = false;
  player.style.left = S.px - 14 + "px";
  player.style.top = S.py - HH - S.camY + "px";   // player 已移入 #stage，屏幕坐标 = 世界坐标 - camY
  return true;
}
target.addEventListener("load", () => setTimeout(initTarget, 300));
const readyPoll = setInterval(() => { if (initTarget()) clearInterval(readyPoll); }, 150);

// ---------- 常量 ----------
const CELL = 28;
const GROUND_H = 96;
const SKY = 600;
const isCoarse = matchMedia("(pointer: coarse)").matches;  // 触屏判断：粒子预算、DPR 上限都靠它
let MAX_PARTS = isCoarse ? 250 : 650;                       // 触屏收紧粒子上限，桌面保持 650
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
  weapon: 0, lastShot: 0, beamAcc: 0, firing: false, descendTarget: null,
  bullets: [], parts: [], pops: [], beams: [],
  worldW: innerWidth, worldH: 1000, docH: 600,
  totalTiles: 0, destroyedTiles: 0, totalEls: 0, destroyedEls: 0,
  shake: 0, muted: false, t0: 0, shots: 0,
  keys: {},
  joyMove: null, joyAim: null,        // 浮动摇杆状态（setupTouch 创建）
  joyDesc: false,
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
  "noscript", "title", "br", "path", "svg", "template", "input", "textarea", "select", "label"]);
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

function sizeFx() {
  // 效果画布只盖"视口"，不覆盖整个世界高度（世界高 = 整页文档 + 600，
  // 移动端会是大几万像素高的画布，每帧 clear 与合成都会爆显存带宽）。
  // 相机偏移在绘制时以 translate 抵消：世界坐标 = 屏幕坐标 + (S.camY - SKY)。
  const dpr = Math.min(devicePixelRatio || 1, isCoarse ? 1.5 : 2);   // 移动端 DPR 上限 1.5，桌面 2
  const W = innerWidth, H = innerHeight;
  S.dpr = dpr; S.vw = W; S.vh = H;
  fx.style.width = W + "px"; fx.style.height = H + "px";
  fx.width = Math.round(W * dpr); fx.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);   // 之后所有绘制坐标都是 CSS 像素（屏幕系）
  S.worldW = W;                             // 世界宽度 = 视口宽度（原逻辑）
}

function drawBegin() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);           // 清屏用物理像素，一步清零
  ctx.clearRect(0, 0, fx.width, fx.height);
  ctx.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);  // 恢复 DPR 变换
}
function drawEnd() { ctx.restore(); }

// ---------- 瓦片构建（分帧） ----------
// 每帧限时 ~5ms / 每段限字数：瓦片构建绝不阻塞首帧。期间 loading 显示"拆解中 x%"，
// 完成后才开始游戏（平台碰撞依赖瓦片，必须等它建完——loading 挡住、开始按钮禁用，无破坏性变化）。
const CHUNK_MS = 5, CHUNK_CHARS = 1500;
let buildTargets = null, buildCursor = 0, buildTotal = 0, buildDone = 0;
let candElSet = new Set();   // 本局候选元素集合：认领文字时跳过"别的靶子"身上的字，防重复认领
function buildProgress() {
  return buildTargets
    ? Math.min(99, Math.round((buildDone / Math.max(1, buildTotal)) * 100))
    : 100;
}

// 直接子文本节点里的非空白字符数（不含子孙元素里的文字）。
// 候选判定用：只有"自己身上"直接挂着文字的才是靶子——纯容器（文字全在子孙里）
// 不是靶子，否则整块 header/侧栏会被当成一个靶子、打光瓦片就整块消失（背景不该被摧毁）。
function ownChars(el) {
  let n = 0;
  for (const nd of el.childNodes) {
    if (nd.nodeType !== 3) continue;
    for (let i = 0; i < nd.data.length; i++) if (!/\s/.test(nd.data[i])) n++;
  }
  return n;
}

// 元素自身「看得见的内容」：媒体标签 / 直接文字 / no-repeat 背景图（logo、栏目图标、
// 轮播占位这类 CSS 背景内容，不是 <img> 所以旧逻辑全漏）。纯容器仍不是靶子。
function hasVisualContent(d, el) {
  const tag = el.tagName;
  if (tag === "IMG" || tag === "VIDEO" || tag === "CANVAS" || tag === "PICTURE" || tag === "IFRAME") return true;
  if (ownChars(el) > 0) return true;
  const cs = d.defaultView.getComputedStyle(el);
  const bi = cs.backgroundImage;
  return !!bi && bi !== "none" && cs.backgroundRepeat !== "repeat" && cs.backgroundRepeat !== "repeat-x" && cs.backgroundRepeat !== "repeat-y";
}

function buildTiles() {
  // 快速路径（首选）：页面规模不大时，单行文本节点用"整段一个 Range"量一次再均分
  // （本任务指定的按行/词批量测量，无换行的标题/链接/导航几乎全是单行节点，Range
  // 调用量从每字符一次降到每节点一次）；多行段落与含 \n 的节点保持逐字符精确测量。
  // 语义不变：非空白字符仍是独立粒子，占据同一批 28px 格子。
  // 分帧路径（兜底）：大页面逐目标元素推进，每帧 5ms 预算 + rAF 续跑，绝不卡首帧。
  const d = doc();
  grid.clear(); elTiles.clear(); holes = [];
  S.totalTiles = 0; S.destroyedTiles = 0; S.totalEls = 0; S.destroyedEls = 0;
  if (!d || !d.body) { buildTargets = null; loading.classList.add("done"); return; }
  S.cols = Math.ceil(S.worldW / CELL); S.rows = Math.ceil(S.docH / CELL);
  if (S.docH < 8000 && S.worldW <= 1500) {
    try { if (buildFast(d)) { buildFinish(); return; } } catch (e) { /* 快路径失败 → 回退分帧 */ }
  }
  // 分帧路径：先按元素逐字符推进（字符是主要工作量），游标每帧必前进，不会死等
  const allEls = [...d.body.querySelectorAll("*")];
  const candSet = new Set();
  for (let i = allEls.length - 1; i >= 0; i--) {
    const el = allEls[i];
    if (!el || el.nodeType !== 1 || SKIP_TAGS.has(el.tagName.toLowerCase())) continue;
    // 纯容器（文字全在子孙里）不入选：靶子只能是"自己身上"有可见内容的元素
    //（直接文字 / <img> / <iframe> / no-repeat 背景图）。
    // 否则断链容器（子元素里有 script/包装层）会把整棵子树的文字都认领成自己的瓦片，
    // 打光后整块 header/侧栏一起消失——背景不该被摧毁。
    if (!hasVisualContent(d, el)) continue;
    candSet.add(el);
  }
  buildTargets = [];
  candElSet = candSet;
  for (const el of candSet) {
    if (el.checkVisibility && !el.checkVisibility({ contentVisibilityAuto: true, visibility: true })) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) continue;
    const isImg = el.tagName === "IMG";
    const isBlock = !isImg && ownChars(el) === 0;   // iframe / 背景图块：无文字，整块成瓦片
    const cs = d.defaultView.getComputedStyle(el);
    buildTargets.push({ el, r, isImg, isBlock, total: isImg ? 1 : Math.max(1, ownChars(el)), chars: [], font: `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`, fg: cs.color, hole: effBg(d, el.parentElement) });
  }
  buildCursor = 0; buildDone = 0;
  buildTotal = buildTargets.reduce((a, t) => a + t.total, 0);
  loading.classList.remove("done");
  loading.firstElementChild.textContent = "拆解中 0%";
  buildStep();   // 立即处理一小段，剩余由 buildStep 自驱 rAF 续跑
}

function buildStep() {
  if (!buildTargets) return;
  const t0 = performance.now();
  let chars = 0;
  while (buildCursor < buildTargets.length && performance.now() - t0 < CHUNK_MS) {
    const t = buildTargets[buildCursor];
    if (!t.isImg) chars += t.total;
    claimTarget(t);
    buildDone += t.total;
    buildCursor++;
    if (chars >= CHUNK_CHARS) break;
  }
  if (buildCursor >= buildTargets.length) buildFinish();
  else {
    loading.firstElementChild.textContent = "拆解中 " + buildProgress() + "%";
    requestAnimationFrame(buildStep);
  }
}

function claimTarget(t) {
  const d = doc();
  const claimCell = (cc, rr, data) => {
    const k = cc + "," + rr;
    let tile = grid.get(k);
    if (!tile) {
      tile = { el: data.el, fg: data.fg, hole: data.hole, isImg: data.isImg, destroyed: false, key: k, chars: [] };
      grid.set(k, tile);
      S.totalTiles++;
    }
    if (data.ch) tile.chars.push(data.ch);
    let set = elTiles.get(data.el);
    if (!set) { set = new Set(); elTiles.set(data.el, set); }
    set.add(k);
  };
  if (t.isImg || t.isBlock) {
    // <img> 与 iframe/背景图块：整块 rect 全铺瓦片（isBlock 无逐字符，一格一洞）
    const rect = t.r;
    const c0 = Math.max(0, Math.floor(rect.left / CELL)), c1 = Math.min(S.cols - 1, Math.floor((rect.left + rect.width - 1) / CELL));
    const r0 = Math.max(0, Math.floor(rect.top / CELL)), r1 = Math.min(S.rows - 1, Math.floor((rect.top + rect.height - 1) / CELL));
    for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) {
      claimCell(cc, rr, { el: t.el, fg: t.fg, hole: t.hole, isImg: t.isImg });
    }
    S.totalEls++;
    return;
  }
  // 节点级批量测量（getClientRects 一次拿所有行 rect，行内按行宽均分）——分帧路径里
  // 也绝不逐字符 getBoundingClientRect，否则每帧 5ms 预算根本不够切一个长段落
  const walker = d.createTreeWalker(t.el, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    let p = node.parentElement;
    let inCand = false;
    while (p && p !== t.el) { if (candElSet.has(p)) { inCand = true; break; } p = p.parentElement; }
    if (inCand) continue;   // 这段文字属于另一个靶子，别重复认领
    const rg = d.createRange();
    rg.selectNodeContents(node);
    const rects = rg.getClientRects();
    if (!rects || !rects.length) continue;
    const lines = [];
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      if (r.width > 0 && r.height > 0) lines.push({ x: r.x, y: r.y, w: r.width, h: r.height });
    }
    if (!lines.length) continue;
    const chars = [];
    for (let i = 0; i < node.data.length; i++) { const ch = node.data[i]; if (!/\s/.test(ch)) chars.push(ch); }
    const n = chars.length;
    if (!n) continue;
    const totalW = lines.reduce((a, l) => a + l.w, 0);
    let ci = 0;
    for (let li = 0; li < lines.length && ci < n; li++) {
      const line = lines[li];
      const cnt = li === lines.length - 1 ? n - ci : Math.max(1, Math.round(n * line.w / totalW));
      const cw = line.w / cnt;
      for (let j = 0; j < cnt && ci < n; j++, ci++) {
        t.chars.push({ ch: chars[ci], x: line.x + j * cw, y: line.y, w: cw, h: line.h });
      }
    }
    for (; ci < n; ci++) {
      t.chars.push({ ch: chars[ci], x: lines[lines.length - 1].x + lines[lines.length - 1].w, y: lines[lines.length - 1].y, w: 4, h: lines[lines.length - 1].h });
    }
  }
  for (const cr of t.chars) {
    const c0 = Math.max(0, Math.floor(cr.x / CELL)), c1 = Math.min(S.cols - 1, Math.floor((cr.x + cr.w - 1) / CELL));
    const r0 = Math.max(0, Math.floor(cr.y / CELL)), r1 = Math.min(S.rows - 1, Math.floor((cr.y + cr.h - 1) / CELL));
    for (let rr = r0; rr <= r1; rr++) for (let cc = c0; cc <= c1; cc++) {
      claimCell(cc, rr, { el: t.el, fg: t.fg, hole: t.hole, ch: cr });
    }
  }
  if (t.chars.length) S.totalEls++;
}

function buildFast(d) {
  const allEls = [...d.body.querySelectorAll("*")];
  const candSet = new Set();
  for (let i = allEls.length - 1; i >= 0; i--) {
    const el = allEls[i];
    if (!el || el.nodeType !== 1 || SKIP_TAGS.has(el.tagName.toLowerCase())) continue;
    if (!hasVisualContent(d, el)) continue;
    candSet.add(el);
  }
  const targets = [];
  const elCs = new Map();   // 元素 → computedStyle 缓存（量取一次）
  candElSet = candSet;
  for (const el of candSet) {
    if (el.checkVisibility && !el.checkVisibility({ contentVisibilityAuto: true, visibility: true })) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) continue;
    const isImg = el.tagName === "IMG";
    const isBlock = !isImg && ownChars(el) === 0;   // iframe / 背景图块
    const cs = d.defaultView.getComputedStyle(el);
    elCs.set(el, cs);
    targets.push({ el, r, isImg, isBlock, chars: [], font: `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`, fg: cs.color, hole: effBg(d, el.parentElement) });
  }
  // 文本节点 → 所属靶子元素（只挂"最近候选就是自己父元素"的节点：
  // 候选只含直接带文字的元素，纯容器已排除，不会再出现"离容器近被容器抢字"）
  const walker = d.createTreeWalker(d.body, NodeFilter.SHOW_TEXT);
  let node;
  const m = new Map();
  while ((node = walker.nextNode())) {
    let p = node.parentElement;
    while (p && p !== d.body) { if (candSet.has(p)) { if (p === node.parentElement) m.set(node, p); break; } p = p.parentElement; }
  }
  // 节点级批量测量：一个 Range 覆盖整段文本，getClientRects() 一次返回所有行 rect，
  // 行内字符按行宽占比均分。多行折行段落也走这里——逐字符 getBoundingClientRect
  // 才是移动端首帧卡死的主凶（整页几千次同步 reflow），行 rect 本身就是浏览器
  // 真实排版结果，均分误差 ≤ 一个字宽，对 28px 瓦片网格无感。
  const measureNode = (nd, t) => {
    const rg = d.createRange();
    rg.selectNodeContents(nd);
    const rects = rg.getClientRects();
    if (!rects || !rects.length) return;
    let lines = [];
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      if (r.width > 0 && r.height > 0) lines.push({ x: r.x, y: r.y, w: r.width, h: r.height });
    }
    if (!lines.length) return;
    const chars = [];
    for (let i = 0; i < nd.data.length; i++) { const ch = nd.data[i]; if (!/\s/.test(ch)) chars.push(ch); }
    const n = chars.length;
    if (!n) return;
    const totalW = lines.reduce((a, l) => a + l.w, 0);
    let ci = 0;
    for (let li = 0; li < lines.length && ci < n; li++) {
      const line = lines[li];
      // 该行应得字符数按行宽占比分配，最后一行拿走剩余
      const cnt = li === lines.length - 1 ? n - ci : Math.max(1, Math.round(n * line.w / totalW));
      const cw = line.w / cnt;
      for (let j = 0; j < cnt && ci < n; j++, ci++) {
        t.chars.push({ ch: chars[ci], x: line.x + j * cw, y: line.y, w: cw, h: line.h });
      }
    }
    for (; ci < n; ci++) {  // 兜底：行宽分配有余量的字符挂到末行尾
      t.chars.push({ ch: chars[ci], x: lines[lines.length - 1].x + lines[lines.length - 1].w, y: lines[lines.length - 1].y, w: 4, h: lines[lines.length - 1].h });
    }
  };
  for (const [nd, t] of m) {
    if (candElSet.has(nd.parentElement) && nd.parentElement !== t.el) continue;   // 属于兄弟靶子，别重复认领
    if (nd.data.includes("\n")) { measureNode(nd, t); continue; }
    const rg = d.createRange();
    rg.selectNodeContents(nd);
    const rr = rg.getBoundingClientRect();
    if (rr.width <= 0 || rr.height <= 0) continue;
    const fsz = parseFloat((t.font.match(/([\d.]+)px/) || ["", "16"])[1]);
    const cs = elCs.get(t.el);
    let lh = parseFloat(cs.lineHeight) || fsz * 1.2;
    if (cs.lineHeight && !/[a-z%]/i.test(cs.lineHeight)) lh *= fsz;   // 无单位行高（如 1.5）= 字号倍数
    if (rr.height > lh * 1.4) { measureNode(nd, t); continue; }      // 折行的多行段落：节点级批量测量
    const chars = [];
    for (let i = 0; i < nd.data.length; i++) { const ch = nd.data[i]; if (!/\s/.test(ch)) chars.push(ch); }
    const n = chars.length;
    if (!n) continue;
    const cw = rr.width / n;   // 单行：整段一个 rect，字符按行宽均分（批量化，网格语义不变）
    for (let i = 0; i < n; i++) t.chars.push({ ch: chars[i], x: rr.x + i * cw, y: rr.y, w: cw, h: rr.height });
  }
  for (const t of targets) claimTarget(t);
  return true;
}

function buildFinish() {
  buildTargets = null;
  loading.classList.add("done");
  if (startBtn.disabled) { startBtn.disabled = false; startBtn.textContent = "开 炸"; }
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
  // 文字：该格缓存的字符逐字飞散（真实位置/真实字体）
  if (!tile.isImg && tile.chars && tile.chars.length) {
    for (const cr of tile.chars) {
      if (!roomFor(1)) break;
      S.parts.push({
        type: "char", ch: cr.ch, x: cr.x, y: cr.y + cr.h / 2,
        vx: (Math.random() - 0.5) * 5.5, vy: -1.5 - Math.random() * 4,
        rot: 0, vr: (Math.random() - 0.5) * 0.3, life: 1.2 + Math.random() * 0.8, max: 2,
        size: cr.h * 0.9, color: tile.fg, font: tile.font, g: 0.16,
      });
    }
  }
  // 图片：该格的纹理块飞散
  if (tile.isImg && tile.el.complete && tile.el.naturalWidth && roomFor(6)) {
    const r = tile.el.getBoundingClientRect();
    const cols = r.width > r.height ? 4 : 3, rows = 3;
    const cw = r.width / cols, chh = r.height / rows;
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const px = r.left + i * cw + cw / 2, py = r.top + j * chh + chh / 2;
      if (px < cxx || px >= cxx + CELL || py < cyy || py >= cyy + CELL) continue;
      if (!roomFor(1)) break;
      S.parts.push({
        type: "img", img: tile.el,
        sx: (i / cols) * tile.el.naturalWidth, sy: (j / rows) * tile.el.naturalHeight,
        sw: tile.el.naturalWidth / cols, sh: tile.el.naturalHeight / rows,
        w: cw, h: chh,
        x: px, y: py,
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
  updateProgress();
  return true;
}

function iframeOff() {
  // iframe 世界原点即文档 (0,0)，相机位移不影响世界坐标
  return { x: 0, y: 0 };
}

// S/↓：向下一层——关闭碰撞，真实重力坠落到脚下更深处的下一个可站立表面
function descendOneLayer() {
  if (S.descendTarget !== null) return;
  const fy = S.py + HH;
  const footL = S.px - HW + 3, footR = S.px + HW - 3;
  let targetTop = null;
  for (let y = fy + CELL + 2; y < S.worldH - 56; y += CELL / 2) {
    if (solidAt(footL, y + 1) || solidAt(footR, y + 1)) { targetTop = y; break; }
  }
  S.descendTarget = targetTop !== null ? targetTop : S.worldH - 56;
  S.onGround = false;
  S.vy = -4.2;   // 小跳起手：有明显的跳跃弧线再落下
  burst(S.px, S.py, 8, "#7ee787");
  sfx("laser");
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
  if (S.joyAim) { S.aimX = S.px + S.joyAim.x * 220; S.aimScreenY = S.py - S.camY + S.joyAim.y * 220; }
  const w = WEAPONS[S.weapon - 1], now = performance.now();
  if (w.kind === "beam") return;                 // 激光在 loop 里持续处理
  if (now - S.lastShot < w.rate) return;
  S.lastShot = now;                              // 先占坑：下一次调用要等满 rate，射速永远不会被"卡住一档"
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

  // clawd：平台物理（瓦片 = 台阶）。键盘 a/d 与虚拟摇杆向量合并
  const kL = S.keys["a"] || S.keys["arrowleft"], kR = S.keys["d"] || S.keys["arrowright"];
  let mv = (kR ? 1 : 0) - (kL ? 1 : 0);
  if (S.joyMove) mv = Math.max(-1, Math.min(1, mv + S.joyMove.x));   // 浮动摇杆：模拟量叠加
  S.vx += Math.max(-1, Math.min(1, mv)) * 0.9;
  S.vx *= 0.85;
  const jet = S.keys["w"] || S.keys["arrowup"] || (S.joyMove && S.joyMove.y < -0.45);
  if (jet) { S.vy -= 0.62; player.classList.add("flying"); } else player.classList.remove("flying");
  if (S.joyMove && S.joyMove.y > 0.75) { if (!S.joyDesc) { S.joyDesc = true; descendOneLayer(); } } else S.joyDesc = false;
  // 站稳时不积累重力速度（消除落地抖动）；空中才施加重力
  if (!jet && S.onGround) S.vy = 0;
  else { S.vy += 0.42; S.vy = Math.max(-8, Math.min(9, S.vy)); }

  if (S.descendTarget !== null) {
    S.vy = Math.min(S.vy + 0.5, 8.5);
    S.py += S.vy;
    if (Math.random() < 0.7 && roomFor(1)) {
      S.parts.push({ type: "sq", x: S.px + (Math.random() - 0.5) * 22, y: S.py + HH - Math.random() * 14, vx: 0, vy: -1, life: 0.4 + Math.random() * 0.3, max: 0.7, color: "#7ee787", size: 2.5, rot: 0, vr: 0, g: 0 });
    }
    if (S.py + HH >= S.descendTarget) {
      S.py = S.descendTarget - HH; S.vy = 0;
      S.descendTarget = null; S.onGround = true;
      burst(S.px, S.py + HH, 12, "#7ee787");
      sfx("hit");
    }
  } else {
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
  player.style.top = S.py - HH - S.camY + "px";   // player 在 #stage：屏幕坐标 = 世界坐标 - camY

  // 朝向跟随鼠标；枪臂指向鼠标
  S.aimY = S.aimScreenY + S.camY;
  const adx = S.aimX - S.px, ady = S.aimY - S.py;
  const ang = Math.atan2(ady, adx);
  S.face = Math.cos(ang) >= 0 ? 1 : -1;
  player.classList.toggle("flip", S.face < 0);
  const flipV = Math.abs(ang) > Math.PI / 2 ? " scaleY(-1)" : "";
  gun.style.transform = `rotate(${ang}rad)${flipV}`;
  gun.style.left = "10px";

  // 相机跟随
  const viewH = innerHeight;
  const targetCam = Math.max(-SKY, Math.min(S.worldH - viewH, S.py - viewH * 0.5));
  S.camY += (targetCam - S.camY) * 0.12;
  world.style.transform = `translateY(${-S.camY}px)`;

  const w = WEAPONS[S.weapon - 1];
  // 触屏开火键按住连发一切武器（旧 setInterval 行为）；桌面半自动仍单发
  if (S.firing && w.kind !== "beam") shoot();

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
    if (p.life <= 0 || p.y > S.camY + innerHeight + 400) S.parts.splice(i, 1);   // 落出相机下方的粒子提前回收
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
  drawBegin();
  ctx.save();
  if (S.shake > 0.5) ctx.translate((Math.random() - 0.5) * S.shake, (Math.random() - 0.5) * S.shake);
  // 画布固定在 #stage 视口上：世界坐标 = 屏幕坐标 + camY
  ctx.translate(0, -S.camY);

  const cullY0 = S.camY - 40, cullY1 = S.camY + S.vh + 40;
  const cullX0 = -40, cullX1 = S.vw + 40;

  // 弹坑（只有被炸掉的字/图区域）——只画可见行区间
  for (const h of holes) {
    if (h.y + h.h < cullY0 || h.y > cullY1) continue;
    ctx.fillStyle = h.color;
    ctx.fillRect(h.x, h.y, h.w, h.h);
  }

  // 光束
  for (const b of S.beams) {
    const a = Math.max(0, b.life / 0.12);
    ctx.globalAlpha = a;
    ctx.strokeStyle = b.color; ctx.lineWidth = b.width;
    ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
    ctx.globalAlpha = a * 0.4; ctx.lineWidth = b.width * 2.6;
    ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // 粒子（字符 / 图片块 / 方块）：只画视口内的；字符粒子按字号分组复用 ctx.font
  let curFont = "";
  for (const p of S.parts) {
    if (p.y + (p.size || 12) < cullY0 || p.y - (p.size || 12) > cullY1 || p.x < cullX0 || p.x > cullX1) continue;
    const a = Math.max(0, Math.min(1, p.life / (p.max || 1)));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(p.x, p.y);
    if (p.rot) ctx.rotate(p.rot);
    if (p.type === "char") {
      if (p.font !== curFont) { ctx.font = curFont = p.font; }   // 同字号粒子复用，不再每粒子设置
      ctx.fillStyle = p.color;
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

  // 飘字（字体常量已在顶部取一次，不再每帧 getComputedStyle）
  ctx.font = POPS_FONT;
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
  drawEnd();
}

// ---------- 输入 ----------
addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(k)) e.preventDefault();
  S.keys[k] = true;
  if (!S.started || S.over) return;
  if (k === " " && !e.repeat && S.onGround) { S.vy = -9; S.onGround = false; sfx("hit"); }
  if ((k === "s" || k === "arrowdown" || e.code === "Numpad2") && !e.repeat) descendOneLayer();
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
addEventListener("blur", () => { for (const k in S.keys) delete S.keys[k]; S.firing = false; });   // 失焦清键，防卡键
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
let rszT = 0;
addEventListener("resize", () => {
  clearTimeout(rszT);
  rszT = setTimeout(() => {
    sizeFx();
    const d = doc();
    if (S.started) return;   // 对局中只重设画布尺寸，不重建瓦片（避免清空玩家破坏进度）
    if (d && d.body && d.readyState === "complete") { S.docH = Math.max(600, d.documentElement.scrollHeight); target.style.height = S.docH + "px"; S.worldH = S.docH + GROUND_H; world.style.height = S.worldH + "px"; floorEl.style.top = (S.docH + 40) + "px"; buildTiles(); }
  }, 300);   // 防抖；尺寸变了按新宽度重建瓦片
});
sizeFx();

// ---------- 触屏：虚拟摇杆（左下，全向）+ 大开火键（右下，按住连发） ----------
// 只在触屏启用：Pointer Events + setPointerCapture，多指各自跟踪，摇杆与开火键可同时按。
// 触控容器 touch-action:none + 全局 touchmove preventDefault（iOS 橡皮筋）。
// ---------- 浮动双摇杆（virtualjoystick.js 风格）：左半屏移动，右半屏瞄准+自动开火 ----------
const JOY_R = 56, JOY_DEAD = 0.14;
function makeJoy(cls) {
  const base = document.createElement("div");
  base.className = "joyBase " + cls;
  const knob = document.createElement("div");
  knob.className = "joyKnob " + cls;
  wrap.appendChild(base); wrap.appendChild(knob);
  const st = { id: -1, bx: 0, by: 0, x: 0, y: 0, base, knob };
  st.show = (x, y) => {
    st.bx = x; st.by = y;
    base.classList.add("on"); knob.classList.add("on");
    base.style.left = x + "px"; base.style.top = y + "px";
    knob.style.left = x + "px"; knob.style.top = y + "px";
  };
  st.move = (x, y) => {
    let dx = x - st.bx, dy = y - st.by;
    const d = Math.hypot(dx, dy) || 1;
    const cl = Math.min(d, JOY_R);
    const nx = dx / d, ny = dy / d;
    const mag = Math.min(1, cl / JOY_R);
    const m2 = mag < JOY_DEAD ? 0 : (mag - JOY_DEAD) / (1 - JOY_DEAD);
    st.x = nx * m2; st.y = ny * m2;
    knob.style.left = (st.bx + nx * cl) + "px";
    knob.style.top = (st.by + ny * cl) + "px";
  };
  st.hide = () => { st.id = -1; st.x = 0; st.y = 0; base.classList.remove("on"); knob.classList.remove("on"); };
  return st;
}
let touchInited = false;
function setupTouch() {
  if (!("PointerEvent" in window) || touchInited) return;
  touchInited = true;
  document.documentElement.classList.add("has-touch");
  document.addEventListener("touchmove", (e) => { e.preventDefault(); }, { passive: false });
  S.joyMove = makeJoy("joyL");
  S.joyAim = makeJoy("joyR");
  const release = (pid) => {
    if (S.joyMove && S.joyMove.id === pid) { S.joyMove.hide(); }
    if (S.joyAim && S.joyAim.id === pid) { S.joyAim.hide(); S.firing = false; }
  };
  stage.addEventListener("pointerdown", (e) => {
    if (!S.started || S.over) return;
    if (e.pointerType === "mouse") return;                    // 桌面走键鼠
    if (e.target.closest("#hud, button, input, a")) return;
    if (e.clientX < innerWidth / 2) {                        // 左半屏：移动摇杆
      if (S.joyMove.id !== -1) return;
      S.joyMove.id = e.pointerId;
      S.joyMove.show(e.clientX, e.clientY);
      S.joyMove.move(e.clientX, e.clientY);
    } else {                                                 // 右半屏：瞄准+开火
      if (S.joyAim.id !== -1) return;
      S.joyAim.id = e.pointerId;
      S.joyAim.show(e.clientX, e.clientY);
      S.joyAim.move(e.clientX, e.clientY);
      S.firing = true;
    }
    e.preventDefault();
  }, { passive: false });
  addEventListener("pointermove", (e) => {
    if (S.joyMove && e.pointerId === S.joyMove.id) S.joyMove.move(e.clientX, e.clientY);
    if (S.joyAim && e.pointerId === S.joyAim.id) S.joyAim.move(e.clientX, e.clientY);
  }, { passive: false });
  const up = (e) => {
    if (S.joyMove && e.pointerId === S.joyMove.id) S.joyMove.hide();
    if (S.joyAim && e.pointerId === S.joyAim.id) { S.joyAim.hide(); S.firing = false; }
  };
  addEventListener("pointerup", up);
  addEventListener("pointercancel", up);
}
if (isCoarse) setupTouch();
window.__setupTouch = setupTouch;

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

// 任意网页：intro 里的输入框 + 按钮
$("urlBtn").addEventListener("click", () => {
  let u = $("urlInput").value.trim();
  if (!u) return;
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  location.href = location.pathname + "?url=" + encodeURIComponent(u);
});
$("urlInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); $("urlBtn").click(); }
});

// 武器栏 + 状态钩子
buildWeaponBar();
setWeapon(1);
requestAnimationFrame(loop);
window.__S = S;
window.__hitTile = tileAt;
})();
