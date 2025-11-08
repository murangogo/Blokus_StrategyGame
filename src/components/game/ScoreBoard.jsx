// src/components/game/ScoreBoard.jsx
import React from 'react';

function ScoreBoard({ players, scores, penalties, colors }) {
  // 确保所有参数都存在，添加防御性编程
  if (!players || !scores || !colors) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 mt-4">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">计分板</h3>
        <p className="text-gray-500 text-center">无法加载计分数据</p>
      </div>
    );
  }

  // 排序玩家，按照分数从高到低
  const sortedPlayers = Object.keys(scores || {}).sort((a, b) => 
    (scores[b] || 0) - (scores[a] || 0)
  );

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mt-4">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">计分板</h3>
      
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-200 text-left">
            <th className="py-3 px-4">玩家</th>
            <th className="py-3 px-4 text-center">格子数</th>
            <th className="py-3 px-4 text-center">惩罚</th>
            <th className="py-3 px-4 text-center">最终得分</th>
          </tr>
        </thead>
        <tbody>
          {sortedPlayers.length > 0 ? (
            sortedPlayers.map(playerId => {
              const playerIndex = parseInt(playerId.substring(1)) - 1;
              const playerInfo = players[playerIndex];
              const colorValue = colors?.[playerId]?.value || '#CCCCCC';
              
              // 计算格子数 = 得分 + 惩罚
              const penalty = penalties?.[playerId] || 0;
              const score = scores?.[playerId] || 0;
              const total = score + penalty;
              
              return (
                <tr key={playerId} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: colorValue }}
                      />
                      <span>{playerInfo?.account || `玩家${playerIndex + 1}`}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">{total}</td>
                  <td className="py-3 px-4 text-center text-red-600">-{penalty}</td>
                  <td className="py-3 px-4 text-center font-semibold">
                    {score}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan="4" className="py-4 text-center text-gray-500">
                暂无得分数据
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ScoreBoard;