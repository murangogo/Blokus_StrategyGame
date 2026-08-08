// 路径：src/App.jsx
import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';
import PageLoader from './components/PageLoader';
import { getToken, isTokenValid } from './utils/auth';
import { authAPI } from './services/api';

// 对局页与历史页体积较大（棋盘渲染、棋子几何计算等），按路由懒加载，
// 登录/首页首屏不再下载这部分代码。
const Room = lazy(() => import('./pages/Room'));
const History = lazy(() => import('./pages/History'));
const HistoryDetail = lazy(() => import('./pages/HistoryDetail'));

/**
 * 路由守卫
 *
 * 注意这里判断的是 isTokenValid() 而不是"token 存不存在"：
 * 过期的 token 字符串依然躺在 localStorage 里，只看存在性的话会放行进入页面，
 * 直到用户点了某个真正发请求的功能才被 401 踢回登录页。
 */
function PrivateRoute({ children }) {
  if (!isTokenValid()) {
    // 曾经登录过（有 token）但已失效 → 告诉登录页显示"登录已过期"
    return <Navigate to="/login" replace state={{ expired: !!getToken() }} />;
  }

  return children;
}

function App() {
  // 本地只能读出 exp，判断不了签名是否仍然有效（例如后端更换过 JWT_SECRET，
  // 此时旧 token 未过期但已失效）。每个浏览器会话向后端确认一次，
  // 校验失败时 api.js 的 401 处理会自动跳回登录页。
  useEffect(() => {
    if (!isTokenValid()) return;
    if (sessionStorage.getItem('authChecked')) return;

    authAPI
      .verify()
      .then(() => sessionStorage.setItem('authChecked', '1'))
      .catch(() => {
        /* 401 已在 api.js 中统一处理，其他错误（如断网）忽略即可 */
      });
  }, []);

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/home"
            element={
              <PrivateRoute>
                <Home />
              </PrivateRoute>
            }
          />
          <Route
            path="/room/:roomId"
            element={
              <PrivateRoute>
                <Room />
              </PrivateRoute>
            }
          />
          <Route
            path="/history"
            element={
              <PrivateRoute>
                <History />
              </PrivateRoute>
            }
          />
          <Route
            path="/history/:id"
            element={
              <PrivateRoute>
                <HistoryDetail />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/home" replace />} />
          {/* 兜底：未知路径回首页，避免直接访问时白屏 */}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
