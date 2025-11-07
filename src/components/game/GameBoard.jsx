// 路径：src/components/game/GameBoard.jsx
import { getLatestMove, isLatestMoveCell } from '../../utils/gameHelpers';
import { getPieceTransforms, calculatePieceOffset } from '../../utils/pieces';
import { useMemo, useState } from 'react';

function GameBoard({ 
  board,            // 棋盘状态 {board: [[]], moves: []}
  trialPosition,    // 试下位置 {x, y, shape}
  myPlayerId,       // 我的玩家ID (p1/p2/p3/p4)
  myColor,          // 新增: 我的颜色对象
  boardSize = 14,   // 新增: 棋盘大小 (14/17/20)
  onCellClick,      // 点击格子回调
  disabled = false, // 是否禁用
  selectedPiece,    // 选中的棋子
  rotation,         // 旋转状态
  flipped           // 翻转状态
}) {
  // 鼠标悬浮位置
  const [hoverPosition, setHoverPosition] = useState(null);

  // 从moves中获取最新一步
  const latestMove = useMemo(() => {
    return getLatestMove(board.moves);
  }, [board.moves]);

  // 获取实际的棋盘数组
  const boardArray = board.board || board;

  // 获取悬浮棋子形状
  const hoverShapeData = useMemo(() => {
    if (selectedPiece == null) return null;
    const shape = getPieceTransforms(selectedPiece, rotation, flipped);
    const offset = calculatePieceOffset(shape);
    return { shape, offset };
  }, [selectedPiece, rotation, flipped]);

  // 处理鼠标移动
  const handleMouseMove = (x, y) => {
    if (disabled || !hoverShapeData) return;
    
    // 应用偏移：鼠标位置就是锚点位置，需要减去offset得到实际的左上角
    setHoverPosition({ 
      x: x - hoverShapeData.offset.offsetX, 
      y: y - hoverShapeData.offset.offsetY 
    });
  };

  // 处理鼠标离开
  const handleMouseLeave = () => {
    setHoverPosition(null);
  };

  // 获取棋子颜色
  const getColorForCell = (cellValue, isLatest, isTrial, isHover) => {
    // 如果是试下或悬浮
    if (isTrial || isHover) {
      return {
        backgroundColor: `${myColor.value}80` // 半透明色
      };
    }

    // 空格子
    if (cellValue === 0) {
      return {};
    }

    // 获取玩家颜色
    const colorId = cellValue;
    const playerColor = `var(--player-color-${colorId})`;
    
    return {
      backgroundColor: isLatest 
        ? `var(--player-color-${colorId}-bright)` // 亮色（最新落子）
        : playerColor
    };
  };

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

    // 检查是否是鼠标悬浮位置
    let isHover = false;
    if (!trialPosition && hoverPosition && hoverShapeData) {
      const { shape } = hoverShapeData;
      const { x: hoverX, y: hoverY } = hoverPosition;
      for (let i = 0; i < shape.length; i++) {
        for (let j = 0; j < shape[i].length; j++) {
          if (shape[i][j] === 1 && hoverY + i === y && hoverX + j === x) {
            isHover = true;
            break;
          }
        }
        if (isHover) break;
      }
    }

    // 检查是否是最新一步
    const isLatest = isLatestMoveCell(x, y, latestMove);

    // 获取颜色样式
    const colorStyle = getColorForCell(cellValue, isLatest, isTrial, isHover);

    // 是否可点击（空格子且未禁用且不是试下格子）
    const canClick = !disabled && cellValue === 0 && !isTrial;

    return (
      <div
        key={`${x}-${y}`}
        onClick={() => canClick && onCellClick(x, y)}
        onMouseEnter={() => handleMouseMove(x, y)}
        className={`
          aspect-square border border-gray-300
          ${cellValue === 0 ? 'bg-white hover:bg-gray-50' : ''}
          ${canClick && hoverShapeData ? 'cursor-pointer' : 'cursor-default'}
          ${isTrial ? 'opacity-70 animate-pulse' : ''}
          ${isHover ? 'opacity-60' : ''}
          ${isLatest && !isTrial && !isHover ? 'ring-2 ring-offset-1 ring-yellow-400' : ''}
          transition-all duration-100
        `}
        style={colorStyle}
      />
    );
  };

  // 生成CSS变量用于定义玩家颜色
  const colorVars = {
    '--player-color-1': '#FF8294',            // 红色-创建者
    '--player-color-2': '#82A6FF',            // 蓝色-加入者A
    '--player-color-3': '#82D282',            // 绿色-加入者B
    '--player-color-4': '#FFB982',            // 橙色-加入者C
    '--player-color-1-bright': '#FF4D66',     // 亮红色
    '--player-color-2-bright': '#4D80FF',     // 亮蓝色
    '--player-color-3-bright': '#4DC24D',     // 亮绿色
    '--player-color-4-bright': '#FF9D4D',     // 亮橙色
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6" style={colorVars}>
      {/* 棋盘标题和图例 */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-800">
          棋盘 ({boardSize}×{boardSize})
        </h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#FF8294' }}></div>
            <span className="text-gray-600">红</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#82A6FF' }}></div>
            <span className="text-gray-600">蓝</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#82D282' }}></div>
            <span className="text-gray-600">绿</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: '#FFB982' }}></div>
            <span className="text-gray-600">橙</span>
          </div>
        </div>
      </div>

      {/* 棋盘网格容器 */}
      <div className="w-full max-w-2xl mx-auto" onMouseLeave={handleMouseLeave}>
        <div 
          className="grid gap-0 w-full aspect-square"
          style={{ 
            gridTemplateColumns: `repeat(${boardSize}, 1fr)`,
            gridTemplateRows: `repeat(${boardSize}, 1fr)`
          }}
        >
          {Array.from({ length: boardSize }, (_, y) =>
            Array.from({ length: boardSize }, (_, x) => renderCell(x, y))
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

      {/* 新增: 我的回合且无操作状态的提示 */}
      {!trialPosition && !hoverPosition && !disabled && (
        <div className="mt-4 text-center">
          <p className="text-sm text-green-600">
            轮到您下棋了，请从下方选择棋子后点击棋盘
          </p>
        </div>
      )}

      {/* 悬浮提示 */}
      {!trialPosition && hoverPosition && !disabled && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">
            点击格子确定试下位置
          </p>
        </div>
      )}
    </div>
  );
}

export default GameBoard;