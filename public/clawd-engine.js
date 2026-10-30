/*!
 * Clawd on Web v2.1 —— 网页桌宠引擎（Clawd 螃蟹像素版）
 * 零依赖，单文件。灵感来自 clawd-on-desk 项目；
 * 模型按 marciogranzotto/clawd-tank（MIT）官方 SVG 规格程序化重绘：
 * 15×16 逻辑网格、单色 #DE886D、黑色竖条眼、无描边无渐变。
 *
 * 快速上手：在页面中引入 clawd.js 即可（自动挂载到整页）；
 * 手动挂载：ClawdPet.mount({ container: el })；静音：ClawdPet.mount({ sound: false })。
 * Agent 状态：ClawdPet.setStatus('thinking'|'typing'|'building'|'juggling'|'alert'|'sleep', detail)
 *             ClawdPet.clearStatus()
 * 同源其他标签页：BroadcastChannel('clawd-on-web') 发送 {type:'status',state,detail} 或 {type:'clear'}
 */
(function () {
'use strict';
if (window.__CLAWD_PET__) return;
window.__CLAWD_PET__ = true;

/* ============ 小工具 ============ */
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[(Math.random() * a.length) | 0];

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};

const REDUCED = (function () {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
})();

/* ============ 壳色（官方为单色扁平风，每肤一个主色） ============ */
const SKINS = {
  crail:   { name: '经典珊瑚', body: '#DE886D' },
  sunset:  { name: '落霞红',   body: '#E0654F' },
  seafoam: { name: '海盐薄荷', body: '#5FAE96' },
  bubble:  { name: '泡泡糖',   body: '#E07FA8' },
  midnight:{ name: '深海蓝紫', body: '#6B79C4' }
};
const SKIN_KEYS = Object.keys(SKINS);
const EYE = '#000000';

/* ============ 台词 ============ */
const LINES = {
  greet: ['钳会！我是Clawd～', '横着走来见你啦', '咔嚓～今天也要加油鸭', '这里就是我的礁石了吗？'],
  greetAm: ['早上好咔！', '早呀！钳力满满的一天'],
  greetNoon: ['中午好～干饭时间到！'],
  greetEve: ['晚上好咔～', '晚上好，一天辛苦啦'],
  greetNight: ['夜深了咔…要早点睡哦', '还没睡吗？我横着陪你'],
  idle: ['咔嚓咔嚓…', '横着走～横着走～', '我的钳子锋利吗？', '咕噜咕噜…（吐泡泡）', '盯——', '（发呆中）', '今天的海面不错'],
  pet: ['壳壳被摸亮了！', '咔嚓咔嚓（开心挥钳）', '再摸摸嘛…', '钳…钳会！', '别捏我…好吧再摸一下'],
  pet10: ['你已经是我的钳信好友了！', '开始想你了咔～'],
  pet30: ['为你横跨整片大海！'],
  drag: ['钳下留情！', '哇！！腿都软了', '放我横着下来！', '耶！横着飞！'],
  thrown: ['横着飞——！', '钳——！！', '壳壳不保——'],
  dizzy: ['壳壳晕了…', '眼睛还在转圈圈…', '下次轻一点咔…'],
  eat: ['咔嚓！咔嚓！', '饼干碎碎是最好的！', '钳子拿饼干有点难…'],
  afterEat: ['再来一块？', '饱啦～'],
  hungry: ['肚子瘪壳了…', '想咔嚓点什么…', '有吃的吗咔？'],
  sleep: ['蟹壳补觉中…', 'Zzz…', '呼…呼…'],
  wake: ['醒啦！钳力满满！', '咔？我睡着了？'],
  play: ['毛线球？我钳子痒！', '接钳！', '看我的钳上功夫！'],
  kick: ['钳中！', '哈！', '命中咔！'],
  walk: ['横着散步～', '巡逻蟹出动', '沙沙沙（小碎步）'],
  run: ['钳来钳来！', '横冲直撞！'],
  stretch: ['把钳子抻开～', '嗯啊——壳壳舒展'],
  skin: ['换新壳啦！', '这个壳色不错！', '蜕壳成功！'],
  typing: ['哒哒哒…写代码', '在敲了在敲了', '这行bug真难缠…'],
  thinking: ['唔…让我想想', '钳子挠挠头…', '正在想一个绝妙主意'],
  building: ['搭起来！', '咔嚓咔嚓（施工中）', '一小块一小块来'],
  juggling: ['杂技蟹登场！', '子代理太多啦！', '稳住…稳住…'],
  alert: ['需要你的批准！', '有人想动我的壳！'],
  dirty: ['好臭咔…快打扫！', '身边有点乱…', '打扫一下嘛…'],
  sick: ['病了…壳壳好烫…', '呜…想吃药药…', '💊…救救咔…'],
  meds: ['咕嘟咕嘟…好了！', '药药有效！钳力恢复！'],
  medsHealthy: ['我很健康咔！不用药'],
  clean: ['洗刷刷～干净了！', '臭味消失咔！'],
  refuse: ['吃不下了咔…', '肚子圆滚滚的…'],
  refusePlay: ['累瘫了…先睡会儿…', '钳子抬不起来…'],
  evolve: ['我长大啦！钳更粗了！', '蜕壳成功！', '又长大了一点咔！'],
  hatch: ['破壳啦！我是Clawd崽崽！'],
  reborn: ['新的蛋来啦！这次要好好照顾我咔！'],
  bored: ['好无聊咔…摸摸我', '陪陪我嘛…', '汇报一下：心情不太行']
};

  /* ============ 动作库 v1：单击随机触发，每个动作独立编舞 ============ */
  /* 编舞函数 f(t, k, c)：t=绝对秒, k=进度0..1, c=通道集合
     通道：c.r 身体附加旋转 | c.dx/c.dy 位移 | c.sq 附加压扁 | c.spinV 旋转速度
     c.clL/c.clR [角度,开合] | c.face 表情 | c.mouth 嘴型 | c.prop 像素道具
     c.emit [类型,速率,偏移] 粒子发射器 | c.look [x,y] 视线 | c.leg 跑动 */
  const T = (id, name, dur, lines, snd, f, extra) => Object.assign({ id, name, dur, lines, snd, f }, extra);
  const TRICKS = [
    /* —— 运动系 —— */
    T('backflip', '后空翻', 1.4, ['看我的后空翻！', '空翻两周半——差半圈咔！'], 'boing', (t, k, c) => { c.spinV = -7.5; c.dy = -Math.sin(k * Math.PI) * 26; c.sq = k < 0.12 ? -0.12 : 0; c.clL = [-1.2, 0.5]; c.clR = [-1.2, 0.5]; }),
    T('cartwheel', '侧手翻', 1.8, ['侧手翻——横着也要翻！', '蟹式体操第一式'], 'boing', (t, k, c) => { c.r = Math.sin(k * Math.PI * 2) * 0.9; c.dx = Math.sin(k * Math.PI) * 30; c.clL = [-1, 0.6]; c.clR = [-1, 0.6]; }),
    T('slamdunk', '扣篮', 1.6, ['扣篮——筐呢？', '先把篮筐长出来！'], 'clack', (t, k, c) => { c.dy = -Math.abs(Math.sin(k * Math.PI * 1.5)) * 30; c.clR = [-2.2 - Math.sin(k * Math.PI * 3) * 0.4, 0.8]; c.clL = [0.4, 0.2]; c.face = 'wide'; }),
    T('squat', '深蹲', 2.2, ['深蹲第三组！', '钳……腿在抖…'], 'pop', (t, k, c) => { c.sq = -Math.abs(Math.sin(k * Math.PI * 4)) * 0.22; c.clL = [-0.6, 0.3]; c.clR = [-0.6, 0.3]; }),
    T('pushup', '俯卧撑', 2.2, ['俯卧撑撑的是钳子', '第五个……第六个…'], 'clicky', (t, k, c) => { c.sq = -Math.abs(Math.sin(k * Math.PI * 5)) * 0.25; c.dy = Math.abs(Math.sin(k * Math.PI * 5)) * 8; c.leg = true; }),
    T('situp', '仰卧起坐', 2.2, ['仰卧起坐！起来…起不来…', '腹肌（的壳）在燃烧'], 'pop', (t, k, c) => { c.sq = -Math.abs(Math.sin(k * Math.PI * 4)) * 0.2; c.r = Math.sin(k * Math.PI * 4) * 0.2; }),
    T('highknees', '高抬腿', 2.0, ['高抬腿！一二一！', '腿要抬到钳子那么高！'], 'clicky', (t, k, c) => { c.leg = true; c.sq = -Math.abs(Math.sin(k * Math.PI * 8)) * 0.1; c.hopV = 3; }),
    T('jumpjack', '开合跳', 2.0, ['开合跳——钳子开合跳！', '一！二！咔！咔！'], 'boing', (t, k, c) => { const o = Math.abs(Math.sin(k * Math.PI * 4)); c.clL = [-1.4 * o - 0.2, o]; c.clR = [-1.4 * o - 0.2, o]; c.sq = -o * 0.08; }),
    T('lunge', '弓步压腿', 2.2, ['压腿压腿～', '柔韧性是蟹的美德'], 'pop', (t, k, c) => { c.r = Math.sin(k * Math.PI * 2) * 0.18; c.dx = Math.sin(k * Math.PI * 2) * 12; }),
    T('shadowbox', '影子拳', 2.0, ['看拳！左勾拳右勾拳！', '咔嚓拳法第一代传人'], 'clack', (t, k, c) => { const p = Math.sin(k * Math.PI * 6); c.clR = [-0.8 + p * 0.5, 0.7]; c.clL = [-0.8 - p * 0.5, 0.7]; c.dx = p * 8; c.shake = 1; }),
    T('burpee', '波比跳', 2.4, ['波比跳——蟹生巅峰', '这动作是给两条腿设计的吧'], 'boing', (t, k, c) => { c.sq = -Math.abs(Math.sin(k * Math.PI * 3)) * 0.22; c.dy = -Math.abs(Math.sin(k * Math.PI * 3 + 1)) * 22; c.spinV = Math.sin(k * Math.PI * 3) * 3; }),
    T('sprint', '冲刺跑', 1.8, ['冲！刺！', '横着冲刺也是冲刺！'], 'clicky', (t, k, c) => { c.leg = true; c.dx = Math.sin(k * Math.PI) * 70; c.r = 0.1; c.emit = ['dust', 6]; }),
    T('longjump', '立定跳远', 1.6, ['立定跳远——量量多远', '落地扬尘才够帅'], 'boing', (t, k, c) => { c.dy = -Math.sin(k * Math.PI) * 24; c.dx = Math.sin(k * Math.PI) * 46; c.sq = k > 0.85 ? -0.18 : 0; c.emit = k > 0.85 ? ['dust', 10] : null; }),
    T('handstand', '倒立', 2.2, ['倒立！血液全冲钳子了', '用钳子走路…失败'], 'boing', (t, k, c) => { c.r = k < 0.85 ? -Math.sin(Math.min(1, k * 1.2) * Math.PI) * 2.6 : 0; c.clL = [-1.6, 0.2]; c.clR = [-1.6, 0.2]; c.face = 'wide'; }),
    T('tugofwar', '拔河', 2.2, ['拔河！一…二…拉！', '对面是谁？是命运咔'], 'clack', (t, k, c) => { c.r = -0.2; c.dx = Math.sin(k * Math.PI * 5) * 10 - 6; c.clL = [0.6, 0.1]; c.clR = [0.6, 0.1]; c.leg = true; }),
    T('hulahoop', '呼啦圈', 2.4, ['呼啦圈转起来～', '腰……壳有腰吗'], 'pop', (t, k, c) => { c.r = Math.sin(k * Math.PI * 10) * 0.25; c.prop = 'hoop'; }),
    T('vault', '跳马', 1.6, ['跳马——马呢？', '蟹也能跳马！'], 'boing', (t, k, c) => { c.dy = -Math.sin(Math.min(1, k * 1.3) * Math.PI) * 32; c.spinV = 4 * Math.sin(k * Math.PI); c.sq = k < 0.15 ? -0.15 : 0; }),
    /* —— 表演系 —— */
    T('sing', '高歌一曲', 2.8, ['♪ 不敢高声语～ ♪', '唱给海听'], 'chirp', (t, k, c) => { c.mouth = 'open'; c.clL = [-0.9, 0.4]; c.r = Math.sin(k * Math.PI * 4) * 0.08; c.emit = ['note', 4]; c.face = 'happy'; }, { hold: '🎤' }),
    T('disco', '迪斯科', 2.6, ['迪斯科——闪亮登场！', '蟹步舞曲！'], 'chirp', (t, k, c) => { c.r = Math.sin(k * Math.PI * 6) * 0.22; c.dx = Math.sin(k * Math.PI * 3) * 14; c.clL = [-0.8 + Math.sin(k * Math.PI * 12) * 0.6, 0.6]; c.clR = [-0.8 - Math.sin(k * Math.PI * 12) * 0.6, 0.6]; c.emit = ['note', 3]; c.face = 'happy'; }, { hold: '🕺' }),
    T('ballet', '芭蕾', 2.8, ['天鹅湖…蟹壳湖', '脚尖绷直！'], 'chirp', (t, k, c) => { c.r = Math.sin(k * Math.PI) * 0.1; c.dy = -Math.sin(k * Math.PI * 2) * 8; c.clL = [-2.4, 0.1]; c.clR = [-0.4, 0.15]; c.prop = 'sparklehand'; }, { hold: '🩰' }),
    T('conductor', '指挥家', 2.6, ['交响乐，预备——起！', '跟着我的钳子走！'], 'chirp', (t, k, c) => { c.clR = [-1.8 + Math.sin(t * 8) * 0.5, 0.3]; c.clL = [-1.8 + Math.sin(t * 8 + 2) * 0.5, 0.3]; c.emit = ['note', 5]; c.face = 'happy'; }, { hold: '🎼' }),
    T('guitar', '弹吉他', 2.6, ['🎸 摇滚咔！', '这首献给大海'], 'clack', (t, k, c) => { c.prop = 'guitar'; c.clR = [-1.1 + Math.sin(t * 14) * 0.25, 0.4]; c.clL = [-0.9, 0.5]; c.r = Math.sin(k * Math.PI * 6) * 0.1; c.emit = ['note', 4]; c.face = 'happy'; }),
    T('drums', '架子鼓', 2.4, ['咚咚哒——咚咚哒！', '鼓手蟹上线'], 'clack', (t, k, c) => { c.prop = 'drum'; c.clL = [-1.2 + Math.sin(t * 16) * 0.5, 0.7]; c.clR = [-1.2 + Math.sin(t * 16 + 2) * 0.5, 0.7]; c.shake = 1.5; c.emit = ['note', 3]; }, { hold: '🥁' }),
    T('erhu', '拉二胡', 2.6, ['二胡一响，蟹泪两行', '《赛马》前奏，走起'], 'chirp', (t, k, c) => { c.prop = 'erhu'; c.clR = [-1.2, 0.3]; c.clL = [-1.0 + Math.sin(t * 10) * 0.3, 0.2]; c.mouth = 'flat'; c.emit = ['note', 2]; }),
    T('magicshow', '魔术表演', 2.6, ['见证奇迹的时刻！', '钳子里什么都没有——变！'], 'sparkle', (t, k, c) => { c.prop = 'hat'; c.clR = [-1.5, 0.4]; c.emit = k > 0.5 ? ['spark', 8] : null; c.face = k > 0.5 ? 'happy' : 'normal'; }, { hold: '🎩' }),
    T('fruitjuggle', '抛接水果', 2.4, ['苹果橘子柠檬——接住！', '杂技蟹的果盘'], 'pop', (t, k, c) => { c.clL = [-1.3 + Math.sin(t * 9) * 0.4, 0.5]; c.clR = [-1.3 + Math.cos(t * 9) * 0.4, 0.5]; c.emit = ['fruit', 2.4]; c.face = 'happy'; }),
    T('yoyo', '玩悠悠球', 2.2, ['悠悠球——睡眠技！', '遛狗…遛球…'], 'clicky', (t, k, c) => { c.prop = 'yoyo'; c.clR = [-0.9, 0.2]; c.r = Math.sin(k * Math.PI * 4) * 0.06; }),
    T('shadowplay', '皮影戏', 2.4, ['皮影戏——看我的影子！', '（摆出大侠姿势）'], 'pop', (t, k, c) => { c.r = Math.sin(k * Math.PI * 3) * 0.2; c.clL = [-1.5 + Math.sin(t * 6) * 0.4, 0.3]; c.clR = [-0.5, 0.4]; }),
    T('beatbox', '节奏口技', 2.2, [' bz t ka 咔嚓噗！', '口技蟹， beat 起来'], 'clicky', (t, k, c) => { c.mouth = 'open'; c.shake = 1.2; c.clR = [-0.9 + Math.sin(t * 18) * 0.2, 0.3]; c.emit = ['bit', 3]; }, { hold: '🎙️' }),
    T('opera', '唱大戏', 2.6, ['哇呀呀呀——', '水袖…没有袖，用胡须！'], 'chirp', (t, k, c) => { c.mouth = 'open'; c.clL = [-1.6 - Math.sin(t * 7) * 0.3, 0.2]; c.clR = [-1.6 + Math.sin(t * 7) * 0.3, 0.2]; c.r = Math.sin(k * Math.PI * 4) * 0.12; c.emit = ['note', 3]; }, { hold: '🎭' }),
    T('skateboard', '玩滑板', 2.2, ['滑板蟹，接招！', 'Ollie——翻板失败'], 'boing', (t, k, c) => { c.prop = 'skate'; c.leg = true; c.dx = Math.sin(k * Math.PI) * 55; c.r = Math.sin(k * Math.PI * 2) * 0.08; c.face = 'wide'; }),
    /* —— 生活系 —— */
    T('shower', '冲淋浴', 2.4, ['哗啦啦——洗澡澡', '水温刚好咔'], 'pop', (t, k, c) => { c.prop = 'shower'; c.emit = ['drop', 14]; c.happiness = 0; c.face = 'happy'; c.mouth = 'smile'; }),
    T('brush', '刷牙', 2.2, ['刷刷刷——牙齿健康', '蟹也要刷牙咔'], 'clicky', (t, k, c) => { c.prop = 'brush'; c.mouth = 'open'; c.clR = [-1.2, 0.3]; c.r = Math.sin(t * 12) * 0.05; }, { hold: '🪥' }),
    T('watermelon', '啃西瓜', 2.4, ['咔嚓——甜的！', '夏天就要啃西瓜'], 'munch', (t, k, c) => { c.prop = 'melon'; c.mouth = 'eat'; c.clR = [-1.1, 0.4]; c.emit = ['crumb', 3]; c.face = 'happy'; }),
    T('boba', '喝奶茶', 2.4, ['吸——珍珠卡住了', '三分糖去冰咔'], 'pop', (t, k, c) => { c.prop = 'boba'; c.mouth = 'o'; c.clR = [-1.2, 0.3]; c.sq = Math.sin(t * 3) * 0.02; }),
    T('coffee', '喝咖啡', 2.2, ['苦…但是醒脑', '蟹的咖啡因代谢很快咔'], 'pop', (t, k, c) => { c.prop = 'coffee'; c.mouth = 'o'; c.emit = ['steam', 3]; }),
    T('read', '看书', 2.8, ['哗啦——这页有意思', '书中自有小鱼干'], 'pop', (t, k, c) => { c.prop = 'book'; c.look = [0.4, 0.3]; c.mouth = 'flat'; c.clR = [-1.0, 0.2]; }, { hold: '📖' }),
    T('gameboy', '打掌机', 2.6, ['差一点点！再来一次', '通关就在下一把'], 'clicky', (t, k, c) => { c.prop = 'console'; c.look = [0.3, -0.4]; c.mouth = 'o'; c.clL = [-1.0, 0.3]; c.clR = [-1.0, 0.3]; c.emit = ['bit', 3]; c.face = 'wide'; }),
    T('fishing', '钓鱼', 3.0, ['愿者上钩咔…', '（钓了三小时，一条没有）'], 'pop', (t, k, c) => { c.prop = 'rod'; c.mouth = 'flat'; c.look = [0.6, 0.5]; c.emit = k > 0.4 ? ['ripple', 1.2] : null; }),
    T('garden', '种花', 2.6, ['埋下种子，开出钳子花', '园丁蟹上岗'], 'sparkle', (t, k, c) => { c.prop = 'sprout'; c.sq = -Math.abs(Math.sin(k * Math.PI * 2)) * 0.1; c.emit = k > 0.6 ? ['spark', 3] : null; c.face = 'happy'; }),
    T('paint', '画油画', 2.6, ['这幅叫《蟹壳的沉思》', '签名签在壳上'], 'pop', (t, k, c) => { c.prop = 'easel'; c.clR = [-1.3 + Math.sin(t * 6) * 0.3, 0.3]; c.look = [0.5, -0.2]; c.emit = ['paint', 2]; }),
    T('photo', '拍立得', 2.2, ['咔嚓——说茄子！', '照片洗出来了：全是壳'], 'pop', (t, k, c) => { c.prop = 'camera'; c.face = k > 0.6 ? 'wide' : 'normal'; c.emit = k > 0.6 ? ['flash', 2] : null; c.clR = [-1.3, 0.2]; }),
    T('kite', '放风筝', 2.8, ['风筝飞得比钳子高！', '线断了……风筝自由了'], 'pop', (t, k, c) => { c.prop = 'kite'; c.look = [-0.3, -0.8]; c.emit = ['wind', 2]; c.leg = true; }),
    T('bubbles', '吹泡泡', 2.4, ['咕噜咕噜——泡泡！', '最大的那个别飞走咔'], 'pop', (t, k, c) => { c.mouth = 'o'; c.emit = ['bubble', 4]; c.face = 'happy'; }),
    T('cooking', '颠勺炒菜', 2.4, ['颠勺！火候到了！', '米其林三相蟹'], 'clack', (t, k, c) => { c.prop = 'wok'; c.shake = 2; c.clL = [-1.1, 0.5]; c.clR = [-1.1, 0.5]; c.emit = ['steam', 3]; c.mouth = 'open'; }),
    T('laundry', '搓衣服', 2.2, ['搓搓搓——泡泡飞', '家务蟹无怨言'], 'clicky', (t, k, c) => { c.prop = 'tub'; c.shake = 1.8; c.emit = ['bubble', 3]; }),
    T('telescope', '瞭望远方', 2.4, ['海平线上有……另一只蟹？', '望远镜里全是星星'], 'pop', (t, k, c) => { c.prop = 'scope'; c.look = [0.8, -0.3]; c.mouth = 'o'; }, { hold: '🔭' }),
    T('butterfly', '追蝴蝶', 2.2, ['蝴蝶等等我！', '横着追蝴蝶是我的浪漫'], 'pop', (t, k, c) => { c.leg = true; c.dx = Math.sin(k * Math.PI * 3) * 35; c.clR = [-1.3 + Math.sin(t * 10) * 0.4, 0.5]; c.face = 'happy'; c.emit = ['butterfly', 1]; }),
    T('ants', '观察蚂蚁', 2.4, ['嘘——蚂蚁在搬家', '第三只蚂蚁驮着饼干屑'], 'pop', (t, k, c) => { c.sq = -0.15; c.look = [0.2, 0.9]; c.mouth = 'flat'; c.emit = ['ant', 1.5]; }),
    T('raindance', '淋雨跳舞', 2.4, ['下雨也要跳舞咔！', '雨点打在壳上哒哒响'], 'pop', (t, k, c) => { c.emit = ['drop', 12]; c.r = Math.sin(k * Math.PI * 5) * 0.15; c.clL = [-1.2, 0.5]; c.clR = [-1.2, 0.5]; c.face = 'happy'; }),
    T('sunbathe', '晒太阳', 2.8, ['阳光晒在壳上……舒服', '晒出古铜色钳子'], 'pop', (t, k, c) => { c.prop = 'suntan'; c.face = 'sleep'; c.mouth = 'smile'; c.sq = Math.sin(t * 1.5) * 0.02; c.emit = ['sun', 1.5]; }),
    T('treasure', '挖宝藏', 2.4, ['挖挖挖——闪光！', '是谁的宝箱埋在这'], 'clack', (t, k, c) => { c.sq = -Math.abs(Math.sin(k * Math.PI * 3)) * 0.15; c.emit = k > 0.4 ? ['dust', 4] : null; c.emit2 = k > 0.7 ? ['spark', 4] : null; c.clR = [0.6 - Math.sin(k * Math.PI * 3) * 0.5, 0.6]; }),
    T('sandwich', '叠三明治', 2.4, ['面包·蟹肉·面包·完', '蟹肉三明治……等等，蟹肉？！'], 'munch', (t, k, c) => { c.prop = 'sandwich'; c.mouth = 'eat'; c.clL = [-1.1, 0.4]; c.emit = ['crumb', 2]; }),
    T('spa', '泡温泉', 2.8, ['咕嘟咕嘟……暖和', '温泉蛋就是我'], 'pop', (t, k, c) => { c.prop = 'spa'; c.dy = Math.sin(t * 2) * 3; c.face = 'sleep'; c.mouth = 'smile'; c.emit = ['steam', 3]; }),
    /* —— 情绪社交 —— */
    T('fakecry', '假哭', 2.2, ['呜呜呜……骗你的咔', '假哭要掉真眼泪才敬业'], 'pop', (t, k, c) => { c.face = 'sad'; c.mouth = 'sad'; c.emit = ['tear', 2.5]; c.r = Math.sin(t * 10) * 0.06; }),
    T('laugh', '捧腹大笑', 2.2, ['哈哈哈哈咔！', '笑到壳裂——开玩笑的'], 'chirp', (t, k, c) => { c.face = 'happy'; c.mouth = 'open'; c.r = Math.sin(t * 12) * 0.12; c.sq = -Math.abs(Math.sin(t * 12)) * 0.06; c.emit = ['note', 2]; }),
    T('smug', '墨镜耍帅', 2.2, ['帅，是有代价的', '（墨镜是画上去的）'], 'pop', (t, k, c) => { c.prop = 'shades'; c.r = 0.1; c.mouth = 'flat'; c.clR = [-0.6, 0.1]; }, { hold: '😎' }),
    T('shy', '蒙眼害羞', 2.2, ['不、不看你看我了咔', '（钳子挡脸）'], 'pop', (t, k, c) => { c.prop = 'blush'; c.clL = [-1.3, 0.3]; c.clR = [-1.3, 0.3]; c.r = Math.sin(t * 6) * 0.06; }, { hold: '🙈' }),
    T('wink', '眨眼放电', 1.8, ['哔——被电到了吧', '左眼放电，右眼备用'], 'sparkle', (t, k, c) => { c.face = 'wink'; c.emit = ['spark', 2]; c.r = 0.06; c.mouth = 'smile'; }),
    T('cheer', '加油打气', 2.0, ['加油！你可以的咔！', '钳子为你挥舞！'], 'boing', (t, k, c) => { c.prop = 'flag'; c.clR = [-1.6 + Math.sin(t * 10) * 0.4, 0.6]; c.hopV = 2; c.face = 'happy'; }),
    T('bow', '深深鞠躬', 2.0, ['感谢观看——鞠躬！', '蟹式礼仪，失敬失敬'], 'pop', (t, k, c) => { c.r = Math.sin(Math.min(1, k * 1.4) * Math.PI) * 0.5; c.clL = [-0.2, 0.1]; c.clR = [-0.2, 0.1]; c.mouth = 'flat'; }),
    T('pray', '合十祈福', 2.4, ['愿海面平静，愿壳壳健康', '（诚心诚意）'], 'pop', (t, k, c) => { c.prop = 'pray'; c.mouth = 'flat'; c.face = 'sleep'; c.emit = ['spark', 1.2]; }, { hold: '🙏' }),
    T('claphands', '热烈鼓掌', 2.0, ['啪啪啪——掌声送给造梗的人', '钳掌声，很响的'], 'clack', (t, k, c) => { const o = Math.abs(Math.sin(t * 14)); c.clL = [-1.1, o]; c.clR = [-1.1, o]; c.face = 'happy'; }),
    T('blowkiss', '飞吻', 1.8, ['么么——接住咔！', '飞吻发射！'], 'pop', (t, k, c) => { c.face = 'heart'; c.clR = [-1.5, 0.4]; c.emit = ['heart', 3]; c.r = 0.08; }),
    T('headbang', '甩头', 2.0, ['甩！甩！甩！', '脖子……有吗？甩就完了'], 'clack', (t, k, c) => { c.r = Math.sin(t * 14) * 0.28; c.shake = 1.5; c.face = 'wide'; c.emit = ['note', 3]; }),
    /* —— 科技系 —— */
    T('phonecall', '打电话', 2.4, ['喂？是我，Clawd', '信号在海里不太好咔'], 'clicky', (t, k, c) => { c.prop = 'phone'; c.mouth = 'open'; c.look = [0.5, 0]; c.mouth = 'open'; }),
    T('droneplay', '玩无人机', 2.4, ['无人机——起飞！', '比它飞得高的只有我扔的它'], 'clicky', (t, k, c) => { c.prop = 'drone'; c.look = [-0.2, -0.9]; c.clR = [-1.4, 0.3]; c.emit = ['bit', 1.5]; }),
    T('robotdance', '机器人舞', 2.4, ['哔——咔——哔——咔', '机械蟹，出厂设置'], 'clicky', (t, k, c) => { const st = Math.floor(t * 5) % 2; c.clL = st ? [-1.5, 0.4] : [-0.4, 0.1]; c.clR = st ? [-0.4, 0.1] : [-1.5, 0.4]; c.r = st ? 0.12 : -0.12; c.dx = st ? 6 : -6; c.emit = ['bit', 2]; }),
    T('vrplay', '玩VR', 2.4, ['虚拟世界……撞墙了', 'VR里我是八爪蟹'], 'clicky', (t, k, c) => { c.prop = 'vr'; c.face = 'wide'; c.r = Math.sin(t * 6) * 0.15; c.dx = Math.sin(t * 5) * 8; c.clL = [-1.2, 0.5]; c.clR = [-1.2, 0.5]; }),
    T('selfie', '自拍', 2.0, ['3、2、1——茄子！', '（这张下巴太方，重拍）'], 'pop', (t, k, c) => { c.prop = 'selfie'; c.face = 'happy'; c.clR = [-1.6, 0.3]; c.emit = k > 0.5 ? ['flash', 2] : null; c.r = -0.08; }),
    T('scanqr', '扫码舞', 2.2, ['扫我——是真蟹担保', '（这个码不能扫）'], 'clicky', (t, k, c) => { c.prop = 'qr'; c.emit = ['bit', 4]; c.r = Math.sin(k * Math.PI * 4) * 0.1; }),
    T('airguitar', '空气吉他', 2.2, ['（弹的是空气，燃的是心）', 'Solo——!!'], 'clack', (t, k, c) => { c.clL = [-1.3, 0.2]; c.clR = [-0.8 + Math.sin(t * 15) * 0.5, 0.6]; c.r = Math.sin(k * Math.PI * 6) * 0.12; c.emit = ['note', 4]; c.face = 'happy'; }),
    /* —— 自然季节 —— */
    T('snowman', '堆雪人', 2.6, ['雪蟹……雪做蟹？', '给它也安上黑豆眼'], 'pop', (t, k, c) => { c.prop = 'snowman'; c.sq = -Math.abs(Math.sin(k * Math.PI * 2)) * 0.12; c.emit = ['dust', 3]; c.face = 'happy'; }),
    T('fireworks', '放烟花', 2.6, ['砰——啪——开花！', '烟花是为蟹开的'], 'sparkle', (t, k, c) => { c.clR = [-1.5, 0.4]; c.look = [-0.2, -0.9]; c.emit = ['firework', 2]; c.face = 'wide'; }),
    T('mooncake', '吃月饼', 2.4, ['五仁……是考验', '月饼配海风，绝了'], 'munch', (t, k, c) => { c.prop = 'mooncake'; c.mouth = 'eat'; c.clR = [-1.1, 0.4]; c.emit = ['crumb', 2]; }, { hold: '🥮' }),
    T('zongzi', '包粽子', 2.4, ['粽叶一卷，糯米一塞', '咸粽党咔！'], 'munch', (t, k, c) => { c.prop = 'zongzi'; c.mouth = 'eat'; c.clL = [-1.0, 0.4]; c.clR = [-1.2, 0.4]; c.emit = ['leafbit', 2]; }),
    T('lantern', '提灯笼', 2.4, ['灯笼一亮，夜路不怕', '照亮你回家的路咔'], 'pop', (t, k, c) => { c.prop = 'lantern'; c.emit = ['glow', 2]; c.mouth = 'smile'; }, { hold: '🏮' }),
    T('umbrella', '撑伞听雨', 2.6, ['雨打伞面哒哒哒', '伞下是最安全的壳'], 'pop', (t, k, c) => { c.prop = 'umbrella'; c.emit = ['drop', 8]; c.mouth = 'flat'; }),
    T('leafchase', '追落叶', 2.2, ['叶子别跑！', '秋天的第一片落叶'], 'pop', (t, k, c) => { c.leg = true; c.dx = Math.sin(k * Math.PI * 3) * 30; c.clR = [-1.2 + Math.sin(t * 8) * 0.4, 0.4]; c.emit = ['leaf', 1.5]; c.face = 'happy'; }),
    T('flowerpin', '簪花', 2.2, ['簪一朵花，蟹生赢家', '泉州簪花，蟹也簪'], 'sparkle', (t, k, c) => { c.prop = 'flower'; c.face = 'happy'; c.clR = [-1.4, 0.3]; c.r = Math.sin(t * 4) * 0.05; }, { hold: '🌸' }),
    T('snowcatch', '接雪花', 2.4, ['雪花落在钳子上……化了', '每片都不一样咔'], 'pop', (t, k, c) => { c.clL = [-1.5, 0.3]; c.clR = [-1.5, 0.3]; c.look = [0, -0.8]; c.emit = ['snow', 5]; c.mouth = 'smile'; }),
    T('stargaze', '数星星', 2.6, ['一颗、两颗、三颗……一百颗！', '那颗最亮的是你'], 'pop', (t, k, c) => { c.prop = 'stargaze'; c.look = [0, -0.9]; c.emit = ['spark', 2.5]; c.mouth = 'smile'; }, { hold: '🌟' }),
    T('sunrise', '迎日出', 2.6, ['太阳出来了！', '新的一天，钳力全开'], 'pop', (t, k, c) => { c.prop = 'sunrise'; c.face = 'happy'; c.mouth = 'smile'; c.emit = ['sun', 2]; }),
    T('seawind', '吹海风', 2.4, ['海风咸咸的，舒服', '（胡须在飘）'], 'pop', (t, k, c) => { c.prop = 'wind'; c.mouth = 'smile'; c.r = Math.sin(t * 3) * 0.06; c.emit = ['wind', 2]; }),
    T('climbhill', '爬山', 2.4, ['爬山虎……蟹爬行', '山顶的风景值得咔'], 'boing', (t, k, c) => { c.leg = true; c.dx = Math.sin(k * Math.PI) * 26; c.dy = -Math.sin(k * Math.PI) * 14; c.clL = [-1.2, 0.4]; c.clR = [-1.2, 0.4]; }),
    /* —— Clawd 特色 —— */
    T('bubblebath', '泡泡浴', 2.6, ['泡泡堆成山咔！', '（泡泡里冒出一串咕噜）'], 'pop', (t, k, c) => { c.prop = 'tub'; c.emit = ['bubble', 6]; c.face = 'happy'; c.mouth = 'smile'; c.dy = Math.sin(t * 2) * 3; }),
    T('clawshine', '磨钳子', 2.2, ['磨刀不误砍柴工', '钳子要亮到反光咔'], 'snip', (t, k, c) => { const o = Math.abs(Math.sin(t * 10)); c.clL = [-0.8, o]; c.clR = [-0.8, 1 - o]; c.emit = ['spark', 3]; }),
    T('seashell', '听海螺', 2.4, ['里面有海的声音！', '……也有我自己的回声咔'], 'pop', (t, k, c) => { c.prop = 'shell'; c.look = [0.3, 0.2]; c.mouth = 'o'; c.emit = ['wave', 1]; }),
    T('seaweed', '跳海草舞', 2.2, ['海草海草海草～', '随波摇晃！'], 'chirp', (t, k, c) => { c.r = Math.sin(t * 9) * 0.3; c.dx = Math.sin(t * 4.5) * 16; c.clL = [-0.3, 0.3]; c.clR = [-0.3, 0.3]; c.face = 'happy'; }, { hold: '🌿' }),
    T('starfish', '捡海星', 2.2, ['海星：你也是星吗？', '我们是五角亲戚咔'], 'sparkle', (t, k, c) => { c.prop = 'starfish'; c.mouth = 'smile'; c.emit = ['spark', 2]; }, { hold: '⭐' }),
    T('pearl', '珍珠发光', 2.2, ['看！我的珍珠在发光', '孕育一颗珠要好久咔'], 'sparkle', (t, k, c) => { c.prop = 'pearl'; c.clR = [-1.3, 0.3]; c.look = [0.2, -0.2]; c.emit = ['glow', 2]; }, { hold: '💎' }),
    T('surf', '冲浪', 2.4, ['浪来了——起乘！', '挂了…再来！'], 'boing', (t, k, c) => { c.prop = 'surf'; c.r = Math.sin(k * Math.PI * 3) * 0.15; c.dx = Math.sin(k * Math.PI) * 40; c.clL = [-1.3, 0.4]; c.clR = [-0.6, 0.3]; c.face = 'wide'; }),
    T('snorkel', '浮潜', 2.6, ['水下世界……咕噜咕噜', '看到小丑鱼了咔！'], 'pop', (t, k, c) => { c.prop = 'snorkel'; c.emit = ['bubble', 4]; c.face = 'wide'; c.look = [0.4, 0.4]; }),
    T('sandcastle', '堆沙堡', 2.6, ['沙堡要有护城河', '潮水来了……不！'], 'pop', (t, k, c) => { c.prop = 'castle'; c.sq = -Math.abs(Math.sin(k * Math.PI * 3)) * 0.12; c.emit = ['dust', 3]; c.face = 'happy'; }),
    T('tideride', '乘潮汐', 2.4, ['潮起我起，潮落我落', '冲浪的祖先版'], 'pop', (t, k, c) => { c.dy = Math.sin(t * 3) * 6; c.r = Math.sin(t * 2.4) * 0.12; c.clL = [-1.2, 0.3]; c.clR = [-1.2, 0.3]; c.face = 'happy'; c.emit = ['wave', 2]; }),
    T('sunsetview', '看晚霞', 2.6, ['晚霞是天空的壳', '今天的夕阳真美咔'], 'pop', (t, k, c) => { c.prop = 'sunset'; c.look = [0.7, -0.1]; c.mouth = 'smile'; c.emit = ['sun', 1.5]; }, { hold: '🌅' }),
    T('meditate', '冥想', 2.8, ['心如止水……止水……', '（睡着了不算冥想失败）'], 'pop', (t, k, c) => { c.prop = 'zen'; c.face = 'sleep'; c.mouth = 'flat'; c.sq = Math.sin(t * 1.2) * 0.02; c.emit = ['zen', 1]; }, { hold: '🧘' }),
    T('moonwalk', '太空步', 2.2, ['太空步——横着滑走', '月球都要学我咔'], 'chirp', (t, k, c) => { c.dx = -Math.sin(k * Math.PI) * 40; c.r = -0.06; c.leg = true; }, { hold: '🌙' }),
    T('tea', '茶艺表演', 2.6, ['茶要慢慢倒，壳要慢慢品', '茶艺蟹，上茶！'], 'pop', (t, k, c) => { c.prop = 'teapot'; c.mouth = 'smile'; c.clR = [-1.2, 0.3]; c.emit = ['steam', 2.5]; }, { hold: '🍵' }),
    T('poem', '念诗', 2.8, ['不敢高声语，恐惊天上人', '（Ech0 的座右铭，念给你听）'], 'chirp', (t, k, c) => { c.prop = 'scroll'; c.mouth = 'flat'; c.clR = [-1.1, 0.2]; c.emit = ['note', 1.2]; c.look = [0.3, -0.3]; }, { hold: '📜' })
  ];


/* ============ 音效（WebAudio 合成，无外部资源） ============ */
const Sound = {
  ctx: null,
  ensure() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.ctx = null; }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  },
  tone(f0, f1, dur, type, gain, delay) {
    this.ensure();
    if (!this.ctx) return;
    try {
      const c = this.ctx, t0 = c.currentTime + (delay || 0);
      const o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(Math.max(f0, 1), t0);
      o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain || 0.05, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t0); o.stop(t0 + dur + 0.05);
    } catch (e) {}
  },
  noise(dur, gain, delay, freq) {
    this.ensure();
    if (!this.ctx) return;
    try {
      const c = this.ctx, t0 = c.currentTime + (delay || 0);
      const n = (c.sampleRate * dur) | 0;
      const b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      const s = c.createBufferSource(); s.buffer = b;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 2600; f.Q.value = 1.1;
      const g = c.createGain(); g.gain.value = gain || 0.04;
      s.connect(f); f.connect(g); g.connect(c.destination);
      s.start(t0);
    } catch (e) {}
  },
  pop() { this.tone(540, 920, 0.09, 'sine', 0.05); },
  boing(v) { v = clamp(v == null ? 0.5 : v, 0.15, 1); this.tone(120 + v * 170, 70, 0.16, 'triangle', 0.045 + v * 0.04); },
  purr() { this.tone(96, 80, 0.5, 'sawtooth', 0.02); this.tone(192, 160, 0.5, 'sine', 0.018); },
  chirp() { this.tone(700, 1150, 0.1, 'sine', 0.035); this.tone(1150, 800, 0.12, 'sine', 0.03, 0.09); },
  munch() { for (let i = 0; i < 3; i++) this.noise(0.05, 0.04, i * 0.15); },
  sparkle() { this.tone(1250, 1900, 0.12, 'sine', 0.028); this.tone(1650, 2500, 0.12, 'sine', 0.022, 0.07); },
  snip() { this.noise(0.03, 0.05, 0, 3800); this.tone(1500, 900, 0.05, 'square', 0.025, 0.02); },
  clicky() { this.tone(950, 700, 0.03, 'square', 0.02); },
  clack() { this.tone(320, 170, 0.06, 'square', 0.045); this.noise(0.03, 0.035, 0, 1800); },
  ding() { this.tone(880, 880, 0.28, 'sine', 0.055); this.tone(1318, 1318, 0.32, 'sine', 0.045, 0.13); }
};

