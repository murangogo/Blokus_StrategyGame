import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getUser } from '../utils/auth';
import { gameAPI } from '../services/api';
import { PIECES, getPieceTransforms, isOutOfBounds, isOverlapping, isValidPlacement } from '../constants/pieces';
import Toast from '../components/Toast';

function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const user = getUser();
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const timerRef = useRef(null);
  
  // 游戏状态
  const [gameState, setGameState] = useState(null);
  const [board, setBoard] = useState(Array(14).fill(null).map(() => Array(14).fill(0)));
  const [myRole, setMyRole] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState('creator');
  
  // 棋子选择状态
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [previewPos, setPreviewPos] = useState(null);
  const [usedPieces, setUsedPieces] = useState({
    creator: Array(21).fill(false),
    joiner: Array(21).fill(false)
  });
  
  // 计时器状态
  const [limitTime, setLimitTime] = useState(60);
  const [backupTime, setBackupTime] = useState({ creator: 300, joiner: 300 });
  const [currentTime, setCurrentTime] = useState(60);
  const [roundStartTime, setRoundStartTime] = useState(null);
  
  // UI状态
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [gameStatus, setGameStatus] = useState('waiting');
  const [isPassed, setIsPassed] = useState(false);
  const [gameResult, setGameResult] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);

  // 显示Toast
  const showToast = useCallback((message, type = 'error') => {
    setToast({ message, type });
  }, []);

  // 获取游戏状态
  useEffect(() => {
    const fetchGameState = async () => {
      try {
        const response = await gameAPI.getState(roomId);
        if (response.data.success) {
          const state = response.data.state;
          setGameState(state);
          setGameStatus(state.config?.gameStatus || 'waiting');
          setLimitTime(state.config?.limitTime || 60);
          
          if (state.players?.creator?.userId === user.userId) {
            setMyRole('creator');
          } else if (state.players?.joiner?.userId === user.userId) {
            setMyRole('joiner');
          }
          
          if (state.board?.board) {
            setBoard(state.board.board);
          }
          
          if (state.creator && state.joiner) {
            setUsedPieces({
              creator: state.creator.pieces || Array(21).fill(false),
              joiner: state.joiner.pieces || Array(21).fill(false)
            });
            setBackupTime({
              creator: state.creator.backupTime || 300,
              joiner: state.joiner.backupTime || 300
            });
            setIsPassed(state[myRole]?.passed || false);
          }
          
          if (state.progress) {
            setCurrentPlayer(state.progress.currentPlayer);
            setRoundStartTime(state.progress.roundStartTime);
          }
          
          setLoading(false);
        }
      } catch (err) {
        console.error('Fetch state error:', err);
        showToast('获取房间状态失败');
        setLoading(false);
      }
    };
    
    fetchGameState();
  }, [roomId, user.userId, showToast]);

  // WebSocket连接
  const connectWebSocket = useCallback(() => {
    if (!myRole) return;
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = import.meta.env.PROD 
      ? 'battle.azuki.top'
      : window.location.host;
    const wsUrl = `${protocol}//${host}/api/game/connect/${roomId}?playerId=${user.userId}`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setWsConnected(true);
      showToast('已连接到游戏服务器', 'success');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setWsConnected(false);
    };
    
    ws.onclose = () => {
      console.log('WebSocket closed');
      setWsConnected(false);
      
      // 5秒后自动重连
      reconnectTimerRef.current = setTimeout(() => {
        showToast('正在重新连接...', 'info');
        connectWebSocket();
      }, 5000);
    };
  }, [myRole, roomId, user.userId, showToast]);

  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [connectWebSocket]);

  // 计时器逻辑
  useEffect(() => {
    if (gameStatus !== 'playing' || !roundStartTime) return;
    
    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - roundStartTime) / 1000);
      const remaining = limitTime - elapsed;
      
      if (remaining > 0) {
        setCurrentTime(remaining);
      } else {
        // 开始使用backup time
        const backupRemaining = backupTime[currentPlayer] - (elapsed - limitTime);
        if (backupRemaining > 0) {
          setCurrentTime(0);
          setBackupTime(prev => ({
            ...prev,
            [currentPlayer]: backupRemaining
          }));
        } else {
          setCurrentTime(0);
          setBackupTime(prev => ({
            ...prev,
            [currentPlayer]: 0
          }));
          // TODO: 触发超时惩罚
        }
      }
    };
    
    timerRef.current = setInterval(updateTimer, 1000);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameStatus, roundStartTime, limitTime, currentPlayer, backupTime]);

  // 处理WebSocket消息
  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'game_state':
        setGameState(data);
        setGameStatus(data.config?.gameStatus);
        if (data.progress) {
          setCurrentPlayer(data.progress.currentPlayer);
          setRoundStartTime(data.progress.roundStartTime);
          setCurrentTime(data.config?.limitTime || 60);
        }
        break;
        
      case 'player_joined':
        setGameState(prev => ({
          ...prev,
          players: { ...prev.players, joiner: data.joiner }
        }));
        showToast('对手已加入', 'success');
        break;
        
      case 'game_started':
        setGameStatus('playing');
        setCurrentPlayer(data.currentPlayer);
        setRoundStartTime(Date.now());
        setCurrentTime(limitTime);
        showToast('游戏开始！', 'success');
        break;
        
      case 'move_made':
        setBoard(data.board || board);
        setCurrentPlayer(data.nextPlayer);
        setRoundStartTime(Date.now());
        setCurrentTime(limitTime);
        setUsedPieces(prev => ({
          ...prev,
          [data.player]: [...prev[data.player]].map((used, i) => 
            i === data.pieceIndex ? true : used
          )
        }));
        setSelectedPiece(null);
        setPreviewPos(null);
        setRotation(0);
        setFlipped(false);
        break;
        
      case 'player_passed':
        if (data.player === myRole) {
          setIsPassed(true);
          showToast('你已停手', 'info');
        } else {
          showToast('对手已停手', 'info');
        }
        break;
        
      case 'game_ended':
        setGameStatus('finished');
        setGameResult({
          winner: data.winner,
          scores: data.scores,
          penalties: data.penalties
        });
        break;
        
      case 'error':
        showToast(data.message);
        break;
    }
  };

  // 开始游戏
  const handleStartGame = async () => {
    try {
      await gameAPI.startGame(roomId);
    } catch (err) {
      showToast('开始游戏失败');
    }
  };

  // 选择棋子
  const handleSelectPiece = (pieceId) => {
    if (usedPieces[myRole][pieceId]) return;
    if (currentPlayer !== myRole) return;
    if (gameStatus !== 'playing') return;
    
    setSelectedPiece(pieceId);
    setRotation(0);
    setFlipped(false);
    setPreviewPos(null);
  };

  // 旋转/翻转
  const handleRotate = () => setRotation((rotation + 1) % 4);
  const handleFlip = () => setFlipped(!flipped);

  // 棋盘点击
  const handleBoardClick = (y, x) => {
    if (selectedPiece === null) return;
    if (currentPlayer !== myRole) return;
    if (gameStatus !== 'playing') return;
    
    const shape = getPieceTransforms(selectedPiece, rotation, flipped);
    
    if (isOutOfBounds(shape, x, y)) {
      showToast('超出边界');
      return;
    }
    
    if (isOverlapping(shape, x, y, board)) {
      showToast('棋子重叠');
      return;
    }
    
    const playerId = myRole === 'creator' ? 1 : 2;
    const isFirstMove = usedPieces[myRole].every(used => !used);
    
    if (!isValidPlacement(shape, x, y, board, playerId, isFirstMove)) {
      showToast(isFirstMove ? '第一个棋子必须在角落' : '不符合角对角规则');
      return;
    }
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'move',
        pieceIndex: selectedPiece,
        position: { x, y },
        rotation,
        flip: flipped
      }));
    } else {
      showToast('连接断开，请等待重连');
    }
  };

  // 停手
  const handlePass = () => {
    if (currentPlayer !== myRole) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'pass' }));
    }
  };

  // 渲染预览
  const renderPreview = (y, x) => {
    if (!selectedPiece && selectedPiece !== 0) return null;
    if (!previewPos || previewPos.x !== x || previewPos.y !== y) return null;
    
    const shape = getPieceTransforms(selectedPiece, rotation, flipped);
    const playerId = myRole === 'creator' ? 1 : 2;
    const isFirstMove = usedPieces[myRole].every(used => !used);
    
    const isValid = !isOutOfBounds(shape, x, y) && 
                    !isOverlapping(shape, x, y, board) &&
                    isValidPlacement(shape, x, y, board, playerId, isFirstMove);
    
    return (
      <div className="absolute inset-0 pointer-events-none">
        {shape.map((row, i) =>
          row.map((cell, j) => {
            if (!cell) return null;
            const posY = y + i;
            const posX = x + j;
            if (posY >= 14 || posX >= 14) return null;
            
            return (
              <div
                key={`preview-${i}-${j}`}
                className={`absolute ${isValid ? 'bg-green-400' : 'bg-red-400'} opacity-50`}
                style={{
                  top: `${(posY / 14) * 100}%`,
                  left: `${(posX / 14) * 100}%`,
                  width: `${100 / 14}%`,
                  height: `${100 / 14}%`
                }}
              />
            );
          })
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div className="max-w-7xl mx-auto">
        {/* 顶部信息栏 */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/home')}
                className="text-gray-600 hover:text-gray-800"
              >
                ← 返回
              </button>
              <div>
                <h2 className="text-xl font-bold">房间号: {roomId}</h2>
                <p className="text-sm text-gray-500">
                  你是: {myRole === 'creator' ? '创建者（蓝色）' : '加入者（红色）'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              
              {gameStatus === 'waiting' && myRole === 'creator' && (
                <button
                  onClick={handleStartGame}
                  disabled={!gameState?.players?.joiner}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                >
                  {gameState?.players?.joiner ? '开始游戏' : '等待对手...'}
                </button>
              )}
              
              {gameStatus === 'playing' && (
                <div className="text-lg font-semibold">
                  {currentPlayer === myRole ? '你的回合' : '对手回合'}
                </div>
              )}
            </div>
          </div>
          
          {/* 计时器 */}
          {gameStatus === 'playing' && (
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>回合时间</span>
                  <span>{currentTime}s / {limitTime}s</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 transition-all duration-1000"
                    style={{ width: `${Math.max(0, (currentTime / limitTime) * 100)}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>后备时间 ({currentPlayer === 'creator' ? '创建者' : '加入者'})</span>
                  <span>{backupTime[currentPlayer]}s / 300s</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-500 transition-all duration-1000"
                    style={{ width: `${(backupTime[currentPlayer] / 300) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* 棋盘 */}
          <div className="lg:col-span-3 bg-white rounded-xl shadow-lg p-4">
            <div className="aspect-square max-w-2xl mx-auto relative">
              <div className="grid grid-cols-14 gap-0.5 bg-gray-300 p-1">
                {board.map((row, y) =>
                  row.map((cell, x) => (
                    <div
                      key={`${y}-${x}`}
                      onClick={() => handleBoardClick(y, x)}
                      onMouseEnter={() => setPreviewPos({ x, y })}
                      onMouseLeave={() => setPreviewPos(null)}
                      className={`
                        aspect-square border border-gray-400 cursor-pointer transition
                        ${cell === 0 ? 'bg-white hover:bg-gray-100' : ''}
                        ${cell === 1 ? 'bg-blue-500' : ''}
                        ${cell === 2 ? 'bg-red-500' : ''}
                      `}
                    />
                  ))
                )}
              </div>
              {previewPos && renderPreview(previewPos.y, previewPos.x)}
            </div>
            
            {/* 操作按钮 */}
            {gameStatus === 'playing' && currentPlayer === myRole && selectedPiece !== null && (
              <div className="flex gap-2 mt-4 justify-center">
                <button onClick={handleRotate} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                  旋转 ({rotation * 90}°)
                </button>
                <button onClick={handleFlip} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                  {flipped ? '已翻转' : '翻转'}
                </button>
                <button onClick={() => {
                  setSelectedPiece(null);
                  setRotation(0);
                  setFlipped(false);
                }} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition">
                  取消
                </button>
              </div>
            )}
          </div>

          {/* 棋子面板 */}
          <div className="bg-white rounded-xl shadow-lg p-4">
            <h3 className="font-bold mb-4">我的棋子</h3>
            <div className="grid grid-cols-3 gap-2 max-h-[600px] overflow-y-auto">
              {PIECES.map((piece) => (
                <button
                  key={piece.id}
                  onClick={() => handleSelectPiece(piece.id)}
                  disabled={usedPieces[myRole]?.[piece.id] || currentPlayer !== myRole || gameStatus !== 'playing'}
                  className={`
                    p-2 border-2 rounded-lg transition
                    ${selectedPiece === piece.id ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
                    ${usedPieces[myRole]?.[piece.id] ? 'opacity-30 cursor-not-allowed' : 'hover:border-blue-400 cursor-pointer'}
                    ${currentPlayer !== myRole || gameStatus !== 'playing' ? 'cursor-not-allowed opacity-50' : ''}
                  `}
                >
                  <div className="aspect-square flex items-center justify-center">
                    <div className="grid gap-0.5" style={{
                      gridTemplateColumns: `repeat(${piece.shape[0].length}, minmax(0, 1fr))`
                    }}>
                      {piece.shape.map((row, i) =>
                        row.map((cell, j) => (
                          <div
                            key={`${i}-${j}`}
                            className={`w-2 h-2 ${cell ? (myRole === 'creator' ? 'bg-blue-500' : 'bg-red-500') : ''}`}
                          />
                        ))
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            {gameStatus === 'playing' && currentPlayer === myRole && !isPassed && (
              <button
                onClick={handlePass}
                className="w-full mt-4 px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition"
              >
                停手
              </button>
            )}
            
            {isPassed && (
              <div className="mt-4 p-3 bg-gray-100 rounded-lg text-center text-gray-600">
                你已停手
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 游戏结束弹窗 */}
      {gameResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4 text-center">游戏结束</h2>
            <div className="space-y-4">
              <div className="text-center text-xl font-semibold">
                {gameResult.winner === 'draw' ? '平局！' : 
                 gameResult.winner === myRole ? '你赢了！' : '你输了'}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">创建者</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {gameResult.scores.creator}
                  </div>
                  {gameResult.penalties.creator > 0 && (
                    <div className="text-xs text-red-600">
                      惩罚: -{gameResult.penalties.creator}
                    </div>
                  )}
                </div>
                
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">加入者</div>
                  <div className="text-2xl font-bold text-red-600">
                    {gameResult.scores.joiner}
                  </div>
                  {gameResult.penalties.joiner > 0 && (
                    <div className="text-xs text-red-600">
                      惩罚: -{gameResult.penalties.joiner}
                    </div>
                  )}
                </div>
              </div>
              
              <button
                onClick={() => navigate('/home')}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
              >
                返回首页
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Room;