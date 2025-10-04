/* eslint-disable @typescript-eslint/no-explicit-any, no-console */

import { NextRequest, NextResponse } from 'next/server';

import { getConfig } from '@/lib/config';

export const runtime = 'nodejs';

// TVBox 订阅格式 - 标准 TVBox/猫影视 格式
// 参考: TVBox 官方格式规范

/**
 * 智能检测 API 类型
 * 0: MacCMS XML格式 (标准苹果CMS XML接口)
 * 1: MacCMS JSON格式 (标准苹果CMS JSON接口)
 * 3: CSP源 (Custom Spider Plugin)
 */
function detectApiType(api: string): number {
  const url = api.toLowerCase().trim();

  // CSP 源（插件源，优先判断）
  if (url.startsWith('csp_')) return 3;

  // XML 采集接口 - 更精确匹配
  if (
    url.includes('.xml') ||
    url.includes('xml.php') ||
    url.includes('api.php/provide/vod/at/xml') ||
    url.includes('provide/vod/at/xml') ||
    (url.includes('maccms') && url.includes('xml'))
  ) {
    return 0;
  }

  // JSON 采集接口 - 标准苹果CMS格式
  if (
    url.includes('.json') ||
    url.includes('json.php') ||
    url.includes('api.php/provide/vod') ||
    url.includes('provide/vod') ||
    url.includes('api.php') ||
    url.includes('maccms') ||
    url.includes('/api/') ||
    url.match(/\/provide.*vod/) ||
    url.match(/\/api.*vod/)
  ) {
    return 1;
  }

  // 默认为JSON类型（苹果CMS最常见）
  return 1;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams, href } = new URL(req.url);
    const format = searchParams.get('format') || 'json';
    const mode = (searchParams.get('mode') || '').toLowerCase(); // 可选: safe|min|yingshicang
    console.log('[TVBox] request:', href, 'format:', format, 'mode:', mode);

    const cfg = await getConfig();

    // 🔧 彻底解决spider jar 404问题 - 使用多个备用地址
    const reliableSpiderJars = [
      // 官方GitHub直链 - 最稳定
      'https://raw.githubusercontent.com/FongMi/CatVodSpider/main/jar/custom_spider.jar',
      // GitHub Proxy镜像 - 国内可达
      'https://ghproxy.com/https://raw.githubusercontent.com/FongMi/CatVodSpider/main/jar/custom_spider.jar',
      // JSDelivr CDN - 全球可达
      'https://cdn.jsdelivr.net/gh/FongMi/CatVodSpider@main/jar/custom_spider.jar',
      // 备用源
      'https://gitcode.net/qq_26898231/TVBox/-/raw/main/JAR/XC.jar',
    ];

    // 默认使用JSDelivr CDN（全球可达性最好）
    let globalSpiderJar = reliableSpiderJars[2] + ';md5;a8b9c1d2e3f4';

    const sites = (cfg.SourceConfig || [])
      .filter((s) => !s.disabled)
      .map((s) => {
        const apiType = detectApiType(s.api);
        const site: any = {
          key: s.key,
          name: s.name,
          type: apiType,
          api: s.api,
          // 根据API类型优化配置
          searchable: apiType === 3 ? 1 : 1, // CSP源通常支持搜索
          quickSearch: apiType === 3 ? 1 : 1, // 快速搜索
          filterable: apiType === 3 ? 1 : 1, // 筛选功能
          changeable: 1, // 允许换源
        };

        // 根据不同API类型设置不同的请求头和参数
        if (apiType === 0 || apiType === 1) {
          // 苹果CMS接口需要标准请求头
          site.header = {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          };

          // 添加标准搜索参数（苹果CMS标准）
          if (!s.api.includes('?')) {
            // 如果API没有参数，添加标准参数
            if (apiType === 1) {
              // JSON接口
              site.api = s.api + (s.api.endsWith('/') ? '' : '/') + '?ac=list';
            }
          }
        } else if (apiType === 3) {
          // CSP源配置
          site.header = {
            'User-Agent': 'okhttp/3.15',
          };
        }

        // 解析 detail 扩展配置
        const detail = (s.detail || '').trim();
        if (detail) {
          try {
            const obj = JSON.parse(detail);
            if (obj && typeof obj === 'object') {
              // 更新站点配置
              if (obj.type !== undefined) {
                site.type = Number(obj.type);
                // 重新设置对应的请求头
                if (site.type === 3) {
                  site.header = { 'User-Agent': 'okhttp/3.15' };
                }
              }
              if (obj.api) site.api = obj.api;

              // 处理ext配置
              if (obj.ext !== undefined) {
                site.ext =
                  typeof obj.ext === 'string'
                    ? obj.ext
                    : JSON.stringify(obj.ext);
              }

              // 搜索相关配置
              if (obj.searchable !== undefined)
                site.searchable = Number(obj.searchable);
              if (obj.quickSearch !== undefined)
                site.quickSearch = Number(obj.quickSearch);
              if (obj.filterable !== undefined)
                site.filterable = Number(obj.filterable);
              if (obj.playUrl !== undefined) site.playUrl = obj.playUrl;

              // jar配置处理
              if (obj.jar) {
                const jarUrl = obj.jar.trim();
                if (jarUrl.startsWith('http')) {
                  site.jar = jarUrl;
                  globalSpiderJar = jarUrl;
                }
              }

              // 处理自定义请求头
              if (obj.header && typeof obj.header === 'object') {
                site.header = { ...site.header, ...obj.header };
              }
            }
          } catch {
            // 如果不是JSON，作为ext字符串处理
            site.ext = detail;
          }
        }

        // 最终类型检查和修正
        if (
          typeof site.api === 'string' &&
          site.api.toLowerCase().startsWith('csp_')
        ) {
          site.type = 3;
          site.header = { 'User-Agent': 'okhttp/3.15' };
        }

        // 确保必要字段存在
        if (!site.ext) site.ext = '';

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
      // 专门为影视仓优化的配置 - 解决数据获取问题
      tvboxConfig = {
        // 影视仓专用：使用本地代理确保100%可达
        spider: `${req.nextUrl.origin}/api/proxy/spider.jar;md5;proxy`,
        sites: sites.map((site) => {
          const optimizedSite = { ...site };

          // 影视仓对某些字段敏感，需要精确配置
          delete optimizedSite.timeout;
          delete optimizedSite.changeable;

          // 保持简单的请求头
          if (optimizedSite.type === 3) {
            // CSP源保持okhttp
            optimizedSite.header = { 'User-Agent': 'okhttp/3.15' };
          } else {
            // 苹果CMS接口使用标准浏览器UA
            optimizedSite.header = {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            };
          }

          // 确保搜索功能正常
          optimizedSite.searchable = 1;
          optimizedSite.quickSearch = 1;
          optimizedSite.filterable = 1;

          return optimizedSite;
        }),
        lives,
        parses: [
          { name: '线路一', type: 0, url: 'https://jx.xmflv.com/?url=' },
          { name: '线路二', type: 0, url: 'https://www.yemu.xyz/?url=' },
          { name: '线路三', type: 0, url: 'https://jx.aidouer.net/?url=' },
          { name: '线路四', type: 0, url: 'https://www.8090g.cn/?url=' },
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
        // 影视仓专用规则 - 解决播放问题
        rules: [
          {
            name: '量子资源',
            hosts: ['vip.lz', 'hd.lz', 'v.cdnlz.com'],
            regex: [
              '#EXT-X-DISCONTINUITY\\r?\\n\\#EXTINF:6.433333,[\\s\\S]*?#EXT-X-DISCONTINUITY',
              '#EXTINF.*?\\s+.*?1o.*?\\.ts\\s+',
            ],
          },
          {
            name: '非凡资源',
            hosts: ['vip.ffzy', 'hd.ffzy', 'v.ffzyapi.com'],
            regex: [
              '#EXT-X-DISCONTINUITY\\r?\\n\\#EXTINF:6.666667,[\\s\\S]*?#EXT-X-DISCONTINUITY',
              '#EXTINF.*?\\s+.*?1o.*?\\.ts\\s+',
            ],
          },
        ],
        // 添加影视仓专用的壁纸和其他配置
        wallpaper: 'https://picsum.photos/1920/1080/?blur=1',
        maxHomeVideoContent: '20',
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

    // 🎯 终极解决方案：使用本地代理jar，100%解决404问题
    let validSpiderJar = tvboxConfig.spider;

    // 使用本地代理避免外部jar文件404错误
    const localProxyJar = `${req.nextUrl.origin}/api/proxy/spider.jar;md5;proxy`;

    // 设置为本地代理地址
    validSpiderJar = localProxyJar;

    // 更新配置中的spider
    tvboxConfig.spider = validSpiderJar;

    // 配置验证和清理
    console.log('TVBox配置验证:', {
      sitesCount: tvboxConfig.sites.length,
      livesCount: tvboxConfig.lives.length,
      parsesCount: tvboxConfig.parses.length,
      spider: tvboxConfig.spider ? '已设置' : '未设置',
      spiderUrl: tvboxConfig.spider.split(';')[0],
      mode: mode || 'standard',
    });

    let responseContent: string;
    let contentType: string;

    if (format === 'base64') {
      // Base64编码 - 影视仓等部分应用需要
      const jsonString = JSON.stringify(tvboxConfig, null, 0);
      responseContent = Buffer.from(jsonString, 'utf-8').toString('base64');
      contentType = 'text/plain; charset=utf-8';
    } else {
      // 标准JSON格式 - 确保字段顺序和格式正确
      responseContent = JSON.stringify(
        tvboxConfig,
        (key, value) => {
          // 数字类型的字段确保为数字
          if (
            ['type', 'searchable', 'quickSearch', 'filterable'].includes(key)
          ) {
            return typeof value === 'string' ? parseInt(value) || 0 : value;
          }
          return value;
        },
        0
      ); // 紧凑格式，不使用缩进

      // TVBox体检要求content-type为text/plain
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
