# NANOFIX V28 Home Return Fix Report

## 修复目标
在导航栏一级菜单下的二级页面中，尤其左侧二级菜单点击到第三、第四个二级栏目页面后，点击顶部 LOGO 或 Home 必须直接返回 Home 首页第一屏顶部。

## 已修复
- Next.js 独立二级栏目页面中，所有 `href="#home"` 的 Home/LOGO 链接，在非首页路由下自动改为真实首页路径。
- 默认路径返回 `/`。
- 英文路径返回 `/en`。
- 中文路径返回 `/zh`。
- 首页自身仍保留 `#home`，点击 Home 会滚动回首页第一屏。
- 静态完整预览包同步修复：`#home` 会强制显示首页区块并滚动到 `#home` 顶部。
- 预览包补齐第三、第四个二级栏目路由识别，包括：External Wall Coating、Balcony & Planter Box、Clear Penetrating Treatment、Epoxy Tile Grouting、Service Warranty Terms、Client Testimonials。

## 已验证
- `/waterproofing-works/external-wall-coating` Home -> `/`
- `/waterproofing-works/balcony-planter-box` Home -> `/`
- `/no-hacking-repair/clear-penetrating-treatment` Home -> `/`
- `/no-hacking-repair/epoxy-tile-grouting` Home -> `/`
- `/track-record-warranty/service-warranty-terms` Home -> `/`
- `/track-record-warranty/client-testimonials` Home -> `/`
- `/en/waterproofing-works/balcony-planter-box` Home -> `/en`
- `/zh/no-hacking-repair/epoxy-tile-grouting` Home -> `/zh`

## 验证命令
- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm run build:css` ✅
- `npm run verify:anchors` ✅
- `npm run audit:v28` ✅
- `npm audit --audit-level=moderate` ✅ 0 vulnerabilities
- `npm run build` ✅
- `npm run verify` ✅
