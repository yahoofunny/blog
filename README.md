# bt's Blog

bt的技术博客。基于 [Astro](https://astro.build) + [Astro Cactus](https://github.com/chrismwilliams/astro-theme-cactus) 主题魔改。

## 设计

**液态玻璃风格（Glassmorphism）**——半透明毛玻璃卡片 + SpaceX 火箭视频全屏背景。深色遮罩让内容清晰可读，`backdrop-filter: blur()` 实现磨砂质感。桌面端左侧边栏 + 手机抽屉式折叠。

## 技术栈

- **框架**: Astro + Tailwind CSS
- **托管**: Cloudflare Pages (`bingtao.xyz`)
- **设计**: 液态玻璃 SpaceX 风格

## 本地开发

```bash
pnpm install
pnpm dev        # http://localhost:4321
pnpm build      # 构建到 dist/
```

## 部署

推送 `main` 分支 → Cloudflare Pages 自动构建部署。

## 许可

本项目代码采用 [MIT License](LICENSE)。Astro Cactus 主题版权所有其原作者。
