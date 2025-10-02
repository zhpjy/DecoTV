/* eslint-disable @typescript-eslint/no-explicit-any, no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getConfig } from '@/lib/config';

export const runtime = 'nodejs';

// TVBox 订阅格式（常见的 drpy/猫影视样式的简化版）
// 文档参考社区资料：输出 sites、lives 两部分即可被多数 TVBox 分支识别

export async function GET(_req: NextRequest) {
  try {
    const cfg = await getConfig();

    const sites = (cfg.SourceConfig || [])
      .filter((s) => !s.disabled)
      .map((s) => ({
        key: s.key,
        name: s.name,
        api: s.api,
        type: 1, // 1: 通用 xml/json 采集接口
        searchable: 1,
        quickSearch: 1,
        filterable: 1,
        ext: s.detail || ''
      }));

    const lives = (cfg.LiveConfig || [])
      .filter((l) => !l.disabled)
      .map((l) => ({
        name: l.name,
        // TVBox 支持直链或 m3u 链接
        url: l.url,
        ua: l.ua || '',
        epg: l.epg || ''
      }));

    const payload = {
      sites,
      lives
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store'
      },
    });
  } catch (e) {
    console.error('TVBox 配置生成失败:', e);
    return NextResponse.json({ error: 'TVBox 配置生成失败' }, { status: 500 });
  }
}