/* ============ 样式 ============ */
const CSS = `
.cw-wrap{position:fixed;left:0;top:0;width:0;height:0;z-index:2147483000;pointer-events:none}
.cw-abs{position:absolute}
.cw-canvas{position:absolute;left:-130px;top:-360px;pointer-events:none}
.cw-fx{position:absolute;left:0;top:0;pointer-events:none}
.cw-fx-fixed{position:fixed;inset:0;pointer-events:none}
.cw-hit{position:absolute;left:-56px;top:-76px;width:112px;height:84px;pointer-events:auto;cursor:grab;touch-action:none;-webkit-user-select:none;user-select:none}
.cw-hit:active{cursor:grabbing}
.cw-bubble{position:absolute;left:0;bottom:84px;transform:translateX(-50%) scale(.6);transform-origin:50% 100%;background:#fff;color:#4a3b32;padding:7px 13px;border-radius:14px;font:13px/1.4 system-ui,-apple-system,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;white-space:nowrap;box-shadow:0 4px 14px rgba(60,40,20,.18),0 0 0 1px rgba(0,0,0,.04);opacity:0;pointer-events:none;transition:transform .18s cubic-bezier(.34,1.56,.64,1),opacity .18s}
.cw-bubble.on{opacity:1;transform:translateX(-50%) scale(1)}
.cw-bubble::after{content:'';position:absolute;left:50%;bottom:-5px;width:10px;height:10px;background:#fff;transform:translateX(-50%) rotate(45deg);border-radius:2px}
.cw-bubble.below{bottom:auto;top:16px;transform:translateX(-50%) scale(.6) rotate(180deg)}
.cw-bubble.below.on{transform:translateX(-50%) scale(1) rotate(180deg)}
.cw-bubble.below span{display:inline-block;transform:rotate(180deg)}
.cw-bubble.below::after{bottom:auto;top:-5px}
.cw-up{bottom:136px}
/* 长按轮盘菜单：按钮环绕小蟹上半弧，逐个弹出 */
.cw-radial{position:absolute;left:0;top:0;width:0;height:0;pointer-events:none;z-index:3}
.cw-radial button{position:absolute;width:42px;height:42px;border-radius:50%;border:0;background:rgba(255,255,255,.96);font-size:19px;line-height:1;cursor:pointer;display:grid;place-items:center;box-shadow:0 4px 14px rgba(60,40,20,.28),0 0 0 1px rgba(0,0,0,.06);pointer-events:auto;transform:translate(-50%,-50%) scale(.2) rotate(-30deg);opacity:0;transition:transform .24s cubic-bezier(.34,1.56,.64,1),opacity .16s;padding:0;font-family:inherit}
.cw-radial.on button{opacity:1;transform:translate(-50%,-50%) scale(1) rotate(0deg)}
.cw-radial.on button:hover{transform:translate(-50%,-50%) scale(1.18) rotate(0deg);background:#fff}
.cw-radial.on button:active{transform:translate(-50%,-50%) scale(.95) rotate(0deg)}
.cw-radial.on button.sel{transform:translate(-50%,-50%) scale(1.3) rotate(0deg);background:#ffe8d2;box-shadow:0 0 0 3px rgba(217,119,87,.55),0 6px 18px rgba(60,40,20,.3)}
/* Tamagotchi 状态面板 */
.cw-stats{position:absolute;left:50%;top:-196px;transform:translateX(-50%) translateY(6px) scale(.95);width:236px;background:#fff;border-radius:12px;padding:12px 14px;box-shadow:0 8px 26px rgba(60,40,20,.22),0 0 0 1px rgba(0,0,0,.05);font:12px/1.5 system-ui,-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;color:#4a3b32;opacity:0;display:none;pointer-events:none;transition:transform .18s cubic-bezier(.34,1.56,.64,1),opacity .18s}
.cw-stats.on{display:block;opacity:1;transform:translateX(-50%) translateY(0) scale(1);pointer-events:auto}
.cw-stats.down{top:16px}
.cw-stats h4{margin:0 0 7px;font-size:13px;display:flex;justify-content:space-between;align-items:baseline}
.cw-stats h4 .age{font-weight:400;color:#8a7666;font-size:11px}
.cw-stats .row{display:flex;align-items:center;gap:7px;margin:5px 0}
.cw-stats .lb{width:34px;flex:none;color:#8a7666}
.cw-stats .cw-bar{flex:1;height:9px;background:rgba(0,0,0,.1);border-radius:4px;overflow:hidden}
.cw-stats .cw-bar i{display:block;height:100%;background:#d97757;border-radius:4px;transition:width .35s}
.cw-stats .val{width:28px;text-align:right;font-variant-numeric:tabular-nums}
.cw-stats .meta{margin-top:7px;color:#8a7666;border-top:1px dashed rgba(0,0,0,.12);padding-top:6px}
.cw-stats .rip{color:#8a7666;text-align:center;margin:2px 0 4px}
.cw-stats .rebirth{margin-top:6px;width:100%;border:0;background:#d97757;color:#fff;border-radius:8px;padding:6px;cursor:pointer;font-family:inherit;font-size:12px}
.cw-stats .rebirth:hover{background:#c5663f}
.cw-card{position:absolute;left:50%;top:-128px;transform:translateX(-50%) translateY(6px) scale(.9);display:none;align-items:center;gap:8px;background:#fff;border-radius:14px;padding:9px 10px 9px 14px;box-shadow:0 8px 26px rgba(60,40,20,.22),0 0 0 1px rgba(0,0,0,.05);font:13px/1.4 system-ui,-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;white-space:nowrap;pointer-events:none;transition:transform .18s cubic-bezier(.34,1.56,.64,1),opacity .18s;opacity:0}
.cw-card.on{display:flex;opacity:1;transform:translateX(-50%) translateY(0) scale(1);pointer-events:auto}
.cw-card.down{top:14px}
.cw-card .t{font-weight:600;color:#b4442c}
.cw-card .d{color:#8a7666;max-width:200px;overflow:hidden;text-overflow:ellipsis}
.cw-card .ok{background:#d97757;color:#fff;border:0;border-radius:8px;padding:4px 12px;cursor:pointer;font-size:12px;font-family:inherit}
.cw-card .ok:hover{background:#c5663f}
.cw-corner{position:fixed;right:20px;bottom:20px;width:48px;height:48px;border-radius:50%;background:#fff;box-shadow:0 6px 22px rgba(0,0,0,.2),0 0 0 1px rgba(0,0,0,.05);display:grid;place-items:center;font-size:22px;cursor:pointer;user-select:none;transition:transform .15s;z-index:2147483000}
.cw-corner:hover{transform:scale(1.1) rotate(-8deg)}
.cw-corner.cw-abs{position:absolute}
`;

