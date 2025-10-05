/**
 * 版本检测和管理工具
 * 版本号格式: YYYYMMDDHHMMSS (年月日时分秒)
 */

const CURRENT_VERSION = '0.2.0';

export interface VersionInfo {
  version: string; // package.json 版本 (如 "0.2.0")
  timestamp: string; // 时间戳版本 (如 "20251005140531")
  buildTime: Date; // 构建时间
  isLatest: boolean; // 是否为最新版本
  updateAvailable: boolean; // 是否有更新可用
  displayVersion: string; // 显示版本 (如 "v0.2.0")
}

export interface RemoteVersionInfo {
  version: string;
  timestamp: string;
  releaseNotes?: string[];
  downloadUrl?: string;
}

/**
 * 解析时间戳版本号
 */
export function parseVersionTimestamp(timestamp: string): Date | null {
  if (!/^\d{14}$/.test(timestamp)) {
    return null;
  }

  const year = parseInt(timestamp.slice(0, 4));
  const month = parseInt(timestamp.slice(4, 6)) - 1; // JS 月份从0开始
  const day = parseInt(timestamp.slice(6, 8));
  const hour = parseInt(timestamp.slice(8, 10));
  const minute = parseInt(timestamp.slice(10, 12));
  const second = parseInt(timestamp.slice(12, 14));

  const date = new Date(year, month, day, hour, minute, second);

  // 验证日期是否有效
  if (isNaN(date.getTime())) {
    return null;
  }

  return date;
}

/**
 * 比较两个版本时间戳
 * @param current 当前版本时间戳
 * @param remote 远程版本时间戳
 * @returns 1: 当前版本更新, 0: 版本相同, -1: 远程版本更新
 */
export function compareVersions(current: string, remote: string): number {
  const currentNum = parseInt(current);
  const remoteNum = parseInt(remote);

  if (currentNum > remoteNum) return 1;
  if (currentNum < remoteNum) return -1;
  return 0;
}

/**
 * 格式化版本时间戳为可读格式
 */
export function formatVersionTimestamp(timestamp: string): string {
  const date = parseVersionTimestamp(timestamp);
  if (!date) return timestamp;

  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * 生成当前时间戳版本号
 */
export function generateVersionTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}${hour}${minute}${second}`;
}

/**
 * 获取当前版本信息
 */
export async function getCurrentVersionInfo(): Promise<VersionInfo> {
  try {
    // 从 VERSION.txt 获取时间戳版本
    const response = await fetch('/VERSION.txt');
    const timestamp = (await response.text()).trim();

    const buildTime = parseVersionTimestamp(timestamp) || new Date();

    return {
      version: CURRENT_VERSION,
      timestamp,
      buildTime,
      isLatest: true, // 默认当前版本是最新的，需要与远程比较
      updateAvailable: false,
      displayVersion: `v${CURRENT_VERSION}`,
    };
  } catch (error) {
    // 降级处理
    const timestamp = '20251005140531'; // 默认时间戳
    return {
      version: CURRENT_VERSION,
      timestamp,
      buildTime: parseVersionTimestamp(timestamp) || new Date(),
      isLatest: true,
      updateAvailable: false,
      displayVersion: `v${CURRENT_VERSION}`,
    };
  }
}

/**
 * 检查是否有新版本可用
 * 这里可以连接到 GitHub API 或其他版本检查服务
 */
export async function checkForUpdates(currentTimestamp: string): Promise<{
  hasUpdate: boolean;
  remoteVersion?: RemoteVersionInfo;
}> {
  try {
    // 这里可以连接到 GitHub Releases API 或自定义的版本检查服务
    // 目前使用模拟数据，实际使用时可以连接真实API
    const mockRemoteVersion: RemoteVersionInfo = {
      version: '0.2.1',
      timestamp: '20251010120000', // 假设的未来版本
      releaseNotes: [
        '修复 JAR 加载错误问题',
        '优化版本检测机制',
        '提升 TVBox 配置稳定性',
      ],
      downloadUrl: 'https://github.com/Decohererk/DecoTV/releases/latest',
    };

    const comparison = compareVersions(
      currentTimestamp,
      mockRemoteVersion.timestamp
    );

    return {
      hasUpdate: comparison < 0,
      remoteVersion: comparison < 0 ? mockRemoteVersion : undefined,
    };
  } catch (error) {
    return {
      hasUpdate: false,
    };
  }
}

/**
 * 获取版本状态文本和颜色
 */
export function getVersionStatusInfo(versionInfo: VersionInfo) {
  if (versionInfo.updateAvailable) {
    return {
      text: '有新版本可用',
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      borderColor: 'border-orange-200 dark:border-orange-800',
      icon: '🔄',
    };
  }

  return {
    text: '当前已是最新版本',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-200 dark:border-green-800',
    icon: '✅',
  };
}

// 导出当前版本号供其他地方使用
export { CURRENT_VERSION };
