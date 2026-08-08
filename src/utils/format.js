// 路径：src/utils/format.js
// 历史列表与历史详情共用的展示格式化

/** 格式化日期：2026年8月8日 */
export function formatDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '未知';
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

/** 格式化时长：1小时2分钟3秒 */
export function formatDuration(seconds) {
  if (!seconds) return '未知';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) return `${hours}小时${minutes}分钟${secs}秒`;
  if (minutes > 0) return `${minutes}分钟${secs}秒`;
  return `${secs}秒`;
}