/* ============ 粒子 ============ */
class Particles {
  constructor() { this.list = []; }
  add(p) { this.list.push(p); if (this.list.length > 160) this.list.splice(0, this.list.length - 160); }
  heart(x, y, big) { this.add({ t: 'heart', x, y, vx: rand(-16, 16), vy: rand(-78, -44), life: 0, max: rand(1.0, 1.5), size: big ? rand(7, 10) : rand(4.5, 7.5), ph: rand(0, 6), color: pick(['#ff6f91', '#ff8fab', '#ffb3c6']) }); }
  spark(x, y) { this.add({ t: 'spark', x, y, vx: rand(-46, 46), vy: rand(-76, -14), life: 0, max: rand(0.6, 1.1), size: rand(2.5, 4), ph: rand(0, 6), color: pick(['#FFD700', '#FFC107', '#FFF59D', '#FFA000']) }); }
  zzz(x, y) { this.add({ t: 'zzz', x, y, vx: rand(6, 13), vy: rand(-26, -18), life: 0, max: 2.6, size: rand(3, 4.2), ph: rand(0, 6), color: pick(['#90A4AE', '#B0BEC5', '#CFD8DC']) }); }
  bit(x, y) { this.add({ t: 'bit', x, y, vx: rand(-12, 12), vy: rand(-52, -30), life: 0, max: rand(0.8, 1.3), size: rand(3, 4.5), ph: 0, color: '#40C4FF' }); }
  dust(x, y, n) { for (let i = 0; i < n; i++) this.add({ t: 'dust', x: x + rand(-14, 14), y: y + rand(-3, 2), vx: rand(-46, 46), vy: rand(-34, -6), life: 0, max: rand(0.35, 0.6), size: rand(3, 6.5), ph: 0 }); }
  crumb(x, y) { this.add({ t: 'crumb', x, y, vx: rand(-70, 70), vy: rand(-160, -60), life: 0, max: rand(0.6, 0.9), size: rand(1.8, 3.2), ph: 0 }); }
  dot(x, y) { this.add({ t: 'dot', x, y, vx: rand(-3, 3), vy: -12, life: 0, max: 1.1, size: rand(2, 3.2), ph: 0, color: 'rgba(255,255,255,.95)' }); }
  note(x, y) { this.add({ t: 'note', x, y, vx: rand(-14, 14), vy: rand(-52, -34), life: 0, max: rand(1.0, 1.5), size: rand(12, 17), ph: rand(0, 6), txt: pick(['\u266a', '\u266b', '\u266c']), color: pick(['#6e6eff', '#ff6f91', '#4aa3ff', '#ffb84a']) }); }
  emoji(txt, x, y, size, vy, grav) { this.add({ t: 'emoji', x, y, vx: rand(-8, 8), vy: vy != null ? vy : rand(-40, -24), life: 0, max: rand(1.2, 2.0), size: size || 20, grav: !!grav, ph: 0, txt }); }
  emojiRain(txt, W) { this.add({ t: 'emoji', x: rand(30, W - 30), y: -24, vx: rand(-10, 10), vy: rand(46, 76), life: 0, max: 3.4, size: rand(16, 24), grav: false, ph: 0, txt }); }
  /* --- 动作发射器：类型 → 生成函数 --- */
  static EMIT = {
    note: (P, x, y) => P.note(x + rand(-30, 30), y - rand(60, 90)),
    spark: (P, x, y) => P.spark(x + rand(-40, 40), y - rand(30, 90)),
    heart: (P, x, y) => P.heart(x + rand(-30, 30), y - rand(50, 90)),
    bit: (P, x, y) => P.bit(x + rand(-40, 40), y - rand(40, 70)),
    dust: (P, x, y) => P.dust(x + rand(-24, 24), y, 2),
    crumb: (P, x, y) => P.crumb(x + rand(-16, 16), y - 40),
    drop: (P, x, y, W) => P.add({ t: 'dot', x: rand(Math.max(30, x - 60), Math.min(W - 30, x + 60)), y: y - 130, vx: rand(-6, 6), vy: 130, life: 0, max: 1.1, size: rand(1.6, 2.6), ph: 0, color: '#6fb7e0' }),
    steam: (P, x, y) => P.add({ t: 'dot', x: x + rand(-14, 14), y: y - 60, vx: rand(-4, 4), vy: -30, life: 0, max: 1.4, size: rand(2.5, 4), ph: 0, color: 'rgba(255,255,255,.6)' }),
    bubble: (P, x, y) => P.add({ t: 'ring', x: x + rand(-24, 24), y: y - rand(30, 70), vx: rand(-6, 6), vy: rand(-30, -16), life: 0, max: 1.6, size: rand(3, 6), ph: 0, color: 'rgba(160,210,240,.8)' }),
    ripple: (P, x, y) => P.add({ t: 'ring', x: x + rand(-20, 20), y: y - 2, vx: 0, vy: 0, life: 0, max: 0.9, size: 8, ph: 0, color: 'rgba(140,190,230,.6)' }),
    tear: (P, x, y) => P.add({ t: 'dot', x: x - 8, y: y - 66, vx: rand(-3, 3), vy: 40, life: 0, max: 0.8, size: 2.4, ph: 0, color: '#7fc3ec' }),
    snow: (P, x, y, W) => P.add({ t: 'dot', x: rand(30, W - 30), y: y - 150, vx: rand(-12, 12), vy: rand(28, 44), life: 0, max: 4, size: rand(1.8, 3), ph: 0, color: 'rgba(255,255,255,.9)' }),
    zen: (P, x, y) => P.add({ t: 'dot', x: x + rand(-20, 20), y: y - rand(50, 90), vx: 0, vy: -16, life: 0, max: 1.6, size: rand(2, 3), ph: 0, color: 'rgba(200,220,255,.7)' }),
    sun: (P, x, y) => P.spark(x + rand(-50, 50), y - rand(80, 120)),
    glow: (P, x, y) => P.add({ t: 'dot', x: x + rand(-20, 20), y: y - rand(60, 100), vx: 0, vy: -10, life: 0, max: 1.3, size: rand(3, 5), ph: 0, color: 'rgba(255,230,150,.8)' }),
    paint: (P, x, y) => P.dot(x + rand(-40, 40), y - rand(40, 90)),
    wind: (P, x, y, W) => P.add({ t: 'wind', x: rand(20, W - 20), y: y - rand(30, 100), vx: rand(40, 90), vy: 0, life: 0, max: 1.2, size: rand(8, 16), ph: 0, color: 'rgba(255,255,255,.45)' }),
    fruit: (P, x, y) => P.emoji(pick(['🍎', '🍊', '🍋', '🍇']), x + rand(-36, 36), y - rand(70, 100), 20),
    leaf: (P, x, y, W) => P.emojiRain(pick(['🍂', '🍁']), W),
    butterfly: (P, x, y) => P.emoji('🦋', x + rand(-50, 50), y - rand(50, 100), 20),
    ant: (P, x, y) => P.add({ t: 'dot', x: x + rand(-40, 40), y: y - 3, vx: rand(14, 30) * (Math.random() < 0.5 ? 1 : -1), vy: 0, life: 0, max: 2.2, size: 1.8, ph: 0, color: '#4a3226' }),
    flash: (P, x, y) => P.spark(x + rand(-6, 6), y - rand(70, 84)),
    firework: (P, x, y, W) => P.spark(rand(40, W - 40), y - rand(90, 160)),
  };
  note(x, y) { this.add({ t: 'note', x, y, vx: rand(-14, 14), vy: rand(-52, -34), life: 0, max: rand(1.0, 1.5), size: rand(12, 17), ph: rand(0, 6), txt: pick(['♪', '♫', '♬']), color: pick(['#6e6eff', '#ff6f91', '#4aa3ff', '#ffb84a']) }); }
  emoji(txt, x, y, size, vy, grav) { this.add({ t: 'emoji', x, y, vx: rand(-8, 8), vy: vy != null ? vy : rand(-40, -24), life: 0, max: rand(1.2, 2.0), size: size || 20, grav: !!grav, ph: 0, txt }); }
  emojiRain(txt, W) { this.add({ t: 'emoji', x: rand(30, W - 30), y: -24, vx: rand(-10, 10), vy: rand(46, 76), life: 0, max: 3.4, size: rand(16, 24), grav: false, ph: 0, txt }); }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life += dt;
      if (p.life >= p.max) { this.list.splice(i, 1); continue; }
      if (p.t === 'heart') { p.x += p.vx * dt + Math.sin(p.life * 7 + p.ph) * 16 * dt; p.y += p.vy * dt; }
      else if (p.t === 'spark') { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt; }
      else if (p.t === 'zzz') { p.x += p.vx * dt + Math.sin(p.life * 3 + p.ph) * 14 * dt; p.y += p.vy * dt; }
      else if (p.t === 'dust') { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; }
      else if (p.t === 'crumb') { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 900 * dt; }
      else if (p.t === 'bit' || p.t === 'dot') { p.x += p.vx * dt; p.y += p.vy * dt; }
      else if (p.t === 'note') { p.x += p.vx * dt + Math.sin(p.life * 5 + p.ph) * 18 * dt; p.y += p.vy * dt; }
      else if (p.t === 'emoji') { p.x += p.vx * dt; p.y += p.vy * dt; if (p.grav) p.vy += 500 * dt; }
      else if (p.t === 'ring') { p.x += p.vx * dt; p.y += p.vy * dt; }
      else if (p.t === 'wind') { p.x += p.vx * dt; }
      else if (p.t === 'note') { p.x += p.vx * dt + Math.sin(p.life * 5 + p.ph) * 18 * dt; p.y += p.vy * dt; }
      else if (p.t === 'emoji') { p.x += p.vx * dt; p.y += p.vy * dt; if (p.grav) p.vy += 500 * dt; }
    }
  }
  draw(g) {
    for (const p of this.list) {
      const k = p.life / p.max;
      const alpha = k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1;
      g.save();
      g.globalAlpha = alpha;
      if (p.t === 'heart') {
        g.fillStyle = p.color;
        heartPath(g, p.x, p.y, p.size * (1 + Math.sin(p.life * 9 + p.ph) * 0.08));
        g.fill();
      } else if (p.t === 'spark') {
        // 官方星光：step 式逐帧闪
        const on = Math.floor(p.life * 8 + p.ph * 3) % 3;
        g.fillStyle = p.color;
        const s = p.size;
        if (on === 0) { g.fillRect(p.x - s * 0.4, p.y - s * 0.4, s * 0.8, s * 0.8); }
        else {
          g.fillRect(p.x - s, p.y - s * 0.3, s * 2, s * 0.6);
          g.fillRect(p.x - s * 0.3, p.y - s, s * 0.6, s * 2);
        }
      } else if (p.t === 'zzz') {
        // 官方像素 Z：上横条 + 两块对角 + 下横条
        const s = p.size;
        g.fillStyle = p.color;
        g.fillRect(p.x - s * 2, p.y - s * 2, s * 4, s);
        g.fillRect(p.x + s * 0.2, p.y - s * 1, s, s);
        g.fillRect(p.x - s * 1.2, p.y, s, s);
        g.fillRect(p.x - s * 2, p.y + s, s * 4, s);
      } else if (p.t === 'dust') {
        g.fillStyle = 'rgba(180,170,160,' + (0.35 * alpha).toFixed(3) + ')';
        g.beginPath();
        g.arc(p.x, p.y, p.size * (1 + k * 1.4), 0, Math.PI * 2);
        g.fill();
      } else if (p.t === 'crumb') {
        g.fillStyle = '#b9834e';
        g.fillRect(p.x, p.y, p.size, p.size);
      } else if (p.t === 'bit') {
        g.fillStyle = p.color;
        const s = p.size * (0.7 + k * 0.5);
        g.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      } else if (p.t === 'note') {
        g.fillStyle = p.color;
        g.font = '700 ' + p.size + 'px system-ui,sans-serif';
        g.textAlign = 'center';
        g.fillText(p.txt || '\u266a', p.x, p.y);
      } else if (p.t === 'emoji') {
        g.font = Math.round(p.size) + 'px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(p.txt, p.x, p.y);
        g.textBaseline = 'alphabetic';
      } else if (p.t === 'ring') {
        g.strokeStyle = p.color;
        g.lineWidth = 1.6;
        g.beginPath();
        g.arc(p.x, p.y, p.size * (1 + k * 1.6), 0, Math.PI * 2);
        g.stroke();
      } else if (p.t === 'wind') {
        g.strokeStyle = p.color;
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(p.x, p.y);
        g.quadraticCurveTo(p.x + p.size / 2, p.y - 3, p.x + p.size, p.y);
        g.stroke();
      } else if (p.t === 'dot') {
        g.fillStyle = p.color;
        g.beginPath();
        g.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        g.fill();
      } else if (p.t === 'note') {
        g.fillStyle = p.color;
        g.font = '700 ' + p.size + 'px system-ui,sans-serif';
        g.textAlign = 'center';
        g.fillText(p.txt || '♪', p.x, p.y);
      } else if (p.t === 'emoji') {
        g.font = Math.round(p.size) + 'px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(p.txt, p.x, p.y);
        g.textBaseline = 'alphabetic';
      }
      g.restore();
    }
  }
}

function heartPath(g, x, y, s) {
  g.beginPath();
  g.moveTo(x, y + s);
  g.bezierCurveTo(x - s * 1.4, y, x - s * 1.2, y - s * 1.2, x, y - s * 0.4);
  g.bezierCurveTo(x + s * 1.2, y - s * 1.2, x + s * 1.4, y, x, y + s);
  g.closePath();
}

/* ============ Clawd 本体（官方 15×16 网格，1 单位 = U px，原点=脚底中心） ============ */
const U = 7;
const GRAVITY = 2200;
const LONG_PRESS_MS = 500; // 长按蓄力时长：松早=摸头，拖动=拖拽，蓄满=轮盘菜单

class Clawd {
  constructor(eng) {
    this.eng = eng;
    this.skinKey = store.get(eng.prefix + '_skin', 'crail');
    if (!SKINS[this.skinKey]) this.skinKey = 'crail';
    this.x = eng.W / 2;
    this.y = eng.groundY;
    this.vx = 0; this.vy = 0;
    this.facing = 1;
    this.state = 'idle';
    this.stateT = 0;
    this.stateDur = rand(1.5, 3);
    this.targetX = null;
    this.walkPhase = 0;
    this.legPhase = 0;
    this.sq = 0; this.sqV = 0;
    this.look = { x: 0, y: 0.1 };
    this.lookOverride = null;
    this.blinkT = 0; this.nextBlink = rand(1.5, 4);
    this.spin = 0; this.spinV = 0;
    this.eatT = 0;
    this.heartEyes = 0;
    this.airH = 0;
    this.affection = 0;
    this.lastInteract = performance.now();
    this.sleepAfter = 22000;
    this.chatT = rand(18, 34);
    this.dustT = 0;
    this.face = 'normal';
    // 钳子：{a 角度, o 开合}（左臂正角=抬起，右臂经镜像同号同义）
    this.clawL = { a: 0.12, o: 0.12, init: false };
    this.clawR = { a: 0.12, o: 0.12, init: false };
    this.clapT = 0;
    this.tapSide = 0; this.tapT = 0;
    this.hammerSide = 0; this.hammerT = 0; this.hammerHit = false;
    this.charge = 0; // 长按蓄力进度 0..1（画蓄力圆环用）
    this.trick = null; this.trickRot = 0; this.trickDx = 0; this.trickDy = 0;
    this.trickSq = 0; this.trickJit = 0; this.trickMouth = ''; this.trickProp = ''; this.lastTrickId = '';
    this.affection = (eng.tama && eng.tama.affection) || 0;
  }

  get skin() {
    // 色盘联动：宿主站点可通过 setColors({body}) 让 Clawd 穿上主题色
    if (this.eng.customBody) return { name: '主题色', body: this.eng.customBody };
    return SKINS[this.skinKey];
  }

