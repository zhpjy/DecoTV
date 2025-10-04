import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

// Spider JAR 本地代理端点 - 解决外部jar 404问题
export async function GET(_req: NextRequest) {
  try {
    // 多个备用spider jar源
    const spiderJarUrls = [
      'https://raw.githubusercontent.com/FongMi/CatVodSpider/main/jar/custom_spider.jar',
      'https://ghproxy.com/https://raw.githubusercontent.com/FongMi/CatVodSpider/main/jar/custom_spider.jar',
      'https://cdn.jsdelivr.net/gh/FongMi/CatVodSpider@main/jar/custom_spider.jar',
      'https://gitcode.net/qq_26898231/TVBox/-/raw/main/JAR/XC.jar',
    ];

    let lastError = null;

    // 依次尝试每个jar源
    for (const jarUrl of spiderJarUrls) {
      try {
        const response = await fetch(jarUrl, {
          signal: AbortSignal.timeout(10000), // 10秒超时
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });

        if (response.ok) {
          // 直接转发jar文件内容
          const jarBuffer = await response.arrayBuffer();

          return new NextResponse(jarBuffer, {
            headers: {
              'Content-Type': 'application/java-archive',
              'Content-Length': jarBuffer.byteLength.toString(),
              'Cache-Control': 'public, max-age=3600', // 1小时缓存
              'Access-Control-Allow-Origin': '*',
            },
          });
        }
      } catch (error) {
        lastError = error;
        continue;
      }
    }

    // 所有源都失败，返回错误
    return NextResponse.json(
      {
        error: 'Spider JAR not available',
        message: '所有spider jar源均不可用，请稍后再试',
        lastError:
          lastError instanceof Error ? lastError.message : 'Unknown error',
      },
      { status: 502 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Proxy error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
