# bt's Blog

基于 [Astro](https://astro.build) 构建的个人技术博客，SpaceX 风格设计 + Chirpy 信息架构。

## ✨ 特性

### 设计
- **SpaceX 风格** — 全屏火箭发射视频背景 + 液态玻璃卡片（Glassmorphism），`backdrop-filter: blur()` 磨砂质感
- **🔄 暗/亮主题切换** — header 太阳/月亮按钮一键切换，localStorage 持久化，刷新不丢失
- **😉 蓝色笑脸 Logo** — 左上角 StreamlineFreehandSmileyWink 图标，点击回到首页
- **SpaceX 风格汉堡菜单** — 移动端三根极细线条 → X 动画过渡，cubic-bezier 丝滑曲线
- **响应式布局** — 桌面端左侧固定侧边栏 + 顶部导航，移动端全屏 overlay 菜单

### 内容
- **MDX 支持** — 文章可嵌入 JSX 组件，支持 Markdown 全部语法
- **LaTeX 数学公式** — KaTeX 渲染，行内 `$...$` 和块级 `$$...$$`
- **代码高亮** — Expressive Code，`github-dark` / `github-light` 双主题

### 交互
- **🦞 Clawd 桌宠** — 右下角像素螃蟹，点击切换姿态+说话，拖拽移动，双击问候，定时主动搭话。25+ 句 bt 主题对话，GPU 加速拖动
- **Giscus 评论区** — GitHub Discussions 驱动，无需第三方服务

### 导航
- **标签系统** — 侧边栏标签云带计数，点击筛选，独立标签页
- **归档页** — 按年份分组，日期 + 标签一览
- **侧边栏** — Chirpy 风格（TOC / Tags / Archive）
- **Pagefind 全文搜索** — 构建时生成索引，静态搜索

### Gadgets 页面
- **Claude FM** — 24/7 Lo-fi 电台
- **Drone Zone** — SomaFM Dark Ambient 空间音乐
- **Telegraph 图床** — 自建图片托管入口（telegraph-image-download.pages.dev）

### SEO
- **OG 图片自动生成** — 每篇文章 1200×630 PNG 社交卡片
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
├── styles/         # 全局 CSS（含 Light 主题覆盖）
└── utils/          # 工具函数
public/
├── smiley.svg      # 左上角 Logo
├── on.svg / off.svg # 主题切换图标
├── clawd/          # Clawd 桌宠 GIF
└── spacex.mp4      # 视频背景
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
