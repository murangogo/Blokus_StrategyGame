// components/game/GameBoard.jsx
import { getPlayerId, getLatestMove, isLatestMoveCell, getCellColorClass } from '../../utils/gameHelpers';
import { useMemo } from 'react';

function GameBoard({ 
  board,           // 棋盘状态 {board: [[]], moves: []}
  trialPosition,   // 试下位置 {x, y, shape}
  myRole,          // 我的角色
  onCellClick,     // 点击格子回调
  disabled = false // 是否禁用
}) {
  // 从moves中获取最新一步
  const latestMove = useMemo(() => {
    return getLatestMove(board.moves);
  }, [board.moves]);

  // 获取实际的棋盘数组
  const boardArray = board.board || board;

  // 渲染单个格子
  const renderCell = (x, y) => {
    const cellValue = boardArray[y][x];
    
    // 检查是否是试下位置
    let isTrial = false;
    if (trialPosition) {
      const { shape, x: trialX, y: trialY } = trialPosition;
      for (let i = 0; i < shape.length; i++) {
        for (let j = 0; j < shape[i].length; j++) {
          if (shape[i][j] === 1 && trialY + i === y && trialX + j === x) {
            isTrial = true;
            break;
          }
        }
        if (isTrial) break;
      }
    }

    // 检查是否是最新一步
    const isLatest = isLatestMoveCell(x, y, latestMove);

    // 确定格子所属玩家（用于试下颜色）
    const playerRole = isTrial ? myRole : (cellValue === 1 ? 'creator' : 'joiner');

    // 获取颜色类名
    const colorClass = getCellColorClass(cellValue, isLatest, isTrial, playerRole);

    // 是否可点击（空格子且未禁用且不是试下格子）
    const canClick = !disabled && cellValue === 0 && !isTrial;

    return (
      <div
        key={`${x}-${y}`}
        onClick={() => canClick && onCellClick(x, y)}
        className={`
          aspect-square border border-gray-300
          ${colorClass}
          ${canClick ? 'cursor-pointer' : 'cursor-default'}
          ${isTrial ? 'opacity-70 animate-pulse' : ''}
          ${isLatest && !isTrial ? 'ring-2 ring-offset-1 ring-yellow-400' : ''}
          transition-all duration-150
        `}
      />
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* 棋盘标题和图例 */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-800">棋盘</h3>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#FF8294] rounded border border-gray-300"></div>
            <span className="text-gray-600">创建者</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#82A6FF] rounded border border-gray-300"></div>
            <span className="text-gray-600">加入者</span>
          </div>
        </div>
      </div>

      {/* 棋盘网格容器 */}
      <div className="w-full max-w-2xl mx-auto">
        <div 
          className="grid gap-0 w-full aspect-square"
          style={{ 
            gridTemplateColumns: 'repeat(14, 1fr)',
            gridTemplateRows: 'repeat(14, 1fr)'
          }}
        >
          {Array.from({ length: 14 }, (_, y) =>
            Array.from({ length: 14 }, (_, x) => renderCell(x, y))
          )}
        </div>
      </div>

      {/* 提示信息 */}
      {disabled && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">不是您的回合，请等待...</p>
        </div>
      )}

      {trialPosition && !disabled && (
        <div className="mt-4 text-center">
          <p className="text-sm text-blue-600">
            试下位置: ({trialPosition.x}, {trialPosition.y}) - 点击"确定下棋"完成落子
          </p>
        </div>
      )}
    </div>
  );
}

export default GameBoard;