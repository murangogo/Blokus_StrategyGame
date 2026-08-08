// 路径：src/components/game/PieceSelector.jsx
import { memo } from 'react';
import { PIECES } from '../../utils/pieces';

// 根据棋子外接尺寸挑选合适的小方格尺寸
function getCellSize(rows, cols) {
  const maxDim = Math.max(rows, cols);
  if (maxDim <= 2) return 'w-3 h-3';
  if (maxDim <= 3) return 'w-2.5 h-2.5';
  return 'w-2 h-2';
}

function PieceSelector({
  pieces, // 已使用棋子数组 [true, false, ...]
  selectedPiece, // 当前选中的棋子ID
  onSelect, // 选择棋子回调
  myColor, // 我的颜色对象
}) {
  // 渲染单个棋子
  const renderPiece = (pieceId) => {
    const piece = PIECES[pieceId];
    const shape = piece.shape;
    const isUsed = pieces?.[pieceId] || false;
    const isSelected = selectedPiece === pieceId;

    const rows = shape.length;
    const cols = shape[0].length;
    const cellSize = getCellSize(rows, cols);

    // 注意：颜色来自后端下发的运行时值，Tailwind 无法在编译期生成对应类名，
    // 因此所有与玩家颜色相关的样式都走 inline style。
    let tileClass = 'bg-white hover:bg-gray-50 border-gray-300 border cursor-pointer hover:border-gray-400';
    let tileStyle;

    if (isUsed) {
      tileClass = 'bg-gray-200 cursor-not-allowed opacity-50 border border-transparent';
    } else if (isSelected) {
      tileClass = 'border-2 cursor-pointer';
      tileStyle = {
        backgroundColor: `${myColor.value}20`,
        borderColor: myColor.value,
      };
    }

    return (
      <div
        key={pieceId}
        onClick={() => !isUsed && onSelect(pieceId)}
        className={`
          relative flex-shrink-0 w-20 h-20 rounded-lg p-2
          flex flex-col items-center justify-center gap-1
          transition-all duration-200 transform
          ${tileClass}
          ${!isUsed ? 'hover:scale-105 active:scale-95' : ''}
          ${isSelected ? 'shadow-lg' : ''}
        `}
        style={tileStyle}
      >
        {/* 棋子网格 */}
        <div
          className="grid gap-0.5"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          }}
        >
          {shape.map((row, y) =>
            row.map((cell, x) => (
              <div
                key={`${x}-${y}`}
                className={`${cellSize} ${cell === 1 ? 'rounded-sm' : ''}`}
                style={
                  cell === 1
                    ? isUsed
                      ? { backgroundColor: '#9CA3AF' }
                      : { backgroundColor: myColor.value, opacity: 0.7 }
                    : undefined
                }
              />
            ))
          )}
        </div>

        {/* 棋子信息 */}
        <div className="text-xs text-gray-600 font-medium mt-1">{piece.name}</div>

        {/* 已使用标记 */}
        {isUsed && (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
        )}

        {/* 选中标记 */}
        {isSelected && !isUsed && (
          <div className="absolute -top-1 -right-1">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: myColor.value }}
            >
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 统计剩余棋子
  const remainingPieces = pieces ? pieces.filter((used) => !used).length : 21;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* 标题和统计 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">选择棋子</h3>
        <span className="text-sm text-gray-600">
          剩余: <span className="font-bold text-blue-600">{remainingPieces}</span>/21
        </span>
      </div>

      {/* 限制高度为两行棋子，多余部分纵向滚动 */}
      <div>
        <div
          className="flex flex-wrap gap-3 overflow-y-auto pb-2 scrollbar-thin"
          style={{ maxHeight: '180px' }}
        >
          {PIECES.map((_, index) => renderPiece(index))}
        </div>

        <div className="mt-2 text-center">
          <p className="text-xs text-gray-400">上下滑动查看更多棋子</p>
        </div>
      </div>

      {/* 图例说明 */}
      <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-center gap-6 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-white border border-gray-300 rounded"></div>
          <span>可用</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-200 rounded opacity-50"></div>
          <span>已使用</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded"
            style={{
              backgroundColor: `${myColor.value}20`,
              border: `2px solid ${myColor.value}`,
            }}
          ></div>
          <span>已选中</span>
        </div>
      </div>
    </div>
  );
}

export default memo(PieceSelector);
