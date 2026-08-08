// 路径：src/pages/Room.jsx
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameRoom } from '../hooks/useGameRoom';
import { useGameTimer } from '../hooks/useGameTimer';
import { gameAPI } from '../services/api';

import PageLoader from '../components/PageLoader';
import GameStatus from '../components/game/GameStatus';
import GameBoard from '../components/game/GameBoard';
import TimeProgress from '../components/game/TimeProgress';
import PiecePreview from '../components/game/PiecePreview';
import GameControls from '../components/game/GameControls';
import PieceSelector from '../components/game/PieceSelector';
import ScoreBoard from '../components/game/ScoreBoard';
import GameResultModal from '../components/game/GameResultModal';

import { canPlacePiece, getNewBoard, calculateButtonStates } from '../utils/gameHelpers';
import { getPieceTransforms, calculatePieceOffset } from '../utils/pieces';

const DEFAULT_COLOR = { value: '#FF8294' };
const EMPTY_PIECES = Array(21).fill(false);

function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();

  // === WebSocket和游戏状态 ===
  const { gameState, wsConnected, error, myPlayerId, sendMove, sendPass } =
    useGameRoom(roomId);

  // === UI状态 ===
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [trialPosition, setTrialPosition] = useState(null); // {x, y, shape}
  const [showScoreBoard, setShowScoreBoard] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);

  // === 防抖状态（防止频繁点击）===
  const [isSubmitting, setIsSubmitting] = useState(false);

  // === 派生状态 ===
  const myState = gameState.playerStates?.[myPlayerId];
  const gameStatus = gameState.config?.gameStatus;
  const isMyTurn = gameState.progress?.currentPlayer === myPlayerId;
  const boardSize = gameState.config?.boardSize || 14;
  const playerCount = gameState.config?.playerCount || 2;
  const boardArray = gameState.board?.board || gameState.board;

  // === 计时器 ===
  const {
    limitRemaining,
    backupRemaining,
    usingBackup,
    limitProgress,
    backupProgress,
    limitDisplay,
    backupDisplay,
    warningLevel,
  } = useGameTimer(
    gameState.config?.limitTime ?? 60,
    myState?.backupTime ?? 300,
    isMyTurn,
    gameState.progress?.roundStartTime,
    gameStatus
  );

  // 计时器每 200ms 更新一次，下面这些值必须保持稳定引用，
  // 否则 memo 化的子组件（棋盘、棋子选择器等）会跟着一起重渲染。
  const myColor = useMemo(
    () => gameState.colors?.[myPlayerId] || DEFAULT_COLOR,
    [gameState.colors, myPlayerId]
  );

  const buttonStates = useMemo(
    () => calculateButtonStates(gameState, myPlayerId, selectedPiece, trialPosition),
    [gameState, myPlayerId, selectedPiece, trialPosition]
  );

  // === 事件处理：选择棋子 ===
  const handlePieceSelect = useCallback((pieceId) => {
    setTrialPosition(null); // 清除之前的试下
    setRotation(0);
    setFlipped(false);
    setSelectedPiece(pieceId);
  }, []);

  // === 事件处理：旋转 / 翻转（形状变了，试下位置作废）===
  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 1) % 4);
    setTrialPosition(null);
  }, []);

  const handleFlip = useCallback(() => {
    setFlipped((prev) => !prev);
    setTrialPosition(null);
  }, []);

  // === 事件处理：点击棋盘格子 ===
  const handleBoardClick = useCallback(
    (x, y) => {
      if (selectedPiece == null || !isMyTurn || gameStatus !== 'playing') return;

      const shape = getPieceTransforms(selectedPiece, rotation, flipped);
      const offset = calculatePieceOffset(shape);

      // 用户点击的是锚点位置，减去偏移得到棋子左上角
      // 合法性在“确定下棋”时才校验，这里允许自由摆放
      setTrialPosition({
        x: x - offset.offsetX,
        y: y - offset.offsetY,
        shape,
      });
    },
    [selectedPiece, isMyTurn, gameStatus, rotation, flipped]
  );

  // === 事件处理：确定下棋 ===
  const handleConfirmMove = useCallback(async () => {
    if (!trialPosition || isSubmitting) return;

    // 确认时才做合法性检查
    const validation = canPlacePiece(
      selectedPiece,
      trialPosition.x,
      trialPosition.y,
      rotation,
      flipped,
      boardArray,
      myPlayerId,
      myState
    );

    if (!validation.valid) {
      alert(validation.reason);
      return;
    }

    setIsSubmitting(true);

    try {
      const newBoard = getNewBoard(
        boardArray,
        selectedPiece,
        trialPosition.x,
        trialPosition.y,
        rotation,
        flipped,
        myPlayerId
      );

      const success = sendMove(
        selectedPiece,
        { x: trialPosition.x, y: trialPosition.y },
        rotation,
        flipped,
        newBoard
      );

      if (success) {
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
  }, [
    trialPosition,
    isSubmitting,
    selectedPiece,
    rotation,
    flipped,
    boardArray,
    myPlayerId,
    myState,
    sendMove,
  ]);

  // === 事件处理：停止下棋 ===
  const handlePass = useCallback(() => {
    if (isSubmitting) return;

    if (!window.confirm('确定要停止下棋吗？停手后本局将不再有落子机会。')) return;

    setIsSubmitting(true);

    if (!sendPass()) {
      alert('发送失败，请检查网络连接');
    }

    setTimeout(() => setIsSubmitting(false), 500);
  }, [isSubmitting, sendPass]);

  // === 事件处理：清除试下 ===
  const handleClearTrial = useCallback(() => setTrialPosition(null), []);

  // === 事件处理：开始游戏 ===
  const handleStartGame = useCallback(async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      await gameAPI.startGame(roomId);
    } catch (err) {
      console.error('Start game error:', err);
      alert(err.response?.data?.error || '开始游戏失败，请重试');
    } finally {
      setTimeout(() => setIsSubmitting(false), 500);
    }
  }, [isSubmitting, roomId]);

  // === 游戏结果 ===
  const gameResult = useMemo(() => {
    if (gameStatus !== 'finished' || !gameState.winner) return null;
    if (gameState.winner === 'draw') return 'draw';
    return gameState.winner === myPlayerId ? 'win' : 'lose';
  }, [gameStatus, gameState.winner, myPlayerId]);

  // === 结算弹窗只自动弹出一次，关闭后不再打扰 ===
  const resultShownRef = useRef(false);
  useEffect(() => {
    if (gameStatus !== 'finished' || !gameState.winner || resultShownRef.current) return;

    resultShownRef.current = true;
    // 短暂延迟，确保结算数据已到齐
    const timer = setTimeout(() => setShowResultModal(true), 500);
    return () => clearTimeout(timer);
  }, [gameStatus, gameState.winner]);

  // === 错误状态 ===
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <svg
              className="w-16 h-16 text-red-500 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
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
    return <PageLoader title="连接中..." subtitle="正在建立游戏连接" />;
  }

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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            返回首页
          </button>

          <div className="text-sm text-gray-600">
            房间号: <span className="font-mono font-semibold">{roomId}</span>
            <span className="ml-3 text-gray-500">
              棋盘: {boardSize}×{boardSize}
            </span>
          </div>
        </div>

        {/* 主内容区 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧 */}
          <div className="space-y-6">
            <GameStatus gameState={gameState} myPlayerId={myPlayerId} myState={myState} />

            {/* 游戏结束时显示查看计分板按钮 */}
            {gameStatus === 'finished' && (
              <>
                <button
                  onClick={() => setShowScoreBoard((prev) => !prev)}
                  className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  {showScoreBoard ? '隐藏计分板' : '查看计分板'}
                </button>

                {showScoreBoard && (
                  <ScoreBoard
                    players={gameState.players}
                    scores={gameState.finalScores || {}}
                    penalties={gameState.penalties || {}}
                    colors={gameState.colors}
                  />
                )}
              </>
            )}

            <GameBoard
              board={gameState.board}
              trialPosition={trialPosition}
              myColor={myColor}
              boardSize={boardSize}
              playerCount={playerCount}
              onCellClick={handleBoardClick}
              disabled={!isMyTurn || gameStatus !== 'playing'}
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
              gameStatus={gameStatus}
              gameConfig={gameState.config}
              players={gameState.players}
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
              pieces={myState?.pieces || EMPTY_PIECES}
              selectedPiece={selectedPiece}
              onSelect={handlePieceSelect}
              myColor={myColor}
            />
          </div>
        </div>

        {/* 游戏结果弹窗 */}
        <GameResultModal
          isOpen={showResultModal}
          onClose={() => setShowResultModal(false)}
          result={gameResult}
          winner={gameState.winner}
          players={gameState.players}
        />
      </div>
    </div>
  );
}

export default Room;
