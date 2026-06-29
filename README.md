# bt's Blog

基于 [Astro](https://astro.build) 构建的个人技术博客，灵感来自 Jekyll Chirpy 主题的信息架构，融合 SpaceX 液态玻璃视觉风格。

## ✨ 特性

### 内容

- **MDX 支持** — 不仅支持标准 Markdown，还支持 MDX，可在文章中嵌入 JSX 组件，实现交互式内容
- **LaTeX 数学公式** — 通过 KaTeX 引擎渲染，支持行内 `$...$` 和块级 `$$...$$` 公式，适合技术笔记
- **代码高亮** — 使用 Astro Expressive Code，支持暗/亮双主题（`github-dark` / `github-light`），自动随系统切换

### 交互

- **🦞 Clawd 桌宠** — 右下角悬浮的像素风螃蟹宠物，自动切换表情动画。**点击切换姿态**，拖拽移动位置，双击说话，会定时主动问候
- **Giscus 评论区** — 基于 GitHub Discussions 的评论系统，无需第三方服务，数据归你自己

### 导航

- **标签系统** — 每篇文章可打多个标签，侧边栏标签云带计数，点击筛选该标签下的所有文章
- **归档页** — 按年份分组展示全部文章，一目了然
- **侧边栏** — Chirpy 风格导航（TOC / 标签 / 归档），桌面端始终可见
- **搜索** — 基于 Pagefind 的全文搜索（构建时生成索引）

### SEO & 分享

- **自动生成 OG 图片** — 每篇文章构建时自动生成社交分享卡片（Open Graph Image），包含标题和站点信息
- **RSS 订阅** — 标准 RSS 2.0 源，方便读者订阅
- **自动站点地图** — Sitemap XML 提升搜索引擎收录
- **PWA 支持** — 可安装到桌面，离线也能访问
- **Webmention** — 支持 Webmention 协议，可接收来自其他站点的引用通知

### 设计

- **液态玻璃风格（Glassmorphism）** — 半透明毛玻璃卡片，`backdrop-filter: blur()` 磨砂质感
- **SpaceX 视频背景** — 全屏火箭发射视频循环播放，深色遮罩确保文字可读
- **响应式布局** — 桌面端左侧固定侧边栏，移动端自适应
- **暗色主题** — 深色背景 + 高对比度文字，护眼舒适

## 🚀 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | [Astro](https://astro.build) |
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
pnpm dev        # 启动开发服务器 http://localhost:4321
pnpm build      # 构建到 dist/
pnpm preview    # 预览构建结果
```

## 🚢 部署

推送 `main` 分支 → GitHub Actions 运行 `astro check` + `pnpm build` → Cloudflare Pages 自动部署。

## 📁 项目结构

```
src/
├── components/     # 组件（BaseHead, SidebarContent, PostPreview 等）
├── content/
│   └── post/       # 博客文章 (.md / .mdx)
├── data/           # 数据查询（获取文章、标签、归档分组）
├── layouts/        # 布局（Base.astro, BlogPost.astro）
├── pages/          # 页面路由
│   ├── tags/       # 标签页
│   └── archives.astro  # 归档页
├── plugins/        # Remark 插件（提示框、GitHub 卡片、阅读时间）
├── styles/         # 全局样式
└── utils/          # 工具函数
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
draft: true         # 草稿（可选，生产环境不显示）
---
```

## 📄 许可

[MIT License](LICENSE)
