/* eslint-disable @typescript-eslint/no-explicit-any, no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getConfig } from '@/lib/config';

export const runtime = 'nodejs';

// TVBox 订阅格式 - 标准 TVBox/猫影视 格式
// 参考: TVBox 官方格式规范

/**
 * 检测 API 类型
 * 0: MacCMS XML格式
 * 1: MacCMS JSON格式
 * 3: 自定义json格式
 */
function detectApiType(api: string): number {
  const url = api.toLowerCase();

  // XML采集接口
  if (url.includes('xml') || (url.includes('maccms') && url.includes('xml'))) {
    return 0;
  }

  // JSON采集接口
  if (
    url.includes('json') ||
    url.includes('api.php') ||
    url.includes('provide') ||
    url.includes('maccms')
  ) {
    return 1;
  }

  // 默认JSON类型
  return 1;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'json';

    const cfg = await getConfig();

    // 构建站点配置 - 严格按照TVBox标准格式
    const sites = (cfg.SourceConfig || [])
      .filter((s) => !s.disabled)
      .map((s) => ({
        key: s.key,
        name: s.name,
        type: detectApiType(s.api),
        api: s.api,
        searchable: 1,
        quickSearch: 1,
        filterable: 1,
        ext: s.detail || '',
      }));

    // 构建直播配置
    const lives = (cfg.LiveConfig || [])
      .filter((l) => !l.disabled)
      .map((l) => ({
        name: l.name,
        type: 0, // 0-m3u格式
        url: l.url,
        ua:
          l.ua ||
          'Mozilla/5.0 (Linux; Android 11; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.72 Mobile Safari/537.36',
        epg: l.epg || '',
        logo: '',
        group: '直播',
      }));

    // 标准 TVBox 配置格式 - 最小化且兼容的格式
    const tvboxConfig = {
      spider: '',
      wallpaper: '',
      sites: sites,
      lives: lives,
      parses: [
        {
          name: '默认解析',
          type: 0,
          url: 'https://jx.xmflv.com/?url=',
        },
        {
          name: 'Json并发',
          type: 2,
          url: 'Parallel',
        },
      ],
      flags: [
        'youku',
        'qq',
        'iqiyi',
        'qiyi',
        'letv',
        'sohu',
        'tudou',
        'pptv',
        'mgtv',
        'wasu',
        'bilibili',
        'renrenmi',
      ],
      ijk: [
        {
          group: '软解码',
          options: [
            { category: 4, name: 'opensles', value: '0' },
            { category: 4, name: 'overlay-format', value: '842225234' },
            { category: 4, name: 'framedrop', value: '1' },
            { category: 4, name: 'start-on-prepared', value: '1' },
            { category: 1, name: 'http-detect-range-support', value: '0' },
            { category: 1, name: 'fflags', value: 'fastseek' },
            { category: 4, name: 'reconnect', value: '1' },
            { category: 4, name: 'mediacodec', value: '0' },
            { category: 4, name: 'mediacodec-auto-rotate', value: '0' },
            {
              category: 4,
              name: 'mediacodec-handle-resolution-change',
              value: '0',
            },
          ],
        },
      ],
      ads: ['mimg.0c1q0l.cn', 'www.googletagmanager.com', 'mc.usihnbcq.cn'],
    };

    // 验证配置格式
    console.log('TVBox配置验证:', {
      sitesCount: tvboxConfig.sites.length,
      livesCount: tvboxConfig.lives.length,
      parsesCount: tvboxConfig.parses.length,
    });

    let responseContent: string;
    let contentType: string;

    if (format === 'base64') {
      // Base64编码
      const jsonString = JSON.stringify(tvboxConfig, null, 0);
      responseContent = Buffer.from(jsonString, 'utf-8').toString('base64');
      contentType = 'text/plain; charset=utf-8';
    } else {
      // 标准JSON格式 - 确保正确格式化
      responseContent = JSON.stringify(
        tvboxConfig,
        (key, value) => {
          // 避免循环引用
          if (value === null || value === undefined) {
            return value;
          }
          return value;
        },
        2
      );
      contentType = 'application/json; charset=utf-8';
    }

    return new NextResponse(responseContent, {
      headers: {
        'content-type': contentType,
        'cache-control': 'no-store, no-cache, must-revalidate',
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, OPTIONS',
        'access-control-allow-headers': 'Content-Type',
      },
    });
  } catch (e) {
    console.error('TVBox 配置生成失败:', e);
    return NextResponse.json(
      {
        error: 'TVBox 配置生成失败',
        details: e instanceof Error ? e.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
