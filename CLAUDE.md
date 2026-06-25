# bt's Blog — 项目说明

## 托管
- **GitHub**: `yahoofunny/blog` (private repo)
- **部署**: Cloudflare Pages (自动从 main 分支构建)
- **域名**: `bingtao.xyz` (Cloudflare DNS), `blog-6rb.pages.dev` (Pages 默认域名)
- **Web 前端**: `claude.bingtao.xyz` → Azure HK VM → nginx:80 → Python:8080 (密码 `claudemusk123`)

## 技术栈
- **框架**: Astro 6.3.3 + Tailwind CSS 4
- **内容**: Markdown/MDX 在 `src/content/post/`
- **CI**: 用 pnpm (不是 npm)，推送前必须 `npx astro check` 通过

## 关键操作
```bash
cd ~/blog-source
npx astro check    # 推送前必须跑，0 错误才能 push
git add -A && git commit -m "..." && git push origin main
```
Cloudflare Pages 自动部署，推送后等 1-2 分钟生效。

## 文件结构
- `src/layouts/Base.astro` — 全局布局（玻璃拟态+视频背景+侧边栏）
- `src/layouts/BlogPost.astro` — 文章页布局（TOC 注入侧边栏）
- `src/pages/index.astro` — 首页
- `src/styles/global.css` — SpaceX 玻璃拟态主题
- `src/content/post/*.md` — 博客文章
- `src/site.config.ts` — 网站设置（标题、描述等）

## 设计
- **背景**: SpaceX 火箭视频全屏循环 (`public/spacex.mp4`)
- **风格**: 玻璃拟态 (glassmorphism)，深色半透明卡片
- **侧边栏**: 桌面端固定左侧，显示文章列表 + 当前页 TOC；手机端抽屉式
- **侧边栏按钮**: `onclick="window._toggleSidebar()"` 控制手机侧边栏

## Azure VM (香港)
- **IP**: `13.88.216.213`，SSH: `ssh -i bt_key.pem azureuser@13.88.216.213`
- **Web 前端**: `claude.bingtao.xyz` 密码入口，背后是 Claude Code
- **Telegram Bot**: `@bingtao2077_bot`，支持文字+图片 OCR
- **Blog 位置**: `/home/azureuser/web-frontend/`
- **Git token**: `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` 已配置

## 注意事项
- Astro check 说 0 errors 后再 push
- 不要直接用 package.json 的 `"overrides"` 加 vite（会导致 pnpm 锁文件不匹配）
- CI 用 pnpm，本地 dev 用 `npx astro dev`
- GitHub 有时 SSL 出错：`git -c http.version=HTTP/1.1 push` 重试
