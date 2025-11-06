// 路径：src/services/api.js
import axios from 'axios';

const API_BASE_URL = import.meta.env.PROD 
  ? 'https://gameapi.azuki.top'  
  : 'http://127.0.0.1:8787';      

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器（添加token）
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器（处理错误）
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      const hasToken = localStorage.getItem('token');
      
      // ✅ 只有token过期且不在登录页才跳转
      if (hasToken && currentPath !== '/login') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      // ✅ 登录页的401错误直接返回，让Login组件处理
    }
    return Promise.reject(error);
  }
);

// API方法
export const authAPI = {
  login: (account, password) => 
    api.post('/auth/login', { account, password }),
  verify: () => 
    api.post('/auth/verify')
};

export const gameAPI = {
  createRoom: (limitTime) => 
    api.post('/game/create', { limitTime }),
  joinRoom: (roomId) => 
    api.post(`/game/join/${roomId}`),
  getState: (roomId) => 
    api.get(`/game/state/${roomId}`),
  startGame: (roomId) => 
    api.post(`/game/start/${roomId}`)
};

export const historyAPI = {
  getList: () => 
    api.get('/history/list'),
  getDetail: (historyId) => 
    api.get(`/history/${historyId}`)
};

// WebSocket连接函数（带token）
export function createGameWebSocket(roomId, onMessage) {
  const token = localStorage.getItem('token');

  if (!token) {
    console.error("无法建立WebSocket连接：找不到token");
    return null; 
  }

  // 不再传递明文的userId，而是传递token
  const wsUrl = `${import.meta.env.PROD ? 'wss' : 'ws'}://${import.meta.env.PROD ? 'gameapi.azuki.top' : '127.0.0.1:8787'}/game/connect/${roomId}?token=${token}`;
  
  const ws = new WebSocket(wsUrl);
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage(data);
  };
  
  ws.onerror = (error) => {
    console.error("WebSocket 发生错误:", error);
  };
  
  ws.onclose = (event) => {
    console.log("WebSocket 连接已关闭:", event.code, event.reason);
  };
  
  return ws;
}

export default api;