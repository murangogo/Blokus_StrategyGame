// 路径：src/pages/HistoryDetail.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { historyAPI } from '../services/api';

function HistoryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 颜色映射表
  const colorMap = {
    1: "#FF8294", // 红色 - p1
    2: "#82A6FF", // 蓝色 - p2
    3: "#82D282", // 绿色 - p3
    4: "#FFB982"  // 橙色 - p4
  };

  useEffect(() => {
    fetchGameDetail();
  }, [id]);

  const fetchGameDetail = async () => {
    try {
      setLoading(true);
      const response = await historyAPI.getDetail(id);
      
      if (response.data.success) {
        setGame(response.data.data);
      } else {
        setError('获取游戏详情失败');
      }
    } catch (err) {
      console.error('Fetch game detail error:', err);
      setError('加载失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 格式化日期
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}年${month}月${day}日`;
  };

  // 格式化游戏时长
  const formatDuration = (seconds) => {
    if (!seconds) return '未知';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟${secs}秒`;
    } else if (minutes > 0) {
      return `${minutes}分钟${secs}秒`;
    } else {
      return `${secs}秒`;
    }
  };

  // 渲染棋盘
  const renderBoard = () => {
    if (!game || !game.boardState) return null;

    const board = game.boardState;
    const boardSize = game.boardSize || 14;

    return (
      <div className="w-full max-w-2xl mx-auto">
        <div 
          className="grid gap-0 w-full aspect-square"
          style={{ 
            gridTemplateColumns: `repeat(${boardSize}, 1fr)`,
            gridTemplateRows: `repeat(${boardSize}, 1fr)`
          }}
        >
          {Array.from({ length: boardSize }, (_, y) =>
            Array.from({ length: boardSize }, (_, x) => {
              const cellValue = board[y][x];
              
              let cellStyle = { backgroundColor: 'white' };
              
              // 使用颜色映射表确定格子颜色
              if (cellValue > 0 && cellValue <= 4) {
                cellStyle.backgroundColor = colorMap[cellValue];
              }

              return (
                <div
                  key={`${x}-${y}`}
                  className="aspect-square border border-gray-300"
                  style={cellStyle}
                />
              );
            })
          )}
        </div>
      </div>
    );
  };

  // 渲染玩家卡片
  const renderPlayerCard = (playerId, playerData) => {
    if (!playerData || !game) return null;
    
    // 获取玩家分数和惩罚
    const score = game.scores?.[playerId] || 0;
    const penalty = game.penalties?.[playerId] || 0;
    
    // 计算格数（分数+惩罚）
    const grids = score + penalty;
    
    // 获取颜色
    const colorId = playerData.colorId || parseInt(playerId.substring(1));
    const color = colorMap[colorId] || "#CCCCCC";
    
    // 获取标签文字（第一个字）
    const label = playerId === 'p1' ? '创' : (
      playerId === 'p2' ? '蓝' : (
        playerId === 'p3' ? '绿' : '橙'
      )
    );
    
    // 是否是获胜者
    const isWinner = game.winner === playerId;
    
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{backgroundColor: `${color}30`}}>
            <span className="font-bold text-lg" style={{color: color}}>{label}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-800">{playerData.account}</h3>
              {isWinner && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                  获胜者
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">玩家 {playerId.toUpperCase()}</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">惩罚:</span>
            <span className="font-semibold text-red-600">{penalty}格</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">格数:</span>
            <span className="font-semibold text-gray-800">{grids}格</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="text-gray-600">得分:</span>
            <span className={`font-bold text-xl ${isWinner ? 'text-green-600' : 'text-blue-600'}`}>{score}</span>
          </div>
        </div>
      </div>
    );
  };

  // 加载状态
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-gray-600 font-medium">加载游戏详情中...</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error || !game) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">加载失败</h2>
            <p className="text-red-600 mb-6">{error || '游戏不存在'}</p>
            <button
              onClick={() => navigate('/history')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              返回列表
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 获取胜者文本
  const getWinnerText = () => {
    if (game.winner === 'draw') return '平局';
    if (!game.winner) return '未知';
    return game.winnerAccount || '未知玩家';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* 返回按钮 */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/history')}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-white rounded-lg transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回列表
          </button>
        </div>

        {/* 标题卡片 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              {game.winner === 'draw' ? '平局' : '获胜者: '}
              <span className={game.winner && game.winner !== 'draw' ? 'text-green-600' : 'text-gray-600'}>
                {getWinnerText()}
              </span>
            </h1>
            <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm mt-2">
              {game.playerCount}人对战 · {game.boardSize}×{game.boardSize}棋盘
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-6 mt-4">
              {/* 日期 */}
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-gray-700">{formatDate(game.finishedAt)}</span>
              </div>

              {/* 对局用时 */}
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-gray-700">对局用时: {formatDuration(game.gameDuration)}</span>
              </div>

              {/* 回合时间限制 */}
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span className="text-gray-700">回合限时: {game.limitTime}秒</span>
              </div>

              {/* 备用时间 */}
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-gray-700">备用时间: {game.backupTime}秒</span>
              </div>

              {/* 回合数 */}
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-gray-700">共{game.totalRounds}回合</span>
              </div>
            </div>
          </div>
        </div>

        {/* 玩家信息卡片 - 动态生成 */}
        <div className={`grid grid-cols-1 ${Object.keys(game.players || {}).length > 2 ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-6 mb-6`}>
          {Object.entries(game.players || {}).map(([playerId, playerData]) => 
            renderPlayerCard(playerId, playerData)
          )}
        </div>

        {/* 棋盘 */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 text-center">
            棋盘 ({game.boardSize}×{game.boardSize})
          </h2>
          {renderBoard()}
        </div>
      </div>
    </div>
  );
}

export default HistoryDetail;