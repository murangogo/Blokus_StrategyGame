// 路径：src/components/game/GameBoard.jsx
import { memo, useMemo, useState } from 'react';
import { getLatestMoveCells } from '../../utils/gameHelpers';
import { getPieceTransforms, calculatePieceOffset } from '../../utils/pieces';

// 玩家颜色（CSS变量，避免为每个格子拼接样式对象）
const COLOR_VARS = {
  '--player-color-1': '#FF8294', // 红色-创建者
  '--player-color-2': '#82A6FF', // 蓝色-加入者A
  '--player-color-3': '#82D282', // 绿色-加入者B
  '--player-color-4': '#FFB982', // 橙色-加入者C
  '--player-color-1-bright': '#FF4D66',
  '--player-color-2-bright': '#4D80FF',
  '--player-color-3-bright': '#4DC24D',
  '--player-color-4-bright': '#FF9D4D',
};

const LEGEND = [
  { color: '#FF8294', label: '红' },
  { color: '#82A6FF', label: '蓝' },
  { color: '#82D282', label: '绿' },
  { color: '#FFB982', label: '橙' },
];

// 把某个形状在 (x, y) 处覆盖的格子收集成 "x,y" 集合，供渲染时 O(1) 查询
function shapeToCellSet(shape, originX, originY) {
  const cells = new Set();
  for (let i = 0; i < shape.length; i++) {
    for (let j = 0; j < shape[i].length; j++) {
      if (shape[i][j] === 1) cells.add(`${originX + j},${originY + i}`);
    }
  }
  return cells;
}

function GameBoard({
  board, // 棋盘状态 {board: [[]], moves: []}
  trialPosition, // 试下位置 {x, y, shape}
  myColor, // 我的颜色对象
  boardSize = 14, // 棋盘大小 (14/17/20)
  onCellClick, // 点击格子回调
  disabled = false, // 是否禁用
  selectedPiece, // 选中的棋子
  rotation, // 旋转状态
  flipped, // 翻转状态
}) {
  // 鼠标悬浮位置（已换算为棋子左上角坐标）
  const [hoverPosition, setHoverPosition] = useState(null);

  const boardArray = board.board || board;

  // 最新一步棋覆盖的格子
  const latestMoveCells = useMemo(() => getLatestMoveCells(board.moves), [board.moves]);

  // 悬浮预览用的棋子形状与锚点偏移
  const hoverShapeData = useMemo(() => {
    if (selectedPiece == null) return null;
    const shape = getPieceTransforms(selectedPiece, rotation, flipped);
    return { shape, offset: calculatePieceOffset(shape) };
  }, [selectedPiece, rotation, flipped]);

  // 试下 / 悬浮覆盖的格子，整块棋盘只计算一次
  const trialCells = useMemo(
    () =>
      trialPosition
        ? shapeToCellSet(trialPosition.shape, trialPosition.x, trialPosition.y)
        : null,
    [trialPosition]
  );

  const hoverCells = useMemo(
    () =>
      !trialPosition && hoverPosition && hoverShapeData
        ? shapeToCellSet(hoverShapeData.shape, hoverPosition.x, hoverPosition.y)
        : null,
    [trialPosition, hoverPosition, hoverShapeData]
  );

  const handleMouseEnter = (x, y) => {
    if (disabled || !hoverShapeData) return;
    // 鼠标所在格是锚点，减去偏移得到棋子左上角
    setHoverPosition({
      x: x - hoverShapeData.offset.offsetX,
      y: y - hoverShapeData.offset.offsetY,
    });
  };

  // 渲染单个格子
  const renderCell = (x, y) => {
    const key = `${x},${y}`;
    const cellValue = boardArray[y][x];

    const isTrial = trialCells?.has(key) ?? false;
    const isHover = hoverCells?.has(key) ?? false;
    const isLatest = latestMoveCells.has(key);

    // 试下位置与已有棋子重叠时给出红框提示（仅视觉，不阻止操作）
    const isInvalidTrial = isTrial && cellValue !== 0;

    let colorStyle = {};
    if (isTrial || isHover) {
      colorStyle = { backgroundColor: `${myColor.value}80` }; // 半透明色
    } else if (cellValue !== 0) {
      colorStyle = {
        backgroundColor: isLatest
          ? `var(--player-color-${cellValue}-bright)` // 亮色（最新落子）
          : `var(--player-color-${cellValue})`,
      };
    }

    // 空格子且未禁用且不是试下格子才可点击
    const canClick = !disabled && cellValue === 0 && !isTrial;

    return (
      <div
        key={key}
        onClick={() => canClick && onCellClick(x, y)}
        onMouseEnter={() => handleMouseEnter(x, y)}
        className={`
          aspect-square border border-gray-300
          ${cellValue === 0 ? 'bg-white hover:bg-gray-50' : ''}
          ${canClick && hoverShapeData ? 'cursor-pointer' : 'cursor-default'}
          ${isTrial ? `opacity-70 ${isInvalidTrial ? 'border-red-500 border-2' : 'animate-pulse'}` : ''}
          ${isHover ? 'opacity-60' : ''}
          ${isLatest && !isTrial && !isHover ? 'ring-2 ring-offset-1 ring-yellow-400' : ''}
          transition-all duration-100
        `}
        style={colorStyle}
      />
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6" style={COLOR_VARS}>
      {/* 棋盘标题和图例 */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-800">
          棋盘 ({boardSize}×{boardSize})
        </h3>
        <div className="flex items-center gap-4 text-xs">
          {LEGEND.map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: color }}></div>
              <span className="text-gray-600">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 棋盘网格容器 */}
      <div className="w-full max-w-2xl mx-auto" onMouseLeave={() => setHoverPosition(null)}>
        <div
          className="grid gap-0 w-full aspect-square"
          style={{
            gridTemplateColumns: `repeat(${boardSize}, 1fr)`,
            gridTemplateRows: `repeat(${boardSize}, 1fr)`,
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
            试下位置: ({trialPosition.x}, {trialPosition.y}) - 点击“确定下棋”完成落子
          </p>
        </div>
      )}

      {!trialPosition && !hoverPosition && !disabled && (
        <div className="mt-4 text-center">
          <p className="text-sm text-green-600">轮到您下棋了，请从下方选择棋子后点击棋盘</p>
        </div>
      )}

      {!trialPosition && hoverPosition && !disabled && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">点击格子确定试下位置</p>
        </div>
      )}
    </div>
  );
}

// 计时器每 200ms 触发一次父组件重渲染，这里用 memo 挡住与棋盘无关的刷新
export default memo(GameBoard);
