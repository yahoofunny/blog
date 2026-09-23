# bt's Blog

基于 [Astro](https://astro.build) 构建的个人技术博客 + 游戏中心，Hermes Agent 风格纸面设计 + Chirpy 信息架构。

## ✨ 特性

### 设计
- **Hermes 风格纸面设计** — 纸面浅色底（#fdfdfd）+ 电光蓝主色（#0000f2）+ 直角卡片 + 等宽大写标签 + 点状分隔线
- **💡 暗/亮主题切换** — 右上角灯泡按钮一键切换，默认浅色，localStorage 持久化；游戏中心同源共享偏好
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
| 蔚蓝 Celeste | 平台跳跃（网页移植） | 🖥 电脑；手机走 PICO-8 原版外链 |
| 小游戏合集 ×124 | 合集外链 | ✅ |

新增游戏：把静态文件放进 `public/games/<name>/`，在 `public/games/index.html` 加卡片即可。

### 交互
- **<img src="public/clawd-icon.svg" width="18" alt="Clawd"> Clawd 桌宠** — 右下角像素螃蟹，点击切换姿态+说话，拖拽移动，双击问候，定时主动搭话。25+ 句 bt 主题对话
- **Giscus 评论区** — GitHub Discussions 驱动，无需第三方服务

### 导航
- 顶部导航：**Games / Archives / About / Gadgets**
- **标签系统** — 侧边栏标签云带计数，点击筛选，独立标签页
- **归档页** — 按年份分组，日期 + 标签一览
- **侧边栏** — Chirpy 风格（TOC / Tags / Archive）
- **Pagefind 全文搜索** — 构建时生成索引，静态搜索
- **语言切换** — LANGUAGE 菜单：中文 / EN（Google Translate）/ 颜文字模式

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
| 评论 | [Giscus](https://giscus.app) |
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
├── components/     # BaseHead, SidebarContent, PostPreview 等
├── content/post/   # 博客文章 (.md / .mdx)
├── data/           # 文章/标签/归档查询
├── layouts/        # Base.astro（全局布局）, BlogPost.astro
├── pages/
│   ├── tags/       # 标签聚合 + 单标签筛选
│   ├── archives.astro  # 按年归档
│   ├── radio.astro     # Gadgets 页面
│   └── about.astro
├── plugins/        # Remark 插件
├── styles/         # 全局 CSS（设计 tokens + 亮暗主题）
└── utils/          # 工具函数
public/
├── games/          # 游戏中心（index.html + 各游戏静态文件）
├── fonts/          # 自托管字体（Oswald / Courier Prime）
├── on.svg / off.svg # 主题切换灯泡图标
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
