# mome 主题源码

这是 **[mome.bingtao.xyz](https://mome.bingtao.xyz)** 那层皮的源码 ——
也就是这个博客的皮肤，搬到 [Ech0](https://github.com/lin-snow/Ech0) 上的那一版。

> ⚠️ **这些文件只是一层皮肤 —— 拿它当不了网站。**
> Ech0（Go + Vue 写的单人微博客）**要自己找台服务器跑起来**：
> [mome.bingtao.xyz](https://mome.bingtao.xyz) 就是跑在一台自建服务器上的。
> 这套主题只是往它的「自定义 CSS / 自定义 JS」里塞的两段文本，
> **不含 Ech0 本身，也不含任何后端**。
>
> - Ech0 官方文档：**<https://ech0.app/docs>**
> - Ech0 源码仓库：**<https://github.com/lin-snow/Ech0>**

浏览器里那份同内容的说明在 **[`./`](./)**（也就是本目录的 index.html）。

---

## 目录里有什么

```
custom.css        构建产物 —— 粘贴到 Ech0 面板「自定义 CSS」
custom.js         构建产物 —— 粘贴到 Ech0 面板「自定义 JS」
src/tokens.css    色值源码（改颜色改这里）
src/tail.css      规则源码（第 3 节往后的所有样式）
src/build.py      tokens + tail → custom.css
```

`custom.css` 别手改，它是 `build.py` 生成的，下次构建会覆盖：

```bash
python src/build.py                    # 字体走 /fonts
python src/build.py https://cdn.example.com/fonts    # 字体走外链
```

## 装法

**1. 先有一个跑起来的 Ech0。** 见上面那两个链接。

**2. 字体。** 把 `oswald-var.woff2` / `courier-prime-400.woff2` /
`courier-prime-700.woff2` 放到你站点的 `/fonts/` 下（这三份字体在
[bts-moment](https://github.com/yahoofunny/bts-moment) 仓库里，都是 SIL OFL 1.1）。
放别处就用 `build.py` 带上你那个路径重新构建。

**3. 注入。** Ech0 面板 → 系统设置 → 把 `custom.css` 和 `custom.js` 的全文分别
粘进「自定义 CSS」和「自定义 JS」，保存、刷新。做完主题就生效了。

**4. 图标和壁纸（要自己换成你的）。** 本目录里这两份是**本博客在用的那一版**，
所以里面的地址全是写死的 `https://bingtao.xyz/...`，直接用会指向我的站点。
`custom.js` 顶部的 `CONFIG` 里逐项换成你自己的：

```js
particleUrl: '/bg-particle/index.html',   // 粒子壁纸页面
home:        { href: '/', icon: '/pacman.svg' },        // 左上角那个标志
themeIcons:  { light: '/off.svg', dark: '/on.svg' },    // 右上角开关灯
nav:         [ ... ],                     // 中间那六栏，换成你的路径
kaomoji:     { enabled: true, label: '(´・ω・`)' },      // 药丸第三段（见下）
sourceUrl:   '',                          // 侧栏源码入口（见下）
```

## 几件要知道的事

- **没有 `/en/` 路径。** Ech0 的语言是客户端状态（存在 `localStorage.locale`），
  不是路由。顶栏那个 `中 / EN` 药丸是去点它原生菜单，点完当场变、不用刷新；
  想分享一个英文链接就用 `?lang=en`。
- **药丸的第三段是颜文字，不是一种语言。** 点它 = 开 / 关，句末标点后面随机
  插一个颜文字 —— 纯显示效果，**不写进 Ech0 的任何数据**，状态只在
  `localStorage.kaomoji` 里。不想要就把 `kaomoji.enabled` 改成 `false`。
- **手机上六栏目和语言药丸都收进汉堡。** 窄屏（≤900px）顶栏只剩标志、开关灯和
  一个 ☰，点开是一层全屏菜单 —— 六条链接，下面跟着语言药丸，跟博客自己那个
  一模一样。
- **顶栏是这套主题加的**，不是 Ech0 自带的。Ech0 原生的主题键和语言键被
  脚本打标记藏掉了（`.bt-native`），别按类名去藏 ——
  `.home-header__link-icon` 是 RSS / 禅模式 / 登录共用的类名，一刀切会连带干掉三个。
- **吃豆人回的是博客首页**（`CONFIG.home.href`），灯泡是明暗两态开关。
  图标得是**深色线条**的 SVG，暗色下脚本会加 `invert(1)` 翻白。
- **`sourceUrl` 请填上。** Ech0 是 AGPL-3.0，§13 要求「通过网络与它交互的用户
  能拿到对应源码」。这套主题也一样以 AGPL-3.0 发布 —— 所以对外提供服务时，
  把 `sourceUrl` 填成你自己那份主题仓库的地址（侧栏会多出一个 `SOURCE` 入口）。
  不填则整行藏掉。
- **只有明暗两态。** Ech0 原生是 `light → sunny → dark` 三态循环，这里接管成了
  干净的两态，`sunny` 被归到亮色那套。

## 出处与许可

本目录的全部内容来自 **[bts-moment](https://github.com/yahoofunny/bts-moment)**
（同一作者），那边有完整的 README、部署套件（加载页改写 / systemd 单元）、
`extras/bg-particle/` 粒子壁纸页面和第三方组件清单（`NOTICE`）。
要拿去用，**去那边克隆更省事** —— 这里这份是给「正在看这个博客的人」
一个就近的副本。

- 本主题：**AGPL-3.0-or-later**
- [Ech0](https://github.com/lin-snow/Ech0) — L1nSn0w and contributors，AGPL-3.0
- Oswald / Courier Prime — SIL OFL 1.1
- particles.js — Vincent Garreau，MIT
- 侧栏 `SOURCE` 用的 github 图标 — Material Design Icons（Pictogrammers），Apache-2.0
