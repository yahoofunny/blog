# bt's Blog

基于 [Astro](https://astro.build) 构建的个人主页 + 游戏厅，硬边纸面设计（暗色为主）+ 自托管的碎碎念时间线。

## ✨ 特性

### 设计
- **硬边纸面设计** — 卡片/按钮/输入框一律直角 + 等宽大写微标签 + 点状分隔线。暗色是主基调（纸面 `#0e0e13` + 电光蓝 `#6e6eff`），亮色是反色版（`#fdfdfd` + `#0000f2`）
- **💡 暗/亮主题切换** — 右上角灯泡按钮一键切换，**默认暗色**（首次打开一定是暗的，不跟随系统），localStorage 持久化；游戏中心同源共享偏好
- **粒子背景** — `Base.astro` 里挂了一张全站 `bg-particle` 画布，暗色模式下显示；Mome 那边用同样的 iframe 引同一份资源
- **本地字体** — Oswald（窄体展示）+ Courier Prime（等宽）自托管于 `/fonts/`，无 Google Fonts 依赖，国内直连秒开
- **响应式布局** — 桌面端左侧固定侧边栏 + 顶部导航，移动端全屏 overlay 菜单 + 极细线条汉堡动画

### 内容
- **MDX 支持** — 文章可嵌入 JSX 组件，支持 Markdown 全部语法
- **LaTeX 数学公式** — KaTeX 渲染，行内 `$...$` 和块级 `$$...$$`
- **代码高亮** — Expressive Code，`github-dark` / `github-light` 双主题

### 🎮 游戏中心（/games/）
全部开源、纯静态本地托管，手机/电脑都能玩：

| 游戏 | 类型 | 移动端 |
|------|------|--------|
| 飞机大战 | 弹幕射击 | ✅ 原生触屏 |
| 大球吃小球 | agar.io 单机 | ✅ 已加触屏补丁 |
| 合成大西瓜 | Suika 玩法 | ✅ 移动端优先 |
| 运输船 · 穿越火线 3D | FPS 场景 | ✅ 触屏（电脑更佳） |
| 鹈鹕骑单车 | 3D 休闲 | ✅ 触屏 |
| 飞车 3D · QQ飞车同人 | 3D 竞速 | ✅ 触屏（电脑更佳） |
| 像素怪物对战 | 像素 RPG 对战 | ✅ |
| 蔚蓝 Celeste | 平台跳跃（网页移植） | 🖥 电脑；手机走 PICO-8 原版外链 |
| 小游戏合集 ×124 | 合集外链 | ✅ |

新增游戏：把静态文件放进 `public/games/<name>/`，在 `public/games/index.html` 加卡片即可。

### 📮 Mome（mome.bingtao.xyz）
顶栏 **Mome** 是个外链，指向自托管的碎碎念时间线 —— [Ech0](https://github.com/lin-snow/Ech0)（Go + Vue，AGPL-3.0），跑在自己的服务器上，数据和上传的媒体都在自己手里。

- 不想写整篇文章时的低门槛出口，发一条 = 一次 POST
- 匿名可读、匿名可点赞（点赞端点是公开的，带 2 次/5 小时的幂等限流）
- 评论开着但需审核；SMTP 通知已通
- 只有一处风格靠注入：`custom.css` / `custom_js` 把 Ech0 的暖棕主题盖成上面这套暗色 token

### 交互
- **<img src="public/clawd-icon.svg" width="18" alt="Clawd"> Clawd 桌宠** — 右下角像素螃蟹，点击切换姿态+说话，拖拽移动，双击问候，定时主动搭话。25+ 句 bt 主题对话

### 导航
- 顶部导航：**Chat / Games / Archives / Mome / Gadgets / About**（Mome 是外链，其余为站内）
- **标签系统** — 标签云带计数，点击筛选，独立标签页
- **归档页** — 按年份分组，日期 + 标签一览
- **侧边栏** — 本页目录（TOC）+ 标签云
- **Pagefind 全文搜索** — 构建时生成索引，静态搜索
- **语言切换** — 页头三段式开关：**中 / EN / 颜文字**。EN 是真正的 `/en/` 页面，正文由 argos-translate **离线**翻译，不依赖任何在线翻译接口；颜文字模式只在句末标点后随机插一个颜文字，纯本地显示效果

### Gadgets 页面
- **Claude FM** — 24/7 Lo-fi 电台
- **Drone Zone** — SomaFM Dark Ambient 空间音乐
- **Telegraph 图床** — 自建图片托管入口（telegraph-image-download.pages.dev）

### SEO
- **OG 图片自动生成** — 每篇文章 1200×630 PNG 社交卡片（纸面蓝风格）
- **RSS 2.0** — `/rss.xml`
- **Sitemap** — 自动生成

## 🚀 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | [Astro](https://astro.build) 6.x |
| 样式 | [Tailwind CSS](https://tailwindcss.com) v4 |
| 内容 | MDX + Markdown |
| 数学 | [KaTeX](https://katex.org) |
| 搜索 | [Pagefind](https://pagefind.app) |
| 代码高亮 | [Expressive Code](https://expressive-code.com) |
| 部署 | [Cloudflare Pages](https://pages.cloudflare.com) |
| CI/CD | GitHub Actions |

## 📦 本地开发

```bash
pnpm install
pnpm dev        # http://localhost:4321
pnpm build      # 构建到 dist/
pnpm preview    # 预览构建结果
```

## 🚢 部署

推送 `main` → GitHub Actions (`astro check` + `pnpm build`) → Cloudflare Pages 自动部署。

## 📁 项目结构

```
src/
├── components/     # BaseHead, SidebarContent, LangSwitch, ChatApp + blog/PostPreview
├── content/post/   # 文章 (.md / .mdx)
├── data/           # 文章/标签/归档查询
├── i18n/           # ui.ts（中英文案键）+ utils.ts
├── layouts/        # Base.astro（全局布局 + 顶栏）, BlogPost.astro
├── pages/
│   ├── index.astro     # 首页（HomeView：随笔抽屉）
│   ├── chat.astro      # Chat 页（调自训 MiniMind 小模型）
│   ├── archives.astro  # 按年归档
│   ├── radio.astro     # Gadgets 页面
│   ├── asmr.astro      # ASMR / 白噪音页
│   ├── about.astro
│   ├── tags/           # 标签聚合 + 单标签筛选
│   ├── posts/          # 文章详情
│   ├── en/             # 英文镜像（同结构）
│   └── og-image/       # 构建期生成社交卡片
├── plugins/        # Remark 插件
├── styles/         # 全局 CSS（设计 tokens + 亮暗主题）
└── utils/          # 工具函数
public/
├── games/          # 游戏中心（index.html + 各游戏静态文件）
├── bg-particle/    # 粒子背景画布（首页 + Mome 共用）
├── fonts/          # 自托管字体（Oswald / Courier Prime）
├── on.svg / off.svg # 主题切换灯泡图标
├── lang/           # 颜文字模式的语言包
└── clawd/          # Clawd 桌宠 GIF
```

## 📝 文章 Frontmatter

```yaml
---
title: "文章标题"
description: "文章简介"
publishDate: "2026-01-01"
tags: ["标签1", "标签2"]
pinned: true        # 置顶（可选）
updatedDate: "2026-02-01"  # 更新日期（可选）
draft: true         # 草稿（可选，生产不显示）
---
```

## 📄 许可

[MIT License](LICENSE)
