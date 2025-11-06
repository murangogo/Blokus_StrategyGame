// 路径：src/components/game/TimeProgress.jsx
function TimeProgress({ 
  limitProgress,      // limit时间进度 (0-100)
  backupProgress,     // backup时间进度 (0-100)
  limitRemaining,     // 剩余limit时间（秒）
  backupRemaining,    // 剩余backup时间（秒）
  limitDisplay,       // 格式化的limit时间显示
  backupDisplay,      // 格式化的backup时间显示
  isMyTurn,          // 是否我的回合
  usingBackup,       // 是否正在使用backup时间
  warningLevel,      // 警告等级
  buttonStates,      // 按钮状态对象
  onStartGame,        // 开始游戏回调
  myRole,           // 我的角色
  gameStatus        // 游戏状态
}) {
  // 根据警告等级决定动画效果
  const getProgressAnimation = () => {
    if (!isMyTurn) return '';
    
    if (warningLevel === 'critical') {
      return 'animate-pulse';
    } else if (warningLevel === 'danger') {
      return 'animate-pulse';
    } else if (warningLevel === 'warning') {
      return '';
    }
    return '';
  };

  // 根据游戏状态决定按钮文字
  const getButtonText = () => {
    if (gameStatus === 'playing' || gameStatus === 'finished') {
      return '已开始游戏！';
    }
    if (buttonStates.startGame) {
      return '开始游戏';
    }
    if (myRole == 'creator') {
      return '等待对手加入...';
    } else {
      return '等待房主开始游戏...';
    }
  };

  // 游戏开始后按钮禁用
  const isButtonDisabled = gameStatus !== 'waiting' || !buttonStates.startGame;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
      {/* 开始游戏按钮 */}
      {buttonStates?.startGame !== undefined && (
        <button
          onClick={onStartGame}
          disabled={isButtonDisabled}
          className={`
            w-full py-3 px-4 rounded-lg font-semibold text-lg
            transition-all duration-200 transform
            ${!isButtonDisabled
              ? 'bg-green-600 hover:bg-green-700 text-white hover:scale-105 active:scale-95 cursor-pointer'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {getButtonText()}
        </button>
      )}

      {/* 回合时间进度条 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">回合时间</span>
          <span className={`
            font-mono font-bold
            ${isMyTurn ? 'text-red-600' : 'text-gray-400'}
            ${warningLevel === 'danger' || warningLevel === 'critical' ? 'animate-pulse' : ''}
          `}>
            {limitDisplay}
          </span>
        </div>
        
        <div className="relative w-full h-6 bg-gray-200 rounded-lg overflow-hidden">
          <div 
            className={`
              absolute left-0 top-0 h-full bg-red-500
              transition-all duration-300 ease-linear
              ${getProgressAnimation()}
            `}
            style={{ width: `${limitProgress}%` }}
          />
          
          {/* 进度条内的文字 */}
          {isMyTurn && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-semibold text-white drop-shadow-md">
                {Math.ceil(limitRemaining)}秒
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 备用时间进度条 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">备用时间</span>
          <span className={`
            font-mono font-bold
            ${usingBackup && isMyTurn ? 'text-yellow-600' : 'text-gray-400'}
            ${usingBackup && (warningLevel === 'danger' || warningLevel === 'critical') ? 'animate-pulse' : ''}
          `}>
            {backupDisplay}
          </span>
        </div>
        
        <div className="relative w-full h-6 bg-gray-200 rounded-lg overflow-hidden">
          <div 
            className={`
              absolute left-0 top-0 h-full bg-yellow-500
              transition-all duration-300 ease-linear
              ${usingBackup && isMyTurn ? getProgressAnimation() : ''}
            `}
            style={{ width: `${backupProgress}%` }}
          />
          
          {/* 进度条内的文字 */}
          {usingBackup && isMyTurn && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-semibold text-white drop-shadow-md">
                {Math.ceil(backupRemaining)}秒
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 状态提示 */}
      {isMyTurn && (
        <div className="text-center">
          {warningLevel === 'critical' && (
            <p className="text-sm font-semibold text-red-600 animate-pulse">
              ⚠️ 备用时间已耗尽！将受到惩罚！
            </p>
          )}
          {warningLevel === 'danger' && !usingBackup && (
            <p className="text-sm font-semibold text-orange-600">
              ⏰ 时间紧迫，请尽快落子
            </p>
          )}
          {usingBackup && warningLevel !== 'critical' && (
            <p className="text-sm text-yellow-700">
              正在消耗备用时间...
            </p>
          )}
        </div>
      )}

      {/* 非回合状态提示 */}
      {!isMyTurn && (
        <div className="text-center">
          <p className="text-sm text-gray-500">
            等待对手行动中...
          </p>
        </div>
      )}
    </div>
  );
}

export default TimeProgress;