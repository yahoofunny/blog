# Clawd 桌宠 v2 整合说明

把博客原来的 GIF 桌宠升级为 Canvas 像素引擎版（形象按官方 clawd-tank SVG 规格程序化重绘），
并整合了 clawd-on-desk 的 agent 状态玩法 + mome 色盘的主题色联动。

## 改动清单

| 文件 | 操作 | 说明 |
| --- | --- | --- |
| `public/clawd-engine.js` | **新增** | 桌宠引擎（零依赖单文件，v2.2.0） |
| `public/clawd-blog.js` | **新增** | 博客桥接层（台词池/活动度睡眠/主题色联动，纯桌宠无跳转） |
| `src/layouts/Base.astro` | **修改** | 原内联 GIF 桌宠整块替换为两个 script 标签；颜文字walker 的排除选择器补了 `.cw-bubble,.cw-card` |
| `public/clawd-pet.js` | 可删 | 旧版桌宠脚本，已无引用（历史留存可自行决定） |
| `public/clawd/*.gif` | 保留 | `esp32-badge-clawd-pet.mdx` 文章还在引用这些图，别删 |
| `public/_clawd-test.html` | 测试页 | 模拟博客环境的验证页，可留可删 |

## 桥接层保留了旧版桌宠的全部行为

- 单击 → 摸摸头（爱心 + 咕噜声 + 钉住菜单）；双击 → 喂饼干；按住拖拽甩飞
- 25 条博客专属台词 + 路由感知开场白 + 访问计数（沿用 `localStorage` 键 `cv`）
- 键盘无障碍：焦点 + Enter/Space 摸摸头
- 活动度系统：300 秒没动静 → 睡觉（Zzz 摊平姿势），有动静就醒

## 新增能力

- **agent 状态演出**（clawd-on-desk 同款）：`ClawdPet.setStatus('thinking'|'typing'|'building'|'juggling'|'alert'|'sleep', detail)`
  桥接层每 2~3 分钟随机来一段小剧场，替代旧版随机换 GIF
- **色盘联动**：壳色自动跟随站点 `--wm-primary`（亮 `#3a63d0` / 暗 `#6e6eff` 电光蓝），
  监听 `html.dark` class 变化实时切换；菜单 🎨 手动换肤会脱掉主题色回到官方珊瑚色
- 长按 / 右键 → 环形轮盘菜单（蓄力圆环动画，6 按钮弧形展开，点空白 / Esc / 再长按收起）；悬停 → 胶囊快捷条
- 触屏长按同样可用（移动端的主要菜单入口）
- 物理拖拽：甩出去会飞、落地弹跳、摔狠了眼冒星星

## Tamagotchi 养成系统（v3 内置）

桌宠自带完整电子宠物机制：六项数值（📊 面板查看）、蛋→退休全生命周期（温和模式无死亡）、
生病喂药、消化排泄与打扫、照料分与日记、退休后领养下一代（日记跨代保留）、
壳色/数值全部持久化在 localStorage（键前缀 `clawd_`）。
访问者的蟹和你的蟹互不影响（按站点+浏览器隔离）。时间用墙钟同步，
刷新页面、换标签页、后台挂机都不会错账；离线超过 12 小时的部分温柔保护。

## 想接 Claude Code hooks？

任何本地脚本把状态推给页面即可（页面里已有 BroadcastChannel 监听，频道名 `clawd-on-web`）：

```js
// 例如通过 WebSocket / 轮询收到 Claude 状态后：
BroadcastChannel && new BroadcastChannel('clawd-on-web')
  .postMessage({ type: 'status', state: 'typing', detail: 'Claude Code' });
```

## 部署

把上面三个文件放进你的 blog 仓库提交即可，Cloudflare Pages 会自动构建。
本地预览跑 `pnpm dev` 后任意页面右下角就能看到 Clawd。
