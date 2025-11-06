// 路径：src/utils/pieces.js
// 21种Blokus棋子形状定义
// 每个棋子用二维数组表示，1表示有方块，0表示空白
export const PIECES = [
  // 1格
  { id: 0, name: 'I1', size: 1, shape: [[1]] },
  
  // 2格
  { id: 1, name: 'I2', size: 2, shape: [[1, 1]] },
  
  // 3格
  { id: 2, name: 'I3', size: 3, shape: [[1, 1, 1]] },
  { id: 3, name: 'L3', size: 3, shape: [[1, 0], [1, 1]] },
  
  // 4格
  { id: 4, name: 'I4', size: 4, shape: [[1, 1, 1, 1]] },
  { id: 5, name: 'O4', size: 4, shape: [[1, 1], [1, 1]] },
  { id: 6, name: 'T4', size: 4, shape: [[1, 1, 1], [0, 1, 0]] },
  { id: 7, name: 'L4', size: 4, shape: [[1, 0, 0], [1, 1, 1]] },
  { id: 8, name: 'Z4', size: 4, shape: [[1, 1, 0], [0, 1, 1]] },
  
  // 5格
  { id: 9, name: 'I5', size: 5, shape: [[1, 1, 1, 1, 1]] },
  { id: 10, name: 'L5', size: 5, shape: [[1, 0, 0, 0], [1, 1, 1, 1]] },
  { id: 11, name: 'T5', size: 5, shape: [[1, 1, 1], [0, 1, 0], [0, 1, 0]] },
  { id: 12, name: 'V5', size: 5, shape: [[1, 0, 0], [1, 0, 0], [1, 1, 1]] },
  { id: 13, name: 'N5', size: 5, shape: [[0, 1, 0], [1, 1, 0], [1, 0, 0], [1, 0, 0]] },
  { id: 14, name: 'Z5', size: 5, shape: [[1, 1, 0], [0, 1, 0], [0, 1, 1]] },
  { id: 15, name: 'P5', size: 5, shape: [[1, 1], [1, 1], [1, 0]] },
  { id: 16, name: 'W5', size: 5, shape: [[1, 0, 0], [1, 1, 0], [0, 1, 1]] },
  { id: 17, name: 'U5', size: 5, shape: [[1, 0, 1], [1, 1, 1]] },
  { id: 18, name: 'F5', size: 5, shape: [[0, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { id: 19, name: 'X5', size: 5, shape: [[0, 1, 0], [1, 1, 1], [0, 1, 0]] },
  { id: 20, name: 'Y5', size: 5, shape: [[0, 1], [1, 1], [0, 1], [0, 1]] }
];

// 旋转棋子（顺时针90度）
export function rotatePiece(shape) {
  const rows = shape.length;
  const cols = shape[0].length;
  const rotated = Array(cols).fill(null).map(() => Array(rows).fill(0));
  
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      rotated[j][rows - 1 - i] = shape[i][j];
    }
  }
  return rotated;
}

// 翻转棋子（水平翻转）
export function flipPiece(shape) {
  return shape.map(row => [...row].reverse());
}

// 获取棋子的所有变换
export function getPieceTransforms(pieceId, rotation = 0, flipped = false) {
  let shape = PIECES[pieceId].shape;
  
  // 翻转
  if (flipped) {
    shape = flipPiece(shape);
  }
  
  // 旋转
  for (let i = 0; i < rotation; i++) {
    shape = rotatePiece(shape);
  }
  
  return shape;
}

// 检查棋子是否超出边界
export function isOutOfBounds(shape, x, y, boardSize = 14) {
  for (let i = 0; i < shape.length; i++) {
    for (let j = 0; j < shape[i].length; j++) {
      if (shape[i][j] === 1) {
        const newY = y + i;
        const newX = x + j;
        if (newX < 0 || newX >= boardSize || newY < 0 || newY >= boardSize) {
          return true;
        }
      }
    }
  }
  return false;
}

// 检查棋子是否与已有棋子重叠
export function isOverlapping(shape, x, y, board) {
  for (let i = 0; i < shape.length; i++) {
    for (let j = 0; j < shape[i].length; j++) {
      if (shape[i][j] === 1) {
        const newY = y + i;
        const newX = x + j;
        if (board[newY]?.[newX] !== 0) {
          return true;
        }
      }
    }
  }
  return false;
}

// 检查是否符合角对角规则（至少有一个角相邻，没有边相邻）
export function isValidPlacement(shape, x, y, board, playerId, isFirstMove) {
  // 第一步必须在角落
  if (isFirstMove) {
    const corners = [
      [0, 0], [0, 13], [13, 0], [13, 13]
    ];
    
    let hasCorner = false;
    for (let i = 0; i < shape.length; i++) {
      for (let j = 0; j < shape[i].length; j++) {
        if (shape[i][j] === 1) {
          const posY = y + i;
          const posX = x + j;
          if (corners.some(([cy, cx]) => cy === posY && cx === posX)) {
            hasCorner = true;
            break;
          }
        }
      }
      if (hasCorner) break;
    }
    return hasCorner;
  }
  
  // 检查边相邻（不允许）和角相邻（必须）
  let hasCornerAdjacent = false;
  
  for (let i = 0; i < shape.length; i++) {
    for (let j = 0; j < shape[i].length; j++) {
      if (shape[i][j] === 1) {
        const posY = y + i;
        const posX = x + j;
        
        // 检查四条边（不能有同色）
        const edges = [
          [posY - 1, posX], [posY + 1, posX],
          [posY, posX - 1], [posY, posX + 1]
        ];
        
        for (const [ey, ex] of edges) {
          if (ey >= 0 && ey < 14 && ex >= 0 && ex < 14) {
            if (board[ey][ex] === playerId) {
              return false; // 边相邻，不合法
            }
          }
        }
        
        // 检查四个角（必须至少有一个同色）
        const corners = [
          [posY - 1, posX - 1], [posY - 1, posX + 1],
          [posY + 1, posX - 1], [posY + 1, posX + 1]
        ];
        
        for (const [cy, cx] of corners) {
          if (cy >= 0 && cy < 14 && cx >= 0 && cx < 14) {
            if (board[cy][cx] === playerId) {
              hasCornerAdjacent = true;
            }
          }
        }
      }
    }
  }
  
  return hasCornerAdjacent;
}

// 将棋子放置到棋盘（返回新棋盘）
export function placePieceOnBoard(board, shape, x, y, playerId) {
  const newBoard = board.map(row => [...row]);
  
  for (let i = 0; i < shape.length; i++) {
    for (let j = 0; j < shape[i].length; j++) {
      if (shape[i][j] === 1) {
        const posY = y + i;
        const posX = x + j;
        newBoard[posY][posX] = playerId;
      }
    }
  }
  
  return newBoard;
}

// 计算棋盘上某个玩家的格数
export function countPlayerSquares(board, playerId) {
  let count = 0;
  for (let i = 0; i < board.length; i++) {
    for (let j = 0; j < board[i].length; j++) {
      if (board[i][j] === playerId) count++;
    }
  }
  return count;
}

// 获取玩家ID（creator=1, joiner=2）
export function getPlayerId(role) {
  return role === 'creator' ? 1 : 2;
}

/**
 * 计算棋子形状的锚点偏移
 * 返回第一个实际方块的位置作为锚点
 * @param {array} shape - 棋子形状二维数组
 * @returns {object} { offsetX: number, offsetY: number }
 */
export function calculatePieceOffset(shape) {
  // 找到第一行有方块的行
  let offsetY = 0;
  for (let i = 0; i < shape.length; i++) {
    const hasBlock = shape[i].some(cell => cell === 1);
    if (hasBlock) {
      offsetY = i;
      break;
    }
  }
  
  // 在这一行中，找到第一个方块的列
  let offsetX = 0;
  for (let j = 0; j < shape[offsetY].length; j++) {
    if (shape[offsetY][j] === 1) {
      offsetX = j;
      break;
    }
  }
  
  return { offsetX, offsetY };
}