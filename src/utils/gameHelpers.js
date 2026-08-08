// 路径：src/utils/gameHelpers.js
import {
  getPieceTransforms,
  isOutOfBounds,
  isOverlapping,
  isValidPlacement,
  placePieceOnBoard,
} from './pieces';

/**
 * 获取玩家颜色ID (p1->1, p2->2, p3->3, p4->4)
 * @param {string} playerId - 玩家ID
 * @returns {number} 颜色ID
 */
export function getPlayerColorId(playerId) {
  if (!playerId || typeof playerId !== 'string') return 1;
  return parseInt(playerId.substring(1));
}

/**
 * 检查是否是玩家的首步棋
 * @param {object} playerState - 玩家状态
 * @returns {boolean}
 */
export function isFirstMove(playerState) {
  return playerState?.totalPiecesUsed === 0;
}

/**
 * 检查棋子是否可以放置 (多人版)
 * @param {number} pieceId - 棋子ID
 * @param {number} x - X坐标
 * @param {number} y - Y坐标
 * @param {number} rotation - 旋转次数
 * @param {boolean} flipped - 是否翻转
 * @param {array} board - 棋盘状态
 * @param {string} playerId - 玩家ID (p1, p2, p3, p4)
 * @param {object} playerState - 玩家状态
 * @returns {object} { valid: boolean, reason: string }
 */
export function canPlacePiece(pieceId, x, y, rotation, flipped, board, playerId, playerState) {
  // 检查棋子是否已使用
  if (playerState?.pieces?.[pieceId]) {
    return { valid: false, reason: '该棋子已使用' };
  }

  const shape = getPieceTransforms(pieceId, rotation, flipped);
  const boardSize = board.length;

  if (isOutOfBounds(shape, x, y, boardSize)) {
    return { valid: false, reason: '超出棋盘边界' };
  }

  if (isOverlapping(shape, x, y, board)) {
    return { valid: false, reason: '与已有棋子重叠' };
  }

  // 检查是否符合放置规则
  const colorId = getPlayerColorId(playerId);
  const firstMove = isFirstMove(playerState);

  if (!isValidPlacement(shape, x, y, board, colorId, firstMove, boardSize)) {
    return {
      valid: false,
      reason: firstMove
        ? '首步棋必须占据一个角落'
        : '必须与己方棋子角对角相邻，且不能边对边相邻',
    };
  }

  return { valid: true, reason: '' };
}

/**
 * 计算放置棋子后的新棋盘 (多人版)
 * @param {array} board - 当前棋盘
 * @param {number} pieceId - 棋子ID
 * @param {number} x - X坐标
 * @param {number} y - Y坐标
 * @param {number} rotation - 旋转次数
 * @param {boolean} flipped - 是否翻转
 * @param {string} playerId - 玩家ID (p1, p2, p3, p4)
 * @returns {array} 新棋盘
 */
export function getNewBoard(board, pieceId, x, y, rotation, flipped, playerId) {
  const shape = getPieceTransforms(pieceId, rotation, flipped);
  return placePieceOnBoard(board, shape, x, y, getPlayerColorId(playerId));
}

/**
 * 获取最新一步棋覆盖的格子，返回 "x,y" 组成的 Set，供棋盘 O(1) 查询高亮
 * @param {array} moves - 棋步历史
 * @returns {Set<string>}
 */
export function getLatestMoveCells(moves) {
  const cells = new Set();
  if (!moves || moves.length === 0) return cells;

  const lastMove = moves[moves.length - 1];
  const shape = getPieceTransforms(lastMove.pieceIndex, lastMove.rotation, lastMove.flip);

  for (let i = 0; i < shape.length; i++) {
    for (let j = 0; j < shape[i].length; j++) {
      if (shape[i][j] === 1) {
        cells.add(`${lastMove.position.x + j},${lastMove.position.y + i}`);
      }
    }
  }

  return cells;
}

/**
 * 计算按钮可用状态
 * @param {object} gameState - 游戏状态
 * @param {string} myPlayerId - 我的角色 (p1~p4)
 * @param {number|null} selectedPiece - 选中的棋子ID
 * @param {object|null} trialPosition - 试下位置
 * @returns {object} 按钮状态对象
 */
export function calculateButtonStates(gameState, myPlayerId, selectedPiece, trialPosition) {
  if (!gameState.config || !gameState.progress) {
    return {
      confirmMove: false,
      rotate: false,
      flip: false,
      pass: false,
      clearTrial: false,
      startGame: false,
    };
  }

  const { gameStatus, requiredPlayerCount = 2 } = gameState.config;
  const isMyTurn = gameState.progress.currentPlayer === myPlayerId;
  const myState = gameState.playerStates?.[myPlayerId];

  // 已加入的玩家是否达到开局人数
  const joinedPlayers = gameState.players?.filter(Boolean).length || 0;
  const hasEnoughPlayers = joinedPlayers >= requiredPlayerCount;

  const hasSelectedPiece = typeof selectedPiece === 'number';

  return {
    // 确定下棋：我的回合 + 有试下位置 + 游戏中
    confirmMove: isMyTurn && !!trialPosition && gameStatus === 'playing',

    // 旋转 / 翻转：有选中棋子
    rotate: hasSelectedPiece,
    flip: hasSelectedPiece,

    // 停手：我的回合 + 游戏中 + 我未停手
    pass: isMyTurn && gameStatus === 'playing' && !myState?.passed,

    // 清除试下：有试下位置
    clearTrial: !!trialPosition,

    // 开始游戏：我是房主(p1) + 人数够 + 等待中
    startGame: myPlayerId === 'p1' && hasEnoughPlayers && gameStatus === 'waiting',
  };
}
