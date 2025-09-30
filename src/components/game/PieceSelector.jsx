// components/game/PieceSelector.jsx
import { PIECES, getPieceTransforms } from '../../utils/pieces';

function PieceSelector({ 
  pieces,           // 已使用棋子数组 [true, false, ...]
  selectedPiece,    // 当前选中的棋子ID
  onSelect,         // 选择棋子回调
  myRole            // 我的角色
}) {
  // 根据角色决定颜色
  const getColorClass = (isUsed, isSelected) => {
    if (isUsed) {
      return 'bg-gray-200 cursor-not-allowed opacity-50';
    }
    if (isSelected) {
      return myRole === 'creator' 
        ? 'bg-red-100 border-red-500 border-2 cursor-pointer'
        : 'bg-blue-100 border-blue-500 border-2 cursor-pointer';
    }
    return 'bg-white hover:bg-gray-50 border-gray-300 border cursor-pointer hover:border-gray-400';
  };

  // 渲染单个棋子
  const renderPiece = (pieceId) => {
    const piece = PIECES[pieceId];
    const shape = piece.shape;
    const isUsed = pieces?.[pieceId] || false;
    const isSelected = selectedPiece === pieceId;

    // 计算网格大小
    const rows = shape.length;
    const cols = shape[0].length;

    // 根据棋子大小决定格子尺寸
    const getCellSize = () => {
      const maxDim = Math.max(rows, cols);
      if (maxDim <= 2) return 'w-3 h-3';
      if (maxDim <= 3) return 'w-2.5 h-2.5';
      return 'w-2 h-2';
    };

    // 棋子颜色
    const pieceColor = isUsed 
      ? 'bg-gray-400' 
      : myRole === 'creator' 
        ? 'bg-[#FFB8C2]' 
        : 'bg-[#B8CCFF]';

    return (
      <div
        key={pieceId}
        onClick={() => !isUsed && onSelect(pieceId)}
        className={`
          flex-shrink-0 w-24 h-24 rounded-lg p-2
          flex flex-col items-center justify-center gap-1
          transition-all duration-200 transform
          ${getColorClass(isUsed, isSelected)}
          ${!isUsed && 'hover:scale-105 active:scale-95'}
          ${isSelected && 'shadow-lg'}
        `}
      >
        {/* 棋子网格 */}
        <div 
          className="grid gap-0.5"
          style={{ 
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`
          }}
        >
          {shape.map((row, y) =>
            row.map((cell, x) => (
              <div
                key={`${x}-${y}`}
                className={`
                  ${getCellSize()}
                  ${cell === 1 ? `${pieceColor} rounded-sm` : 'bg-transparent'}
                `}
              />
            ))
          )}
        </div>

        {/* 棋子信息 */}
        <div className="text-xs text-gray-600 font-medium mt-1">
          {piece.name}
        </div>

        {/* 已使用标记 */}
        {isUsed && (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )}

        {/* 选中标记 */}
        {isSelected && !isUsed && (
          <div className="absolute -top-1 -right-1">
            <div className={`
              w-6 h-6 rounded-full flex items-center justify-center
              ${myRole === 'creator' ? 'bg-red-500' : 'bg-blue-500'}
            `}>
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 统计剩余棋子
  const remainingPieces = pieces ? pieces.filter(used => !used).length : 21;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* 标题和统计 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">选择棋子</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            剩余: <span className="font-bold text-blue-600">{remainingPieces}</span>/21
          </span>
        </div>
      </div>

      {/* 棋子列表 - 横向滚动 */}
      <div className="relative">
        <div 
          className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#D1D5DB #F3F4F6'
          }}
        >
          {PIECES.map((_, index) => renderPiece(index))}
        </div>

        {/* 滚动提示 */}
        {PIECES.length > 5 && (
          <div className="mt-2 text-center">
            <p className="text-xs text-gray-400">← 滑动查看更多棋子 →</p>
          </div>
        )}
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
          <div className={`w-4 h-4 rounded ${myRole === 'creator' ? 'bg-red-100 border-red-500 border-2' : 'bg-blue-100 border-blue-500 border-2'}`}></div>
          <span>已选中</span>
        </div>
      </div>
    </div>
  );
}

export default PieceSelector;