// 路径：src/components/game/GameStatus.jsx
import { countPlayerSquares } from '../../utils/pieces';

function GameStatus({ gameState, myPlayerId, myState }) {
  // 获取我的颜色ID
  const myColorId = myState?.colorId || parseInt(myPlayerId.substring(1));

  // 计算我的棋盘格数
  const mySquares = myState && gameState.board 
    ? countPlayerSquares(gameState.board.board || gameState.board, myColorId)
    : 0;

  // 我的惩罚格数
  const myPenalty = myState?.penalty || 0;

  // 最终得分（格数 - 惩罚）
  const myFinalScore = mySquares - myPenalty;

  // 游戏状态文本
  const getGameStatusText = () => {
    if (!gameState.config) return '加载中...';
    
    const { gameStatus, playerCount = 0, requiredPlayerCount = 2, hasEnoughPlayers = false } = gameState.config;
    
    // 获取已加入玩家数量
    const joinedPlayers = gameState.players?.filter(p => p !== null).length || 0;
    
    switch (gameStatus) {
      case 'waiting':
        if (myPlayerId === 'p1') { // 创建者
          return hasEnoughPlayers || joinedPlayers >= requiredPlayerCount
            ? '等待开始游戏'
            : `等待其他玩家加入 (${joinedPlayers}/${requiredPlayerCount})`;
        } else {
          return '等待房主开始游戏';
        }
        
      case 'playing':
        return '游戏进行中';
        
      case 'finished':
        const { winner } = gameState;
        if (!winner) return '游戏结束';
        
        if (winner === 'draw') {
          return '平局';
        }
        
        // 获取赢家名字
        const winnerIndex = parseInt(winner.substring(1)) - 1;
        const winnerName = gameState.players[winnerIndex]?.account || '未知玩家';
        return `${winnerName} 胜利`;
      
      default:
        return '未知状态';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
      {/* 游戏状态 - 最大最醒目 */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-800 mb-1">
          {getGameStatusText()}
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

      {/* 新增: 玩家列表 - 水平展示 */}
      {gameState.players && gameState.players.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {gameState.players.map((player, index) => {
              if (!player) return null;
              
              const playerId = `p${index+1}`;
              const isCurrentPlayer = gameState.progress?.currentPlayer === playerId;
              const isMe = playerId === myPlayerId;
              const color = gameState.colors?.[playerId]?.value || "#CCCCCC";
              
              return (
                <div 
                  key={playerId}
                  className={`
                    flex items-center p-2 rounded-lg
                    ${isCurrentPlayer ? 'bg-gray-100 shadow-sm' : ''}
                    ${isMe ? 'border border-dashed border-gray-300' : ''}
                    transition-all duration-200
                  `}
                >
                  {/* 玩家颜色指示器 */}
                  <div 
                    className="w-6 h-6 rounded-full flex-shrink-0 mr-2"
                    style={{ backgroundColor: color }}
                  >
                    {isCurrentPlayer && (
                      <div className="w-full h-full flex items-center justify-center animate-pulse">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      </div>
                    )}
                  </div>
                  
                  {/* 玩家名称 */}
                  <div className="text-sm">
                    <span className="font-medium text-gray-800">{player.account}</span>
                    {isMe && <span className="ml-1 text-xs text-gray-500">(我)</span>}
                    {gameState.playerStates?.[playerId]?.passed && (
                      <span className="ml-1 text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-600 rounded">
                        已停手
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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