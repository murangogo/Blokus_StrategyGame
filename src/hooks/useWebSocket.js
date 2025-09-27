import { useEffect, useRef, useState } from 'react';
import { getUser, getToken } from '../utils/auth';

export function useWebSocket(roomId, onMessage) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const user = getUser();
  const token = getToken();

  useEffect(() => {
    if (!roomId || !user) return;

    const connect = () => {
      // WebSocket URL（注意：浏览器WebSocket不支持自定义headers，token通过URL传递）
      const wsUrl = `${import.meta.env.PROD ? 'wss' : 'ws'}://${
        import.meta.env.PROD ? 'gameapi.azuki.top' : '127.0.0.1:8787'
      }/game/connect/${roomId}?playerId=${user.userId}`;

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[WebSocket] 已连接');
        setConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WebSocket] 收到消息:', data);
          onMessage(data);
        } catch (error) {
          console.error('[WebSocket] 解析消息失败:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] 错误:', error);
      };

      ws.onclose = () => {
        console.log('[WebSocket] 连接关闭');
        setConnected(false);
        
        // 3秒后自动重连
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[WebSocket] 尝试重连...');
          connect();
        }, 3000);
      };

      wsRef.current = ws;
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [roomId, user]);

  const sendMessage = (message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.error('[WebSocket] 连接未就绪');
    }
  };

  return { connected, sendMessage };
}