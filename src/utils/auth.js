// 路径: src/utils/auth.js
export const setToken = (token) => {
  localStorage.setItem('token', token);
};

export const getToken = () => {
  return localStorage.getItem('token');
};

export const removeToken = () => {
  localStorage.removeItem('token');
};

export const setUser = (user) => {
  localStorage.setItem('user', JSON.stringify(user));
};

export const getUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const removeUser = () => {
  localStorage.removeItem('user');
};

export const logout = () => {
  removeToken();
  removeUser();
};

/**
 * 解析JWT的载荷部分。
 *
 * 只做 base64url 解码，**不验证签名** —— 前端也没有密钥，验签只能由后端完成。
 * 这里的用途仅仅是提前读出 exp，避免"页面能进去、一操作就被踢回登录页"。
 *
 * @returns {object|null} 载荷对象，解析失败返回 null
 */
export function getTokenPayload(token = getToken()) {
  if (!token) return null;

  try {
    const segment = token.split('.')[1];
    if (!segment) return null;

    // base64url -> base64，并补齐 padding
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

    // 账号可能含非 ASCII 字符，走 TextDecoder 保证 UTF-8 正确
    const json = new TextDecoder().decode(
      Uint8Array.from(atob(padded), (ch) => ch.charCodeAt(0))
    );

    return JSON.parse(json);
  } catch {
    // token 被改坏 / 不是合法JWT，一律当作无效
    return null;
  }
}

/**
 * 本地判断token是否仍然有效（未过期）。
 * 提前 30 秒判定为过期，避免发出一个注定 401 的请求。
 */
export function isTokenValid() {
  const payload = getTokenPayload();
  if (!payload?.exp) return false;

  return payload.exp * 1000 > Date.now() + 30_000;
}
