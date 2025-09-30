// hooks/useGameTimer.js
import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * 游戏计时器Hook
 * @param {number} limitTime - 每回合基础时间（秒）
 * @param {number} backupTime - 当前后备时间（秒，来自后端）
 * @param {boolean} isMyTurn - 是否我的回合
 * @param {number} roundStartTime - 回合开始时间戳（毫秒）
 * @param {string} gameStatus - 游戏状态 (waiting/playing/finished)
 */
export function useGameTimer(
  limitTime,
  backupTime,
  isMyTurn,
  roundStartTime,
  gameStatus
) {
  // 当前回合剩余的limit时间
  const [limitRemaining, setLimitRemaining] = useState(limitTime);
  
  // 当前回合剩余的backup时间
  const [backupRemaining, setBackupRemaining] = useState(backupTime);
  
  // 是否正在消耗backup时间
  const [usingBackup, setUsingBackup] = useState(false);
  
  // 计时器引用
  const timerRef = useRef(null);
  
  // 上次更新时间（用于暂停后恢复）
  const lastUpdateRef = useRef(null);
  
  // 当前回合开始时的backup时间（用于计算消耗）
  const roundStartBackupRef = useRef(backupTime);

  // 清除计时器
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // 重置计时器状态
  const resetTimer = useCallback(() => {
    setLimitRemaining(limitTime);
    setBackupRemaining(backupTime);
    setUsingBackup(false);
    lastUpdateRef.current = null;
  }, [limitTime, backupTime]);

  // 同步后端的backup时间
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

    // 不是我的回合，停止计时
    if (!isMyTurn) {
      clearTimer();
      return;
    }

    // 没有回合开始时间，无法计时
    if (!roundStartTime) {
      clearTimer();
      return;
    }

    // 新回合开始，重置状态
    setLimitRemaining(limitTime);
    setUsingBackup(false);
    roundStartBackupRef.current = backupTime;
    lastUpdateRef.current = Date.now();

    // 启动计时器，100ms更新一次
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - roundStartTime) / 1000; // 从回合开始经过的秒数

      if (elapsed < limitTime) {
        // 还在limit时间内
        const remaining = limitTime - elapsed;
        setLimitRemaining(Math.max(0, remaining));
        setUsingBackup(false);
      } else {
        // limit时间用完，开始消耗backup
        setLimitRemaining(0);
        setUsingBackup(true);
        
        const overTime = elapsed - limitTime;
        const backupUsed = overTime;
        const backupLeft = roundStartBackupRef.current - backupUsed;
        
        setBackupRemaining(Math.max(0, backupLeft));
      }

      lastUpdateRef.current = now;
    }, 100);

    // 清理函数
    return () => {
      clearTimer();
    };
  }, [
    isMyTurn, 
    limitTime, 
    backupTime, 
    roundStartTime, 
    gameStatus, 
    clearTimer, 
    resetTimer
  ]);

  // 计算进度百分比（用于进度条显示）
  const limitProgress = limitTime > 0 
    ? Math.max(0, Math.min(100, (limitRemaining / limitTime) * 100))
    : 0;

  const backupProgress = backupTime > 0
    ? Math.max(0, Math.min(100, (backupRemaining / backupTime) * 100))
    : 0;

  // 格式化时间显示（MM:SS）
  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // 时间警告状态（用于UI提示）
  const getTimeWarningLevel = useCallback(() => {
    if (!isMyTurn || gameStatus !== 'playing') return 'normal';
    
    // limit时间少于10秒
    if (limitRemaining > 0 && limitRemaining < 10) return 'warning';
    
    // backup时间少于30秒
    if (usingBackup && backupRemaining < 30) return 'danger';
    
    // backup时间耗尽
    if (usingBackup && backupRemaining <= 0) return 'critical';
    
    return 'normal';
  }, [isMyTurn, gameStatus, limitRemaining, backupRemaining, usingBackup]);

  return {
    // 时间状态
    limitRemaining,           // 剩余limit时间（秒）
    backupRemaining,          // 剩余backup时间（秒）
    usingBackup,              // 是否正在使用backup时间
    
    // 进度百分比
    limitProgress,            // limit时间进度 (0-100)
    backupProgress,           // backup时间进度 (0-100)
    
    // 格式化显示
    limitDisplay: formatTime(limitRemaining),
    backupDisplay: formatTime(backupRemaining),
    
    // 警告等级
    warningLevel: getTimeWarningLevel(),
    
    // 工具方法
    formatTime,
    resetTimer
  };
}