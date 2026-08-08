// 路径：src/hooks/useGameRoom.js
import { useState, useEffect, useRef, useReducer, useCallback } from 'react';
import { createGameWebSocket, gameAPI } from '../services/api';
import { getUser } from '../utils/auth';

// 游戏状态Reducer
function gameReducer(state, action) {
  switch (action.type) {
    case 'SET_INITIAL_STATE': {
      // 初始化游戏状态（来自 game_state 广播或 /game/state 接口）
      return {
        ...state,
        config: action.payload.config,
        players: action.payload.players || [],
        playerStates: action.payload.playerStates || {},
        colors: action.payload.colors || {},
        progress: action.payload.progress,
        board: action.payload.board || state.board,
        initialized: true,
      };
    }

    case 'GAME_STARTED': {
      // 游戏开始（随后 fetchGameState 会做一次完整同步）
      return {
        ...state,
        config: {
          ...state.config,
          gameStatus: 'playing',
        },
        progress: {
          ...state.progress,
          currentPlayer: action.payload.currentPlayer,
          playerOrder: action.payload.playerOrder || state.progress?.playerOrder,
          roundStartTime: Date.now(),
        },
      };
    }

    case 'MOVE_MADE': {
      // 有玩家下棋
      const { playerId, pieceIndex, nextPlayer, currentRound, playerState, boardState } =
        action.payload;

      // 合并该玩家的最新状态，并标记棋子已使用
      const pieces = playerState?.pieces
        ? [...playerState.pieces]
        : [...(state.playerStates[playerId]?.pieces || Array(21).fill(false))];
      pieces[pieceIndex] = true;

      return {
        ...state,
        board: boardState || state.board,
        playerStates: {
          ...state.playerStates,
          [playerId]: { ...state.playerStates[playerId], ...playerState, pieces },
        },
        progress: {
          ...state.progress,
          currentPlayer: nextPlayer,
          currentRound,
          roundStartTime: Date.now(), // 新回合开始时间
          activePlayerCount:
            action.payload.activePlayerCount ?? state.progress?.activePlayerCount,
        },
      };
    }

    case 'PLAYER_PASSED': {
      // 有玩家停手
      const { playerId, nextPlayer, currentRound, activePlayerCount } = action.payload;

      return {
        ...state,
        playerStates: {
          ...state.playerStates,
          [playerId]: { ...state.playerStates[playerId], passed: true },
        },
        progress: {
          ...state.progress,
          currentPlayer: nextPlayer,
          currentRound,
          roundStartTime: Date.now(),
          activePlayerCount: activePlayerCount ?? state.progress?.activePlayerCount,
        },
      };
    }

    case 'GAME_ENDED': {
      // 游戏结束
      return {
        ...state,
        config: {
          ...state.config,
          gameStatus: 'finished',
        },
        winner: action.payload.winner,
        finalScores: action.payload.scores,
        penalties: action.payload.penalties,
      };
    }

    default:
      return state;
  }
}

// 初始游戏状态
const initialGameState = {
  config: null,
  players: [],
  playerStates: {},
  colors: {},
  progress: null,
  board: Array(14).fill(null).map(() => Array(14).fill(0)),
  winner: null,
  finalScores: null,
  penalties: null,
  initialized: false,
};

const MAX_RECONNECT_ATTEMPTS = 5;
const HEARTBEAT_INTERVAL = 15000;
const HEARTBEAT_TIMEOUT = 30000; // 30秒无pong响应视为断线

