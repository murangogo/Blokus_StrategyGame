import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, logout } from '../utils/auth';
import { gameAPI } from '../services/api';
import Modal from '../components/Modal';

function Home() {
  const navigate = useNavigate();
  const user = getUser();
  
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  
  const [limitTime, setLimitTime] = useState('180');
  const [roomIdInput, setRoomIdInput] = useState('');
  const [createdRoomId, setCreatedRoomId] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 创建房间
  const handleCreateRoom = async () => {
    const time = parseInt(limitTime);
    if (isNaN(time) || time < 60 || time > 300) {
      setError('请输入有效的时间（60-300秒）');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await gameAPI.createRoom(time);
      
      if (response.data.success) {
        const roomId = response.data.data.roomId;

        console.log(response);
        
        console.log(roomId);

        setCreatedRoomId(roomId);
        setCreateModalOpen(false);
        setResultModalOpen(true);
      } else {
        setError(response.data.error || '创建房间失败');
      }
    } catch (err) {
      console.error('Create room error:', err);
      setError(err.response?.data?.error || '网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 加入房间
  const handleJoinRoom = async () => {
    if (!roomIdInput.trim()) {
      setError('请输入房间号');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await gameAPI.joinRoom(roomIdInput);
      
      if (response.data.success) {
        // 跳转到房间页面
        navigate(`/room/${roomIdInput}`);
      } else {
        setError(response.data.error || '加入房间失败');
      }
    } catch (err) {
      console.error('Join room error:', err);
      setError(err.response?.data?.error || '网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  // 进入已创建的房间
  const handleEnterCreatedRoom = () => {
    setResultModalOpen(false);
    navigate(`/room/${createdRoomId}`);
  };

  // 登出
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 头部 - 欢迎信息 */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                欢迎！{user?.account || '玩家'}
              </h1>
              <p className="text-gray-500">角斗士棋 Blokus - 双人对战</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              退出登录
            </button>
          </div>
        </div>

        {/* 功能按钮区域 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 创建房间 */}
          <button
            onClick={() => {
              setCreateModalOpen(true);
              setError('');
              setLimitTime('180');
            }}
            className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all transform hover:scale-105 active:scale-95"
          >
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">创建房间</h3>
            <p className="text-gray-500 text-sm">开启新的对局</p>
          </button>

          {/* 进入房间 */}
          <button
            onClick={() => {
              setJoinModalOpen(true);
              setError('');
              setRoomIdInput('');
            }}
            className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all transform hover:scale-105 active:scale-95"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">进入房间</h3>
            <p className="text-gray-500 text-sm">加入好友对局</p>
          </button>

          {/* 历史棋局 */}
          <button
            onClick={() => navigate('/history')}
            className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all transform hover:scale-105 active:scale-95"
          >
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">历史棋局</h3>
            <p className="text-gray-500 text-sm">查看对战记录</p>
          </button>
        </div>
      </div>

      {/* 创建房间弹窗 */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => !loading && setCreateModalOpen(false)}
        title="创建房间"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              每回合最大等待时间（秒）
            </label>
            <input
              type="number"
              value={limitTime}
              onChange={(e) => setLimitTime(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition disabled:bg-gray-100"
              placeholder="默认180秒"
              min="10"
              max="3600"
            />
            <p className="text-xs text-gray-500 mt-1">范围：10-3600秒</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => !loading && setCreateModalOpen(false)}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消
            </button>
            <button
              onClick={handleCreateRoom}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? '创建中...' : '确定'}
            </button>
          </div>
        </div>
      </Modal>

      {/* 加入房间弹窗 */}
      <Modal
        isOpen={joinModalOpen}
        onClose={() => !loading && setJoinModalOpen(false)}
        title="加入房间"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              房间号
            </label>
            <input
              type="text"
              value={roomIdInput}
              onChange={(e) => setRoomIdInput(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition disabled:bg-gray-100"
              placeholder="请输入房间号"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => !loading && setJoinModalOpen(false)}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消
            </button>
            <button
              onClick={handleJoinRoom}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? '加入中...' : '确定'}
            </button>
          </div>
        </div>
      </Modal>

      {/* 创建成功结果弹窗 */}
      <Modal
        isOpen={resultModalOpen}
        onClose={() => setResultModalOpen(false)}
        title="房间创建成功"
      >
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">房间号</p>
            <p className="text-2xl font-mono font-bold text-green-600 break-all">
              {createdRoomId}
            </p>
          </div>
          
          <p className="text-sm text-gray-500">
            请将房间号分享给好友，等待好友加入后即可开始游戏
          </p>

          <button
            onClick={handleEnterCreatedRoom}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            进入房间
          </button>
        </div>
      </Modal>
    </div>
  );
}

export default Home;