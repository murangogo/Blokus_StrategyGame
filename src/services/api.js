// 路径：src/services/api.js
const API_BASE_URL = import.meta.env.PROD
  ? 'https://gameapi.azuki.top'
  : 'http://127.0.0.1:8787';

const WS_BASE_URL = import.meta.env.PROD
  ? 'wss://gameapi.azuki.top'
  : 'ws://127.0.0.1:8787';

/**
 * 请求失败时抛出的错误。
 * 保留 `response: { status, data }` 结构，调用方可继续用 err.response?.data?.error 取错误信息。
 */
class ApiError extends Error {
  constructor(message, response) {
    super(message);
    this.name = 'ApiError';
    this.response = response;
  }
}

// token 失效时清理本地状态并回到登录页
function handleUnauthorized() {
  const hasToken = localStorage.getItem('token');
  // 登录页自身的 401 交给 Login 组件展示，不做跳转
  if (hasToken && window.location.pathname !== '/login') {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const token = localStorage.getItem('token');
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    // 网络层面的失败（断网、DNS、CORS 等），没有 response
    throw new ApiError(err.message || 'Network error');
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401) handleUnauthorized();
    throw new ApiError(data?.error || res.statusText, { status: res.status, data });
  }

  return { data };
}

// API方法
export const authAPI = {
  login: (account, password) =>
    request('/auth/login', { method: 'POST', body: { account, password } }),
  verify: () =>
    request('/auth/verify', { method: 'POST' }),
};

export const gameAPI = {
  createRoom: (limitTime, backupTime, playerCount, boardSize) =>
    request('/game/create', {
      method: 'POST',
      body: { limitTime, backupTime, playerCount, boardSize },
    }),
  joinRoom: (roomId) =>
    request(`/game/join/${encodeURIComponent(roomId)}`, { method: 'POST' }),
  getState: (roomId) =>
    request(`/game/state/${encodeURIComponent(roomId)}`),
  startGame: (roomId) =>
    request(`/game/start/${encodeURIComponent(roomId)}`, { method: 'POST' }),
};

export const historyAPI = {
  getList: (page = 1, size = 15) =>
    request(`/history/list?page=${page}&size=${size}`),
  getDetail: (historyId) =>
    request(`/history/${encodeURIComponent(historyId)}`),
};

// WebSocket连接函数（token通过查询参数传递，后端 wsAuthMiddleware 校验）
export function createGameWebSocket(roomId, onMessage) {
  const token = localStorage.getItem('token');

  if (!token) {
    console.error('无法建立WebSocket连接：找不到token');
    return null;
  }

  const wsUrl = `${WS_BASE_URL}/game/connect/${encodeURIComponent(roomId)}?token=${encodeURIComponent(token)}`;
  const ws = new WebSocket(wsUrl);

  ws.onmessage = (event) => {
    try {
      onMessage(JSON.parse(event.data));
    } catch (err) {
      console.error('WebSocket 消息解析失败:', err);
    }
  };

  return ws;
}
