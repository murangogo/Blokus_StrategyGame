import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 说明：前端不经过 dev proxy，直接按 import.meta.env.PROD 走
// 127.0.0.1:8787（本地 wrangler）或 gameapi.azuki.top（线上），
// 见 src/services/api.js。
export default defineConfig(({ command }) => ({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    // 目标浏览器只需支持现代语法，产物更小且无需额外 polyfill
    target: 'es2022',
    // 跳过 gzip 体积统计，构建更快
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        // 第三方依赖单独成块：应用代码更新时这部分仍可命中浏览器缓存
        manualChunks(id) {
          if (id.includes('node_modules')) return 'vendor';
        },
      },
    },
  },
  esbuild: {
    // 生产构建剔除调试日志（保留 console.error 以便线上排查）
    pure:
      command === 'build'
        ? ['console.log', 'console.debug', 'console.info', 'console.warn']
        : [],
  },
}))