  setState(s, dur) {
    if (this.state === s && s !== 'idle') return;
    this.state = s;
    this.stateT = 0;
    this.stateDur = dur || 0;
    this.face = 'normal';
    this.lookOverride = null;
    const eng = this.eng;
    switch (s) {
      case 'sleep': this.face = 'sleep'; eng.say(pick(LINES.sleep)); break;
      case 'happy': this.face = 'happy'; break;
      case 'eat': this.face = 'eat'; break;
      case 'dizzy': this.face = 'dizzy'; eng.say(pick(LINES.dizzy)); break;
      case 'drag': this.face = 'wide'; eng.say(pick(LINES.drag)); break;
      case 'think': eng.say(pick(LINES.thinking)); break;
      case 'type': eng.say(pick(LINES.typing)); break;
      case 'build': eng.say(pick(LINES.building)); break;
      case 'juggle': eng.say(pick(LINES.juggling)); break;
      case 'alert': eng.play('ding'); eng.say(pick(LINES.alert)); break;
      case 'walk': if (Math.random() < 0.4) eng.say(pick(LINES.walk)); break;
      case 'run': if (Math.random() < 0.5) eng.say(pick(LINES.run)); break;
      case 'chase': eng.say(pick(LINES.play)); break;
      case 'stretch': eng.say(pick(LINES.stretch)); break;
      default: break;
    }
  }

  interact() { this.lastInteract = performance.now(); }

  sleepy() {
    if (this.eng.autoSleep === false) return false;
    const h = new Date().getHours();
    const night = h >= 23 || h < 7;
    const idleFor = performance.now() - this.lastInteract;
    return idleFor > (night ? 8000 : this.sleepAfter);
  }

  /* ---- agent 状态（clawd-on-desk 整合点） ---- */
  applyForced() {
    const eng = this.eng;
    const f = eng.forced;
    if (!f) return;
    switch (f.state) {
      case 'thinking': this.setState('think', rand(8, 14)); break;
      case 'typing': this.setState('type', rand(7, 12)); break;
      case 'building': this.setState('build', rand(7, 12)); break;
      case 'juggling': this.setState('juggle', rand(9, 15)); break;
      case 'alert': this.setState('alert'); break;
      case 'sleep': this.setState('sleep'); break;
      default: eng.clearForced(); this.setState('idle', rand(1, 2));
    }
  }

  update(dt, t) {
    const eng = this.eng;
    // Tamagotchi：退休后化为星痕，一切行为静止
    if (eng.tama && eng.tama.retired) {
      if (this.state !== 'retire') { this.state = 'retire'; this.stateT = 0; this.face = 'sleep'; }
      return;
    }
    // 到睡觉时段（22:00–08:00）：强制入睡；时段结束自动醒来
    if (eng.tama && eng.tama.hatched) {
      if (eng.tama.clockSleep && this.state !== 'sleep' && this.state !== 'trick') {
        this.setState('sleep');
        eng.tama.forcedSleep = true;
        eng.say('到点啦…晚安咔…', 2600);
      } else if (eng.tama.forcedSleep && !eng.tama.clockSleep && this.state === 'sleep') {
        eng.tama.forcedSleep = false;
        this.setState('idle', rand(1, 2));
        eng.say('早安咔！', 2200);
      }
    }
    this.stateT += dt;

    /* --- 持续性小系统 --- */

    // 眨眼（官方：周期性 scaleY→0.1）
    this.blinkT += dt;
    if (this.blinkT > this.nextBlink) {
      this.blinkT = 0;
      this.nextBlink = rand(1.8, 4.5);
      if (this.state === 'sleep') this.blinkT = -1;
    }

    // 压扁弹簧
    this.sqV += (-this.sq * 170 - this.sqV * 10.5) * dt;
    this.sq = clamp(this.sq + this.sqV * dt, -0.45, 0.5);

    // 视线（官方：眼睛整体平移，非瞳孔转动）
    let tx = 0, ty = 0.1;
    if (this.lookOverride) { tx = this.lookOverride.x; ty = this.lookOverride.y; }
    else if (this.state !== 'sleep') {
      const p = eng.pointer;
      const dx = p.x - this.x, dy = p.y - (this.y - 45);
      const d = Math.hypot(dx, dy);
      if (d < 460) { tx = clamp(dx / 200, -1, 1); ty = clamp(dy / 200, -1, 1); }
      else if (this.state === 'walk' || this.state === 'run' || this.state === 'chase') { tx = 0.7 * this.facing; ty = 0.15; }
      else if (this.state === 'think') { tx = 0.6 * this.facing; ty = -0.7; }
      else if (this.state === 'type') { tx = 0; ty = 0.5; } // 盯着屏幕
    }
    const lk = 1 - Math.exp(-8 * dt);
    this.look.x = lerp(this.look.x, tx, lk);
    this.look.y = lerp(this.look.y, ty, lk);

    if (this.heartEyes > 0) this.heartEyes -= dt;
    // Tamagotchi：生病时一脸病容（动作期间让位）
    if (eng.tama && eng.tama.sick && this.face === 'normal' && this.state !== 'trick') this.face = 'sick';
    // 动作库：应用编舞通道
    if (this.state === 'trick' && this.trick) this.applyTrick(dt, t);

    /* --- 状态机 --- */
    const onGround = this.y >= eng.groundY - 0.5;
    this.airH = eng.groundY - this.y;

    switch (this.state) {
      case 'idle': {
        // 菜单打开时站定别动，免得按钮行跟着飘走
        if (eng.menuOpen) this.stateDur = Math.max(this.stateDur, this.stateT + 0.4);
        if (this.stateT > this.stateDur) this.pickIdle();
        this.chatT -= dt;
        if (this.chatT < 0) {
          this.chatT = rand(18, 36);
          const tm = eng.tama;
          if (tm && tm.sick) eng.say(pick(LINES.sick));
          else if (tm && tm.hunger < 30) eng.say(pick(LINES.hungry));
          else if (tm && (tm.clean < 25 || tm.poops.length)) eng.say(pick(LINES.dirty));
          else if (tm && tm.happy < 25) eng.say(pick(LINES.bored));
          else if (Math.random() < 0.6) eng.say(pick(LINES.idle));
        }
        if (Math.random() < dt * 0.25) eng.play('snip');
        break;
      }
      case 'sit': {
        if (eng.menuOpen) this.stateDur = Math.max(this.stateDur, this.stateT + 0.4);
        if (this.stateT > this.stateDur) this.pickIdle();
        break;
      }
      case 'look': {
        if (this.stateT > this.stateDur) this.setState('idle', rand(0.6, 1.6));
        break;
      }
      case 'walk': case 'run': {
        const speed = this.state === 'run' ? 250 : 66;
        const dir = this.targetX == null ? this.facing : Math.sign(this.targetX - this.x) || 1;
        this.facing = dir;
        this.x += dir * speed * dt;
        this.walkPhase += dt * Math.sqrt(speed) * 0.78;
        this.legPhase += dt * (this.state === 'run' ? 26 : 14);
        if (eng.tama) eng.tama.walkDist += speed * dt; // 探索经验来源
        if (this.state === 'run') {
          this.dustT -= dt;
          if (this.dustT < 0 && onGround) { this.dustT = 0.11; eng.particles.dust(this.x - dir * 20, this.y, 1); }
        }
        if (this.targetX != null && Math.abs(this.targetX - this.x) < 8) {
          this.targetX = null;
          if (this.state === 'run') this.setState('happy', 0.8);
          else this.setState('idle', rand(1, 2.4));
        }
        if (this.stateT > 14) this.setState('idle', rand(1, 2));
        break;
      }
      case 'chase': {
        if (!eng.ball) { this.setState('happy', 1); break; }
        const b = eng.ball;
        const dx = b.x - this.x;
        if (Math.abs(dx) > 44) {
          const dir = Math.sign(dx) || 1;
          this.facing = dir;
          this.x += dir * 235 * dt;
          this.walkPhase += dt * 12;
          this.legPhase += dt * 24;
          if (onGround && Math.abs(dx) > 130 && Math.random() < dt * 1.6) { this.vy = -rand(280, 380); eng.play('boing', 0.3); }
          this.dustT -= dt;
          if (this.dustT < 0 && onGround) { this.dustT = 0.1; eng.particles.dust(this.x - dir * 20, this.y, 1); }
        } else if (onGround && b.y > eng.groundY - 90) {
          b.vx = this.facing * rand(260, 400);
          b.vy = -rand(300, 470);
          b.kicks++;
          const tm = eng.tama;
          if (tm && !tm.retired) {
            tm.energy = clamp(tm.energy - 3, 0, 100);
            tm.happiness = clamp(tm.happiness + 3, 0, 100);
            tm.playExp += 2;
            tm.weight = Math.max(1, tm.weight - 0.1);
          }
          this.vy = -230;
          this.sqV -= 0.8;
          eng.play('clack');
          if (Math.random() < 0.5) eng.say(pick(LINES.kick));
          if (b.kicks >= 4 && !b.dying) b.dying = true;
        }
        if (b.dying && b.alpha < 0.35) this.setState('happy', 1.2);
        if (this.stateT > 16) { if (eng.ball) eng.ball.dying = true; this.setState('idle', 1); }
        break;
      }
      case 'stretch': {
        if (this.stateT / 1.7 >= 1) this.setState('idle', rand(1.5, 3));
        break;
      }
      case 'jump': {
        if (onGround && this.stateT > 0.15) this.setState('idle', rand(1, 2.5));
        break;
      }
      case 'happy': {
        this.face = this.heartEyes > 0 ? 'heart' : 'happy';
        if (onGround && !eng.menuOpen && this.stateT < this.stateDur - 0.2 && Math.random() < dt * 6) {
          this.vy = -rand(140, 220);
          this.sqV -= 0.5;
        }
        this.clapT += dt;
        if (Math.random() < dt * 3) eng.particles.spark(this.x + rand(-46, 46), this.y - rand(30, 80));
        if (this.stateT > this.stateDur) this.setState('idle', rand(1, 2.5));
        break;
      }
      case 'eat': {
        this.eatT += dt;
        if (Math.random() < dt * 7) eng.particles.crumb(this.x + this.facing * 6, this.y - 30);
        if (this.eatT > 1.25) {
          if (eng.cookie) eng.cookie = null;
          const tm = eng.tama;
          if (tm && !tm.retired) {
            tm.fullness = clamp(tm.fullness + 25, 0, 100);
            tm.happiness = clamp(tm.happiness + 4, 0, 100);
            tm.weight += 0.4;
            if (!tm.digestAt) tm.digestAt = Date.now() + rand(60, 120) * 60000; // 消化事件 60~120 分钟
          }
          this.heartEyes = 1.4;
          eng.say(pick(LINES.afterEat));
          this.setState('happy', 1.3);
          for (let i = 0; i < 3; i++) eng.particles.heart(this.x + rand(-16, 16), this.y - 80);
        }
        break;
      }
      case 'wait': {
        if (!eng.cookie) this.setState('idle', rand(0.5, 1));
        if (this.stateT > 2.6) this.setState('idle', rand(0.5, 1));
        break;
      }
      case 'think': {
        if (Math.random() < dt * 0.9) eng.particles.dot(this.x + this.facing * rand(40, 52), this.y - rand(98, 116));
        if (this.stateT > this.stateDur) {
          if (eng.forced) { this.stateT = 0; this.stateDur = rand(8, 14); }
          else this.setState('idle', rand(1, 2.5));
        }
        break;
      }
      case 'type': {
        this.tapT -= dt;
        if (this.tapT < 0) {
          this.tapT = rand(0.12, 0.3);
          this.tapSide = 1 - this.tapSide;
          eng.play('clicky');
          if (Math.random() < 0.45) eng.particles.bit(this.x + rand(-40, 40), this.y - rand(38, 66));
        }
        if (this.stateT > this.stateDur) {
          if (eng.forced) { this.stateT = 0; this.stateDur = rand(7, 12); }
          else this.setState('idle', rand(1, 2.5));
        }
        break;
      }
      case 'build': {
        this.hammerT += dt;
        const cyc = this.hammerT % 0.9;
        if (cyc > 0.62 && !this.hammerHit) {
          this.hammerHit = true;
          this.hammerSide = 1 - this.hammerSide;
          eng.play('clack');
          const side = this.hammerSide === 1 ? 1 : -1;
          eng.particles.spark(this.x + side * 48, this.y - 16);
        }
        if (cyc < 0.2) this.hammerHit = false;
        if (this.stateT > this.stateDur) {
          if (eng.forced) { this.stateT = 0; this.stateDur = rand(7, 12); }
          else this.setState('idle', rand(1, 2.5));
        }
        break;
      }
      case 'juggle': {
        if (Math.random() < dt * 0.8) eng.play('clicky');
        if (this.stateT > this.stateDur) {
          if (eng.forced) { this.stateT = 0; this.stateDur = rand(9, 15); }
          else this.setState('happy', 1);
        }
        break;
      }
      case 'alert': {
        this.face = 'wide';
        if (onGround && Math.random() < dt * 2.2) { this.vy = -rand(90, 150); }
        if (this.stateT > 90 && eng.forced) eng.clearForced();
        if (!eng.forced || eng.forced.state !== 'alert') this.setState('idle', rand(0.5, 1));
        break;
      }
      case 'sleep': {
        eng.zzzT -= dt;
        if (eng.zzzT < 0) {
          eng.zzzT = 1.6;
          eng.particles.zzz(this.x + this.facing * 26, this.y - 44);
        }
        if (this.stateT > 50 && !eng.tama.clockSleep && !eng.forced) { this.setState('stretch'); this.lastInteract = performance.now(); }
        break;
      }
      case 'drag': {
        const p = eng.pointer;
        const gx = p.x + this.grabDX, gy = Math.min(p.y + this.grabDY, eng.groundY);
        const k = 1 - Math.exp(-13 * dt);
        const nx = lerp(this.x, gx, k), ny = lerp(this.y, gy, k);
        this.vx = clamp(lerp(this.vx, (nx - this.x) / Math.max(dt, 0.001), 0.55), -2400, 2400);
        this.vy = clamp(lerp(this.vy, (ny - this.y) / Math.max(dt, 0.001), 0.55), -2400, 2400);
        this.x = nx; this.y = ny;
        this.facing = this.vx < -20 ? -1 : this.vx > 20 ? 1 : this.facing;
        this.airH = eng.groundY - this.y;
        break;
      }
      default: break;
    }

    /* --- 空中物理 --- */
    if (this.state !== 'drag') {
      if (!onGround || this.vy < 0) {
        this.vy += GRAVITY * dt;
        this.y += this.vy * dt;
        this.x += this.vx * dt;
        this.spinV = lerp(this.spinV, clamp(this.vx * 0.003, -2.6, 2.6), 0.08);
        this.spin += this.spinV * dt;
        const m = 54;
        if (this.x < m) { this.x = m; this.vx *= -0.55; eng.particles.spark(this.x - 30, this.y - 40); }
        if (this.x > eng.W - m) { this.x = eng.W - m; this.vx *= -0.55; eng.particles.spark(this.x + 30, this.y - 40); }
        if (this.y >= eng.groundY) {
          const impact = this.vy;
          this.y = eng.groundY;
          this.vy = 0;
          this.vx *= 0.6;
          this.sqV -= clamp(impact * 0.00075, 0, 1.1);
          this.spin = 0; this.spinV = 0;
          eng.particles.dust(this.x, this.y, clamp(Math.round(impact / 130), 2, 9));
          if (impact > 250) eng.play('boing', clamp(impact / 1300, 0.2, 1));
          if (this.state === 'thrown') {
            if (impact > 950) {
              this.setState('dizzy', 1.6);
            } else if (Math.abs(this.vx) > 380) {
              this.vy = -Math.min(330, 120 + impact * 0.35);
            } else {
              this.setState('idle', rand(1, 2));
            }
          } else if (this.state === 'jump') {
            this.setState('idle', rand(0.8, 1.8));
          }
        }
      } else {
        this.spin = lerp(this.spin, 0, 1 - Math.exp(-10 * dt));
      }
    }

    // 边界与地面
    if (this.state !== 'drag') {
      if (this.state !== 'thrown') this.x = clamp(this.x, 54, eng.W - 54);
      if (this.y > eng.groundY) { this.y = eng.groundY; if (this.vy > 0) this.vy = 0; }
    }

    if ((this.state === 'idle' || this.state === 'sit') && !eng.forced && !eng.menuOpen && this.sleepy()) {
      this.setState('sleep');
    }

    // 长按蓄力环（pointer 按住未动时充能，松开/拖动/弹菜单即清空）
    if (eng.press && this.state !== 'drag' && this.state !== 'thrown') {
      this.charge = clamp((performance.now() - eng.press.t0) / LONG_PRESS_MS, 0, 1);
    } else {
      this.charge = lerp(this.charge, 0, 1 - Math.exp(-14 * dt));
    }

    // 钳子姿态缓动
    this.updateClaws(dt, t);
  }

  pickIdle() {
    const eng = this.eng;
    if (eng.forced) { this.applyForced(); return; }
    const r = Math.random();
    if (this.sleepy()) { this.setState('sleep'); return; }
    if (r < 0.32) {
      this.targetX = rand(64, eng.W - 64);
      this.setState('walk');
    } else if (r < 0.46) {
      this.setState('look', rand(1.2, 2));
      this.lookOverride = { x: pick([-0.9, 0.9]), y: rand(-0.2, 0.2) };
    } else if (r < 0.58) {
      this.setState('stretch');
    } else if (r < 0.68 && (!eng.tama || eng.tama.energy > 25) && !REDUCED) {
      this.vy = -rand(380, 520);
      this.sqV -= 0.7;
      eng.play('boing', 0.5);
      this.setState('jump');
    } else if (r < 0.82) {
      this.setState('sit', rand(2.5, 6));
    } else {
      this.setState('idle', rand(1.2, 3));
    }
  }

  /* ---------- 动作库：执行 ---------- */
  startTrick(def) {
    const eng = this.eng;
    this.trick = { def, emitAcc: {} };
    this.setState('trick', def.dur);
    this.trickMouth = '';
    if (def.snd) eng.play(def.snd);
    eng.say(pick(def.lines), Math.min(3600, def.dur * 1400));
    if (eng.tama && !eng.tama.retired) {
      eng.tama.happiness = clamp(eng.tama.happiness + 3, 0, 100);
      eng.tama.careExp += 1;
    }
  }
  startRandomTrick() {
    const eng = this.eng;
    const tm = eng.tama;
    if (tm && tm.retired) { eng.say('它退休去星海了…（📊 领养新蛋）', 2600); return; }
    if (tm && !tm.hatched) { eng.say('还是颗蛋咔…孵出来才会一百种动作'); return; }
    if (tm && tm.sick) { eng.say('病着呢…先💊再表演咔…'); return; }
    if (eng.tama.clockSleep && this.state === 'sleep') { eng.say(pick(['Zzz…让我睡…', '（翻了个身）', '明天的表演，明天看…']), 2200); return; }
    let def;
    let guard = 0;
    do { def = TRICKS[(Math.random() * TRICKS.length) | 0]; guard++; } while (def.id === this.lastTrickId && guard < 20);
    this.lastTrickId = def.id;
    this.startTrick(def);
  }
  applyTrick(dt, t) {
    const eng = this.eng;
    const tr = this.trick;
    const def = tr.def;
    tr.t += dt;
    const k = clamp(tr.t / def.dur, 0, 1);
    const c = {};
    def.f(t, k, c);
    this.trickRot = c.r || 0;
    this.trickDx = c.dx || 0;
    this.trickDy = c.dy || 0;
    this.trickSq = c.sq || 0;
    this.trickJit = c.shake || 0;
    this.trickMouth = c.mouth || '';
    this.trickProp = c.prop || (def.hold ? '_e' + def.hold : '');
    if (c.spinV) this.spin += c.spinV * dt;
    if (c.face) this.face = c.face;
    if (c.look) this.lookOverride = { x: c.look[0], y: c.look[1] };
    if (c.leg) this.legPhase += dt * 16;
    if (c.hopV && this.y >= eng.groundY - 0.5 && Math.random() < dt * c.hopV * 3) { this.vy = -rand(160, 260); eng.play('boing', 0.25); }
    if (c.clL) { this.clawL.a = lerp(this.clawL.a, c.clL[0], 1 - Math.exp(-10 * dt)); this.clawL.o = lerp(this.clawL.o, c.clL[1], 1 - Math.exp(-10 * dt)); }
    if (c.clR) { this.clawR.a = lerp(this.clawR.a, c.clR[0], 1 - Math.exp(-10 * dt)); this.clawR.o = lerp(this.clawR.o, c.clR[1], 1 - Math.exp(-10 * dt)); }
    if (c.emit) {
      const type = c.emit[0], rate = c.emit[1], ox = c.emit[2] || 0, oy = c.emit[3] || 0;
      tr.emitAcc[type] = (tr.emitAcc[type] || 0) + rate * dt;
      const fn = this.constructor.EMIT && this.constructor.EMIT[type];
      while (tr.emitAcc[type] >= 1) {
        tr.emitAcc[type] -= 1;
        if (fn) fn(eng.particles, this.x + ox, this.y + oy, eng.W);
      }
    }
    if (k >= 1) {
      this.trick = null;
      this.trickRot = 0; this.trickDx = 0; this.trickDy = 0; this.trickSq = 0; this.trickJit = 0; this.trickMouth = ''; this.trickProp = '';
      this.setState('idle', rand(0.9, 1.7));
    }
  }

