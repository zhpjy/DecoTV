/*
 * Robust spider.jar provider
 * - Sequentially tries remote candidates
 * - Caches successful jar (memory) for TTL
 * - Provides minimal fallback jar when all fail (still 200 to avoid TVBox unreachable)
 */
import crypto from 'crypto';

// Remote jar candidates (order by stability). Update list as needed.
const CANDIDATES: string[] = [
  'https://raw.githubusercontent.com/FongMi/CatVodSpider/main/jar/custom_spider.jar',
  'https://cdn.jsdelivr.net/gh/FongMi/CatVodSpider@main/jar/custom_spider.jar',
  // Extra mirrors / alternative community jars (add more if needed)
  'https://ghproxy.com/https://raw.githubusercontent.com/FongMi/CatVodSpider/main/jar/custom_spider.jar',
  'https://gitcode.net/qq_26898231/TVBox/-/raw/main/JAR/XC.jar',
];

// Minimal valid JAR (ZIP) with MANIFEST.MF (base64)
// Generated from: jar cfe empty.jar (with basic manifest) minimized.
const FALLBACK_JAR_BASE64 =
  'UEsDBBQAAAAIAI2JZFMAAAAAAAAAAAAAAAAJAAAATUVUQS1JTkYvUEsDBBQAAAAIAI2JZFN2y5eRAAAAACAAAAAQAAAAJAAAATUVUQS1JTkYvTUFOSUZFU1QuTUZTTVRrAAEKwMDAwMDAxNC1KLMvPz1PwFJycDIw0rUyNDQyMDIw1DlQAUEsHCO8JVu8/AAAAOAAAAFBLAQIUABQAAAAIAI2JZFMA7wlW7z8AAABOAAAAJAAAAAAAAAAAAAAAAAAAAAAATUVUQS1JTkYvUEsBAhQAFAAAAAgAjYlkU3bLl5EAAAAAIAAAABAAAAAAAAAAAAAAAAADgAAABNRVRBLUlORi9NQU5JRkVTVC5NRlBLBQYAAAAAAgACAHAAAABNAAAAAAA=';

interface SpiderJarInfo {
  buffer: Buffer;
  md5: string;
  source: string; // url or 'fallback'
  success: boolean; // true if fetched real remote jar
  cached: boolean;
  timestamp: number;
  size: number;
  tried: number; // number of candidates tried until success/fallback
}

let cache: SpiderJarInfo | null = null;
const TTL = 6 * 60 * 60 * 1000; // 6h

async function fetchRemote(
  url: string,
  timeoutMs = 8000
): Promise<Buffer | null> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const resp = await fetch(url, { method: 'GET', signal: controller.signal });
    clearTimeout(id);
    if (!resp.ok || resp.status >= 400) return null;
    const ab = await resp.arrayBuffer();
    if (ab.byteLength < 500) return null; // too small to be a real jar
    return Buffer.from(ab);
  } catch {
    return null;
  }
}

function md5(buf: Buffer): string {
  return crypto.createHash('md5').update(buf).digest('hex');
}

export async function getSpiderJar(
  forceRefresh = false
): Promise<SpiderJarInfo> {
  const now = Date.now();
  if (!forceRefresh && cache && now - cache.timestamp < TTL) {
    return { ...cache, cached: true };
  }
  let tried = 0;
  for (const url of CANDIDATES) {
    tried += 1;
    const buf = await fetchRemote(url);
    if (buf) {
      const info: SpiderJarInfo = {
        buffer: buf,
        md5: md5(buf),
        source: url,
        success: true,
        cached: false,
        timestamp: now,
        size: buf.length,
        tried,
      };
      cache = info;
      return info;
    }
  }
  // fallback
  const fb = Buffer.from(FALLBACK_JAR_BASE64, 'base64');
  const info: SpiderJarInfo = {
    buffer: fb,
    md5: md5(fb),
    source: 'fallback',
    success: false,
    cached: false,
    timestamp: now,
    size: fb.length,
    tried,
  };
  cache = info; // still cache fallback to avoid hammering
  return info;
}

export function getSpiderStatus() {
  return cache ? { ...cache, buffer: undefined } : null;
}
