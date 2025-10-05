/* eslint-disable no-console, @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // 强制动态渲染，需要运行时请求头信息

function getBaseUrl(req: NextRequest): string {
  const envBase = (process.env.NEXT_PUBLIC_SITE_BASE || '')
    .trim()
    .replace(/\/$/, '');
  if (envBase) return envBase;
  const proto = (req.headers.get('x-forwarded-proto') || 'https')
    .split(',')[0]
    .trim();
  const host = (
    req.headers.get('x-forwarded-host') ||
    req.headers.get('host') ||
    ''
  )
    .split(',')[0]
    .trim();
  if (!host) return '';
  return `${proto}://${host}`;
}

function isPrivateHost(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    const h = u.hostname;
    return (
      h === 'localhost' ||
      h === '0.0.0.0' ||
      h === '127.0.0.1' ||
      h.startsWith('10.') ||
      h.startsWith('172.16.') ||
      h.startsWith('172.17.') ||
      h.startsWith('172.18.') ||
      h.startsWith('172.19.') ||
      h.startsWith('172.2') || // 172.20-172.31 简化判断
      h.startsWith('192.168.')
    );
  } catch {
    return false;
  }
}

async function tryFetchHead(
  url: string,
  timeoutMs = 3500
): Promise<{ ok: boolean; status?: number; error?: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort('timeout'), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Range: 'bytes=0-0' },
      redirect: 'follow',
      signal: ctrl.signal as any,
      cache: 'no-store',
    } as any);
    clearTimeout(timer);
    return { ok: res.ok, status: res.status };
  } catch (e: any) {
    clearTimeout(timer);
    return { ok: false, error: e?.message || 'fetch error' };
  }
}

export async function GET(req: NextRequest) {
  try {
    const baseUrl = getBaseUrl(req);
    if (!baseUrl) {
      return NextResponse.json(
        { ok: false, error: 'cannot determine base url' },
        { status: 500 }
      );
    }

    const configUrl = `${baseUrl}/api/tvbox/config?format=json&mode=safe`;
    const cfgRes = await fetch(configUrl, { cache: 'no-store' });
    const contentType = cfgRes.headers.get('content-type') || '';
    const text = await cfgRes.text();
    let parsed: any = null;
    let parseError: string | undefined;
    try {
      parsed = JSON.parse(text);
    } catch (e: any) {
      parseError = e?.message || 'json parse error';
    }

    const result: any = {
      ok: cfgRes.ok,
      status: cfgRes.status,
      contentType,
      size: text.length,
      baseUrl,
      configUrl,
      hasJson: !!parsed,
      issues: [] as string[],
    };

    if (!cfgRes.ok) {
      result.issues.push(`config request failed: ${cfgRes.status}`);
    }
    if (!contentType.includes('text/plain')) {
      result.issues.push('content-type is not text/plain');
    }
    if (!parsed) {
      result.issues.push(`json parse failed: ${parseError}`);
    }

    if (parsed) {
      const sites = Array.isArray(parsed.sites) ? parsed.sites : [];
      const lives = Array.isArray(parsed.lives) ? parsed.lives : [];
      const spider = parsed.spider || '';
      result.sitesCount = sites.length;
      result.livesCount = lives.length;
      result.parsesCount = Array.isArray(parsed.parses)
        ? parsed.parses.length
        : 0;

      // 检查私网地址
      const privateApis = sites.filter(
        (s: any) => typeof s?.api === 'string' && isPrivateHost(s.api)
      ).length;
      result.privateApis = privateApis;
      if (privateApis > 0) {
        result.issues.push(`found ${privateApis} private api urls`);
      }
      if (typeof spider === 'string' && spider) {
        result.spider = spider;
        result.spiderPrivate = isPrivateHost(spider);
        if (result.spiderPrivate) {
          result.issues.push('spider url is private/not public');
        } else if (
          spider.startsWith('http://') ||
          spider.startsWith('https://')
        ) {
          const spiderCheck = await tryFetchHead(spider, 3500);
          result.spiderReachable = spiderCheck.ok;
          result.spiderStatus = spiderCheck.status;
          if (!spiderCheck.ok) {
            result.issues.push(
              `spider unreachable: ${spiderCheck.status || spiderCheck.error}`
            );
          }
        }
      }
    }

    // 最终状态
    result.pass =
      result.ok &&
      result.hasJson &&
      (!result.issues || result.issues.length === 0);
    return NextResponse.json(result, {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (e: any) {
    console.error('Diagnose failed', e);
    return NextResponse.json(
      { ok: false, error: e?.message || 'unknown error' },
      { status: 500 }
    );
  }
}
