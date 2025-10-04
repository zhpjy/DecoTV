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
/**
 * 检测 API 类型
 * 0: MacCMS XML格式
 * 1: MacCMS JSON格式
 * 3: CSP 源（csp_*）
 */
function detectApiType(api: string): number {
  const url = api.toLowerCase();

  // CSP 源（优先判断）
  if (url.startsWith('csp_')) return 3;

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
    const { searchParams, href } = new URL(req.url);
    const format = searchParams.get('format') || 'json';
    const mode = (searchParams.get('mode') || '').toLowerCase(); // 可选: safe|min|yingshicang
    console.log('[TVBox] request:', href, 'format:', format, 'mode:', mode);

    const cfg = await getConfig();

    // 构建站点配置 - 严格按照TVBox标准格式，优化jar处理
    // 默认优质spider jar地址，确保兼容性
    let globalSpiderJar =
      'https://gh-proxy.com/raw.githubusercontent.com/FongMi/CatVodSpider/main/jar/custom_spider.jar;md5;a8b9c1d2e3f4';
    const sites = (cfg.SourceConfig || [])
      .filter((s) => !s.disabled)
      .map((s) => {
        const site: any = {
          key: s.key,
          name: s.name,
          type: detectApiType(s.api),
          api: s.api,
          searchable: 1,
          quickSearch: 1,
          filterable: 1,
          // 优化搜索体验的附加配置
          timeout: 10000, // 10秒超时
          changeable: 1,
          // 添加请求头优化兼容性
          header: {
            'User-Agent':
              'Mozilla/5.0 (Linux; Android 11; M2012K11AC Build/RKQ1.200928.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/77.0.3865.120 MQQBrowser/6.2 TBS/045714 Mobile Safari/537.36',
          },
        };

        // 解析 detail：允许 JSON 字符串承载扩展字段，如 { ext, jar, type, api, searchable, quickSearch, filterable, playUrl }
        const detail = (s.detail || '').trim();
        if (detail) {
          try {
            const obj = JSON.parse(detail);
            if (obj) {
              if (obj.type !== undefined) site.type = obj.type;
              if (obj.api) site.api = obj.api;
              if (obj.ext !== undefined) {
                // 强制 ext 为字符串，避免部分 TVBox 分支无法解析对象
                site.ext =
                  typeof obj.ext === 'string'
                    ? obj.ext
                    : JSON.stringify(obj.ext);
              }
              if (obj.searchable !== undefined)
                site.searchable = obj.searchable;
              if (obj.quickSearch !== undefined)
                site.quickSearch = obj.quickSearch;
              if (obj.filterable !== undefined)
                site.filterable = obj.filterable;
              if (obj.playUrl !== undefined) site.playUrl = obj.playUrl;
              if (obj.jar) {
                // 优化jar处理，确保URL有效性
                const jarUrl = obj.jar.trim();
                if (jarUrl.startsWith('http')) {
                  site.jar = jarUrl;
                  globalSpiderJar = jarUrl; // 更新全局spider为最新有效jar
                }
              }
            }
          } catch {
            // 非 JSON，作为 ext 字符串
            site.ext = detail;
          }
        } else {
          site.ext = '';
        }

        // 如果 api 以 csp_ 开头，则强制为 CSP 类型
        if (
          typeof site.api === 'string' &&
          site.api.toLowerCase().startsWith('csp_')
        ) {
          site.type = 3;
        }

        return site;
      });

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

    // 构建配置对象（支持多种模式优化）
    let tvboxConfig: any;
    if (mode === 'yingshicang') {
      // 专门为影视仓优化的配置
      tvboxConfig = {
        spider: globalSpiderJar,
        sites: sites.map((site) => ({
          ...site,
          // 移除可能导致影视仓解析失败的字段
          header: undefined,
          timeout: undefined,
        })),
        lives,
        parses: [
          { name: '默认解析', type: 0, url: 'https://jx.xmflv.com/?url=' },
          { name: '夜幕解析', type: 0, url: 'https://www.yemu.xyz/?url=' },
          { name: '爱豆解析', type: 0, url: 'https://jx.aidouer.net/?url=' },
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
        ],
        // 影视仓专用优化配置
        rules: [
          {
            name: '量子广告',
            hosts: ['vip.lz', 'hd.lz'],
            regex: [
              '#EXT-X-DISCONTINUITY\\r?\\n\\#EXTINF:6.433333,[\\s\\S]*?#EXT-X-DISCONTINUITY',
              '#EXTINF.*?\\s+.*?1o.*?\\.ts\\s+',
            ],
          },
          {
            name: '非凡广告',
            hosts: ['vip.ffzy', 'hd.ffzy'],
            regex: [
              '#EXT-X-DISCONTINUITY\\r?\\n\\#EXTINF:6.666667,[\\s\\S]*?#EXT-X-DISCONTINUITY',
              '#EXTINF.*?\\s+.*?1o.*?\\.ts\\s+',
            ],
          },
        ],
      };
    } else if (mode === 'safe' || mode === 'min') {
      // 仅输出最必要字段，避免解析器因字段不兼容而失败
      tvboxConfig = {
        spider: globalSpiderJar,
        sites,
        lives,
        parses: [
          { name: '默认解析', type: 0, url: 'https://jx.xmflv.com/?url=' },
          { name: '夜幕解析', type: 0, url: 'https://www.yemu.xyz/?url=' },
        ],
      };
    } else {
      // 标准完整配置 - 优化体验和兼容性
      tvboxConfig = {
        spider: globalSpiderJar,
        wallpaper: 'https://picsum.photos/1920/1080/?blur=2',
        sites,
        lives,
        parses: [
          {
            name: '默认解析',
            type: 0,
            url: 'https://jx.xmflv.com/?url=',
            ext: {
              flag: [
                'qq',
                'qiyi',
                'mgtv',
                'youku',
                'letv',
                'sohu',
                'xigua',
                'cntv',
              ],
              header: { 'User-Agent': 'Mozilla/5.0' },
            },
          },
          {
            name: '夜幕解析',
            type: 0,
            url: 'https://www.yemu.xyz/?url=',
            ext: {
              flag: ['qq', 'qiyi', 'mgtv', 'youku', 'letv', 'sohu'],
              header: { 'User-Agent': 'Mozilla/5.0' },
            },
          },
          {
            name: '爱豆解析',
            type: 0,
            url: 'https://jx.aidouer.net/?url=',
            ext: {
              flag: ['qq', 'qiyi', 'mgtv', 'youku', 'letv'],
              header: { 'User-Agent': 'Mozilla/5.0' },
            },
          },
          {
            name: '8090解析',
            type: 0,
            url: 'https://www.8090g.cn/?url=',
            ext: {
              flag: ['qq', 'qiyi', 'mgtv', 'youku'],
              header: { 'User-Agent': 'Mozilla/5.0' },
            },
          },
          { name: 'Json并发', type: 2, url: 'Parallel' },
          { name: 'Json轮询', type: 2, url: 'Sequence' },
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
          'xigua',
          'cntv',
          '1905',
          'fun',
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
              { category: 4, name: 'enable-accurate-seek', value: '0' },
              { category: 4, name: 'mediacodec', value: '0' },
              { category: 4, name: 'mediacodec-auto-rotate', value: '0' },
              {
                category: 4,
                name: 'mediacodec-handle-resolution-change',
                value: '0',
              },
              { category: 2, name: 'skip_loop_filter', value: '48' },
              { category: 4, name: 'packet-buffering', value: '0' },
              { category: 1, name: 'analyzeduration', value: '2000000' },
              { category: 1, name: 'probesize', value: '10485760' },
              { category: 1, name: 'flush_packets', value: '1' },
            ],
          },
          {
            group: '硬解码',
            options: [
              { category: 4, name: 'opensles', value: '0' },
              { category: 4, name: 'overlay-format', value: '842225234' },
              { category: 4, name: 'framedrop', value: '1' },
              { category: 4, name: 'start-on-prepared', value: '1' },
              { category: 1, name: 'http-detect-range-support', value: '0' },
              { category: 1, name: 'fflags', value: 'fastseek' },
              { category: 4, name: 'reconnect', value: '1' },
              { category: 4, name: 'enable-accurate-seek', value: '0' },
              { category: 4, name: 'mediacodec', value: '1' },
              { category: 4, name: 'mediacodec-auto-rotate', value: '1' },
              {
                category: 4,
                name: 'mediacodec-handle-resolution-change',
                value: '1',
              },
              { category: 2, name: 'skip_loop_filter', value: '48' },
              { category: 4, name: 'packet-buffering', value: '0' },
              { category: 1, name: 'analyzeduration', value: '2000000' },
              { category: 1, name: 'probesize', value: '10485760' },
            ],
          },
        ],
        ads: [
          'mimg.0c1q0l.cn',
          'www.googletagmanager.com',
          'mc.usihnbcq.cn',
          'wan.51img1.com',
          'iqiyi.hbuioo.com',
          'vip.ffzyad.com',
          'https://lf1-cdn-tos.bytegoofy.com/obj/tos-cn-i-dy/455ccf9e8ae744378118e4bd289288dd',
        ],
        doh: [
          {
            name: '阿里DNS',
            url: 'https://dns.alidns.com/dns-query',
            ips: ['223.5.5.5', '223.6.6.6'],
          },
          {
            name: '腾讯DNS',
            url: 'https://doh.pub/dns-query',
            ips: ['119.29.29.29', '119.28.28.28'],
          },
        ],
      };
    }

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
      // 标准JSON格式 - 使用紧凑输出，部分 TVBox 对格式比较敏感
      responseContent = JSON.stringify(tvboxConfig);
      // 某些 TVBox 分支对 application/json 处理有兼容性问题，改为 text/plain
      contentType = 'text/plain; charset=utf-8';
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
