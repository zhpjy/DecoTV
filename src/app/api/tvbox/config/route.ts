/* eslint-disable @typescript-eslint/no-explicit-any, no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getConfig } from '@/lib/config';

export const runtime = 'nodejs';

// TVBox 订阅格式 - 标准 TVBox/猫影视 格式
// 参考文档: https://github.com/CatVodTVOfficial/TVBoxOSC

// 检测 API 类型（通过 URL 推测）
function detectApiType(api: string): number {
  const url = api.toLowerCase();
  if (url.includes('xml') || url.includes('maccms')) {
    return 0; // XML 采集接口
  }
  if (
    url.includes('json') ||
    url.includes('api.php') ||
    url.includes('provide')
  ) {
    return 1; // JSON 采集接口
  }
  // 默认返回 JSON 类型
  return 1;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'json';

    const cfg = await getConfig();

    // 构建站点配置
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
        playUrl: '',
        categories: [],
      }));

    // 构建直播配置
    const lives = (cfg.LiveConfig || [])
      .filter((l) => !l.disabled)
      .map((l) => ({
        name: l.name,
        type: 0,
        url: l.url,
        ua: l.ua || 'Mozilla/5.0 (Linux; Android 11) AppleWebKit/537.36',
        epg: l.epg || '',
        logo: '',
        group: 'DecoTV直播',
      }));

    // 标准 TVBox 配置格式
    const tvboxConfig = {
      spider: '',
      wallpaper: '',
      lives: lives.length > 0 ? lives : [],
      sites,
      parses: [
        {
          name: '默认解析',
          type: 0,
          url: 'https://jx.xmflv.com/?url=',
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
      ],
      ijk: [
        {
          group: '软解码',
          options: [
            {
              category: 4,
              name: 'opensles',
              value: '0',
            },
          ],
        },
      ],
      ads: ['mimg.0c1q0l.cn', 'www.googletagmanager.com', 'mc.usihnbcq.cn'],
    };

    let responseContent: string;
    let contentType: string;

    if (format === 'base64') {
      responseContent = Buffer.from(
        JSON.stringify(tvboxConfig),
        'utf-8'
      ).toString('base64');
      contentType = 'text/plain; charset=utf-8';
    } else {
      responseContent = JSON.stringify(tvboxConfig, null, 2);
      contentType = 'application/json; charset=utf-8';
    }

    return new NextResponse(responseContent, {
      headers: {
        'content-type': contentType,
        'cache-control': 'no-store',
        'access-control-allow-origin': '*',
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
