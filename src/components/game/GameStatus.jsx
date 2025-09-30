// components/game/GameStatus.jsx
import { 
  getGameStatusText, 
  getRoundStatusText,
  countPlayerSquares,
  getPlayerId 
} from '../../utils/gameHelpers';

function GameStatus({ gameState, myRole, myState }) {
  // 获取游戏状态文本
  const gameStatusText = getGameStatusText(gameState, myRole);
  
  // 获取回合状态文本
  const roundStatusText = getRoundStatusText(gameState, myRole);

  // 计算我的棋盘格数
  const mySquares = myState && gameState.board 
    ? countPlayerSquares(gameState.board.board || gameState.board, getPlayerId(myRole))
    : 0;

  // 我的惩罚格数
  const myPenalty = myState?.penalty || 0;

  // 最终得分（格数 - 惩罚）
  const myFinalScore = mySquares - myPenalty;

  // 根据回合状态决定样式
  const getRoundStatusStyle = () => {
    if (!gameState.config || gameState.config.gameStatus !== 'playing') {
      return 'bg-gray-100 text-gray-600 border-gray-300';
    }

    if (roundStatusText.includes('我的回合')) {
      return 'bg-green-100 text-green-700 border-green-300';
    } else if (roundStatusText.includes('对方回合')) {
      return 'bg-blue-100 text-blue-700 border-blue-300';
    } else if (roundStatusText.includes('已停手')) {
      return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    } else {
      return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
      {/* 游戏状态 - 最大最醒目 */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-1">
          {gameStatusText}
        </h2>
        {gameState.config?.gameStatus === 'waiting' && (
          <p className="text-sm text-gray-500">
            房间号: {gameState.config.roomId}
          </p>
        )}
      </div>

      {/* 分隔线 */}
      <div className="border-t border-gray-200"></div>

      {/* 我的数据区域 */}
      <div className="grid grid-cols-3 gap-3">
        {/* 惩罚格数 */}
        <div className="bg-red-50 rounded-lg p-3 border border-red-200">
          <div className="text-xs text-red-600 font-medium mb-1">惩罚</div>
          <div className="text-2xl font-bold text-red-700">
            {myPenalty > 0 ? `-${myPenalty}` : '0'}格
          </div>
        </div>

        {/* 棋盘格数 */}
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <div className="text-xs text-blue-600 font-medium mb-1">格数</div>
          <div className="text-2xl font-bold text-blue-700">
            {mySquares}格
          </div>
        </div>

        {/* 最终得分 */}
        <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
          <div className="text-xs text-purple-600 font-medium mb-1">得分</div>
          <div className="text-2xl font-bold text-purple-700">
            {myFinalScore}格
          </div>
        </div>
      </div>

      {/* 回合状态 - 突出显示 */}
      {gameState.config?.gameStatus === 'playing' && (
        <div className={`
          rounded-lg p-4 text-center font-semibold text-lg
          border-2 ${getRoundStatusStyle()}
          transition-all duration-300
        `}>
          {roundStatusText}
        </div>
      )}

      {/* 额外信息 */}
      {gameState.progress && gameState.config?.gameStatus === 'playing' && (
        <div className="flex items-center justify-between text-sm text-gray-500 pt-2 border-t border-gray-100">
          <span>回合数: {gameState.progress.currentRound}</span>
          {myState && (
            <span>已用棋子: {myState.totalPiecesUsed}/21</span>
          )}
        </div>
      )}
    </div>
  );
}

export default GameStatus;