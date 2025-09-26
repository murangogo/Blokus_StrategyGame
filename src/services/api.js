import axios from 'axios';

const API_BASE_URL = import.meta.env.PROD 
  ? 'https://gameapi.azuki.top'
  : 'https://gameapi.azuki.top';

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
  getList: (userId, limit = 50) => 
    api.get('/history/list', { params: { userId, limit } }),
  getDetail: (historyId) => 
    api.get(`/history/${historyId}`)
};

export default api;