  /* ---------- 钳子目标姿态（角度/开合，左右经镜像对称） ---------- */
  updateClaws(dt, t) {
    if (this.state === 'trick') return; // 编舞直接控制钳子
    let La, Lo, Ra, Ro;
    const rest = () => [0.12 + Math.sin(t * 1.3) * 0.06, 0.12];
    switch (this.state) {
      case 'drag': case 'thrown':
        La = -1.35 + Math.sin(t * 13) * 0.3; Lo = 0.6;
        Ra = -1.35 + Math.sin(t * 13 + 2.6) * 0.3; Ro = 0.6;
        break;
      case 'happy':
        La = -(0.8 + Math.sin(t * 10) * 0.5); Lo = 0.3;
        Ra = -(0.8 - Math.sin(t * 10) * 0.5); Ro = 0.3;
        break;
      case 'type': {
        const dipL = this.tapSide === 0 ? Math.abs(Math.sin(t * 21)) : 0;
        const dipR = this.tapSide === 1 ? Math.abs(Math.sin(t * 21)) : 0;
        La = -1.05 - dipL * 0.45; Lo = 0.1;
        Ra = -1.05 - dipR * 0.45; Ro = 0.1;
        break;
      }
      case 'think':
        [La, Lo] = rest();
        Ra = -2.3 + Math.sin(t * 2) * 0.12; Ro = 0.15;
        break;
      case 'build': {
        const swing = Math.abs(Math.sin((this.hammerT % 0.9) / 0.9 * Math.PI));
        const hit = (this.hammerT % 0.9) > 0.62;
        const a = hit ? 0.5 : 0.5 - swing * 2.0;
        if (this.hammerSide === 1) { Ra = a; Ro = 0.2; [La, Lo] = rest(); }
        else { La = a; Lo = 0.2; [Ra, Ro] = rest(); }
        break;
      }
      case 'juggle':
        La = -0.9 + Math.sin(t * 5 + Math.PI) * 0.55; Lo = 0.4;
        Ra = -0.9 + Math.sin(t * 5) * 0.55; Ro = 0.4;
        break;
      case 'alert':
        La = -1.5 + Math.sin(t * 8) * 0.15; Lo = 0.5;
        Ra = -1.5 - Math.sin(t * 8) * 0.15; Ro = 0.5;
        break;
      case 'sleep':
        La = 1.25; Lo = 0;
        Ra = 1.25; Ro = 0;
        break;
      case 'walk': case 'run': case 'chase':
        La = 0.15 + Math.sin(this.walkPhase) * 0.14; Lo = 0.16;
        Ra = 0.15 - Math.sin(this.walkPhase) * 0.14; Ro = 0.16;
        break;
      default:
        [La, Lo] = rest();
        [Ra, Ro] = rest();
    }
    const k = this.state === 'drag' || this.state === 'thrown' ? 1 - Math.exp(-16 * dt) : 1 - Math.exp(-9 * dt);
    this.clawL.a = lerp(this.clawL.a, La, k);
    this.clawL.o = lerp(this.clawL.o, Lo, k);
    this.clawR.a = lerp(this.clawR.a, Ra, k);
    this.clawR.o = lerp(this.clawR.o, Ro, k);
  }

  /* ---------- 绘制 ---------- */
  draw(g, t) {
    const eng = this.eng;
    const skin = this.skin.body;
    const walking = this.state === 'walk' || this.state === 'run' || this.state === 'chase';
    const sleeping = this.state === 'sleep';

    // 单位坐标画笔：px(网格x, 网格y, 宽, 高)，网格原点=(7.5,15)=脚底中心
    const px = (ux, uy, uw, uh) => g.fillRect((ux - 7.5) * U, (uy - 15) * U, uw * U, uh * U);

    // 影子（官方：黑 0.5，睡觉加宽）
    const shScale = clamp(1 - this.airH / 320, 0.3, 1);
    g.save();
    g.globalAlpha = (sleeping ? 0.45 : 0.5) * shScale;
    g.fillStyle = '#000';
    const shW = sleeping ? 17 : 9;
    g.fillRect(-shW * U * shScale / 2, (15 - 15.85) * U + (this.airH > 2 ? 0 : 0), shW * U * shScale, 0.85 * U);
    g.restore();

    // Tamagotchi：蛋 / 墓碑 各画各的
    if (eng.tama && !eng.tama.hatched) { this.drawEgg(g, t); return; }
    if (eng.tama && eng.tama.retired) { this.drawRetire(g, t); return; }

    g.save();
    g.rotate(this.spin);

    // 压扁/拉伸（官方：跳跃 scaleY 0.85↔1.05，呼吸 1.02/0.98，轴心=脚底）
    let sq = this.sq;
    if (this.airH > 2) sq += clamp(Math.abs(this.vy) / 3400, 0, 0.18);
    if (walking) sq += Math.sin(this.walkPhase * 2) * 0.035;
    if (this.state === 'idle' || this.state === 'sit') sq += Math.sin(t * 2.0) * 0.012;
    if (sleeping) sq += Math.sin(t * 1.4) * 0.024; // breathe-squash 4.5s 慢呼吸
    if (this.state === 'stretch') {
      const k = Math.sin(clamp(this.stateT / 1.7, 0, 1) * Math.PI);
      sq -= k * 0.14;
    }
    if (this.charge > 0 && this.charge < 1) sq -= this.charge * 0.055; // 蓄力时微微下蹲
    sq = clamp(sq, -0.45, 0.5);
    const sx = 1 - sq * 0.7, sy = 1 + sq;

    g.scale(this.facing, 1);
    g.scale(sx, sy);
    // 动作库：编舞位移/旋转/压扁/抖动
    if (this.state === 'trick') {
      g.translate(this.trickDx + rand(-this.trickJit, this.trickJit), this.trickDy + rand(-this.trickJit, this.trickJit));
      g.rotate(this.trickRot);
      g.scale(1 + this.trickSq * 0.7, 1 - this.trickSq);
    }
    // Tamagotchi 成长阶段缩放
    if (eng.tama && eng.tama.hatched) {
      const stScale = ({ baby: 0.66, teen: 0.84, adult: 1 })[eng.tama.stage] || 1;
      if (stScale !== 1) g.scale(stScale, stScale);
    }

    // 身体摇摆（官方：杂耍 ±5°、dizzy ±6°、螃蟹步摇滚）
    let rot = 0;
    if (walking) rot = Math.sin(this.walkPhase) * 0.05;
    if (this.state === 'run' || this.state === 'chase') rot = 0.055;
    if (this.state === 'juggle') rot = Math.sin(t * 2.4) * 0.085;
    if (this.state === 'dizzy') rot = Math.sin(t * 5) * 0.1;
    g.rotate(rot);

    g.fillStyle = skin;

    /* --- 腿（官方：4 条 1×2，底部两侧；走路交替抬；睡觉变 1×1 小尖） --- */
    const legLift = (i, side) => {
      if (sleeping) return 0;
      if (this.state === 'drag' || this.state === 'thrown') return 0;
      if (walking) return Math.max(0, Math.sin(this.legPhase + i * 2.1 + (side > 0 ? Math.PI : 0))) * 0.8;
      return 0;
    };
    if (sleeping) {
      // 摊平时小腿尖从身后露出（官方 y=9）
      px(3, 9, 1, 1); px(5, 9, 1, 1); px(9, 9, 1, 1); px(11, 9, 1, 1);
    } else {
      for (const side of [-1, 1]) {
        for (let i = 0; i < 2; i++) {
          const lift = legLift(i, side);
          const lx = side < 0 ? (i === 0 ? 3 : 5) : (i === 0 ? 11 : 9);
          px(lx, 13 - lift, 1, 2);
        }
      }
    }

    /* --- 钳子手臂（官方：2×2 方块绕肩关节 (2,10)/(13,10) 旋转） --- */
    this.drawClaw(g, -1, this.clawL, skin, t);
    this.drawClaw(g, 1, this.clawR, skin, t);

    /* --- 躯干（官方：11×7 @(2,6)；睡觉摊平 13×5 @(1,10)） --- */
    if (sleeping) {
      px(1, 10, 13, 5);
      // 摊平的手臂铺在地上
      px(-1, 13, 2, 2);
      px(14, 13, 2, 2);
    } else {
      px(2, 6, 11, 7);
    }

    /* --- 脸（官方：黑竖条眼；各状态差异） --- */
    this.drawFace(g, t);

    /* --- 打字姿势：像素笔记本（官方 #546E7A 底座 + #78909C 屏背） --- */
    if (this.state === 'type') {
      g.fillStyle = '#78909C';
      px(3, 9.5, 9, 5.5);
      g.fillStyle = '#546E7A';
      px(2.5, 14.4, 10, 1);
      // logo 白像素 + 青色光晕
      const glow = 0.4 + Math.abs(Math.sin(t * 2.2)) * 0.6;
      g.save();
      g.globalAlpha = glow * 0.5;
      g.fillStyle = '#40C4FF';
      g.beginPath();
      g.arc((7.5 - 7.5) * U, (11.5 - 15) * U, 1.6 * U, 0, Math.PI * 2);
      g.fill();
      g.restore();
      g.fillStyle = '#fff';
      px(7, 11, 1, 1);
    }

    /* --- 生病：头顶冒生病线 --- */
    if (eng.tama && eng.tama.sick && this.state !== 'sleep') {
      g.save();
      g.strokeStyle = 'rgba(122,180,110,.85)';
      g.lineWidth = 2;
      g.lineCap = 'round';
      for (const side of [-1, 1]) {
        const bx = side * 2.4 * U;
        g.beginPath();
        g.moveTo(bx, -7.2 * U);
        g.quadraticCurveTo(bx + 0.5 * U, -7.8 * U, bx, -8.4 * U);
        g.quadraticCurveTo(bx - 0.5 * U, -9.0 * U, bx + 0.2 * U, -9.6 * U);
        g.stroke();
      }
      g.restore();
    }

    /* --- 吃饼干 --- */
    const c = eng.cookie;
    if (c && c.eating) {
      const k = clamp(1 - this.eatT / 1.25, 0, 1);
      g.save();
      g.translate(0, -4.2 * U);
      g.rotate(Math.sin(this.eatT * 14) * 0.2);
      g.scale(k, k);
      drawCookie(g, 0, 0, U);
      g.restore();
    }

    /* --- 杂耍：3 个 2×2 方块（官方 红/黄/绿 抛物线） --- */
    if (this.state === 'juggle') {
      const cols = ['#FF5252', '#FFC107', '#4CAF50'];
      for (let i = 0; i < 3; i++) {
        const ph = t * 3.4 + i * (Math.PI * 2 / 3);
        const bx = Math.sin(ph) * 3.4 * U;
        const by = -8.2 * U - Math.abs(Math.cos(ph)) * 6.4 * U + 1.6 * U;
        g.save();
        g.translate(bx, by);
        g.rotate(ph * 2);
        g.fillStyle = cols[i];
        g.fillRect(-U, -U, 2 * U, 2 * U);
        g.restore();
      }
    }

    /* --- 打字的数据粒子在身体坐标系外（世界粒子层） --- */

    g.restore();

    /* --- 动作库：像素道具 --- */
    if (this.state === 'trick' && this.trickProp) this.drawTrickProp(g, this.trickProp, t);

    /* --- 长按蓄力圆环 --- */
    this.drawChargeRing(g);

    /* --- 思考泡泡（官方：白色像素云 + 3 个蓝色加载点，阶梯点亮） --- */
    if (this.state === 'think') {
      const dir = this.facing;
      g.save();
      g.translate(dir * 4.2 * U, -12.2 * U);
      g.scale(dir, 1);
      g.fillStyle = 'rgba(255,255,255,.92)';
      // 像素云（官方 8×9 网格）
      const cpx = (x, y, w, h) => g.fillRect(x * U, y * U, w * U, h * U);
      cpx(2, 1, 8, 7); cpx(1, 2, 10, 5); cpx(3, 0, 6, 9);
      // 尾巴泡泡
      cpx(2, 7, 2, 2); cpx(1, 9, 1, 1);
      // 3 个加载点（#0082FC，一次亮一个）
      g.fillStyle = '#0082FC';
      const lit = Math.floor(t * 2.2) % 3;
      const dots = [[2.5, 4], [5.5, 4], [8.5, 4]];
      for (let i = 0; i < 3; i++) {
        g.globalAlpha = i === lit ? 1 : 0.18;
        cpx(dots[i][0], dots[i][1], 1, 1);
      }
      g.restore();
    }

    /* --- 需要批准：红色感叹号（官方 #FF3D00，闪烁） --- */
    if (this.state === 'alert' && Math.floor(t * 2.5) % 2 === 0) {
      g.save();
      g.fillStyle = '#FF3D00';
      const bx = this.facing * 7.2 * U;
      g.fillRect(bx - 0.5 * U, -11.5 * U, U, 3 * U);
      g.fillRect(bx - 0.5 * U, -8 * U, U, U);
      g.restore();
    }

    /* --- 晕头转向：3 颗 #FFC107 十字星绕头椭圆轨道 --- */
    if (this.state === 'dizzy') {
      g.save();
      g.fillStyle = '#FFC107';
      for (let i = 0; i < 3; i++) {
        const a = t * 4 + (i * Math.PI * 2) / 3;
        const rx = 3.4 * U, ry = 1.2 * U;
        const sx0 = Math.cos(a) * rx;
        const sy0 = -9.6 * U + Math.sin(a) * ry;
        const sc = 0.6 + (Math.sin(a) + 1) * 0.25;
        const s = U * 0.5 * sc;
        g.fillRect(sx0 - s * 1.6, sy0 - s * 0.5, s * 3.2, s);
        g.fillRect(sx0 - s * 0.5, sy0 - s * 1.6, s, s * 3.2);
      }
      g.restore();
    }
  }

  /* --- 一只钳子：官方 2×2 方块绕肩旋转 + 1×1 拇指（开合） --- */
  drawClaw(g, side, claw, skin, t) {
    const shoulderX = 5.5 * U, shoulderY = -5 * U;
    g.save();
    g.scale(side, 1);
    g.translate(shoulderX, shoulderY);
    g.rotate(claw.a);
    g.fillStyle = skin;
    // 大臂 2×2（肩在方块内侧边缘）
    g.fillRect(0, -U, 2 * U, 2 * U);
    // 拇指（开合）：铰接在臂端
    g.save();
    g.translate(2 * U, 0);
    g.rotate(-claw.o * 0.9);
    g.fillRect(0, -0.5 * U, 1.1 * U, U);
    g.restore();
    g.restore();
  }

