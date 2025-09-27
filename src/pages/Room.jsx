import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getUser } from '../utils/auth';
import { gameAPI } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import {
  PIECES,
  getPieceTransforms,
  isOutOfBounds,
  isOverlapping,
  isValidPlacement,
  placePieceOnBoard,
  countPlayerSquares,
  getPlayerId
} from '../utils/pieces';

const TRANSFORM_STATES = [
  { rotation: 0, flipped: false, label: '原始' },
  { rotation: 1, flipped: false, label: '旋转90°' },
  { rotation: 2, flipped: false, label: '旋转180°' },
  { rotation: 3, flipped: false, label: '旋转270°' },
  { rotation: 0, flipped: true, label: '翻转' },
  { rotation: 1, flipped: true, label: '翻转+90°' },
  { rotation: 2, flipped: true, label: '翻转+180°' },
  { rotation: 3, flipped: true, label: '翻转+270°' },
];

function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const user = getUser();

  // 游戏状态
  const [gameStatus, setGameStatus] = useState('等待加入'); // 等待加入/游戏中/游戏结束
  const [board, setBoard] = useState(Array(14).fill().map(() => Array(14).fill(0)));
  const [myRole, setMyRole] = useState(null); // creator/joiner
  const [players, setPlayers] = useState({ creator: null, joiner: null });
  const [currentPlayer, setCurrentPlayer] = useState('creator');
  const [myPieces, setMyPieces] = useState(Array(21).fill(false));
  const [opponentPieces, setOpponentPieces] = useState(Array(21).fill(false));
  const [myPenalty, setMyPenalty] = useState(0);
  const [opponentPenalty, setOpponentPenalty] = useState(0);
  const [myBackupTime, setMyBackupTime] = useState(300);
  const [opponentBackupTime, setOpponentBackupTime] = useState(300);
  const [limitTime, setLimitTime] = useState(60);
  const [roundStartTime, setRoundStartTime] = useState(Date.now());
  const [lastMove, setLastMove] = useState(null); // 记录最后一步棋
  
  // UI状态
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [transformIndex, setTransformIndex] = useState(0);
  const [previewPosition, setPreviewPosition] = useState(null);
  const [confirmedPosition, setConfirmedPosition] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [loading, setLoading] = useState(true);

  // WebSocket连接
  const { connected, sendMessage } = useWebSocket(roomId, handleWebSocketMessage);

  // 计算我的playerId
  const myPlayerId = useMemo(() => {
    return myRole ? getPlayerId(myRole) : null;
  }, [myRole]);

  // 计算当前变换后的棋子形状
  const currentShape = useMemo(() => {
    if (selectedPiece === null) return null;
    const transform = TRANSFORM_STATES[transformIndex];
    return getPieceTransforms(selectedPiece, transform.rotation, transform.flipped);
  }, [selectedPiece, transformIndex]);

  // 计算我的格数
  const mySquares = useMemo(() => {
    return countPlayerSquares(board, myPlayerId);
  }, [board, myPlayerId]);

  // 计算对方格数
  const opponentSquares = useMemo(() => {
    const opponentId = myPlayerId === 1 ? 2 : 1;
    return countPlayerSquares(board, opponentId);
  }, [board, myPlayerId]);

  // 是否是我的回合
  const isMyTurn = currentPlayer === myRole && gameStatus === '游戏中';

  // 是否是第一步
  const isFirstMove = useMemo(() => {
    return myPieces.every(used => !used);
  }, [myPieces]);

  // 获取游戏初始状态
  useEffect(() => {
    const fetchGameState = async () => {
      try {
        const response = await gameAPI.getState(roomId);
        if (response.data.success) {
          const state = response.data.state;
          
          // 判断我的角色
          const role = state.players.creator.userId === user.userId ? 'creator' : 'joiner';
          setMyRole(role);
          
          // 设置玩家信息
          setPlayers(state.players);
          
          // 设置游戏状态
          setBoard(state.board?.board || Array(14).fill().map(() => Array(14).fill(0)));
          setCurrentPlayer(state.progress?.currentPlayer || 'creator');
          setLimitTime(state.config?.limitTime || 60);
          setRoundStartTime(state.progress?.roundStartTime || Date.now());
          
          // 设置棋子使用情况
          if (role === 'creator') {
            setMyPieces(state.creator?.pieces || Array(21).fill(false));
            setOpponentPieces(state.joiner?.pieces || Array(21).fill(false));
            setMyPenalty(state.creator?.penalty || 0);
            setOpponentPenalty(state.joiner?.penalty || 0);
            setMyBackupTime(state.creator?.backupTime || 300);
            setOpponentBackupTime(state.joiner?.backupTime || 300);
          } else {
            setMyPieces(state.joiner?.pieces || Array(21).fill(false));
            setOpponentPieces(state.creator?.pieces || Array(21).fill(false));
            setMyPenalty(state.joiner?.penalty || 0);
            setOpponentPenalty(state.creator?.penalty || 0);
            setMyBackupTime(state.joiner?.backupTime || 300);
            setOpponentBackupTime(state.creator?.backupTime || 300);
          }
          
          // 设置游戏状态
          if (!state.players.joiner) {
            setGameStatus('等待加入');
          } else if (state.config?.gameStatus === 'playing') {
            setGameStatus('游戏中');
          } else if (state.config?.gameStatus === 'finished') {
            setGameStatus('游戏结束');
          }
        }
      } catch (error) {
        console.error('获取游戏状态失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGameState();
  }, [roomId, user]);

  // 处理WebSocket消息
  function handleWebSocketMessage(data) {
    switch (data.type) {
      case 'game_state':
        // 初始游戏状态（连接时发送）
        // 已在useEffect中处理
        break;

      case 'player_joined':
        setPlayers(prev => ({
          ...prev,
          joiner: data.joiner
        }));
        if (myRole === 'creator') {
          setGameStatus('等待开始');
        }
        break;

      case 'game_started':
        setGameStatus('游戏中');
        setCurrentPlayer(data.currentPlayer);
        break;

      case 'move_made':
        // 对方下棋
        setBoard(data.boardState || board);
        setCurrentPlayer(data.nextPlayer);
        setRoundStartTime(Date.now());
        setLastMove({
          player: data.player,
          pieceIndex: data.pieceIndex,
          position: data.position
        });
        
        // 更新对方棋子状态
        if (data.player !== myRole) {
          setOpponentPieces(prev => {
            const newPieces = [...prev];
            newPieces[data.pieceIndex] = true;
            return newPieces;
          });
          setOpponentPenalty(data.playerState?.penalty || 0);
          setOpponentBackupTime(data.playerState?.backupTime || 300);
        } else {
          // 更新自己的状态（确认）
          setMyPenalty(data.playerState?.penalty || 0);
          setMyBackupTime(data.playerState?.backupTime || 300);
        }
        break;

      case 'player_passed':
        setCurrentPlayer(data.nextPlayer);
        setRoundStartTime(Date.now());
        break;

      case 'game_ended':
        setGameStatus('游戏结束');
        // 可以显示结果弹窗
        break;

      default:
        console.log('未处理的消息类型:', data.type);
    }
  }

  // 计时器
  useEffect(() => {
    if (gameStatus !== '游戏中' || !isMyTurn) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - roundStartTime) / 1000);
      setCurrentTime(elapsed);
    }, 100);

    return () => clearInterval(interval);
  }, [gameStatus, isMyTurn, roundStartTime]);

  // 开始游戏
  const handleStartGame = async () => {
    try {
      await gameAPI.startGame(roomId);
    } catch (error) {
      console.error('开始游戏失败:', error);
    }
  };

  // 选择棋子
  const handleSelectPiece = (pieceIndex) => {
    if (myPieces[pieceIndex]) return; // 已使用
    
    // 清除之前的试下
    setConfirmedPosition(null);
    setPreviewPosition(null);
    
    setSelectedPiece(pieceIndex);
    setTransformIndex(0);
  };

  // 形状变换
  const handleTransform = () => {
    setTransformIndex((prev) => (prev + 1) % TRANSFORM_STATES.length);
  };

  // 棋盘鼠标移动（预览）
  const handleBoardHover = (x, y) => {
    if (!isMyTurn || !currentShape || confirmedPosition) return;
    
    setPreviewPosition({ x, y });
  };

  // 棋盘点击（确认位置）
  const handleBoardClick = (x, y) => {
    if (!isMyTurn || !currentShape) return;
    
    // 验证合法性
    if (isOutOfBounds(currentShape, x, y)) return;
    if (isOverlapping(currentShape, x, y, board)) return;
    if (!isValidPlacement(currentShape, x, y, board, myPlayerId, isFirstMove)) return;
    
    setConfirmedPosition({ x, y });
    setPreviewPosition(null);
  };

  // 清除试下
  const handleClearPreview = () => {
    setConfirmedPosition(null);
    setPreviewPosition(null);
  };

  // 确定下棋
  const handleConfirmMove = () => {
    if (!confirmedPosition || !currentShape) return;
    
    const { x, y } = confirmedPosition;
    const transform = TRANSFORM_STATES[transformIndex];
    
    // 计算新棋盘
    const newBoard = placePieceOnBoard(board, currentShape, x, y, myPlayerId);
    
    // 发送WebSocket消息
    sendMessage({
      type: 'move',
      pieceIndex: selectedPiece,
      position: { x, y },
      rotation: transform.rotation,
      flip: transform.flipped,
      boardState: newBoard
    });
    
    // 更新本地状态
    setBoard(newBoard);
    setMyPieces(prev => {
      const newPieces = [...prev];
      newPieces[selectedPiece] = true;
      return newPieces;
    });
    
    // 清除选择
    setSelectedPiece(null);
    setConfirmedPosition(null);
    setTransformIndex(0);
  };

  // 停止下棋
  const handlePass = () => {
    sendMessage({ type: 'pass' });
  };

  // 渲染棋盘格子
  const renderCell = (rowIndex, colIndex) => {
    const cellValue = board[rowIndex][colIndex];
    const isPreview = previewPosition && currentShape && 
      rowIndex >= previewPosition.y && 
      rowIndex < previewPosition.y + currentShape.length &&
      colIndex >= previewPosition.x && 
      colIndex < previewPosition.x + currentShape[0].length &&
      currentShape[rowIndex - previewPosition.y][colIndex - previewPosition.x] === 1;
    
    const isConfirmed = confirmedPosition && currentShape &&
      rowIndex >= confirmedPosition.y && 
      rowIndex < confirmedPosition.y + currentShape.length &&
      colIndex >= confirmedPosition.x && 
      colIndex < confirmedPosition.x + currentShape[0].length &&
      currentShape[rowIndex - confirmedPosition.y][colIndex - confirmedPosition.x] === 1;

    // 检查是否是最后一步的棋子
    const isLastMove = lastMove && 
      lastMove.player !== myRole &&
      rowIndex >= lastMove.position.y && 
      rowIndex < lastMove.position.y + currentShape?.length &&
      colIndex >= lastMove.position.x && 
      colIndex < lastMove.position.x + currentShape?.[0]?.length;

    let bgColor = 'bg-white';
    if (cellValue === 1) bgColor = 'bg-blue-400'; // 创建者
    if (cellValue === 2) bgColor = 'bg-red-400';  // 加入者
    if (isPreview) bgColor = myPlayerId === 1 ? 'bg-blue-200' : 'bg-red-200';
    if (isConfirmed) bgColor = myPlayerId === 1 ? 'bg-blue-500' : 'bg-red-500';
    if (isLastMove) bgColor = 'ring-2 ring-yellow-400';

    return (
      <div
        key={`${rowIndex}-${colIndex}`}
        className={`w-6 h-6 border border-gray-300 ${bgColor} ${isLastMove ? 'ring-2 ring-yellow-400' : ''}`}
        onMouseEnter={() => handleBoardHover(colIndex, rowIndex)}
        onClick={() => handleBoardClick(colIndex, rowIndex)}
      />
    );
  };

  // 渲染棋子预览
  const renderPiecePreview = (shape, scale = 4) => {
    if (!shape) return null;
    
    return (
      <div className="inline-block">
        {shape.map((row, i) => (
          <div key={i} className="flex">
            {row.map((cell, j) => (
              <div
                key={j}
                className={`w-${scale} h-${scale} ${
                  cell === 1 ? (myPlayerId === 1 ? 'bg-blue-400' : 'bg-red-400') : 'bg-transparent'
                }`}
              />
            ))}
          </div>
        ))}
      </div>
    );
  };

  // 渲染状态文字
  const getStatusText = () => {
    if (gameStatus === '游戏结束') {
      const finalMyScore = mySquares - myPenalty;
      const finalOpponentScore = opponentSquares - opponentPenalty;
      const myName = myRole === 'creator' ? 'A' : 'B';
      const opponentName = myRole === 'creator' ? 'B' : 'A';
      const winner = finalMyScore > finalOpponentScore ? myName : 
                     finalOpponentScore > finalMyScore ? opponentName : '平局';
      return `${myName}:${finalMyScore}格(${mySquares}-${myPenalty}格), ${opponentName}:${finalOpponentScore}格(${opponentSquares}-${opponentPenalty}格), ${winner}胜利`;
    }
    return gameStatus;
  };

  const getTurnText = () => {
    if (gameStatus !== '游戏中') return '';
    if (isMyTurn) return '我的回合';
    return '对方回合';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto flex gap-4">
        {/* 左侧 */}
        <div className="flex-1">
          {/* 状态信息 */}
          <div className="bg-white rounded-lg p-4 mb-4 space-y-2">
            <div className="text-2xl font-bold">{getStatusText()}</div>
            <div className="flex gap-4 text-sm">
              <span>惩罚：-{myPenalty}格</span>
              <span>格数：{mySquares}格</span>
              <span className="font-semibold">{getTurnText()}</span>
            </div>
          </div>

          {/* 棋盘 */}
          <div className="bg-white rounded-lg p-4 inline-block">
            <div className="grid grid-cols-14 gap-0">
              {board.map((row, rowIndex) =>
                row.map((_, colIndex) => renderCell(rowIndex, colIndex))
              )}
            </div>
          </div>
        </div>

        {/* 右侧 */}
        <div className="w-80 space-y-4">
          {/* 进度条 */}
          <div className="bg-white rounded-lg p-4 space-y-3">
            <div>
              <div className="text-sm mb-1">回合时间</div>
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 transition-all"
                  style={{ width: `${Math.max(0, 100 - (currentTime / limitTime) * 100)}%` }}
                />
              </div>
              <div className="text-right text-xs text-gray-500">{limitTime - currentTime}s</div>
            </div>
            <div>
              <div className="text-sm mb-1">备用时间</div>
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-yellow-500 transition-all"
                  style={{ width: `${(myBackupTime / 300) * 100}%` }}
                />
              </div>
              <div className="text-right text-xs text-gray-500">{Math.max(0, myBackupTime)}s</div>
            </div>
          </div>

          {/* 棋子预览和控制 */}
          <div className="bg-white rounded-lg p-4">
            <div className="flex gap-4">
              {/* 预览 */}
              <div className="flex-1 border rounded-lg p-4 flex items-center justify-center min-h-[120px]">
                {currentShape ? renderPiecePreview(currentShape, 6) : '选择棋子'}
              </div>

              {/* 按钮 */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleConfirmMove}
                  disabled={!isMyTurn || !confirmedPosition}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-green-700 transition text-sm"
                >
                  确定下棋
                </button>
                <button
                  onClick={handleTransform}
                  disabled={!selectedPiece}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition text-sm"
                >
                  形状变换
                </button>
                <button
                  onClick={handlePass}
                  disabled={!isMyTurn}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-orange-700 transition text-sm"
                >
                  停止下棋
                </button>
                <button
                  onClick={handleClearPreview}
                  disabled={!confirmedPosition && !previewPosition}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-gray-700 transition text-sm"
                >
                  清除试下
                </button>
              </div>
            </div>
          </div>

          {/* 棋子库 */}
          <div className="bg-white rounded-lg p-4">
            <div className="text-sm font-semibold mb-2">候选棋子</div>
            <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto">
              {PIECES.map((piece, index) => {
                const isUsed = myPieces[index];
                const isSelected = selectedPiece === index;
                
                return (
                  <button
                    key={piece.id}
                    onClick={() => handleSelectPiece(index)}
                    disabled={isUsed}
                    className={`
                      p-2 rounded-lg border-2 transition
                      ${isUsed ? 'bg-gray-200 cursor-not-allowed' : 'bg-white hover:bg-gray-50'}
                      ${isSelected ? 'border-blue-500' : 'border-gray-300'}
                    `}
                  >
                    {renderPiecePreview(piece.shape, 2)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 开始游戏按钮（仅创建者可见） */}
          {myRole === 'creator' && gameStatus === '等待开始' && (
            <button
              onClick={handleStartGame}
              className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
            >
              开始游戏
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Room;