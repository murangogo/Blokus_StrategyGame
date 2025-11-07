// 路径：src/hooks/useGameRoom.js
import { useState, useEffect, useRef, useReducer, useCallback } from 'react';
import { createGameWebSocket } from '../services/api';
import { getUser } from '../utils/auth';

// 游戏状态Reducer
function gameReducer(state, action) {
  switch (action.type) {
    case 'SET_INITIAL_STATE': {
      // 初始化游戏状态（来自game_state广播）
      return {
        ...state,
        config: action.payload.config,
        players: action.payload.players || [],
        playerStates: action.payload.playerStates || {},
        colors: action.payload.colors || {},
        progress: action.payload.progress,
        board: action.payload.board || state.board,
        initialized: true
      };
    }

    case 'PLAYER_JOINED': {
      // 有玩家加入 - 完善逻辑
      const { playerIndex, playerInfo, updatedPlayers, playerCount, requiredCount } = action.payload;
      
      // 如果后端提供了完整的更新玩家列表，则使用它
      let newPlayers;
      if (updatedPlayers) {
        newPlayers = updatedPlayers;
      } else {
        // 否则只更新特定位置的玩家
        newPlayers = [...state.players];
        if (playerIndex !== undefined && playerInfo) {
          newPlayers[playerIndex] = playerInfo;
        }
      }
      
      return {
        ...state,
        players: newPlayers,
        config: {
          ...state.config,
          playerCount: playerCount || state.config?.playerCount,
          requiredPlayerCount: requiredCount || state.config?.requiredPlayerCount,
          // 更新状态，确保UI反映当前状态
          hasEnoughPlayers: (playerCount || newPlayers.filter(p => p).length) >= 
                            (requiredCount || state.config?.requiredPlayerCount || 2)
        }
      };
    }

    case 'GAME_STARTED': {
      // 游戏开始
      return {
        ...state,
        config: {
          ...state.config,
          gameStatus: 'playing'
        },
        progress: {
          ...state.progress,
          currentPlayer: 'p1', // 游戏开始时总是p1先手
          roundStartTime: Date.now()
        }
      };
    }

    case 'MOVE_MADE': {
      // 有玩家下棋
      const { 
        playerId, 
        pieceIndex, 
        nextPlayer, 
        currentRound, 
        playerState, 
        boardState 
      } = action.payload;
      
      // 更新对应玩家的状态
      const updatedPlayerStates = {
        ...state.playerStates,
        [playerId]: {
          ...state.playerStates[playerId],
          ...playerState,
          pieces: state.playerStates[playerId]?.pieces 
            ? [...state.playerStates[playerId].pieces] 
            : Array(21).fill(false)
        }
      };
      
      // 标记该棋子已使用
      if (updatedPlayerStates[playerId]?.pieces) {
        updatedPlayerStates[playerId].pieces[pieceIndex] = true;
      }
      
      return {
        ...state,
        board: boardState || state.board,
        playerStates: updatedPlayerStates,
        progress: {
          ...state.progress,
          currentPlayer: nextPlayer,
          currentRound: currentRound,
          roundStartTime: Date.now(), // 新回合开始时间
          activePlayerCount: action.payload.activePlayerCount || state.progress?.activePlayerCount
        }
      };
    }

    case 'PLAYER_PASSED': {
      // 有玩家停手
      const { playerId, nextPlayer, currentRound, activePlayerCount } = action.payload;
      
      // 标记停手玩家
      const updatedPlayerStates = {
        ...state.playerStates,
        [playerId]: {
          ...state.playerStates[playerId],
          passed: true
        }
      };
      
      return {
        ...state,
        playerStates: updatedPlayerStates,
        progress: {
          ...state.progress,
          currentPlayer: nextPlayer,
          currentRound: currentRound,
          roundStartTime: Date.now(),
          activePlayerCount: activePlayerCount || state.progress?.activePlayerCount
        }
      };
    }

    case 'GAME_ENDED': {
      // 游戏结束
      return {
        ...state,
        config: {
          ...state.config,
          gameStatus: 'finished'
        },
        winner: action.payload.winner,
        finalScores: action.payload.scores,
        penalties: action.payload.penalties
      };
    }

    case 'UPDATE_BACKUP_TIME': {
      // 同步备用时间
      const { playerId, backupTime } = action.payload;
      
      return {
        ...state,
        playerStates: {
          ...state.playerStates,
          [playerId]: {
            ...state.playerStates[playerId],
            backupTime
          }
        }
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
  initialized: false
};

export function useGameRoom(roomId) {
  const [gameState, dispatch] = useReducer(gameReducer, initialGameState);
  const [wsConnected, setWsConnected] = useState(false);
  const [error, setError] = useState(null);
  
  // WebSocket引用
  const wsRef = useRef(null);
  
  // 重连相关
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const maxReconnectAttempts = 5;
  
  // 心跳相关
  const heartbeatIntervalRef = useRef(null);
  const lastPongTimeRef = useRef(Date.now());
  const heartbeatTimeout = 30000; // 30秒无响应视为断线
  
  // 用户ID
  const myPlayerIdRef = useRef(null);

  // === 确定用户ID ===
  const determinePlayerId = useCallback((players) => {
    const user = getUser();
    if (!user) {
      setError('未找到用户信息');
      return null;
    }

    // 遍历玩家数组查找匹配
    for (let i = 0; i < players.length; i++) {
      if (players[i] && players[i].userId === user.id) {
        return `p${i+1}`; // 返回玩家ID (p1, p2, p3, p4)
      }
    }
    
    setError('您不属于此房间');
    return null;
  }, []);

  // === 请求游戏状态 ===
  const fetchGameState = useCallback(async () => {
    try {
      const { gameAPI } = await import('../services/api');
      const response = await gameAPI.getState(roomId);
      
      if (response.data.success) {
        console.log('[useGameRoom] 获取完整状态:', response.data.state);
        dispatch({
          type: 'SET_INITIAL_STATE',
          payload: response.data.state
        });
        
        // 确定玩家ID
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
  const handleBroadcast = useCallback((data) => {
    console.log('[useGameRoom] 收到广播:', data.type, data);
    
    switch (data.type) {
      case 'game_state': {
        // 初始状态同步
        dispatch({ 
          type: 'SET_INITIAL_STATE', 
          payload: data 
        });
        
        // 确定玩家ID
        const playerId = determinePlayerId(data.players);
        if (playerId) {
          myPlayerIdRef.current = playerId;
          console.log('[useGameRoom] 玩家ID确认:', playerId);
        }
        break;
      }

      case 'player_joined': {
        // 玩家加入
        const { playerIndex, playerInfo, updatedPlayers, playerCount, requiredCount } = data;
        
        // 更新整个玩家列表，而不仅是单个玩家
        dispatch({ 
          type: 'PLAYER_JOINED', 
          payload: {
            playerIndex,
            playerInfo,
            updatedPlayers: data.updatedPlayers || undefined, // 可能后端会提供完整的更新列表
            playerCount,
            requiredCount
          }
        });
        
        // 如果自己刚加入，确定ID
        if (!myPlayerIdRef.current) {
          const playerId = determinePlayerId(data.updatedPlayers || [...state.players]);
          if (playerId) {
            myPlayerIdRef.current = playerId;
            console.log('[useGameRoom] 加入后确定玩家ID:', playerId);
          }
        }
        
        // 重要：获取最新完整游戏状态以确保UI更新
        fetchGameState();
        break;
      }

      case 'game_started': {
        // 游戏开始
        dispatch({ type: 'GAME_STARTED' });
        console.log('[useGameRoom] 游戏开始，请求完整状态同步');
        fetchGameState();
        break;
      }

      case 'move_made': {
        // 玩家下棋
        dispatch({ 
          type: 'MOVE_MADE', 
          payload: {
            playerId: data.playerId,
            pieceIndex: data.pieceIndex,
            nextPlayer: data.nextPlayer,
            currentRound: data.currentRound,
            playerState: data.playerState,
            boardState: data.boardState,
            activePlayerCount: data.activePlayerCount
          }
        });
        break;
      }

      case 'player_passed': {
        // 玩家停手
        dispatch({ 
          type: 'PLAYER_PASSED', 
          payload: {
            playerId: data.playerId,
            nextPlayer: data.nextPlayer,
            currentRound: data.currentRound,
            activePlayerCount: data.activePlayerCount
          }
        });
        break;
      }

      case 'game_ended': {
        // 游戏结束
        dispatch({ 
          type: 'GAME_ENDED', 
          payload: {
            winner: data.winner,
            scores: data.scores,
            penalties: data.penalties
          }
        });
        break;
      }

      case 'pong': {
        // 心跳响应
        lastPongTimeRef.current = Date.now();
        break;
      }

      case 'error': {
        // 服务器错误
        console.error('[useGameRoom] 服务器错误:', data.message);
        setError(data.message);
        break;
      }

      default:
        console.warn('[useGameRoom] 未知消息类型:', data.type);
    }
  }, [determinePlayerId, fetchGameState]);

  // === 启动心跳 ===
  const startHeartbeat = useCallback(() => {
    // 清除旧的心跳
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    // 每15秒发送一次心跳
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'heartbeat' }));
        
        // 检查上次pong时间，如果超过30秒无响应则视为断线
        const timeSinceLastPong = Date.now() - lastPongTimeRef.current;
        if (timeSinceLastPong > heartbeatTimeout) {
          console.warn('[useGameRoom] 心跳超时，触发重连');
          wsRef.current.close();
        }
      }
    }, 15000);
  }, []);

  // === 停止心跳 ===
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // === 建立WebSocket连接 ===
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
          attemptReconnect();
        }
      };

      ws.onerror = (err) => {
        console.error('[useGameRoom] WebSocket错误:', err);
        setError('连接出现错误');
      };

      wsRef.current = ws;
      
    } catch (err) {
      console.error('[useGameRoom] 创建连接失败:', err);
      setError('无法建立连接');
    }
  }, [roomId, handleBroadcast, startHeartbeat, stopHeartbeat]);

  // === 断线重连（指数退避策略）===
  const attemptReconnect = useCallback(() => {
    // 清除旧的重连定时器
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    // 超过最大重连次数
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      setError('连接失败，请刷新页面重试');
      return;
    }

    // 计算延迟时间：1秒、2秒、4秒、8秒、10秒
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
    console.log(`[useGameRoom] ${delay}ms后尝试第${reconnectAttemptsRef.current + 1}次重连...`);
    
    setError(`连接断开，${Math.round(delay/1000)}秒后重连...`);

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current++;
      connect();
    }, delay);
  }, [connect]);

  // === 发送下棋消息 ===
  const sendMove = useCallback((pieceIndex, position, rotation, flip, boardState) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('[useGameRoom] WebSocket未连接，无法发送move');
      return false;
    }

    try {
      wsRef.current.send(JSON.stringify({
        type: 'move',
        pieceIndex,
        position,
        rotation,
        flip,
        boardState
      }));
      console.log('[useGameRoom] 发送move:', { pieceIndex, position });
      return true;
    } catch (err) {
      console.error('[useGameRoom] 发送move失败:', err);
      return false;
    }
  }, []);

  // === 发送停手消息 ===
  const sendPass = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('[useGameRoom] WebSocket未连接，无法发送pass');
      return false;
    }

    try {
      wsRef.current.send(JSON.stringify({ type: 'pass' }));
      console.log('[useGameRoom] 发送pass');
      return true;
    } catch (err) {
      console.error('[useGameRoom] 发送pass失败:', err);
      return false;
    }
  }, []);

  // === 主动关闭连接 ===
  const disconnect = useCallback(() => {
    stopHeartbeat();
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    
    setWsConnected(false);
  }, [stopHeartbeat]);

  // === 初始化：建立连接 ===
  useEffect(() => {
    connect();

    // 组件卸载时清理
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // === 对外暴露的接口 ===
  return {
    // 游戏状态
    gameState,
    
    // 连接状态
    wsConnected,
    error,
    
    // 用户角色（改为playerId）
    myPlayerId: myPlayerIdRef.current,
    
    // 操作方法
    sendMove,
    sendPass,
    disconnect,
    
    // 辅助方法
    reconnect: connect
  };
}