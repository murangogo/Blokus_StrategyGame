// 路径：src/components/game/GameControls.jsx
function GameControls({ 
  buttonStates,      // 按钮状态对象
  onConfirmMove,     // 确定下棋
  onRotate,          // 旋转
  onFlip,            // 翻转
  onPass,            // 停止下棋
  onClearTrial       // 清除试下
}) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-3">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">操作</h3>

      {/* 确定下棋按钮 - 最重要，单独一行 */}
      <button
        onClick={onConfirmMove}
        disabled={!buttonStates.confirmMove}
        className={`
          w-full py-3 px-4 rounded-lg font-semibold text-base
          transition-all duration-200 transform
          ${buttonStates.confirmMove
            ? 'bg-green-600 hover:bg-green-700 text-white hover:scale-105 active:scale-95 cursor-pointer shadow-md hover:shadow-lg'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }
        `}
      >
        确定下棋
      </button>

      {/* 旋转和翻转按钮 - 一行两个 */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onRotate}
          disabled={!buttonStates.rotate}
          className={`
            py-2.5 px-4 rounded-lg font-medium text-sm
            transition-all duration-200 transform
            ${buttonStates.rotate
              ? 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105 active:scale-95 cursor-pointer'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          <div className="flex items-center justify-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            旋转
          </div>
        </button>

        <button
          onClick={onFlip}
          disabled={!buttonStates.flip}
          className={`
            py-2.5 px-4 rounded-lg font-medium text-sm
            transition-all duration-200 transform
            ${buttonStates.flip
              ? 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105 active:scale-95 cursor-pointer'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          <div className="flex items-center justify-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            翻转
          </div>
        </button>
      </div>

      {/* 停止下棋和清除试下按钮 - 一行两个 */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onPass}
          disabled={!buttonStates.pass}
          className={`
            py-2.5 px-4 rounded-lg font-medium text-sm
            transition-all duration-200 transform
            ${buttonStates.pass
              ? 'bg-orange-600 hover:bg-orange-700 text-white hover:scale-105 active:scale-95 cursor-pointer'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          <div className="flex items-center justify-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            停止下棋
          </div>
        </button>

        <button
          onClick={onClearTrial}
          disabled={!buttonStates.clearTrial}
          className={`
            py-2.5 px-4 rounded-lg font-medium text-sm
            transition-all duration-200 transform
            ${buttonStates.clearTrial
              ? 'bg-gray-600 hover:bg-gray-700 text-white hover:scale-105 active:scale-95 cursor-pointer'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          <div className="flex items-center justify-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            清除试下
          </div>
        </button>
      </div>

      {/* 操作提示 */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center leading-relaxed">
          {buttonStates.confirmMove && '点击"确定下棋"完成落子'}
          {!buttonStates.confirmMove && buttonStates.rotate && '选择棋子后，可旋转或翻转'}
          {!buttonStates.confirmMove && !buttonStates.rotate && buttonStates.pass && '您可以选择停止下棋'}
          {!buttonStates.confirmMove && !buttonStates.rotate && !buttonStates.pass && '等待操作...'}
        </p>
      </div>
    </div>
  );
}

export default GameControls;