  /* --- 脸：官方黑竖条眼 + 各状态变形 --- */
  drawFace(g, t) {
    const exOff = 3 * U;    // 眼中心偏移（官方 x=4.5/10.5）
    const eyY = -6 * U;     // 眼中心高度（官方 y=8..10）
    const lookX = this.look.x * 0.55 * U * this.facing;
    const lookY = this.look.y * 0.4 * U;

    let blink = 0;
    const blinkable = this.state !== 'sleep' && this.face !== 'wide' && this.state !== 'type';
    if (blinkable && this.blinkT >= 0 && this.blinkT < 0.22) {
      blink = this.blinkT < 0.11 ? 1 - this.blinkT / 0.11 : (this.blinkT - 0.11) / 0.11;
    }

    g.fillStyle = EYE;

    for (const side of [-1, 1]) {
      const cx = side * exOff + lookX;
      const cy = eyY + lookY;
      if (this.face === 'sleep') {
        // 官方闭眼：2×0.4 横线
        g.fillRect(cx - U, cy - 0.2 * U, 2 * U, 0.4 * U);
      } else if (this.face === 'dizzy') {
        // 官方 X 眼：中心块 + 四角块
        const s = U * 0.55;
        g.fillRect(cx - s / 2, cy - s / 2, s, s);
        g.fillRect(cx - s * 1.6, cy - s * 1.6, s, s);
        g.fillRect(cx + s * 0.6, cy - s * 1.6, s, s);
        g.fillRect(cx - s * 1.6, cy + s * 0.6, s, s);
        g.fillRect(cx + s * 0.6, cy + s * 0.6, s, s);
      } else if (this.face === 'heart') {
        // 像素心
        const s = U * 0.62;
        g.fillStyle = '#FF5252';
        g.fillRect(cx - s * 1.5, cy - s, s, s);
        g.fillRect(cx + s * 0.5, cy - s, s, s);
        g.fillRect(cx - s * 1.5, cy, s * 2, s);
        g.fillRect(cx - s * 0.75, cy + s, s * 1.5, s);
        g.fillStyle = EYE;
      } else if (this.face === 'sick') {
        // 病恹恹：无精打采的半闭眼
        g.fillStyle = EYE;
        g.fillRect(cx - 0.5 * U, cy - 0.1 * U, U, 0.55 * U);
      } else if (this.face === 'wide') {
        // 惊讶：竖条变高变抖
        const shake = Math.sin(t * 30 + side * 2) * 1.2;
        g.fillRect(cx - 0.5 * U + shake, cy - 1.5 * U, U, 3 * U);
      } else if (this.state === 'type') {
        // 官方打字眯眼：1×1，随 read-code 左右步进扫描
        const ph = (t % 1.5) / 1.5;
        const scan = ph > 0.85 ? -2 : Math.min(4, Math.floor(ph * 5)) - 2; // -2..2，回车弹回
        g.fillRect(cx - 0.5 * U + scan * U * 0.5, cy - 0.5 * U, U, U);
      } else {
        // 招牌竖条眼 1×2（官方），眨眼 scaleY→0.1
        const h = Math.max(0.15, 1 - blink) * 2;
        g.fillRect(cx - 0.5 * U, cy - h * U / 2, U, h * U);
      }
    }

    // 动作库：编舞嘴型覆盖
    const my = -4.1 * U;
    if (this.trickMouth === 'open') {
      g.fillStyle = EYE;
      g.beginPath(); g.ellipse(0, my + 2, 4.6, 3 + Math.abs(Math.sin(t * 8)) * 1.6, 0, 0, Math.PI * 2); g.fill();
    } else if (this.trickMouth === 'o') {
      g.fillStyle = EYE;
      g.beginPath(); g.arc(0, my + 1, 2.2, 0, Math.PI * 2); g.fill();
    } else if (this.trickMouth === 'flat') {
      g.beginPath(); g.moveTo(-4, my + 1); g.lineTo(4, my + 1); g.stroke();
    } else if (this.trickMouth === 'smile') {
      g.beginPath(); g.arc(0, my - 1, 5, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
    }

    // 吃东西/打哈欠：官方黑嘴块 3×2 @(6,10)
    if (this.face === 'eat') {
      const open = 0.5 + Math.abs(Math.sin(this.eatT * 11)) * 1.5;
      g.fillStyle = EYE;
      g.fillRect(-1.5 * U, -5 * U + (2 - open) * U * 0.5, 3 * U, open * U);
      g.fillStyle = '#000';
    }
  }

  /* --- 动作库：像素道具库（扁平风） --- */
  drawTrickProp(g, id, t) {
    const bob = Math.sin(t * 3) * 2;
    g.save();
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const at = (x, y) => { g.translate(x, y); };
    const pr = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x - w / 2, y - h / 2, w, h); };
    switch (id) {
      case 'guitar': at(44, -34); g.rotate(0.5 + Math.sin(t * 10) * 0.05); pr(0, 0, 10, 30, '#c9803f'); pr(0, -8, 22, 14, '#8a5a2b'); pr(-2, -8, 6, 6, '#33261e'); break;
      case 'drum': at(40, -30); pr(0, 0, 26, 14, '#e8e0d0'); pr(0, -8, 26, 4, '#c9503f'); break;
      case 'erhu': at(42, -36); pr(0, 0, 4, 30, '#7a5230'); pr(6, -12, 12, 12, '#c9c0a8'); break;
      case 'hat': at(40, -66 - bob); pr(0, 0, 26, 4, '#2a2a34'); pr(0, -8, 16, 14, '#2a2a34'); break;
      case 'yoyo': at(30, -30 + Math.sin(t * 5) * 14); pr(0, 0, 14, 14, '#e05a5a'); break;
      case 'brush': at(34, -46 + bob * 0.5); g.rotate(Math.sin(t * 12) * 0.3); pr(0, 0, 4, 16, '#7a5230'); pr(0, 9, 6, 6, '#e8e0d0'); break;
      case 'melon': at(38, -30 + bob * 0.4); g.beginPath(); g.arc(0, 0, 13, 0, Math.PI * 2); g.fillStyle = '#4a9e4a'; g.fill(); pr(0, -4, 20, 3, '#2e6e2e'); break;
      case 'boba': at(36, -44 + bob * 0.5); pr(0, 0, 12, 22, '#d8b98a'); pr(0, 6, 12, 5, '#6e4a2a'); break;
      case 'coffee': at(36, -44 + bob * 0.5); pr(0, 0, 14, 16, '#e8e0d0'); pr(0, -12, 14, 3, '#8a5a2b'); break;
      case 'book': at(38, -50 + bob * 0.5); pr(0, 0, 26, 18, '#e8e0d0'); pr(0, 0, 2, 18, '#c9503f'); break;
      case 'console': at(36, -46 + bob * 0.5); pr(0, 0, 24, 12, '#8a8a98'); pr(-6, -1, 4, 4, '#c9503f'); pr(6, -1, 4, 4, '#4a6ec9'); break;
      case 'rod': g.rotate(-0.5); pr(0, -20, 3, 44, '#7a5230'); g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, -20); g.quadraticCurveTo(16, 4, 8, 22); g.stroke(); break;
      case 'sprout': at(38, -34); pr(0, 0, 4, 14, '#4a9e4a'); pr(-5, -9, 7, 4, '#63c463'); pr(5, -9, 7, 4, '#63c463'); break;
      case 'easel': at(48, -48); pr(-8, 0, 3, 34, '#7a5230'); pr(8, 0, 3, 34, '#7a5230'); pr(0, -6, 26, 20, '#f0ead8'); pr(0, -6, 10, 8, '#6e6eff'); break;
      case 'camera': at(38, -52 + bob * 0.4); pr(0, 0, 22, 14, '#3a3a44'); pr(0, 0, 8, 8, '#1a1a24'); break;
      case 'kite': at(-52, -80 + bob); g.rotate(Math.sin(t * 2) * 0.1); pr(0, 0, 20, 14, '#e05a5a'); break;
      case 'tub': at(0, -18); pr(0, 0, 56, 20, '#e8e0d0'); pr(0, -8, 50, 10, '#a8d8ea'); break;
      case 'scope': at(38, -50 + bob * 0.5); g.rotate(-0.4); pr(0, 0, 6, 30, '#3a3a44'); break;
      case 'spa': at(0, -16); pr(0, 0, 60, 18, '#d8c9a8'); pr(0, -6, 54, 10, '#c9a26b'); break;
      case 'shades': at(0, -6.4 * U); pr(-6.5, 0, 9, 5, '#1a1a24'); pr(6.5, 0, 9, 5, '#1a1a24'); break;
      case 'blush': at(0, -7 * U); pr(-7, 0, 10, 10, '#ffb3c6'); pr(7, 0, 10, 10, '#ffb3c6'); break;
      case 'flag': at(46, -60); pr(0, -8, 3, 30, '#7a5230'); pr(8, -16, 18, 12, '#e05a5a'); break;
      case 'phone': at(34, -48 + bob * 0.5); pr(0, 0, 12, 20, '#2a2a34'); pr(0, -2, 8, 10, '#4aa3ff'); break;
      case 'drone': at(36, -74 + bob); pr(0, 0, 20, 8, '#3a3a44'); pr(-14, -2, 10, 3, '#3a3a44'); pr(14, -2, 10, 3, '#3a3a44'); break;
      case 'vr': at(0, -6.6 * U); pr(0, 0, 26, 12, '#2a2a3a'); pr(0, 0, 18, 8, '#4aa3ff'); break;
      case 'selfie': at(-44, -58 + bob * 0.5); pr(0, 0, 16, 22, '#3a3a44'); pr(0, 4, 12, 12, '#8ad8c9'); break;
      case 'qr': at(46, -64 + bob * 0.4); pr(0, 0, 22, 22, '#ffffff'); pr(-6, -6, 8, 8, '#1a1a24'); pr(6, 6, 6, 6, '#1a1a24'); break;
      case 'snowman': at(50, -30); pr(0, -14, 20, 20, '#ffffff'); pr(0, -32, 14, 14, '#ffffff'); pr(-3, -34, 3, 3, '#1a1a24'); pr(3, -34, 3, 3, '#1a1a24'); break;
      case 'mooncake': at(38, -34 + bob * 0.4); g.beginPath(); g.arc(0, 0, 12, 0, Math.PI * 2); g.fillStyle = '#d8a85a'; g.fill(); pr(0, 0, 18, 3, '#b8873e'); break;
      case 'zongzi': at(38, -32 + bob * 0.4); pr(0, 0, 18, 18, '#4a9e4a'); pr(0, 0, 12, 12, '#e8f0d8'); break;
      case 'lantern': at(42, -58 + bob * 0.6); pr(0, 0, 16, 20, '#e05a3a'); pr(0, -12, 10, 4, '#c9803f'); break;
      case 'umbrella': at(0, -9.4 * U); pr(0, 0, 52, 6, '#e05a5a'); pr(0, 6, 3, 26, '#7a5230'); break;
      case 'flower': at(-8 * U, -8.2 * U); g.font = '18px sans-serif'; g.fillText('🌸', 0, 0); break;
      case 'stargaze': at(-50, -90 + bob); g.font = '16px sans-serif'; g.fillText('✦', 0, 0); g.fillText('✧', 24, -14); break;
      case 'sunrise': at(-56, -40); pr(0, 0, 26, 10, '#ffb84a'); pr(0, -8, 18, 8, '#ff8f5a'); break;
      case 'wind': at(-60, -50); g.font = '16px sans-serif'; g.fillText('🌬️', 0, 0); break;
      case 'shell': at(36, -48 + bob * 0.5); pr(0, 0, 18, 20, '#e8c9a8'); pr(0, 0, 4, 16, '#c9a26b'); break;
      case 'starfish': at(40, -36 + bob * 0.5); g.font = '22px sans-serif'; g.fillText('⭐', 0, 0); break;
      case 'pearl': at(38, -48 + bob * 0.5); g.beginPath(); g.arc(0, 0, 9, 0, Math.PI * 2); g.fillStyle = '#e8e6f0'; g.fill(); g.beginPath(); g.arc(-3, -3, 3, 0, Math.PI * 2); g.fillStyle = '#ffffff'; g.fill(); break;
      case 'surf': at(0, -12); pr(0, 0, 60, 6, '#e8c9a8'); break;
      case 'snorkel': at(-30, -60); pr(0, 0, 4, 24, '#e0a63a'); break;
      case 'castle': at(52, -26); pr(0, 0, 34, 22, '#e8c988'); pr(-12, -12, 10, 10, '#e8c988'); pr(12, -12, 10, 10, '#e8c988'); break;
      case 'sunset': at(-60, -44); pr(0, 0, 30, 12, '#ff8f5a'); break;
      case 'zen': at(-44, -46); pr(0, 0, 26, 4, '#8a8a98'); break;
      case 'scroll': at(44, -52 + bob * 0.5); pr(0, 0, 24, 30, '#f0ead8'); pr(0, -8, 20, 2, '#8a7a5a'); pr(0, -2, 20, 2, '#8a7a5a'); break;
      case 'hoop': at(0, -5.6 * U); g.strokeStyle = '#ff8f5a'; g.lineWidth = 4; g.beginPath(); g.ellipse(0, 0, 5 * U, 1.6 * U, Math.sin(t * 8) * 0.1, 0, Math.PI * 2); g.stroke(); break;
      case 'teapot': at(38, -46 + bob * 0.5); pr(0, 0, 20, 14, '#4a9e8a'); pr(12, -2, 8, 4, '#4a9e8a'); pr(-6, -14, 6, 6, '#4a9e8a'); break;
      case 'shower': at(0, -9.6 * U); pr(0, 0, 22, 5, '#b8c0c8'); pr(0, 6, 12, 6, '#b8c0c8'); break;
      default:
        if (id.startsWith('_e')) { g.font = '26px "Segoe UI Emoji","Noto Color Emoji",sans-serif'; g.fillText(id.slice(2), 0, -6); }
        break;
    }
    g.restore();
  }

  /* --- Tamagotchi：蛋（孵化进度 = 摇晃加剧 + 裂纹增多） --- */
  drawEgg(g, t) {
    const eng = this.eng;
    const skin = this.skin.body;
    const p = eng.tama.hatchP;
    const wob = Math.sin(t * (2.2 + p * 9)) * (0.05 + p * 0.12);
    g.save();
    g.rotate(wob);
    g.fillStyle = skin;
    g.beginPath();
    g.ellipse(0, -4.1 * U, 3.1 * U, 4.2 * U, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(0,0,0,.14)';
    g.beginPath(); g.ellipse(-1.1 * U, -5.4 * U, 0.7 * U, 0.5 * U, 0.3, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(1.2 * U, -3.2 * U, 0.6 * U, 0.45 * U, -0.4, 0, Math.PI * 2); g.fill();
    if (p > 0.3) {
      g.strokeStyle = 'rgba(0,0,0,.5)';
      g.lineWidth = 1.6;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(-1.6 * U, -4.6 * U);
      g.lineTo(-0.6 * U, -4.1 * U);
      g.lineTo(-1.2 * U, -3.6 * U);
      if (p > 0.6) { g.moveTo(1.6 * U, -5.0 * U); g.lineTo(0.7 * U, -4.4 * U); g.lineTo(1.3 * U, -3.7 * U); }
      if (p > 0.85) { g.moveTo(-0.4 * U, -2.6 * U); g.lineTo(0.5 * U, -2.2 * U); }
      g.stroke();
    }
    g.restore();
    this.drawChargeRing(g);
  }

  /* --- Tamagotchi：退休纪念星碑（温和模式，没有死亡） --- */
  drawRetire(g, t) {
    g.save();
    g.fillStyle = '#a9a9b2';
    g.fillRect(-2.9 * U, -7.4 * U, 5.8 * U, 7.4 * U);
    g.fillStyle = '#8e8e98';
    g.fillRect(-3.4 * U, -1.1 * U, 6.8 * U, 1.1 * U);
    g.fillStyle = '#767680';
    g.fillRect(-2.9 * U, -7.4 * U, 5.8 * U, 0.5 * U);
    g.fillStyle = '#ffd76e';
    g.strokeStyle = '#e0a63a';
    g.lineWidth = 1;
    starPath(g, 0, -5.2 * U, 1.6 * U, -Math.PI / 2 + t * 0.8);
    g.fill();
    g.stroke();
    g.fillStyle = '#6e6e78';
    g.font = '700 ' + U * 1.1 + 'px ui-monospace,Consolas,monospace';
    g.textAlign = 'center';
    g.fillText('★ 退休啦', 0, -2.3 * U);
    g.restore();
  }

  drawChargeRing(g) {
    if (!(this.charge > 0.02 && this.charge < 1)) return;
    g.save();
    g.translate(0, -4.6 * U);
    g.strokeStyle = 'rgba(255,255,255,.3)';
    g.lineWidth = 4;
    g.beginPath();
    g.arc(0, 0, 4.3 * U, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = '#fff';
    g.lineCap = 'round';
    g.beginPath();
    g.arc(0, 0, 4.3 * U, -Math.PI / 2, -Math.PI / 2 + this.charge * Math.PI * 2);
    g.stroke();
    g.restore();
  }
}

function drawPoop(g, x, y) {
  g.save();
  g.fillStyle = '#8a5a3b';
  g.fillRect(x - 8, y - 8, 16, 8);
  g.fillRect(x - 5, y - 14, 10, 7);
  g.fillRect(x - 2.5, y - 19, 5, 6);
  g.fillStyle = '#a5714e';
  g.fillRect(x - 4, y - 13, 5, 3);
  g.restore();
}

function drawCookie(g, x, y, U) {
  g.save();
  g.translate(x, y);
  g.fillStyle = '#dca465';
  g.beginPath(); g.arc(0, 0, U * 1.25, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#8a5a2b';
  g.beginPath(); g.arc(-U * 0.4, -U * 0.35, U * 0.2, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(U * 0.4, U * 0.15, U * 0.18, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(-U * 0.05, U * 0.5, U * 0.16, 0, Math.PI * 2); g.fill();
  g.restore();
}

/* ============ 引擎 ============ */
function mount(opts) {
  opts = opts || {};
  const container = opts.container || document.body;
  const fixed = !opts.container;
  const prefix = opts.storageKey || 'clawd';
  const partMult = REDUCED ? 0.3 : 1;

  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const fxCanvas = document.createElement('canvas');
  fxCanvas.className = fixed ? 'cw-fx-fixed' : 'cw-fx';
  if (!fixed) { fxCanvas.style.width = '100%'; fxCanvas.style.height = '100%'; fxCanvas.style.zIndex = 1; }

  const wrap = document.createElement('div');
  wrap.className = 'cw-wrap' + (fixed ? '' : ' cw-abs');

  const canvas = document.createElement('canvas');
  canvas.className = 'cw-canvas';
  canvas.width = 260 * 2; canvas.height = 420 * 2;
  canvas.style.width = '260px'; canvas.style.height = '420px';

  const hit = document.createElement('div');
  hit.className = 'cw-hit';

  const bubble = document.createElement('div');
  bubble.className = 'cw-bubble';
  const bubbleText = document.createElement('span');
  bubble.appendChild(bubbleText);


  const card = document.createElement('div');
  card.className = 'cw-card';
  const cardT = document.createElement('span'); cardT.className = 't'; cardT.textContent = '⚠️ 需要批准';
  const cardD = document.createElement('span'); cardD.className = 'd';
  const cardOk = document.createElement('button'); cardOk.type = 'button'; cardOk.className = 'ok'; cardOk.textContent = '批准';
  card.appendChild(cardT); card.appendChild(cardD); card.appendChild(cardOk);

  wrap.appendChild(canvas);
  wrap.appendChild(hit);
  wrap.appendChild(bubble);
  wrap.appendChild(card);

  const corner = document.createElement('div');
  corner.className = 'cw-corner' + (fixed ? '' : ' cw-abs');
  corner.textContent = '🦀';
  corner.style.display = 'none';
  if (!fixed) { corner.style.right = '14px'; corner.style.bottom = '14px'; }

  const root = fixed ? document.body : container;
  root.appendChild(fxCanvas);
  root.appendChild(wrap);
  root.appendChild(corner);

  const eng = {
    W: 0, H: 0, groundY: 0,
    pointer: { x: 0, y: 0 },
    particles: new Particles(),
    fx: [],
    ball: null,
    cookie: null,
    zzzT: 0,
    forced: null,
    menuOpen: false,
    customBody: opts.color || null,
    autoSleep: opts.autoSleep !== false,
    onTap: typeof opts.onTap === 'function' ? opts.onTap : null,
    onDoubleTap: typeof opts.onDoubleTap === 'function' ? opts.onDoubleTap : null,
    soundOn: opts.sound === false ? false : store.get(prefix + '_sound', true),
    prefix, fixed, container, wrap, canvas, fxCanvas, corner, bubble, bubbleText, card, cardD, hit,
    dpr: Math.min(window.devicePixelRatio || 1, 2)
  };

  const ctx = canvas.getContext('2d');
  const fctx = fxCanvas.getContext('2d');

  function resize() {
    const r = container.getBoundingClientRect();
    eng.W = Math.max(140, fixed ? window.innerWidth : r.width);
    eng.H = Math.max(140, fixed ? window.innerHeight : r.height);
    eng.groundY = eng.H - (fixed ? 12 : 8);
    eng.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = 260 * eng.dpr; canvas.height = 420 * eng.dpr;
    fxCanvas.width = eng.W * eng.dpr; fxCanvas.height = eng.H * eng.dpr;
    if (!fixed) { fxCanvas.style.width = eng.W + 'px'; fxCanvas.style.height = eng.H + 'px'; }
    if (eng.clawd) {
      eng.clawd.x = clamp(eng.clawd.x, 54, eng.W - 54);
      eng.clawd.y = Math.min(eng.clawd.y, eng.groundY);
    }
  }
  resize();

  let ro = null, winResize = null;
  if (fixed) {
    winResize = () => resize();
    window.addEventListener('resize', winResize);
  } else if (window.ResizeObserver) {
    ro = new ResizeObserver(resize);
    ro.observe(container);
  }

  /* --- 气泡 --- */
  let bubbleTimer = null;
  eng.say = function (text, ms) {
    bubbleText.textContent = text;
    const nearTop = eng.clawd && eng.clawd.y < 190;
    bubble.classList.toggle('below', nearTop);
    bubble.classList.toggle('cw-up', (eng.statsOpen || card.classList.contains('on')) && !nearTop);
    bubble.classList.remove('on');
    void bubble.offsetWidth;
    bubble.classList.add('on');
    if (bubbleTimer) clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubble.classList.remove('on'), ms || 2400);
  };

  eng.play = function (name, arg) {
    if (!eng.soundOn) return;
    if (Sound[name]) Sound[name](arg);
  };

  /* --- 批准卡片 --- */
  function showCard(detail) {
    cardD.textContent = detail || 'Claude 想执行一个操作';
    const nearTop = eng.clawd && eng.clawd.y < 200;
    card.classList.toggle('down', nearTop);
    card.classList.add('on');
  }
  function hideCard() { card.classList.remove('on'); }
  cardOk.addEventListener('click', (e) => {
    e.stopPropagation();
    hideCard();
    if (eng.forced && eng.forced.state === 'alert') eng.clearForced();
    const clawd = eng.clawd;
    clawd.interact();
    clawd.setState('happy', 1.2);
    eng.play('pop');
    eng.say('批准啦！咔嚓～');
    const n = Math.round(rand(3, 5) * partMult) + 1;
    for (let i = 0; i < n; i++) eng.particles.heart(clawd.x + rand(-30, 30), clawd.y - rand(50, 85));
  });
  card.addEventListener('pointerdown', (e) => e.stopPropagation());

  /* --- 菜单 --- */
  const ACTIONS = [
    { id: 'stats', icon: '📊', title: '状态面板' },
    { id: 'feed', icon: '🍪', title: '喂饼干' },
    { id: 'clean', icon: '🧹', title: '打扫干净' },
    { id: 'meds', icon: '💊', title: '喂药治病' },
    { id: 'play', icon: '🎾', title: '陪它玩毛线球' },
    { id: 'sleep', icon: '💤', title: '哄睡觉' },
    { id: 'skin', icon: '🎨', title: '换个壳色' },
    { id: 'sound', icon: '🔊', title: '音效开关' },
    { id: 'hide', icon: '✕', title: '先躲起来' }
  ];

  /* --- 长按轮盘菜单 --- */
  const radial = document.createElement('div');
  radial.className = 'cw-radial';
  radial.setAttribute('aria-label', 'Clawd 快捷菜单');
  wrap.appendChild(radial);
  let soundBtn = null;
  for (const a of ACTIONS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = a.icon;
    b.setAttribute('aria-label', a.title);
    b.setAttribute('data-tooltip', a.title);
    if (a.id === 'sound') soundBtn = b;
    b.addEventListener('pointerdown', (e) => e.stopPropagation());
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      doAction(a.id);
    });
    radial.appendChild(b);
  }

  function openRadial() {
    hideMenuNow();
    const clawd = eng.clawd;
    // 贴墙时整体内收，保证按钮不出容器
    const R = 88, cy = -46;
    let dx = 0;
    if (clawd.x < R + 24) dx = R + 24 - clawd.x;
    if (clawd.x > eng.W - R - 24) dx = (eng.W - R - 24) - clawd.x;
    const kids = radial.children;
    for (let i = 0; i < kids.length; i++) {
      const a = Math.PI + ((i + 0.5) * Math.PI) / 6; // 上半弧均分
      kids[i].style.left = dx + Math.cos(a) * R + 'px';
      kids[i].style.top = cy + Math.sin(a) * R + 'px';
      kids[i].style.transitionDelay = REDUCED ? '0ms' : i * 45 + 'ms';
    }
    radial.classList.add('on');
    eng.radialOpen = true;
    eng.menuOpen = true; // 静止逻辑：轮盘/面板打开时蟹站定
    // 记录各选项中心（容器坐标），供「拖拽选择」命中判定
    eng.radialCenters = [];
    for (let i = 0; i < kids.length; i++) {
      const a = Math.PI + ((i + 0.5) * Math.PI) / 6;
      eng.radialCenters.push({ x: clawd.x + dx + Math.cos(a) * R, y: clawd.y + cy + Math.sin(a) * R });
      kids[i].style.transitionDelay = REDUCED ? '0ms' : i * 45 + 'ms';
    }
    eng.radialSel = null;
    setTimeout(() => { for (const k of kids) k.style.transitionDelay = '0ms'; }, 550); // 弹出动画结束后取消延迟，选中高亮要即时
    eng.play('pop');
    clawd.interact();
  }
  function setRadialSel(i) {
    if (eng.radialSel === i) return;
    const kids = radial.children;
    for (let k = 0; k < kids.length; k++) kids[k].classList.toggle('sel', k === i);
    eng.radialSel = i;
    if (i != null) eng.play('clicky');
  }
  function updateRadialHover(px, py) {
    const centers = eng.radialCenters || [];
    let best = null, bestD = 1e9;
    for (let i = 0; i < centers.length; i++) {
      const d = Math.hypot(px - centers[i].x, py - centers[i].y);
      if (d < bestD) { bestD = d; best = i; }
    }
    setRadialSel(best != null && bestD <= 40 ? best : null);
  }
  function closeRadial() {
    if (!eng.radialOpen) return;
    radial.classList.remove('on');
    eng.radialOpen = false;
    eng.radialSel = null;
    eng.radialCenters = null;
    for (const k of radial.children) { k.classList.remove('sel'); k.style.transitionDelay = '0ms'; }
    if (!eng.statsOpen) {
      eng.menuOpen = false;
      bubble.classList.remove('cw-up');
    }
  }

  function refreshSoundIcon() {
    if (soundBtn) soundBtn.textContent = eng.soundOn ? '🔊' : '🔇';
  }
  refreshSoundIcon();

  function doAction(id) {
    const clawd = eng.clawd;
    const tm = eng.tama;
    if (tm && tm.retired && id !== 'stats' && id !== 'sound' && id !== 'hide') {
      hideMenuNow();
      eng.say('它退休去星海了…（📊 领养新蛋）', 2600);
      return;
    }
    clawd.interact();
    hideMenuNow();
    switch (id) {
      case 'stats': toggleStats(); break;
      case 'feed': startFeed(); break;
      case 'clean':
        cleanAction();
        break;
      case 'meds':
        medsAction();
        break;
      case 'play': startPlay(); break;
      case 'sleep':
        if (clawd.state !== 'sleep') { eng.forced = null; hideCard(); clawd.setState('sleep'); }
        break;
      case 'skin': {
        eng.customBody = null; // 手动换肤 = 脱掉主题色，回到官方壳色
        const i = SKIN_KEYS.indexOf(clawd.skinKey);
        clawd.skinKey = SKIN_KEYS[(i + 1) % SKIN_KEYS.length];
        store.set(prefix + '_skin', clawd.skinKey);
        eng.play('sparkle');
        eng.say(pick(LINES.skin));
        const n = Math.round(8 * partMult);
        for (let k = 0; k < n; k++) eng.particles.spark(clawd.x + rand(-40, 40), clawd.y - rand(10, 80));
        break;
      }
      case 'sound':
        eng.soundOn = !eng.soundOn;
        store.set(prefix + '_sound', eng.soundOn);
        refreshSoundIcon();
        if (eng.soundOn) { eng.play('chirp'); eng.say('咔嚓～'); }
        else eng.say('（安静模式）');
        break;
      case 'hide': hidePet(); break;
    }
  }

  function hideMenuNow() {
    closeRadial();
  }
  // 点击小蟹/轮盘以外的地方 → 收起一切面板
  document.addEventListener('pointerdown', (e) => {
    if (!eng.menuOpen) return;
    if (wrap.contains(e.target)) return;
    hideMenuNow();
    closeStats();
  }, true);
  hit.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (eng.radialOpen) closeRadial();
    else openRadial();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeRadial(); closeStats(); }
  });

  /* --- 隐藏 / 恢复 --- */
  let hidden = store.get(prefix + '_hidden', false);
  function hidePet() {
    hidden = true;
    store.set(prefix + '_hidden', true);
    wrap.style.display = 'none';
    fxCanvas.style.display = 'none';
    corner.style.display = 'grid';
  }
  function showPet() {
    hidden = false;
    store.set(prefix + '_hidden', false);
    wrap.style.display = '';
    fxCanvas.style.display = '';
    corner.style.display = 'none';
    eng.clawd.interact();
    eng.clawd.setState('happy', 1.2);
    eng.say('我回来啦～');
  }
  corner.addEventListener('click', showPet);
  if (hidden) { wrap.style.display = 'none'; fxCanvas.style.display = 'none'; corner.style.display = 'grid'; }

  /* --- 喂食 / 玩耍 --- */
  function startFeed() {
    const clawd = eng.clawd;
    const tm = eng.tama;
    if (eng.cookie) return;
    if (tm) {
      if (tm.retired) { eng.say('退休的蟹不吃东西咔…'); return; }
      if (!tm.hatched) { eng.say('还是颗蛋咔…孵出来再吃'); return; }
      if (tm.clockSleep) { eng.say('它在睡觉，醒来再喂咔…'); return; }
      if (tm.fullness > 90) { eng.say(pick(LINES.refuse)); return; }
    }
    if (clawd.state === 'sleep') clawd.setState('idle', 0.1);
    eng.cookie = { x: clamp(clawd.x + rand(-16, 16), 46, eng.W - 46), y: clawd.y - 205, vy: 0, eating: false, t: 0 };
    clawd.setState('wait');
    clawd.lookOverride = { x: 0, y: -0.9 };
    eng.say('哇！是饼干！');
  }
  function startPlay() {
    if (eng.ball) return;
    const clawd = eng.clawd;
    const tm = eng.tama;
    if (tm) {
      if (tm.retired) { eng.say('退休的蟹只想看星星咔…'); return; }
      if (!tm.hatched) { eng.say('蛋蛋不会玩毛线球咔…'); return; }
      if (tm.clockSleep) { eng.say('它在睡觉，醒来再玩咔…'); return; }
      if (tm.sick) { eng.say('病着呢…先吃💊吧'); return; }
      if (tm.energy < 15) { eng.say(pick(LINES.refusePlay)); clawd.setState('sleep'); return; }
      const nowT = Date.now();
      if (nowT < tm.cd.play) { eng.say(pick(['刚玩过咔…歇一会', '钳子有点酸…']), 1800); return; }
      tm.cd.play = nowT + CFG.cd.play;
      tm.energy = clamp(tm.energy - 5, 0, 100);
    }
    if (clawd.state === 'sleep') clawd.setState('idle', 0.1);
    eng.ball = { x: rand(eng.W * 0.2, eng.W * 0.8), y: -20, vx: rand(-90, 90), vy: 0, rot: 0, alpha: 1, dying: false, kicks: 0, t: 0, color: '#e05a5a' };
    clawd.setState('chase');
  }
  function cleanAction() {
    const tm = eng.tama;
    if (!tm.hatched) { eng.say('蛋蛋很干净咔…'); return; }
    if (tm.clockSleep) eng.say('它睡着呢…（轻手轻脚打扫）', 1800);
    if (!tm.poops.length && tm.cleanliness > 90) { eng.say('明明就很干净咔！'); return; }
    const nowT = Date.now();
    const hasPoop = tm.poops.length > 0;
    if (!hasPoop && nowT < tm.cd.bath) { eng.say('刚洗过咔…壳都搓红了', 1800); return; }
    tm.cd.bath = nowT + CFG.cd.bath;
    tm.poops.length = 0;
    tm.cleanliness = 100;
    tm.happiness = clamp(tm.happiness + 4, 0, 100);
    eng.say(pick(LINES.clean));
    eng.play('sparkle');
    const clawd = eng.clawd;
    const n = Math.round(8 * partMult);
    for (let k = 0; k < n; k++) eng.particles.spark(clawd.x + rand(-60, 60), clawd.y - rand(6, 40));
  }
  function medsAction() {
    const tm = eng.tama;
    if (!tm.hatched) { eng.say('蛋蛋不用吃药咔…'); return; }
    if (tm.illnessLevel === 0) { eng.say(pick(LINES.medsHealthy)); return; }
    const nowT = Date.now();
    if (nowT < tm.cd.meds) { eng.say('药要隔半小时再吃咔…', 1800); return; }
    tm.cd.meds = nowT + CFG.cd.meds;
    tm.illnessLevel = Math.max(0, tm.illnessLevel - 1);
    tm.illnessUpMs = 0;
    if (tm.illnessLevel === 0) diary('cure', '病好啦！健康回满');
    tm.health = clamp(tm.health + 10, CFG.gentleFloor, 100);
    tm.happiness = clamp(tm.happiness + 6, 0, 100);
    eng.say(tm.illnessLevel ? '好一点了…还要再吃一次' : pick(LINES.meds));
    eng.play('pop');
    for (let k = 0; k < 4; k++) eng.particles.heart(eng.clawd.x + rand(-24, 24), eng.clawd.y - rand(60, 90));
  }

  /* --- 指针交互 --- */
  let dragging = false;
  let downT = 0, downX = 0, downY = 0, moved = false, lastTap = 0;
  let pressTimer = 0, longPressFired = false;

  function toLocal(e) {
    if (fixed) return { x: e.clientX, y: e.clientY };
    const r = container.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  window.addEventListener('pointermove', (e) => {
    const p = toLocal(e);
    eng.pointer.x = p.x; eng.pointer.y = p.y;
  }, { passive: true });

  hit.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const clawd = eng.clawd;
    const p = toLocal(e);
    eng.pointer.x = p.x; eng.pointer.y = p.y;
    dragging = true; moved = false;
    downT = performance.now(); downX = p.x; downY = p.y;
    clawd.interact();
    clawd.grabDX = undefined; clawd.grabDY = undefined;
    try { hit.setPointerCapture(e.pointerId); } catch (err) {}
    // 长按蓄力：按住不动 500ms → 轮盘菜单；轮盘已开 → 直接进入「拖拽选择」模式
    longPressFired = false;
    clearTimeout(pressTimer);
    if (eng.radialOpen) {
      eng.press = null;
      dragging = true; // 保持拖拽选择语义：松手执行高亮项
      updateRadialHover(p.x, p.y);
      return;
    }
    eng.press = { t0: performance.now() };
    pressTimer = setTimeout(() => {
      pressTimer = 0;
      eng.press = null;
      if (moved || !dragging) return;
      longPressFired = true;
      openRadial();
    }, LONG_PRESS_MS);
    if (clawd.state === 'sleep') {
      if (eng.forced && eng.forced.state === 'sleep') eng.clearForced();
      clawd.setState('idle', rand(0.6, 1.2));
      eng.say(pick(LINES.wake));
    }
  });

  hit.addEventListener('pointermove', (e) => {
    const p0 = toLocal(e);
    if (eng.radialOpen) { updateRadialHover(p0.x, p0.y); return; } // 拖拽选择：Clawd 不动
    if (!dragging) return;
    const p = p0;
    if (!moved && Math.hypot(p.x - downX, p.y - downY) > 9) {
      moved = true;
      eng.press = null;
      clearTimeout(pressTimer);
      const clawd = eng.clawd;
      clawd.grabDX = clamp(clawd.x - p.x, -40, 40);
      clawd.grabDY = clamp(clawd.y - p.y, 14, 60);
      clawd.vx = 0; clawd.vy = 0;
      clawd.setState('drag');
    }
  });

  function release(e) {
    clearTimeout(pressTimer);
    eng.press = null;
    if (!dragging) return;
    dragging = false;
    if (eng.radialOpen) {
      // 拖拽选择：松手执行高亮项；未选中则保持菜单可点选
      const sel = eng.radialSel;
      const act = sel == null ? null : ACTIONS[sel];
      closeRadial();
      if (act) doAction(act.id);
      return;
    }
    if (longPressFired) { longPressFired = false; return; } // 长按松手：菜单已开，不算点击也不算投掷
    const clawd = eng.clawd;
    const p = toLocal(e);
    const dur = performance.now() - downT;
    if (!moved && dur < 350) {
      if (performance.now() - lastTap < 350) {
        lastTap = 0;
        if (eng.onDoubleTap) eng.onDoubleTap(e);
        else if (!eng.cookie) startFeed();
      } else {
        lastTap = performance.now();
        if (eng.onTap) eng.onTap(e);
        else clawd.startRandomTrick(); // 单击 = 随机播放一个动作
      }
    } else {
      clawd.setState('thrown');
    }
  }
  hit.addEventListener('pointerup', release);
  hit.addEventListener('pointercancel', () => {
    clearTimeout(pressTimer);
    eng.press = null;
    longPressFired = false;
    if (dragging) { dragging = false; eng.clawd.setState('thrown'); }
  });

  function petClawd() {
    const clawd = eng.clawd;
    const tm = eng.tama;
    if (tm && tm.retired) { eng.say('它去星海旅行了…（📊 领养新蛋）', 3200); return; }
    if (tm && !tm.hatched) {
      tm.hatchP = clamp(tm.hatchP + 0.15, 0, 1); // 蛋期轻触加速孵化
      eng.play('pop');
      eng.say(pick(['咔咔咔…壳在响！', '快了快了！', '（蛋蛋在颤抖）']), 1800);
      return;
    }
    if (tm) {
      const nowT = Date.now();
      if (nowT < tm.cd.pet) {
        eng.say(pick(['咕噜…（刚摸过，先歇歇）', '摸舒服了咔…', '（眯眼享受）']), 1800);
        return;
      }
      tm.cd.pet = nowT + CFG.cd.pet;
      tm.bond = clamp(tm.bond + 2, 0, 100);
      tm.happiness = clamp(tm.happiness + 5, 0, 100);
      tm.careExp += 1; // 陪伴经验
    }
    clawd.setState('happy', 1.15);
    clawd.sqV -= 0.55;
    clawd.affection++;
    eng.play('purr');
    const n = Math.round(rand(3, 5) * partMult) + 1;
    for (let i = 0; i < n; i++) eng.particles.heart(clawd.x + rand(-30, 30), clawd.y - rand(50, 85));
    if (clawd.affection === 10) { eng.say(pick(LINES.pet10), 3000); for (let i = 0; i < 6; i++) eng.particles.heart(clawd.x + rand(-40, 40), clawd.y - rand(60, 100), true); }
    else if (clawd.affection === 30) { eng.say(pick(LINES.pet30), 3200); for (let i = 0; i < 9; i++) eng.particles.heart(clawd.x + rand(-50, 50), clawd.y - rand(60, 110), true); }
    else eng.say(pick(LINES.pet));
    eng.play('pop');
  }

  if (!fixed) {
    container.addEventListener('pointerdown', (e) => {
      if (e.target !== container && e.target !== fxCanvas) return;
      const p = toLocal(e);
      eng.pointer.x = p.x; eng.pointer.y = p.y;
      const clawd = eng.clawd;
      eng.fx.push({ x: p.x, y: p.y, life: 0, max: 0.5 });
      if (clawd.state === 'sleep' || clawd.state === 'drag' || eng.cookie) return;
      clawd.interact();
      clawd.targetX = clamp(p.x, 54, eng.W - 54);
      clawd.setState('run');
    });
  }

  /* --- 物理小物件 --- */
  function updateBall(dt) {
    const b = eng.ball;
    if (!b) return;
    b.t += dt;
    b.vy += 950 * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.rot += b.vx * dt * 0.06;
    const r = 10, g = eng.groundY;
    if (b.y > g - r) {
      b.y = g - r;
      if (Math.abs(b.vy) > 60) { b.vy *= -0.62; b.vx *= 0.88; }
      else { b.vy = 0; b.vx *= 0.96; }
    }
    if (b.x < r) { b.x = r; b.vx *= -0.72; }
    if (b.x > eng.W - r) { b.x = eng.W - r; b.vx *= -0.72; }
    if (b.dying) { b.alpha -= dt * 1.6; if (b.alpha <= 0) eng.ball = null; }
    else if (b.t > 12) b.dying = true;
  }

  function updateCookie(dt) {
    const c = eng.cookie;
    if (!c || c.eating) return;
    const clawd = eng.clawd;
    c.vy += 1500 * dt;
    c.y += c.vy * dt;
    const mouthY = clawd.y - 30;
    if (c.y >= mouthY && Math.abs(c.x - clawd.x) < 60) {
      c.eating = true;
      clawd.eatT = 0;
      clawd.setState('eat');
      eng.play('munch');
    } else if (c.y > eng.groundY - 6) {
      c.y = eng.groundY - 6;
      c.eating = true;
      clawd.eatT = 0;
      clawd.setState('eat');
      eng.play('munch');
    }
  }

  /* ============ Tamagotchi 系统 v2（规格化实现：温和模式 / 墙钟时间权威 / 成长分支） ============ */
  const TAMA_V = 3;
  const CFG = {
    stages: { egg: 60e3, baby: 3600e3, child: 24 * 3600e3, teen: 48 * 3600e3, adult: 72 * 3600e3, senior: 48 * 3600e3 },
    scale: { baby: 0.66, child: 0.78, teen: 0.88, adult: 1, senior: 0.94 },
    mult: { baby: 1.4, child: 1.1, teen: 1.0, adult: 0.9, senior: 1.1 },
    offlineCapH: 12,
    gentleFloor: 20,
    sleepStart: 22, sleepEnd: 8,
    cd: { pet: 15 * 60000, play: 15 * 60000, meds: 30 * 60000, bath: 60 * 60000 },
    urgentEnter: 15, urgentExit: 30,
    adverseNeedMs: 60 * 60000, illnessUpMs: 120 * 60000, illnessMax: 3,
    protectAfterHatchMs: 30 * 60000
  };
  const STAGE_NAMES = { egg: '蛋', baby: '婴儿蟹', child: '幼年蟹', teen: '少年蟹', adult: '成年Clawd', senior: '老年Clawd' };
  const FORMS = {
    sporty: { name: '运动型', why: '常和它玩毛线球，练出了一身钳子肌肉！' },
    curious: { name: '好奇型', why: '总在四处横着探索，见识越来越广！' },
    companion: { name: '陪伴型', why: '最喜欢贴着你了，温柔都长进了壳里！' },
    hidden: { name: '钳皇', why: '照料完美、亲密无间——传说中的钳皇觉醒了！' }
  };
  const PERSONALITIES = ['活泼', '好奇', '害羞', '贪吃', '慢性子'];

  function tamaDefaults(now) {
    return {
      v: TAMA_V, gen: 1, name: '', birth: now, lastSim: now,
      stage: 'egg', stageElapsed: 0, activeAge: 0, hatched: false, hatchP: 0,
      fullness: 70, happiness: 70, cleanliness: 90, energy: 80, health: 100, bond: 10, weight: 12,
      personalityId: pick(PERSONALITIES), formId: '',
      illnessLevel: 0, illnessUpMs: 0, adverseMs: 0,
      digestAt: 0, poops: [],
      careIntegral: 0, careDur: 0, mistakes: 0,
      emer: { full: false, hap: false, clean: false },
      cd: { pet: 0, play: 0, meds: 0, bath: 0 },
      playExp: 0, careExp: 0, walkDist: 0,
      diary: [], retired: false, retiredAt: 0, pastGens: 0,
      clockSleep: false, protectH: 0
    };
  }
  function tamaMigrate(s) {
    const tm = tamaDefaults(Date.now());
    if (!s || typeof s !== 'object') return tm;
    if (s.v === 1 || s.v === 2) {
      tm.birth = s.birth || tm.birth;
      tm.hatchP = s.hatchP || 0;
      tm.hatched = !!s.hatched;
      tm.stage = s.hatched ? (s.stage === 'teen' ? 'teen' : s.stage === 'adult' ? 'adult' : 'baby') : 'egg';
      tm.fullness = s.hunger != null ? s.hunger : tm.fullness;
      tm.happiness = s.happy != null ? s.happy : tm.happiness;
      tm.energy = s.energy != null ? s.energy : tm.energy;
      tm.cleanliness = s.clean != null ? s.clean : tm.cleanliness;
      tm.health = s.health != null ? s.health : tm.health;
      tm.bond = s.affection != null ? Math.min(100, s.affection) : tm.bond;
      tm.weight = s.weight || tm.weight;
      tm.poops = Array.isArray(s.poops) ? s.poops : [];
      tm.illnessLevel = s.sick ? 1 : 0;
      tm.lastSim = Date.now();
      return tm;
    }
    if (s.v === TAMA_V) return Object.assign(tm, s);
    return tm;
  }
  function tamaLoad() {
    let tm = null, corrupt = false;
    let raw = null;
    try { raw = store.get(prefix + '_tama', null); } catch (e) { raw = null; }
    if (raw) {
      try { tm = tamaMigrate(raw); } catch (e) { corrupt = true; tm = null; }
      if (tm && (!isFinite(tm.fullness) || !isFinite(tm.health))) { corrupt = true; tm = null; }
    }
    if (!tm) {
      const bak = store.get(prefix + '_tama_bak', null);
      try { if (bak) tm = tamaMigrate(bak); } catch (e) { tm = null; }
    }
    if (!tm) tm = tamaDefaults(Date.now());
    if (corrupt) tm.corruptRecovered = true;
    return tm;
  }
  function tamaSave() {
    const tm = eng.tama;
    if (!tm || viewerMode) return;
    try {
      const prev = store.get(prefix + '_tama', null);
      if (prev) store.set(prefix + '_tama_bak', prev);
      if (eng.clawd) tm.affection = eng.clawd.affection;
      store.set(prefix + '_tama', tm);
    } catch (e) { /* 存储异常静默重试 */ }
  }
  function diary(e, text) {
    const tm = eng.tama;
    tm.diary.push({ t: Date.now(), e, text });
    if (tm.diary.length > 200) tm.diary.splice(0, tm.diary.length - 200);
  }
  function tamaAgeText() {
    const tm = eng.tama;
    const ms = tm.activeAge * 1000;
    const d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000);
    if (d > 0) return d + '天' + h + '小时';
    const mi = Math.floor(ms / 60000);
    return mi < 1 ? '刚出生' : mi + '分钟';
  }
  function careScore(tm) {
    if (tm.careDur <= 0) return 0;
    return clamp(Math.round(tm.careIntegral / tm.careDur - Math.min(20, 5 * tm.mistakes)), 0, 100);
  }
  function isSleepHour(date) {
    const h = date.getHours();
    return h >= CFG.sleepStart || h < CFG.sleepEnd;
  }
  function nextWakeMs(tMs) {
    const d = new Date(tMs);
    d.setHours(CFG.sleepEnd, 0, 0, 0);
    if (d.getTime() <= tMs) d.setDate(d.getDate() + 1);
    return d.getTime();
  }

  /* --- 时间权威：唯一入口。墙钟同步 + ≤60s 固定步长 + 离线 12h 保护 --- */
  function tamaSync(nowMs) {
    const tm = eng.tama;
    if (!tm || viewerMode) return;
    if (tm.retired) { tm.lastSim = Math.max(tm.lastSim, nowMs); return; }
    const wallDelta = nowMs - tm.lastSim;
    if (wallDelta <= 0) return; // 时间倒退：不推进不倒扣
    const simDelta = Math.min(wallDelta, CFG.offlineCapH * 3600e3);
    const protectH = (wallDelta - simDelta) / 3600e3;
    let t = nowMs - simDelta;
    while (t < nowMs) {
      const step = Math.min(60000, nowMs - t);
      tamaStep(tm, t, step / 1000);
      t += step;
    }
    tm.lastSim = nowMs;
    if (protectH >= 1) {
      eng.say('离开了 ' + Math.round(wallDelta / 3600e3) + ' 小时，后面 ' + Math.round(protectH) + ' 小时被温柔保护了咔', 4200);
      tm.protectH = (tm.protectH || 0) + protectH;
    }
  }
  function tamaStep(tm, tMs, sec) {
    const date = new Date(tMs);
    const clockSleep = isSleepHour(date);
    tm.clockSleep = clockSleep;
    const mult = CFG.mult[tm.stage] || 1;
    const hr = sec / 3600;
    if (!tm.hatched) {
      tm.hatchP = clamp(tm.hatchP + sec / 60, 0, 1); // 蛋 60 秒（轻触可加速）
      if (tm.hatchP >= 1) tamaHatch(tMs);
      return;
    }
    tm.activeAge += sec;
    tm.stageElapsed += sec * 1000;
    // 六项状态（睡眠时段应用修正倍率）
    tm.fullness = clamp(tm.fullness - 3 * mult * (clockSleep ? 0.15 : 1) * hr, 0, 100);
    tm.happiness = clamp(tm.happiness - 2 * mult * (clockSleep ? 0.10 : 1) * hr, 0, 100);
    tm.cleanliness = clamp(tm.cleanliness - (2 + tm.poops.length) * (clockSleep ? 0.25 : 1) * hr, 0, 100);
    if (clockSleep || eng.clawd.state === 'sleep') tm.energy = clamp(tm.energy + 10 * hr, 0, 100);
    else tm.energy = clamp(tm.energy - 4 * mult * hr, 0, 100);
    // 疾病：恶劣暴露累积（仅清醒），60 分钟 → 1 级，120 分钟升级，最高 3 级
    const adverseNow = !clockSleep && (tm.cleanliness < 20 || tm.fullness < 10);
    if (adverseNow) tm.adverseMs += sec * 1000;
    else if (tm.cleanliness >= 20 && tm.fullness >= 10) tm.adverseMs = Math.max(0, tm.adverseMs - sec * 2000);
    const protectedNow = Date.now() - tm.birth < CFG.protectAfterHatchMs;
    if (!protectedNow && tm.illnessLevel === 0 && tm.adverseMs >= CFG.adverseNeedMs) {
      tm.illnessLevel = 1; tm.illnessUpMs = 0; tm.adverseMs = 0;
      diary('sick', '第一次生病了…快喂💊');
      eng.say(pick(LINES.sick), 3000);
    }
    if (tm.illnessLevel > 0) {
      tm.illnessUpMs += sec * 1000;
      if (tm.illnessUpMs >= CFG.illnessUpMs && tm.illnessLevel < CFG.illnessMax) { tm.illnessLevel++; tm.illnessUpMs = 0; }
      tm.health = clamp(tm.health - (2 * tm.illnessLevel + (adverseNow ? 1 : 0)) * hr, CFG.gentleFloor, 100);
    } else if (tm.fullness >= 40 && tm.happiness >= 40 && tm.cleanliness >= 40 && tm.energy >= 20) {
      tm.health = clamp(tm.health + 1 * hr, 0, 100); // 自然恢复
    } else {
      tm.health = clamp(tm.health, CFG.gentleFloor, 100); // 温和模式保底
    }
    // 消化事件：到点若在睡觉 → 推迟到醒来
    if (tm.digestAt && tMs >= tm.digestAt) {
      if (clockSleep) tm.digestAt = nextWakeMs(tMs);
      else {
        tm.digestAt = 0;
        if (tm.poops.length < 3) { tm.poops.push(clamp(eng.clawd.x + rand(-40, 40), 46, eng.W - 46)); tm.cleanliness = clamp(tm.cleanliness - 5, 0, 100); }
        else tm.cleanliness = clamp(tm.cleanliness - 3, 0, 100);
      }
    }
    // 紧急需求 episode：滞回（<15 进，≥30 出）+ 清醒 30 分钟未处理记 1 次遗漏
    const eps = [['full', tm.fullness], ['hap', tm.happiness], ['clean', tm.cleanliness]];
    for (const ep of eps) {
      const k = ep[0], v = ep[1];
      const st = tm.emer[k];
      if (!st && v < CFG.urgentEnter) tm.emer[k] = { since: tMs, handled: false };
      else if (st && v >= CFG.urgentExit) tm.emer[k] = false;
      else if (st && !st.handled && !clockSleep && tMs - st.since >= 30 * 60000) { st.handled = true; tm.mistakes++; }
    }
    // 照料分积分（睡眠计入）
    const Q = 0.30 * tm.fullness + 0.25 * tm.happiness + 0.20 * tm.cleanliness + 0.15 * tm.energy + 0.10 * tm.health;
    tm.careIntegral += Q * sec;
    tm.careDur += sec;
    // 阶段推进
    const dur = CFG.stages[tm.stage];
    if (dur && tm.stageElapsed >= dur && tm.hatched) advanceStage(tMs);
  }
  function advanceStage(tMs) {
    const tm = eng.tama;
    const next = { baby: 'child', child: 'teen', teen: 'adult', adult: 'senior', senior: 'retire' }[tm.stage];
    if (!next) return;
    const care = careScore(tm);
    if (next === 'retire') { tamaRetire(tMs, care); return; }
    tm.stage = next;
    tm.stageElapsed = 0;
    if (next === 'adult') judgeForm(care);
    eng.clawd.setState('happy', 1.6);
    eng.say(next === 'senior' ? '岁数大了咔…节奏慢下来陪你' : pick(LINES.evolve), 3400);
    eng.play('sparkle');
    diary('evolve', '进化成了' + STAGE_NAMES[next] + '（照料 ' + care + ' 分）');
    const n = Math.round(12 * partMult);
    for (let k = 0; k < n; k++) eng.particles.spark(eng.clawd.x + rand(-50, 50), eng.clawd.y - rand(20, 100));
  }
  function judgeForm(care) {
    const tm = eng.tama;
    const exps = { play: tm.playExp, explore: Math.floor(tm.walkDist / 300), care: tm.careExp };
    let formId;
    const all50 = exps.play >= 50 && exps.explore >= 50 && exps.care >= 50;
    if (care >= 85 && tm.bond >= 80 && all50 && tm.mistakes === 0) formId = 'hidden';
    else if (exps.play < 10 && exps.explore < 10 && exps.care < 10) formId = 'companion';
    else formId = (exps.play >= exps.explore && exps.play >= exps.care) ? 'sporty' : (exps.explore >= exps.care ? 'curious' : 'companion');
    tm.formId = formId;
    diary('form', '长成了「' + FORMS[formId].name + '」——' + FORMS[formId].why);
    setTimeout(() => eng.say('长成了「' + FORMS[formId].name + '」！' + FORMS[formId].why, 5000), 2600);
  }
  function tamaHatch(tMs) {
    const tm = eng.tama;
    tm.hatched = true;
    tm.stage = 'baby';
    tm.stageElapsed = 0;
    eng.clawd.affection = tm.bond;
    eng.clawd.setState('happy', 1.6);
    eng.say(tm.name ? ('破壳啦！' + tm.name + '报到！') : pick(LINES.hatch), 3600);
    if (!tm.name) setTimeout(() => { if (!tm.name && eng.say) eng.say('去 📊 给我起个名字吧！', 3600); }, 3800);
    diary('hatch', '破壳而出' + (tm.name ? '，名字叫 ' + tm.name : ''));
    eng.play('boing', 0.6);
    const n = Math.round(12 * partMult);
    for (let k = 0; k < n; k++) eng.particles.spark(eng.clawd.x + rand(-50, 50), eng.clawd.y - rand(20, 100));
  }
  function tamaRetire(tMs, care) {
    const tm = eng.tama;
    tm.retired = true;
    tm.retiredAt = tMs;
    diary('retire', '一代结束（照料 ' + care + ' 分），去星海旅行了');
    eng.say('这一代圆满啦！去星海旅行了咔…（📊 可领养新蛋）', 6000);
    eng.play('sparkle');
  }
  function tamaNextGen() {
    const tm = eng.tama;
    const gen = tm.gen + 1, past = tm.pastGens + 1, oldDiary = tm.diary;
    eng.tama = tamaDefaults(Date.now());
    eng.tama.gen = gen;
    eng.tama.pastGens = past;
    eng.tama.diary = oldDiary.slice(-60);
    eng.tama.diary.push({ t: Date.now(), e: 'newgen', text: '第 ' + gen + ' 代蛋领养成功（已陪伴 ' + past + ' 代）' });
    eng.poops = eng.tama.poops;
    eng.clawd.affection = 0;
    eng.clawd.setState('idle', rand(1, 2));
    eng.say(pick(LINES.reborn), 3200);
    eng.play('sparkle');
    tamaSave();
  }

  /* --- 多标签页：心跳协调，同一时刻只有一个写入者 --- */
  const tabId = Math.random().toString(36).slice(2);
  let viewerMode = false;
  function heartbeat() {
    try {
      const now = Date.now();
      const raw = store.get(prefix + '_hb', null);
      if (raw && raw.id !== tabId && now - raw.t < 9000) {
        if (!viewerMode) eng.say('另一个标签页正在照顾我咔…这边只围观', 3000);
        viewerMode = true;
      } else {
        viewerMode = false;
        store.set(prefix + '_hb', { id: tabId, t: now });
      }
    } catch (e) { /* 忽略 */ }
  }
  heartbeat();
  setInterval(heartbeat, 3000);

  /* --- Tamagotchi 状态面板 --- */
  const stats = document.createElement('div');
  stats.className = 'cw-stats';
  stats.innerHTML = '<h4><input class="cw-name" maxlength="8" placeholder="起个名字" aria-label="宠物名字"><span class="age"></span></h4>' +
    '<div class="row"><span class="lb">饱食</span><div class="cw-bar"><i data-k="fullness"></i></div><span class="val" data-v="fullness"></span></div>' +
    '<div class="row"><span class="lb">心情</span><div class="cw-bar"><i data-k="happiness"></i></div><span class="val" data-v="happiness"></span></div>' +
    '<div class="row"><span class="lb">清洁</span><div class="cw-bar"><i data-k="cleanliness"></i></div><span class="val" data-v="cleanliness"></span></div>' +
    '<div class="row"><span class="lb">精力</span><div class="cw-bar"><i data-k="energy"></i></div><span class="val" data-v="energy"></span></div>' +
    '<div class="row"><span class="lb">健康</span><div class="cw-bar"><i data-k="health"></i></div><span class="val" data-v="health"></span></div>' +
    '<div class="row"><span class="lb">亲密</span><div class="cw-bar"><i data-k="bond"></i></div><span class="val" data-v="bond"></span></div>' +
    '<div class="meta"></div><div class="cw-diary"></div>' +
    '<div class="rip" hidden></div><button class="rebirth" hidden>🥚 领养下一代蛋</button>' +
    '<div class="cw-debug" hidden><button data-d="1">+1小时</button><button data-d="24">+1天</button><button data-d="full">回满状态</button><button data-d="evo">立即进化</button></div>';
  wrap.appendChild(stats);
  stats.addEventListener('pointerdown', (e) => e.stopPropagation());
  stats.addEventListener('keydown', (e) => e.stopPropagation());
  stats.querySelector('.cw-name').addEventListener('input', function () {
    eng.tama.name = this.value.slice(0, 8);
    tamaSave();
  });
  let statsTimer = 0;
  function updateStats() {
    const tm = eng.tama;
    if (!tm) return;
    const nameInput = stats.querySelector('.cw-name');
    if (document.activeElement !== nameInput && nameInput.value !== tm.name) nameInput.value = tm.name;
    nameInput.placeholder = tm.hatched ? '起个名字' : '蛋蛋等待中';
    stats.querySelector('.age').textContent = '第' + tm.gen + '代 · ' + (tm.retired ? '已退休' : (tm.hatched ? STAGE_NAMES[tm.stage] + ' · ' + tamaAgeText() : '孵化中 ' + Math.floor(tm.hatchP * 100) + '%'));
    for (const k of ['fullness', 'happiness', 'cleanliness', 'energy', 'health', 'bond']) {
      const v = Math.round(tm[k]);
      const bar = stats.querySelector('[data-k="' + k + '"]');
      bar.style.width = v + '%';
      bar.style.background = v < 25 ? '#e05a5a' : '#d97757';
      stats.querySelector('[data-v="' + k + '"]').textContent = v;
    }
    const formName = tm.formId ? FORMS[tm.formId].name : '';
    stats.querySelector('.meta').textContent = (tm.hatched ? ((formName ? formName + ' · ' : '') + STAGE_NAMES[tm.stage] + ' · ') : '') +
      '照料 ' + careScore(tm) + ' 分 · 体重 ' + tm.weight.toFixed(1) + 'g' +
      (tm.poops.length ? ' · 💩×' + tm.poops.length : '') + (tm.illnessLevel ? ' · 😷' + tm.illnessLevel + '级' : '') +
      (tm.hatched ? ' · ' + tm.personalityId : '');
    const dl = stats.querySelector('.cw-diary');
    dl.innerHTML = tm.diary.slice(-3).map((d) => '<div>· ' + d.text + '</div>').join('');
    const rip = stats.querySelector('.rip'), rb = stats.querySelector('.rebirth');
    rip.hidden = !tm.retired; rb.hidden = !tm.retired;
    rip.textContent = tm.retired ? '退休于 ' + new Date(tm.retiredAt).toLocaleString() + ' · 曾领养 ' + tm.pastGens + ' 次新蛋' : '';
  }
  function openStats() {
    tamaSync(Date.now());
    closeRadial();
    stats.classList.toggle('down', eng.clawd.y < 260);
    stats.classList.add('on');
    eng.statsOpen = true;
    eng.menuOpen = true;
    updateStats();
    if (!statsTimer) statsTimer = setInterval(updateStats, 800);
  }
  function closeStats() {
    stats.classList.remove('on');
    eng.statsOpen = false;
    if (!eng.radialOpen) eng.menuOpen = false;
    clearInterval(statsTimer);
    statsTimer = 0;
  }
  function toggleStats() { eng.statsOpen ? closeStats() : openStats(); }
  stats.querySelector('.rebirth').addEventListener('click', (e) => {
    e.stopPropagation();
    tamaNextGen();
    updateStats();
  });
  const debugBox = stats.querySelector('.cw-debug');
  if (store.get('clawd_debug', 0) === 1) debugBox.hidden = false;
  debugBox.addEventListener('click', (e) => {
    const tm = eng.tama;
    const d = e.target.getAttribute && e.target.getAttribute('data-d');
    if (!d) return;
    e.stopPropagation();
    if (d === 'full') { eng.tama.fullness = eng.tama.happiness = eng.tama.cleanliness = eng.tama.energy = eng.tama.health = 100; }
    else if (d === 'evo') { eng.tama.stageElapsed = CFG.stages[eng.tama.stage]; tamaSync(Date.now()); }
    else {
      // 调试推进：绕过 12 小时离线保护（规格 §18 允许），从 lastSim 直接步进
      const ms = parseInt(d, 10) * 3600e3;
      let t = tm.lastSim;
      const end = t + ms;
      while (t < end) {
        const step = Math.min(60000, end - t);
        tamaStep(tm, t, step / 1000);
        t += step;
      }
      tm.lastSim = Date.now(); // 锚点回到现实，后续正常同步
    }
    tamaSave();
    updateStats();
  });

  /* --- Tamagotchi 初始化：读取存档 + 结算离线时间（须在小蟹构造前） --- */
  eng.tama = tamaLoad();
  eng.statsOpen = false;
  eng.poops = eng.tama.poops;
  tamaSync(Date.now());
  if (eng.tama.corruptRecovered) { eng.say('存档好像坏掉了…帮你恢复了备份咔', 4200); }

  const clawd = new Clawd(eng);
  eng.clawd = clawd;
  eng.pointer.x = eng.W / 2; eng.pointer.y = eng.H / 2;

  eng.clearForced = function () {
    eng.forced = null;
    hideCard();
  };

  let last = performance.now();
  let pending = 0, pendingIsRaf = false, watchdog = 0, fallbackActive = false, destroyed = false;
  let greeted = false;

  function onFrame() {
    if (pendingIsRaf && watchdog) { clearTimeout(watchdog); watchdog = 0; }
    pending = 0;
    try {
      runFrame(performance.now());
    } catch (err) {
      try {
        window.__clawdErrors = window.__clawdErrors || [];
        window.__clawdErrors.push(String((err && err.stack) || err));
        if (window.__clawdErrors.length > 6) window.__clawdErrors.splice(0, window.__clawdErrors.length - 6);
      } catch (e2) {}
    }
    scheduleNext();
  }

  function scheduleNext() {
    if (pending || destroyed) return;
    if (!fallbackActive) {
      pendingIsRaf = true;
      pending = requestAnimationFrame(onFrame);
      watchdog = setTimeout(() => {
        try { cancelAnimationFrame(pending); } catch (e3) {}
        pending = 0;
        fallbackActive = true;
        scheduleNext();
      }, 150);
    } else {
      pendingIsRaf = false;
      pending = setTimeout(() => { pending = 0; onFrame(); }, 50);
    }
  }

  function runFrame(tNow) {
    let dt = (tNow - last) / 1000;
    last = tNow;
    if (dt > 0.05) dt = 0.05;
    if (dt <= 0) return;
    const t = tNow / 1000;

    if (!greeted) {
      greeted = true;
      const h = new Date().getHours();
      let line = pick(LINES.greet);
      if (h < 6) line = pick(LINES.greetNight);
      else if (h < 11) line = pick(LINES.greetAm);
      else if (h < 14) line = pick(LINES.greetNoon);
      else if (h < 18) line = pick(LINES.greet);
      else if (h < 23) line = pick(LINES.greetEve);
      setTimeout(() => { if (!hidden) eng.say(line, 2800); }, 900);
    }

    if (!hidden) {
      clawd.update(dt, t);
      // Tamagotchi：墙钟时间权威（与页面帧率/节流无关）
      if (eng.tama && Date.now() - eng.tama.lastSim >= 1000) tamaSync(Date.now());
      updateBall(dt);
      updateCookie(dt);
      eng.particles.update(dt);
      for (let i = eng.fx.length - 1; i >= 0; i--) {
        eng.fx[i].life += dt;
        if (eng.fx[i].life >= eng.fx[i].max) eng.fx.splice(i, 1);
      }

      wrap.style.transform = 'translate3d(' + clawd.x + 'px,' + clawd.y + 'px,0)';

      ctx.setTransform(eng.dpr, 0, 0, eng.dpr, 0, 0);
      ctx.clearRect(0, 0, 260, 420);
      ctx.save();
      ctx.translate(130, 360);
      clawd.draw(ctx, t);
      ctx.save();
      ctx.translate(-clawd.x, -clawd.y);
      eng.particles.draw(ctx);
      ctx.restore();
      ctx.restore();

      if (eng.cookie && !eng.cookie.eating) {
        const c = eng.cookie;
        ctx.save();
        ctx.translate(130 + (c.x - clawd.x), 360 + (c.y - clawd.y));
        drawCookie(ctx, 0, 0, U);
        ctx.restore();
      }

      fctx.setTransform(eng.dpr, 0, 0, eng.dpr, 0, 0);
      fctx.clearRect(0, 0, eng.W, eng.H);
      for (const poopX of eng.poops) drawPoop(fctx, poopX, eng.groundY);
      if (eng.ball) {
        // 毛线球（世界坐标层）
        fctx.save();
        fctx.globalAlpha = eng.ball.alpha;
        fctx.translate(eng.ball.x, eng.ball.y);
        fctx.rotate(eng.ball.rot);
        fctx.fillStyle = eng.ball.color;
        fctx.beginPath(); fctx.arc(0, 0, 9, 0, Math.PI * 2); fctx.fill();
        fctx.strokeStyle = 'rgba(255,255,255,.75)';
        fctx.lineWidth = 1.6;
        fctx.beginPath(); fctx.arc(0, 0, 9, -0.5, 1.1); fctx.stroke();
        fctx.restore();
      }
      for (const f of eng.fx) {
        const k = f.life / f.max;
        fctx.strokeStyle = 'rgba(120,110,140,' + (0.4 * (1 - k)).toFixed(3) + ')';
        fctx.lineWidth = 2;
        fctx.beginPath();
        fctx.arc(f.x, f.y, 4 + k * 26, 0, Math.PI * 2);
        fctx.stroke();
      }
    }
  }
  scheduleNext();

  /* --- Tamagotchi：持久化触发器 --- */
  setInterval(tamaSave, 20000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) tamaSave();
    else {
      tamaSync(Date.now());
    }
  });
  window.addEventListener('pagehide', tamaSave);
  window.addEventListener('beforeunload', tamaSave);

  /* --- Agent 状态 API（clawd-on-desk 整合） --- */
  const FORCED_STATES = ['thinking', 'typing', 'building', 'juggling', 'alert', 'sleep'];
  eng.setStatus = function (state, detail) {
    if (FORCED_STATES.indexOf(state) === -1) return false;
    eng.forced = { state, detail: detail || '', since: Date.now() };
    if (state === 'alert') showCard(detail);
    else hideCard();
    const c = eng.clawd;
    c.interact();
    c.targetX = null;
    if (state === 'sleep') c.setState('sleep');
    else c.applyForced();
    return true;
  };

  /* --- API --- */
  const api = {
    clawd, eng,
    say: (t, m) => eng.say(t, m),
    pet: () => petClawd(),
    hide: hidePet,
    show: showPet,
    setStatus: (s, d) => eng.setStatus(s, d),
    clearStatus: () => { eng.clearForced(); if (clawd.state !== 'idle') clawd.setState('idle', rand(0.8, 1.6)); },
    setColors(colors) {
      // 色盘联动：传入 { body: '#6e6eff' } 让 Clawd 穿宿主站点主题色；传 null 恢复官方壳色
      eng.customBody = (colors && colors.body) || null;
    },
    setLines(map) {
      // 宿主站点可注入/覆盖台词池，如 setLines({ idle: ['bt最棒'], greet: ['bt的Blog！我是Clawd'] })
      if (!map) return;
      for (const k in map) {
        if (Object.prototype.hasOwnProperty.call(LINES, k) && Array.isArray(map[k])) LINES[k] = map[k];
      }
    },
    setSkin(k) { if (SKINS[k]) { clawd.skinKey = k; store.set(prefix + '_skin', k); } },
    setSound(v) { eng.soundOn = !!v; store.set(prefix + '_sound', eng.soundOn); refreshSoundIcon(); },
    destroy() {
      destroyed = true;
      if (pending) {
        if (pendingIsRaf) { try { cancelAnimationFrame(pending); } catch (e4) {} }
        else clearTimeout(pending);
      }
      if (watchdog) clearTimeout(watchdog);
      if (ro) ro.disconnect();
      if (winResize) window.removeEventListener('resize', winResize);
      style.remove();
      wrap.remove(); fxCanvas.remove(); corner.remove();
      if (bc) { try { bc.close(); } catch (e5) {} }
    }
  };

  // BroadcastChannel：同源其他标签页 / 本地桥接脚本可以驱动状态
  let bc = null;
  try {
    bc = new BroadcastChannel('clawd-on-web');
    bc.onmessage = (e) => {
      const d = e.data || {};
      if (d.type === 'status' && d.state) eng.setStatus(d.state, d.detail);
      else if (d.type === 'clear') { eng.clearForced(); if (clawd.state !== 'idle') clawd.setState('idle', rand(0.8, 1.6)); }
    };
  } catch (e6) { bc = null; }

  window.__CLAWD_LAST__ = api;
  return api;
}

/* ============ 对外接口 & 自动挂载 ============ */
window.ClawdPet = {
  mount,
  skins: SKINS,
  skinKeys: SKIN_KEYS,
  version: '3.0.0',
  setStatus(state, detail) {
    const api = window.__CLAWD_LAST__;
    return api ? api.setStatus(state, detail) : false;
  },
  clearStatus() {
    const api = window.__CLAWD_LAST__;
    if (api) api.clearStatus();
  }
};

if (!window.CLAWD_PET_NO_AUTO) {
  // 已有手动挂载的实例（如桥接层）就不再自动挂载，避免叠出两只
  const start = () => { if (!window.__CLAWD_LAST__) mount({}); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
}
})();