export function useGameRoom(roomId) {
  const [gameState, dispatch] = useReducer(gameReducer, initialGameState);
  const [wsConnected, setWsConnected] = useState(false);
  const [error, setError] = useState(null);

  // WebSocket引用
  const wsRef = useRef(null);

  // 重连相关
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);

  // 心跳相关
  const heartbeatIntervalRef = useRef(null);
  const lastPongTimeRef = useRef(Date.now());

  // 我在本房间的角色（p1~p4）
  const myPlayerIdRef = useRef(null);

  // === 根据玩家列表确定我的角色 ===
  const determinePlayerId = useCallback((players) => {
    const user = getUser();
    if (!user) {
      setError('未找到用户信息');
      return null;
    }

    for (let i = 0; i < players.length; i++) {
      if (players[i] && players[i].userId === user.id) {
        return `p${i + 1}`;
      }
    }

    setError('您不属于此房间');
    return null;
  }, []);

  // === 请求完整游戏状态 ===
  const fetchGameState = useCallback(async () => {
    try {
      const response = await gameAPI.getState(roomId);

      if (response.data.success) {
        dispatch({ type: 'SET_INITIAL_STATE', payload: response.data.state });

        const playerId = determinePlayerId(response.data.state.players);
        if (playerId) {
          myPlayerIdRef.current = playerId;
        }
      }
    } catch (err) {
      console.error('[useGameRoom] 获取状态失败:', err);
    }
  }, [roomId, determinePlayerId]);

  // === 处理广播消息 ===
  const handleBroadcast = useCallback(
    (data) => {
      console.log('[useGameRoom] 收到广播:', data.type, data);

      switch (data.type) {
        case 'game_state': {
          // 建立连接时的初始状态同步
          dispatch({ type: 'SET_INITIAL_STATE', payload: data });

          const playerId = determinePlayerId(data.players);
          if (playerId) {
            myPlayerIdRef.current = playerId;
          }
          break;
        }

        case 'player_joined':
        case 'player_rejoined': {
          // 广播本身只带单个玩家信息，直接拉一次完整状态更可靠
          fetchGameState();
          break;
        }

        case 'game_started': {
          dispatch({
            type: 'GAME_STARTED',
            payload: {
              currentPlayer: data.currentPlayer,
              playerOrder: data.playerOrder,
            },
          });
          fetchGameState();
          break;
        }

        case 'move_made': {
          dispatch({
            type: 'MOVE_MADE',
            payload: {
              playerId: data.playerId,
              pieceIndex: data.pieceIndex,
              nextPlayer: data.nextPlayer,
              currentRound: data.currentRound,
              playerState: data.playerState,
              boardState: data.boardState,
              activePlayerCount: data.activePlayerCount,
            },
          });
          break;
        }

        case 'player_passed': {
          dispatch({
            type: 'PLAYER_PASSED',
            payload: {
              playerId: data.playerId,
              nextPlayer: data.nextPlayer,
              currentRound: data.currentRound,
              activePlayerCount: data.activePlayerCount,
            },
          });
          break;
        }

        case 'game_ended': {
          dispatch({
            type: 'GAME_ENDED',
            payload: {
              winner: data.winner,
              scores: data.scores,
              penalties: data.penalties,
            },
          });
          break;
        }

        case 'player_disconnected': {
          // 对方掉线后会自动重连，这里只记录，不打断本地对局
          console.log('[useGameRoom] 玩家断开连接:', data.playerId);
          break;
        }

        case 'pong': {
          lastPongTimeRef.current = Date.now();
          break;
        }

        case 'error': {
          console.error('[useGameRoom] 服务器错误:', data.message);
          setError(data.message);
          break;
        }

        default:
          console.warn('[useGameRoom] 未知消息类型:', data.type);
      }
    },
    [determinePlayerId, fetchGameState]
  );

  // === 心跳 ===
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    stopHeartbeat();

    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'heartbeat' }));

        // 超时无响应则主动关闭，触发重连流程
        if (Date.now() - lastPongTimeRef.current > HEARTBEAT_TIMEOUT) {
          console.warn('[useGameRoom] 心跳超时，触发重连');
          wsRef.current.close();
        }
      }
    }, HEARTBEAT_INTERVAL);
  }, [stopHeartbeat]);

  // === 建立WebSocket连接 ===
  // connect 与 attemptReconnect 相互引用，用 ref 打破循环依赖，
  // 保证 connect 的引用稳定（否则初始化 useEffect 会反复重连）。
  const attemptReconnectRef = useRef(null);

  const connect = useCallback(() => {
    try {
      console.log('[useGameRoom] 尝试连接 WebSocket...');

      const ws = createGameWebSocket(roomId, handleBroadcast);

      if (!ws) {
        setError('无法创建WebSocket连接');
        return;
      }

      ws.onopen = () => {
        console.log('[useGameRoom] WebSocket连接成功');
        setWsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        lastPongTimeRef.current = Date.now();
        startHeartbeat();
      };

      ws.onclose = (event) => {
        console.log('[useGameRoom] WebSocket连接关闭', event.code, event.reason);
        setWsConnected(false);
        stopHeartbeat();

        // 非正常关闭才重连
        if (event.code !== 1000) {
          attemptReconnectRef.current?.();
        }
      };

      ws.onerror = (err) => {
        console.error('[useGameRoom] WebSocket错误:', err);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('[useGameRoom] 创建连接失败:', err);
      setError('无法建立连接');
    }
  }, [roomId, handleBroadcast, startHeartbeat, stopHeartbeat]);

  // === 断线重连（指数退避：1s / 2s / 4s / 8s / 10s）===
  useEffect(() => {
    attemptReconnectRef.current = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
        setError('连接失败，请刷新页面重试');
        return;
      }

      const delay = Math.min(1000 * 2 ** reconnectAttemptsRef.current, 10000);
      setError(`连接断开，${Math.round(delay / 1000)}秒后重连...`);

      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectAttemptsRef.current++;
        connect();
      }, delay);
    };
  }, [connect]);

  // === 发送下棋消息 ===
  const sendMove = useCallback((pieceIndex, position, rotation, flip, boardState) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      console.error('[useGameRoom] WebSocket未连接，无法发送move');
      return false;
    }

    try {
      wsRef.current.send(
        JSON.stringify({ type: 'move', pieceIndex, position, rotation, flip, boardState })
      );
      return true;
    } catch (err) {
      console.error('[useGameRoom] 发送move失败:', err);
      return false;
    }
  }, []);

  // === 发送停手消息 ===
  const sendPass = useCallback(() => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      console.error('[useGameRoom] WebSocket未连接，无法发送pass');
      return false;
    }

    try {
      wsRef.current.send(JSON.stringify({ type: 'pass' }));
      return true;
    } catch (err) {
      console.error('[useGameRoom] 发送pass失败:', err);
      return false;
    }
  }, []);

  // === 初始化：建立连接，卸载时清理 ===
  useEffect(() => {
    connect();

    return () => {
      stopHeartbeat();

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (wsRef.current) {
        wsRef.current.close(1000, 'User disconnected');
        wsRef.current = null;
      }

      setWsConnected(false);
    };
  }, [connect, stopHeartbeat]);

  return {
    gameState,
    wsConnected,
    error,
    myPlayerId: myPlayerIdRef.current,
    sendMove,
    sendPass,
  };
}
