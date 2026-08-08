// 路径：src/hooks/useGameTimer.js
import { useState, useEffect, useRef, useCallback } from 'react';

// 进度条本身带 CSS 过渡，200ms 刷新一次已足够平滑，同时减半重渲染次数
const TICK_MS = 200;

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 游戏计时器Hook
 * @param {number} limitTime - 每回合基础时间（秒）
 * @param {number} backupTime - 当前后备时间（秒，来自后端）
 * @param {boolean} isMyTurn - 是否我的回合
 * @param {number} roundStartTime - 回合开始时间戳（毫秒）
 * @param {string} gameStatus - 游戏状态 (waiting/playing/finished)
 */
export function useGameTimer(limitTime, backupTime, isMyTurn, roundStartTime, gameStatus) {
  // 当前回合剩余的limit时间
  const [limitRemaining, setLimitRemaining] = useState(limitTime);

  // 当前剩余的backup时间
  const [backupRemaining, setBackupRemaining] = useState(backupTime);

  // 是否正在消耗backup时间
  const [usingBackup, setUsingBackup] = useState(false);

  const timerRef = useRef(null);

  // 当前回合开始时的backup时间（用于计算本回合消耗）
  const roundStartBackupRef = useRef(backupTime);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    setLimitRemaining(limitTime);
    setBackupRemaining(backupTime);
    setUsingBackup(false);
  }, [limitTime, backupTime]);

  // 同步后端下发的backup时间
  useEffect(() => {
    setBackupRemaining(backupTime);
  }, [backupTime]);

  // 主计时逻辑
  useEffect(() => {
    // 游戏未开始或已结束，不计时
    if (gameStatus !== 'playing') {
      clearTimer();
      resetTimer();
      return;
    }

    // 不是我的回合 / 缺少回合开始时间，都不计时
    if (!isMyTurn || !roundStartTime) {
      clearTimer();
      return;
    }

    // 新回合开始，重置状态
    setLimitRemaining(limitTime);
    setUsingBackup(false);
    roundStartBackupRef.current = backupTime;

    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - roundStartTime) / 1000; // 回合已用秒数

      if (elapsed < limitTime) {
        setLimitRemaining(Math.max(0, limitTime - elapsed));
        setUsingBackup(false);
      } else {
        // limit时间用完，开始消耗backup
        setLimitRemaining(0);
        setUsingBackup(true);
        setBackupRemaining(
          Math.max(0, roundStartBackupRef.current - (elapsed - limitTime))
        );
      }
    }, TICK_MS);

    return clearTimer;
  }, [isMyTurn, limitTime, backupTime, roundStartTime, gameStatus, clearTimer, resetTimer]);

  // 进度百分比（用于进度条显示）
  const limitProgress =
    limitTime > 0 ? Math.max(0, Math.min(100, (limitRemaining / limitTime) * 100)) : 0;

  const backupProgress =
    backupTime > 0 ? Math.max(0, Math.min(100, (backupRemaining / backupTime) * 100)) : 0;

  // 时间警告等级（用于UI提示）
  let warningLevel = 'normal';
  if (isMyTurn && gameStatus === 'playing') {
    if (usingBackup && backupRemaining <= 0) warningLevel = 'critical';
    else if (usingBackup && backupRemaining < 30) warningLevel = 'danger';
    else if (limitRemaining > 0 && limitRemaining < 10) warningLevel = 'warning';
  }

  return {
    limitRemaining, // 剩余limit时间（秒）
    backupRemaining, // 剩余backup时间（秒）
    usingBackup, // 是否正在使用backup时间
    limitProgress, // limit时间进度 (0-100)
    backupProgress, // backup时间进度 (0-100)
    limitDisplay: formatTime(limitRemaining),
    backupDisplay: formatTime(backupRemaining),
    warningLevel,
  };
}
