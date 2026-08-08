# Blokus_StrategyGame（前端）

A simple strategy game that reminisces about a short time.

一个简单的策略游戏，缅怀一段短暂的时光。

角斗士棋 Blokus 的网页前端，2~4 人在线对战。部署在 Cloudflare Pages：
https://battle.azuki.top

配套后端仓库：[Blokus_StrategyGame_Backend](https://github.com/murangogo/Blokus_StrategyGame_Backend)

---

## 技术栈

React 19 · React Router 7 · Vite 7 · Tailwind CSS 3

无运行时网络库依赖，接口层用原生 `fetch` 封装（`src/services/api.js`）。

## 环境要求

Node ≥ 20.19（推荐用 nvm 安装 LTS）。所有工具都装在项目内，**无需全局安装**。

## 快速开始

```bash
npm install
npm run dev          # http://localhost:5173
```

前端在开发模式下请求 `http://127.0.0.1:8787`，因此需要**先把后端跑起来**
（见后端仓库说明）。生产构建则指向 `https://gameapi.azuki.top`，
切换逻辑见 `src/services/api.js`。

> npm 11 默认不执行依赖的安装脚本。若出现 `npm warn allow-scripts` 且
> `vite build` 报找不到 esbuild 二进制，执行 `npm install-scripts approve esbuild`。

## 常用命令

| 命令 | 说明 |
|---|---|
| `npm run dev` | 开发服务器 |
| `npm run build` | 生产构建，产物在 `dist/` |
| `npm run preview` | 本地预览构建产物 |
| `npm run lint` | ESLint 检查 |
| `npm run deploy` | 构建并发布到 Cloudflare Pages |

## 部署

推荐用 Pages 的 Git 集成，推送到 `main` 即自动部署：

| 配置项 | 值 |
|---|---|
| Build command | `npm run build` |
| Build output directory | `dist` |
| `NODE_VERSION` | `20.19.0` 或更高 |

也可以本地直接发布：

```bash
npm run deploy
```

`public/_redirects` 提供 SPA 路由回退（否则刷新 `/room/xxx` 会 404），
`public/_headers` 配置静态资源的强缓存。两者会随构建自动复制进 `dist/`。

## 目录结构

```
src/
├── components/
│   ├── Modal.jsx           通用弹窗
│   ├── PageLoader.jsx      全屏加载态
│   └── game/               对局组件（棋盘、棋子选择、计分板等）
├── hooks/
│   ├── useGameRoom.js      WebSocket 连接 / 心跳 / 重连 / 状态 reducer
│   └── useGameTimer.js     回合限时与备用时间
├── pages/                  Login / Home / Room / History / HistoryDetail
├── services/api.js         HTTP 接口 + WebSocket 建连
└── utils/
    ├── auth.js             token 与用户信息的本地存储
    ├── format.js           日期、时长格式化
    ├── gameHelpers.js      落子合法性判定、按钮状态计算
    └── pieces.js           21 种棋子定义与旋转/翻转
```

对局页（`Room`）与历史页按路由懒加载，登录/首页首屏不会下载这部分代码。

---

更完整的说明（游戏规则、Cloudflare 资源配置、D1 建表与账号添加、部署与推送流程）
见上层目录的 `README.md`。
