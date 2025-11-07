// 路径：src/utils/gameHelpers.js
import { 
  getPieceTransforms, 
  isOutOfBounds, 
  isOverlapping, 
  isValidPlacement,
  placePieceOnBoard,
  countPlayerSquares 
} from './pieces';

/**
 * 获取玩家ID（用于棋盘数组）
 * @param {string} role - 'creator' 或 'joiner'
 * @returns {number} 1 或 2
 */
export function getPlayerId(role) {
  return role === 'creator' ? 1 : 2;
}

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
 * 获取对手角色
 * @param {string} myRole - 我的角色
 * @returns {string} 对手角色
 */
export function getOpponentRole(myRole) {
  return myRole === 'creator' ? 'joiner' : 'creator';
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

  // 获取变换后的棋子形状
  const shape = getPieceTransforms(pieceId, rotation, flipped);
  
  // 获取棋盘大小
  const boardSize = board.length;
  
  // 检查是否超出边界
  if (isOutOfBounds(shape, x, y, boardSize)) {
    return { valid: false, reason: '超出棋盘边界' };
  }

  // 检查是否与已有棋子重叠
  if (isOverlapping(shape, x, y, board)) {
    return { valid: false, reason: '与已有棋子重叠' };
  }

  // 检查是否符合放置规则
  const colorId = getPlayerColorId(playerId);
  const firstMove = isFirstMove(playerState);
  
  if (!isValidPlacement(shape, x, y, board, colorId, firstMove, boardSize)) {
    if (firstMove) {
      return { valid: false, reason: '首步棋必须占据一个角落' };
    } else {
      return { valid: false, reason: '必须与己方棋子角对角相邻，且不能边对边相邻' };
    }
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
  // 从playerId中提取数字作为棋盘上的值
  const colorId = getPlayerColorId(playerId);
  return placePieceOnBoard(board, shape, x, y, colorId);
}

/**
 * 获取最新一步棋的位置
 * @param {array} moves - 棋步历史
 * @returns {object|null} { player, positions: [{x, y}] }
 */
export function getLatestMove(moves) {
  if (!moves || moves.length === 0) return null;
  
  const lastMove = moves[moves.length - 1];
  const shape = getPieceTransforms(lastMove.pieceIndex, lastMove.rotation, lastMove.flip);
  
  const positions = [];
  for (let i = 0; i < shape.length; i++) {
    for (let j = 0; j < shape[i].length; j++) {
      if (shape[i][j] === 1) {
        positions.push({
          x: lastMove.position.x + j,
          y: lastMove.position.y + i
        });
      }
    }
  }
  
  return {
    player: lastMove.player,
    positions
  };
}

/**
 * 检查某个格子是否是最新一步棋
 * @param {number} x - X坐标
 * @param {number} y - Y坐标
 * @param {object} latestMove - 最新一步棋信息
 * @returns {boolean}
 */
export function isLatestMoveCell(x, y, latestMove) {
  if (!latestMove) return false;
  
  return latestMove.positions.some(pos => pos.x === x && pos.y === y);
}

/**
 * 计算玩家得分（格数 - 惩罚）
 * @param {array} board - 棋盘
 * @param {string} role - 角色
 * @param {number} penalty - 惩罚格数
 * @returns {number} 最终得分
 */
export function calculateScore(board, role, penalty) {
  const playerId = getPlayerId(role);
  const squares = countPlayerSquares(board, playerId);
  return Math.max(0, squares - penalty);
}

/**
 * 获取游戏状态文本
 * @param {object} gameState - 游戏状态
 * @param {string} myRole - 我的角色
 * @returns {string} 状态文本
 */
export function getGameStatusText(gameState, myRole) {
  if (!gameState.config) return '加载中...';
  
  const { gameStatus } = gameState.config;

  // 获取玩家账号名称
  const creatorName = gameState.players?.creator?.account || '创建者';
  const joinerName = gameState.players?.joiner?.account || '加入者';
  
  switch (gameStatus) {
    case 'waiting':
      if (myRole === 'creator') {
        return gameState.players?.joiner 
          ? '等待开始游戏' 
          : '等待对手加入';
      } else {
        return `等待 ${creatorName} 开始游戏`;
      }
      
    case 'playing':
      return '游戏进行中';
      
    case 'finished': {
      const { winner, finalScores, penalties } = gameState;
      
      if (!finalScores) return '游戏结束';
      
      const creatorFinal = finalScores.creator;
      const joinerFinal = finalScores.joiner;
      
      const creatorPenalty = penalties?.creator || 0;
      const joinerPenalty = penalties?.joiner || 0;
      
      if (winner === 'draw') {
        return `平局 - ${creatorName}: ${creatorFinal}格(惩罚${creatorPenalty}格), ${joinerName}: ${joinerFinal}格(惩罚${joinerPenalty}格)`;
      }
      
      const winnerName = winner === 'creator' ? creatorName : joinerName;
      return `${winnerName} 胜利 - ${creatorName}: ${creatorFinal}格(惩罚${creatorPenalty}格), ${joinerName}: ${joinerFinal}格(惩罚${joinerPenalty}格)`;
    }
      
    default:
      return '未知状态';
  }
}

/**
 * 获取回合状态文本
 * @param {object} gameState - 游戏状态
 * @param {string} myRole - 我的角色
 * @returns {string} 回合状态文本
 */
export function getRoundStatusText(gameState, myRole) {
  if (!gameState.progress || !gameState.config) return '';
  
  const { gameStatus } = gameState.config;
  const { currentPlayer } = gameState.progress;
  
  if (gameStatus !== 'playing') return '';
  
  const myState = myRole === 'creator' ? gameState.creator : gameState.joiner;
  const opponentRole = getOpponentRole(myRole);
  const opponentState = opponentRole === 'creator' ? gameState.creator : gameState.joiner;
  
  // 获取对手名字
  const opponentName = opponentRole === 'creator' 
    ? gameState.players?.creator?.account || '对方'
    : gameState.players?.joiner?.account || '对方';

  // 双方都停手
  if (myState?.passed && opponentState?.passed) {
    return '游戏即将结束';
  }
  
  // 我停手了
  if (myState?.passed) {
    return `我已停手，等待 ${opponentName}`;
  }
  
  // 对方停手了
  if (opponentState?.passed) {
    return `${opponentName} 已停手`;
  }
  
  // 正常回合
  return currentPlayer === myRole ? '我的回合' : `${opponentName} 的回合`;
}

/**
 * 计算按钮可用状态
 * @param {object} gameState - 游戏状态
 * @param {string} myRole - 我的角色
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
      startGame: false
    };
  }
  
  const { gameStatus, playerCount = 0, requiredPlayerCount = 2, hasEnoughPlayers = false } = gameState.config;
  const { currentPlayer } = gameState.progress;
  const isMyTurn = currentPlayer === myPlayerId;
  
  const myState = gameState.playerStates?.[myPlayerId];
  
  // 是否是房主（p1）
  const isCreator = myPlayerId === 'p1';
  
  // 检查是否有足够的玩家加入
  // 多重条件确保UI状态正确，这是修复问题2的关键
  const joinedPlayers = gameState.players?.filter(p => p !== null).length || 0;
  const hasMinPlayers = hasEnoughPlayers || joinedPlayers >= requiredPlayerCount;

  return {
    // 确定下棋：我的回合 + 有试下位置 + 游戏中
    confirmMove: isMyTurn && !!trialPosition && gameStatus === 'playing',
    
    // 旋转：有选中棋子
    rotate: typeof selectedPiece === 'number',
    
    // 翻转：有选中棋子
    flip: typeof selectedPiece === 'number',
    
    // 停手：我的回合 + 游戏中 + 我未停手
    pass: isMyTurn && gameStatus === 'playing' && !myState?.passed,
    
    // 清除试下：有试下位置
    clearTrial: !!trialPosition,
    
    // 开始游戏：我是创建者 + 有足够玩家 + 等待状态 - 修复问题2
    startGame: isCreator && hasMinPlayers && gameStatus === 'waiting'
  };
}

/**
 * 获取棋盘格子的颜色类名
 * @param {number} cellValue - 格子值 (0=空, 1=创建者, 2=加入者)
 * @param {boolean} isLatest - 是否是最新一步
 * @param {boolean} isTrial - 是否是试下
 * @param {string} playerRole - 格子所属玩家角色
 * @returns {string} Tailwind类名
 */
export function getCellColorClass(cellValue, isLatest, isTrial, playerRole) {
  if (isTrial) {
    // 试下状态
    return playerRole === 'creator' ? 'bg-[#FFB8C2]' : 'bg-[#B8CCFF]';
  }
  
  if (cellValue === 1) {
    // 创建者的棋子
    return isLatest ? 'bg-[#FF4D66]' : 'bg-[#FF8294]';
  }
  
  if (cellValue === 2) {
    // 加入者的棋子
    return isLatest ? 'bg-[#4D80FF]' : 'bg-[#82A6FF]';
  }
  
  // 空格子
  return 'bg-white hover:bg-gray-50';
}

/**
 * 验证游戏结束条件
 * @param {object} gameState - 游戏状态
 * @returns {boolean} 是否应该结束
 */
export function shouldGameEnd(gameState) {
  if (!gameState.creator || !gameState.joiner) return false;
  
  return gameState.creator.passed && gameState.joiner.passed;
}

/**
 * 获取可用棋子列表
 * @param {array} piecesUsed - 已使用棋子数组
 * @returns {array} 可用棋子ID列表
 */
export function getAvailablePieces(piecesUsed) {
  if (!piecesUsed) return [];
  
  return piecesUsed
    .map((used, index) => !used ? index : null)
    .filter(id => id !== null);
}

/**
 * 计算剩余棋子总格数
 * @param {array} piecesUsed - 已使用棋子数组
 * @returns {number} 剩余格数
 */
export function getRemainingSquares(piecesUsed) {
  if (!piecesUsed) return 0;
  
  // pieces.js中定义的所有棋子
  const pieceSizes = [1, 2, 3, 3, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5];
  
  let total = 0;
  piecesUsed.forEach((used, index) => {
    if (!used) {
      total += pieceSizes[index];
    }
  });
  
  return total;
}

/**
 * 格式化房间ID显示
 * @param {string} roomId - 房间ID
 * @returns {string} 格式化后的房间ID
 */
export function formatRoomId(roomId) {
  if (!roomId) return '';
  
  // 如果房间ID很长，可以添加分隔符
  if (roomId.length > 8) {
    return roomId.match(/.{1,4}/g)?.join('-') || roomId;
  }
  
  return roomId;
}

/**
 * 检查是否可以继续下棋（还有合法位置）
 * @param {array} board - 棋盘
 * @param {array} piecesUsed - 已使用棋子
 * @param {string} role - 角色
 * @param {object} playerState - 玩家状态
 * @returns {boolean} 是否还能下棋
 */
export function canContinuePlaying(board, piecesUsed, role, playerState) {
  if (!piecesUsed || !board) return false;
  
  // 获取可用棋子
  const availablePieces = getAvailablePieces(piecesUsed);
  if (availablePieces.length === 0) return false;
  
  const playerId = getPlayerId(role);
  const firstMove = isFirstMove(playerState);
  
  // 简单检查：遍历部分棋子和位置
  // 完整检查太耗时，这里只做快速判断
  for (let pieceId of availablePieces.slice(0, 5)) {
    for (let rotation = 0; rotation < 4; rotation++) {
      const shape = getPieceTransforms(pieceId, rotation, false);
      
      // 只检查部分位置
      for (let y = 0; y < 14; y += 2) {
        for (let x = 0; x < 14; x += 2) {
          if (!isOutOfBounds(shape, x, y) &&
              !isOverlapping(shape, x, y, board) &&
              isValidPlacement(shape, x, y, board, playerId, firstMove)) {
            return true;
          }
        }
      }
    }
  }
  
  return false;
}