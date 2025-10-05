import { NextResponse } from 'next/server';

import { checkForUpdates, getCurrentVersionInfo } from '@/lib/version';

export const dynamic = 'force-dynamic';

/**
 * 版本检查 API
 * GET /api/version/check - 检查当前版本状态和是否有更新
 */
export async function GET() {
  try {
    const currentVersion = await getCurrentVersionInfo();
    const updateCheck = await checkForUpdates(currentVersion.timestamp);

    const response = {
      success: true,
      current: currentVersion,
      hasUpdate: updateCheck.hasUpdate,
      remote: updateCheck.remoteVersion,
      timestamp: Date.now(),
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}
