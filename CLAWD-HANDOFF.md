# Clawd 项目交接文档（2026-10-31 凌晨）

> 给下一个会话：先读完本文档再动手。用户偏好与硬规则在文末，**必须遵守**。

## 一、项目地图

```
C:\Users\yoummo\Desktop\web\（symlink → D:\DesktopFiles\web）
├── blog/          用户博客仓库的 git clone（github.com/yahoofunny/blog）
│   │              Astro + Cloudflare Pages，正式域名 bingtao.xyz，
│   │              游戏托管在独立 Pages 项目 blog-6rb.pages.dev
│   ├── public/clawd-engine.js    桌宠引擎 v3.0.0（= clawd/clawd.js 的同步副本）
│   ├── public/clawd-blog.js      博客桥接层（台词池/活动度/夜醒，已无主题色联动）
│   ├── public/clawd-playground.html  动作游乐场（100 式点播+连播）
│   ├── public/games/clawd-machine/   抓娃娃机（本会话新增，见"未完成"）
│   ├── public/games/katamari/        滚球（保留）
│   ├── public/games/destroy/         摧毁本站（保留）
│   ├── public/games/index.html       游戏中心索引（已改为 3 卡片）
│   ├── CLAWD-INTEGRATION.md          整合说明
│   └── CLAWD-HANDOFF.md              本文档
├── clawd/         桌宠引擎独立项目（clawd.js + index.html 演示页 + README）
└── blog-bg/       用户的，别动
```

- 源码同步规则：**改 `clawd/clawd.js` 后必须 `cp clawd/clawd.js blog/public/clawd-engine.js`**。
- git：origin fetch 走 ghfast.top 镜像，push 走 GitHub 正门。GitHub 直连本机网络时好时坏（TCP 层拒绝），推送失败就多重试几轮或等网络。

## 二、已推送上线的（bingtao.xyz 刷新可见）

- 像素 Clawd（官方珊瑚色 #DE886D，clawd-tank SVG 规格程序化重绘）
- 单击=随机 100 式动作（洗牌袋不重复）、双击=喂饼干、长按/右键=轮盘拖拽选择、拖拽甩飞
- Tamagotchi：六项数值、蛋→退休 7 节点、疾病 1-3 级、消化排泄打扫、睡觉时段 22-08、
  照料分、日记跨代、领养下一代、多标签页心跳选主、调试面板（localStorage.clawd_debug=1）
- 游戏中心：只剩 抓娃娃机(NEW) / clawd 滚球 / 摧毁本站

## 三、本地领先远程的提交（等推送）

`c24c0bf 抓娃娃机上线 + 游戏厅瘦身`（ahead 1，git push 被网络挡，恢复后 `git push origin main`）
内容：抓娃娃机页面 + 删 9 个旧游戏目录 + 游戏索引改版。

## 四、⚠️ 本会话发现但未验证完的重大 bug（下一会话第一优先）

**回访玩家挂载即崩溃（已修码，未端到端验证）**：
`clawd.js` 的 `tamaSync()` 在 `new Clawd(eng)` **之前**运行离线结算，`tamaStep` 内
`eng.clawd.state` / `eng.clawd.x` 在构造前是 undefined → **隔天回访的玩家 mount 直接崩，
桌宠完全消失**。已修复（构造后结算 + 两处 eng.clawd 空值守卫，见本会话最后提交）。
**下一会话必须做的验证**：
1. 浏览器打开 /public/games/clawd-machine/（本地服务器须以 blog/public 为根，见下）
2. localStorage 预置旧档：`localStorage.setItem('clawd_tama', JSON.stringify({v:3, ..., lastSim: Date.now() - 86400000}))`（lastSim 设为一天前）
3. 刷新 → 确认：不崩、离线结算生效（数值下降但健康≥20）、桌宠正常出现
4. 同页连续两次挂载不炸（多实例场景）

**本地测试服务器的正确姿势**（路径陷阱！）：
- 必须 `cd blog/public && python -m http.server 8943` —— 以 **public 为根**，
  这样 `/clawd-engine.js`（页内绝对引用）才能命中。
- 以 blog/ 为根的服务器（8942 那次）会让 /clawd-engine.js 404 → 机器脚本半死 →
  LED 显示 TIME NaN、宠物舞台空白（用户看到的"垃圾"一半是这个 + 旧缓存）。
- 测试页：/public/_clawd-test.html（记得先 `localStorage.clawd_debug=1` 开调试面板）。

## 五、未完成事项（按优先级）

1. **抓娃娃机 VM 测试调试**：`clawd/_machine_vm_test.js`（Node 虚拟机确定性测试，桩已搭好 90%）。
   当前卡在测试桩自身：`els['b-???'].click()` 某处 undefined / save() 已修容错。
   预期跑通的用例清单在文件尾部（投币→ready、下爪 5s→won、领取→+2 代币+playTrick、
   第二局不重复、代币 0 拒投）。调试桩即可，机器逻辑本身在真实浏览器已人工验证可玩。
2. **推送 c24c0bf + 本会话新提交**（网络恢复后）。
3. **手机真机验收**：用户手机（安卓 Chrome）刷新后确认——珊瑚色恢复 ✓（截图已证）、
   蛋能孵化（领导选举修复后）、轮盘 9 键不出屏（交错双排弧线）、夜间点击被骂醒。
4. **P1 缺口（规格手册 §10-12）**：两款小游戏、商店/装饰/货币、愿望/事件、图鉴成就、
   食物偏好——用户手册明确这些是 P1，但优先级用户说了算。
5. 动作库 100 式的编舞质量逐个过一遍（用户批评过"拿个道具站着不动"，
   已加自动律动兜底 + 40 个 mv 预设，但还可以逐个精修）。

## 六、用户偏好硬规则（违反会挨骂）

1. **Clawd 永远是官方珊瑚色 #DE886D**——禁止跟随站点主题色变色（已被骂过一次）。
2. **桌宠就是纯桌宠**——不要往聊天页/任何页面跳转（用户自评 chat 页垃圾）。
3. **不确定就先搜索查证**（clawd-tank 仓库 MIT 可扒官方 SVG），不要闭门造车。
4. **每个动作必须真编舞**——不许"飘个符号"敷衍。
5. 用户把长按轮盘叫"拓哥麻子"（toggle menu）。
6. 用户运行环境：Windows + Git Bash + IAB（注意 IAB 的 tab 会随机冻结/重建，
   rAF 可能完全暂停——引擎已带 watchdog 降级，测试时用 `window.__MACHINE`/`__CLAWD_LAST__` 探针）。

## 七、新会话开场提示词（复制给 Claude）

> 继续 Clawd 桌宠项目。先读 C:\Users\yoummo\Desktop\web\blog\CLAWD-HANDOFF.md 和
> CLAWD-INTEGRATION.md，然后：① 验证回访玩家挂载修复（按 HANDOFF 第四节步骤）；
> ② 调通抓娃娃机的 VM 测试（clawd/_machine_vm_test.js）；③ 推送待推提交。
> Clawd 必须保持官方珊瑚色，不要动这条。
