// 路径：src/pages/Room.jsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameRoom } from '../hooks/useGameRoom';
import { useGameTimer } from '../hooks/useGameTimer';
import { gameAPI } from '../services/api';

import GameStatus from '../components/game/GameStatus';
import GameBoard from '../components/game/GameBoard';
import TimeProgress from '../components/game/TimeProgress';
import PiecePreview from '../components/game/PiecePreview';
import GameControls from '../components/game/GameControls';
import PieceSelector from '../components/game/PieceSelector';
import ScoreBoard from '../components/game/ScoreBoard';
import GameResultModal from '../components/game/GameResultModal';

import { 
  canPlacePiece, 
  getNewBoard, 
  calculateButtonStates,
  getPlayerColorId
} from '../utils/gameHelpers';

import { getPieceTransforms, calculatePieceOffset } from '../utils/pieces';

function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  // === WebSocket和游戏状态 ===
  const {
    gameState,
    wsConnected,
    error,
    myPlayerId,  // 变更: 使用playerId而不是role
    sendMove,
    sendPass
  } = useGameRoom(roomId);

  // === UI状态 ===
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [trialPosition, setTrialPosition] = useState(null); // {x, y, shape}
  const [showScoreBoard, setShowScoreBoard] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  
  // === 防抖状态（防止频繁点击）===
  const [isSubmitting, setIsSubmitting] = useState(false);

  // === 获取我的状态 ===
  const myState = gameState?.playerStates?.[myPlayerId];
  const isMyTurn = gameState.progress?.currentPlayer === myPlayerId;
  const boardSize = gameState.config?.boardSize || 14;

  // === 计时器 ===
  const {
    limitRemaining,
    backupRemaining,
    usingBackup,
    limitProgress,
    backupProgress,
    limitDisplay,
    backupDisplay,
    warningLevel
  } = useGameTimer(
    gameState.config?.limitTime ?? 60,
    myState?.backupTime ?? 300,
    isMyTurn,
    gameState.progress?.roundStartTime,
    gameState.config?.gameStatus
  );

  // === 按钮状态 ===
  const buttonStates = calculateButtonStates(
    gameState,
    myPlayerId,
    selectedPiece,
    trialPosition
  );

  // === 事件处理：选择棋子 ===
  const handlePieceSelect = (pieceId) => {
    // 清除之前的试下
    setTrialPosition(null);
    // 重置旋转和翻转
    setRotation(0);
    setFlipped(false);
    // 选中新棋子
    setSelectedPiece(pieceId);
  };

  // === 事件处理：旋转棋子 ===
  const handleRotate = () => {
    if (selectedPiece == null) return;
    
    setRotation((prev) => (prev + 1) % 4);
    
    // 如果有试下，需要清除（因为形状变了）
    if (trialPosition) {
      setTrialPosition(null);
    }
  };

  // === 事件处理：翻转棋子 ===
  const handleFlip = () => {
    if (selectedPiece == null) return;
    
    setFlipped((prev) => !prev);
    
    // 如果有试下，需要清除（因为形状变了）
    if (trialPosition) {
      setTrialPosition(null);
    }
  };

  // === 事件处理：点击棋盘格子 ===
  const handleBoardClick = (x, y) => {
    if (selectedPiece == null || !isMyTurn || gameState.config?.gameStatus !== 'playing') {
      return;
    }

    // 获取当前棋子形状及锚点偏移
    const shape = getPieceTransforms(selectedPiece, rotation, flipped);
    const offset = calculatePieceOffset(shape);
    
    // 用户点击的是锚点位置，需要减去偏移得到实际的左上角
    const actualX = x - offset.offsetX;
    const actualY = y - offset.offsetY;

    // 直接设置试下位置，不做合法性检查
    setTrialPosition({
      x: actualX,
      y: actualY,
      shape
    });
  };

  // === 事件处理：确定下棋 ===
  const handleConfirmMove = async () => {
    if (!trialPosition || isSubmitting) return;

    // 在确认下棋时进行合法性检查
    const validation = canPlacePiece(
      selectedPiece,
      trialPosition.x,
      trialPosition.y,
      rotation,
      flipped,
      gameState.board.board || gameState.board,
      myPlayerId,
      myState
    );

    if (!validation.valid) {
      console.warn('无法放置:', validation.reason);
      alert(validation.reason);
      return;
    }

    setIsSubmitting(true);

    try {
      // 计算新棋盘
      const newBoard = getNewBoard(
        gameState.board.board || gameState.board,
        selectedPiece,
        trialPosition.x,
        trialPosition.y,
        rotation,
        flipped,
        myPlayerId, 
        myState?.colorId
      );

      // 发送WebSocket消息
      const success = sendMove(
        selectedPiece,
        { x: trialPosition.x, y: trialPosition.y },
        rotation,
        flipped,
        newBoard
      );

      if (success) {
        // 清空UI状态
        setSelectedPiece(null);
        setTrialPosition(null);
        setRotation(0);
        setFlipped(false);
      } else {
        alert('发送失败，请检查网络连接');
      }
    } catch (err) {
      console.error('Confirm move error:', err);
      alert('下棋失败，请重试');
    } finally {
      // 延迟解锁，防止重复点击
      setTimeout(() => setIsSubmitting(false), 500);
    }
  };

  // === 事件处理：停止下棋 ===
  const handlePass = async () => {
    if (isSubmitting) return;

    const confirmed = window.confirm('确定要停止下棋吗？停手后本局将不再有落子机会。');
    if (!confirmed) return;

    setIsSubmitting(true);

    try {
      const success = sendPass();
      
      if (!success) {
        alert('发送失败，请检查网络连接');
      }
    } catch (err) {
      console.error('Pass error:', err);
      alert('停手失败，请重试');
    } finally {
      setTimeout(() => setIsSubmitting(false), 500);
    }
  };

  // === 事件处理：清除试下 ===
  const handleClearTrial = () => {
    setTrialPosition(null);
  };

  // === 事件处理：开始游戏 ===
  const handleStartGame = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      await gameAPI.startGame(roomId);
    } catch (err) {
      console.error('Start game error:', err);
      alert('开始游戏失败，请重试');
    } finally {
      setTimeout(() => setIsSubmitting(false), 500);
    }
  };


  // === 计算游戏结果 ===
  const getGameResult = useCallback(() => {
    if (gameState.config?.gameStatus !== 'finished' || !gameState.winner) {
      return null;
    }
    
    if (gameState.winner === 'draw') {
      return 'draw';
    }
    
    return gameState.winner === myPlayerId ? 'win' : 'lose';
  }, [gameState.config?.gameStatus, gameState.winner, myPlayerId]);

  //=== 显示结果弹窗 ===
  useEffect(() => {
    if (gameState.config?.gameStatus === 'finished' && gameState.winner && !showResultModal) {
      // 短暂延迟，确保状态已更新
      setTimeout(() => {
        setShowResultModal(true);
      }, 500);
    }
  }, [gameState.config?.gameStatus, gameState.winner]);

  // === 游戏结束处理 ===
  useEffect(() => {
    if (gameState.config?.gameStatus === 'finished') {
      console.log('游戏结束', gameState.winner, gameState.finalScores);
    }
  }, [gameState.config?.gameStatus, gameState.winner, gameState.finalScores]);

  // === 错误处理 ===
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">连接错误</h2>
            <p className="text-red-600 mb-6">{error}</p>
          </div>
          <button
            onClick={() => navigate('/home')}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  // === 加载状态 ===
  if (!wsConnected || !gameState.config || !myPlayerId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-gray-600 font-medium">连接中...</p>
          <p className="text-gray-400 text-sm mt-2">正在建立游戏连接</p>
        </div>
      </div>
    );
  }

  // 获取当前玩家的颜色信息
  const myColor = gameState.colors?.[myPlayerId] || { value: "#FF8294" };

  // === 主渲染 ===
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* 顶部导航栏 */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/home')}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-white rounded-lg transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回首页
          </button>
          
          <div className="text-sm text-gray-600">
            房间号: <span className="font-mono font-semibold">{roomId}</span>
            {gameState.config.boardSize && (
              <span className="ml-3 text-gray-500">
                棋盘: {gameState.config.boardSize}×{gameState.config.boardSize}
              </span>
            )}
          </div>
        </div>

        {/* 主内容区 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧 */}
          <div className="space-y-6">
            <GameStatus
              gameState={gameState}
              myPlayerId={myPlayerId}
              myState={myState}
            />

            {/* 游戏结束时显示查看计分板按钮 */}
            {gameState.config?.gameStatus === 'finished' && (
              <button
                onClick={() => setShowScoreBoard(!showScoreBoard)}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
              >
                {showScoreBoard ? '隐藏计分板' : '查看计分板'}
              </button>
            )}
          
            {/* 条件显示计分板 */}
            {showScoreBoard && gameState.config?.gameStatus === 'finished' && (
              <ScoreBoard 
                players={gameState.players}
                scores={gameState.winner ? gameState.finalScores : {}}
                penalties={gameState.penalties || {}}
                colors={gameState.colors}
              />
            )}
            
            <GameBoard
              board={gameState.board}
              trialPosition={trialPosition}
              myPlayerId={myPlayerId}
              myColor={myColor}
              boardSize={boardSize}
              onCellClick={handleBoardClick}
              disabled={!isMyTurn || gameState.config?.gameStatus !== 'playing'}
              selectedPiece={selectedPiece}  
              rotation={rotation}            
              flipped={flipped}              
            />
          </div>

          {/* 右侧 */}
          <div className="space-y-6">
            <TimeProgress
              limitProgress={limitProgress}
              backupProgress={backupProgress}
              limitRemaining={limitRemaining}
              backupRemaining={backupRemaining}
              limitDisplay={limitDisplay}
              backupDisplay={backupDisplay}
              isMyTurn={isMyTurn}
              usingBackup={usingBackup}
              warningLevel={warningLevel}
              buttonStates={buttonStates}
              onStartGame={handleStartGame}
              myPlayerId={myPlayerId}                      
              gameStatus={gameState.config?.gameStatus} 
              gameConfig={gameState.config}  // 新增: 传递游戏配置
              players={gameState.players}    // 新增: 传递玩家列表
            />

            {/* 棋子预览和操作按钮并排 */}
            <div className="grid grid-cols-2 gap-6">
              <PiecePreview
                pieceId={selectedPiece}
                rotation={rotation}
                flipped={flipped}
                myColor={myColor}
              />

              <GameControls
                buttonStates={buttonStates}
                onConfirmMove={handleConfirmMove}
                onRotate={handleRotate}
                onFlip={handleFlip}
                onPass={handlePass}
                onClearTrial={handleClearTrial}
              />
            </div>

            <PieceSelector
              pieces={myState?.pieces || Array(21).fill(false)}
              selectedPiece={selectedPiece}
              onSelect={handlePieceSelect}
              myColor={myColor}
            />
          </div>

          {/* 添加游戏结果弹窗 */}
          <GameResultModal
            isOpen={showResultModal}
            onClose={() => setShowResultModal(false)}
            result={getGameResult()}
            myPlayerId={myPlayerId}
            winner={gameState.winner}
            players={gameState.players}
          />

        </div>
      </div>
    </div>
  );
}

export default Room;