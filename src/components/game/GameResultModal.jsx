// src/components/game/GameResultModal.jsx
import Modal from '../Modal';

function GameResultModal({ isOpen, onClose, result, myPlayerId, winner, players }) {
  // 获取鼓励性文字
  const getRandomMessage = () => {
    if (result === 'win') {
      const messages = [
        "天下没有不散的宴席，TCP也同样如此。", 
        "可喜可贺，可喜可贺。", 
        "尝蜜粽、品雄黄，万里暖风，君醉否？"
      ];
      return messages[Math.floor(Math.random() * messages.length)];
    } 
    else if (result === 'lose') {
      const messages = [
        "蓄力待时，不争首功。", 
        "天下没有不散的宴席，TCP也同样如此。", 
        "别灰心，胜利在等着你！"
      ];
      return messages[Math.floor(Math.random() * messages.length)];
    } 
    else {
      const messages = [
        "最好的机会，还在等着我。", 
        "以和为贵。", 
        "新荷濯蜻蜓，桑榆未晚，此正读书之时。"
      ];
      return messages[Math.floor(Math.random() * messages.length)];
    }
  };

  // 获取标题
  const getTitle = () => {
    if (result === 'win') return "胜利！";
    if (result === 'lose') return "失败...";
    return "平局";
  };

  // 获取标题的颜色类
  const getTitleColorClass = () => {
    if (result === 'win') return "text-green-600";
    if (result === 'lose') return "text-red-600";
    return "text-blue-600";
  };

  // 获取获胜者显示名称 - 修复这里的错误
  const getWinnerName = () => {
    // 添加防御性检查，确保winner存在且不是'draw'
    if (!winner || winner === 'draw') return null;
    
    try {
      const winnerIndex = parseInt(winner.substring(1)) - 1;
      return players && players[winnerIndex]?.account || '未知玩家';
    } catch (error) {
      console.error('获取获胜者名称时出错:', error);
      return '未知玩家';
    }
  };

  // 只有当result有值时才显示相关内容
  if (!result) return null;

  const winnerName = getWinnerName();
  const message = getRandomMessage();
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="text-center py-6">
        <h2 className={`text-4xl font-bold mb-4 ${getTitleColorClass()}`}>
          {getTitle()}
        </h2>
        
        <p className="text-xl text-gray-700 mb-6">{message}</p>
        
        {winnerName && (
          <p className="text-gray-600">
            获胜者: <span className="font-medium">{winnerName}</span>
          </p>
        )}
        
        <button
          onClick={onClose}
          className="mt-8 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          确定
        </button>
      </div>
    </Modal>
  );
}

export default GameResultModal;