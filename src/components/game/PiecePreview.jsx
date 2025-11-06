// 路径：src/components/game/PiecePreview.jsx
import { getPieceTransforms, calculatePieceOffset } from '../../utils/pieces';
import { PIECES } from '../../utils/pieces';

function PiecePreview({ 
  pieceId,      // 选中的棋子ID
  rotation,     // 旋转次数 (0-3)
  flipped,      // 是否翻转
  myRole        // 我的角色
}) {
  // 如果没有选中棋子
  if (pieceId === null || pieceId === undefined) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">棋子预览</h3>
        <div className="flex items-center justify-center h-48 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-gray-500 text-sm">请从下方选择棋子</p>
          </div>
        </div>
      </div>
    );
  }

  // 获取变换后的棋子形状
  const shape = getPieceTransforms(pieceId, rotation, flipped);
  const offset = calculatePieceOffset(shape);
  
  // 获取棋子信息
  const pieceInfo = PIECES[pieceId];

  // 根据角色决定颜色
  const cellColor = myRole === 'creator' ? 'bg-[#FFB8C2]' : 'bg-[#B8CCFF]';
  const borderColor = myRole === 'creator' ? 'border-red-300' : 'border-blue-300';

  // 计算网格大小（根据棋子实际大小动态调整）
  const rows = shape.length;
  const cols = shape[0].length;
  const maxDimension = Math.max(rows, cols);
  
  // 计算格子大小（保持预览框大小合理）
  const getCellSize = () => {
    if (maxDimension <= 2) return 'w-16 h-16';
    if (maxDimension <= 3) return 'w-12 h-12';
    if (maxDimension <= 4) return 'w-10 h-10';
    return 'w-8 h-8';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* 标题和信息 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">棋子预览</h3>
        <div className="flex items-center gap-2 text-sm">
          <span className="px-2 py-1 bg-gray-100 rounded text-gray-600">
            {pieceInfo.name}
          </span>
          <span className="px-2 py-1 bg-blue-100 rounded text-blue-600">
            {pieceInfo.size}格
          </span>
        </div>
      </div>

      {/* 预览区域 */}
      <div className="flex items-center justify-center min-h-[200px] bg-gray-50 rounded-lg p-6">
        <div 
          className="grid gap-1"
          style={{ 
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`
          }}
        >
          {shape.map((row, y) =>
            row.map((cell, x) => {
              const isAnchor = (y === offset.offsetY && x === offset.offsetX);
              
              return (
                <div
                  key={`${x}-${y}`}
                  className={`
                    ${getCellSize()}
                    ${cell === 1 
                      ? `${cellColor} ${borderColor} border-2 rounded shadow-sm 
                        ${isAnchor ? 'ring-4 ring-offset-1 ring-yellow-400' : ''}` 
                      : 'bg-transparent'
                    }
                    transition-all duration-200
                    relative
                  `}
                >
                  {isAnchor && cell === 1 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full shadow-lg"></div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 变换状态指示 */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>旋转: {rotation * 90}°</span>
        </div>
        {flipped && (
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span>已翻转</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-white rounded-full border-2 border-yellow-400 shadow"></div>
          <span>锚点</span>
        </div>
      </div>
    </div>
  );
}

export default PiecePreview;