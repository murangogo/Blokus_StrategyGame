// 路径：src/pages/History.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { historyAPI } from '../services/api';

function History() {
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  
  const ITEMS_PER_PAGE = 20;

  // 获取历史记录
  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await historyAPI.getList();
      
      if (response.data.success) {
        setGames(response.data.data.games);
      } else {
        setError('获取历史记录失败');
      }
    } catch (err) {
      console.error('Fetch history error:', err);
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

  // 分页逻辑
  const totalPages = Math.ceil(games.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentGames = games.slice(startIndex, endIndex);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
          <p className="text-gray-600 font-medium">加载历史记录中...</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">加载失败</h2>
            <p className="text-red-600 mb-6">{error}</p>
            <button
              onClick={fetchHistory}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 标题栏 */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">历史记录</h1>
            <p className="text-gray-600">共 {games.length} 场游戏</p>
          </div>
          <button
            onClick={() => navigate('/home')}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-white rounded-lg transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回首页
          </button>
        </div>

        {/* 列表头部 */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-4 hidden md:grid md:grid-cols-4 text-sm font-semibold text-gray-600">
          <div>比赛日期</div>
          <div>对战用户</div>
          <div>用时</div>
          <div>获胜者</div>
        </div>

        {/* 游戏记录列表 */}
        {currentGames.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500 text-lg">暂无历史记录</p>
            <p className="text-gray-400 text-sm mt-2">完成第一场游戏后将显示在这里</p>
          </div>
        ) : (
          <div className="space-y-3">
            {currentGames.map((game) => (
              <div
                key={game.id}
                onClick={() => navigate(`/history/${game.id}`)}
                className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer p-4 md:p-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 items-center">
                  {/* 日期 */}
                  <div className="flex md:block items-center justify-between md:justify-start">
                    <span className="text-gray-500 text-xs md:hidden">日期:</span>
                    <span className="text-gray-800 font-medium">
                      {formatDate(game.finishedAt)}
                    </span>
                  </div>

                  {/* 对战用户 */}
                  <div className="flex md:block items-center justify-between md:justify-start">
                    <span className="text-gray-500 text-xs md:hidden">对战:</span>
                    <span className="text-gray-800">
                      {game.creatorAccount} <span className="text-gray-400">vs</span> {game.joinerAccount}
                    </span>
                  </div>

                  {/* 用时 */}
                  <div className="flex md:block items-center justify-between md:justify-start">
                    <span className="text-gray-500 text-xs md:hidden">用时:</span>
                    <span className="text-gray-600">
                      {formatDuration(game.gameDuration)}
                    </span>
                  </div>

                  {/* 获胜者 */}
                  <div className="flex items-center justify-between md:justify-start">
                    <span className="text-gray-500 text-xs md:hidden">获胜:</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${
                        game.winner ? 'text-green-600' : 'text-gray-600'
                      }`}>
                        {game.winnerAccount || '平局'}
                      </span>
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 分页器 */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center items-center gap-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                currentPage === 1
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              上一页
            </button>

            {[...Array(Math.min(5, totalPages))].map((_, index) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = index + 1;
              } else if (currentPage <= 3) {
                pageNum = index + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + index;
              } else {
                pageNum = currentPage - 2 + index;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                currentPage === totalPages
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              下一页
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default History;