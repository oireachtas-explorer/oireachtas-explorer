const WORKER_API_BASE = (import.meta.env.VITE_TRANSCRIPT_API_BASE as string | undefined)?.replace(/\/+$/, '') ?? '';

export interface ShortLinkResponse {
  code: string;
  shortUrl: string;
  targetUrl: string;
}

export class ShortLinkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ShortLinkError';
  }
}

const shortLinkCache = new Map<string, Promise<ShortLinkResponse>>();

function ensureWorkerBase(): string {
  if (!WORKER_API_BASE) {
    throw new ShortLinkError('Short links need a configured Cloudflare Worker URL.');
  }
  return WORKER_API_BASE;
}

async function readError(response: Response): Promise<string> {
  try {
    const data: unknown = await response.json();
    if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
      return data.error;
    }
  } catch {
    // ignore
  }
  return `Request failed (${response.status}).`;
}

export function isShortLinksEnabled(): boolean {
  return Boolean(WORKER_API_BASE);
}

export async function createShortLink(targetUrl: string): Promise<ShortLinkResponse> {
  const normalizedTarget = targetUrl.trim();
  if (!normalizedTarget) {
    throw new ShortLinkError('Missing target URL for short link creation.');
  }

  const cached = shortLinkCache.get(normalizedTarget);
  if (cached) return cached;

  const request = (async () => {
    const base = ensureWorkerBase();
    const response = await fetch(`${base}/shortlinks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUrl: normalizedTarget }),
    });

    if (!response.ok) {
      throw new ShortLinkError(await readError(response));
    }

    return await response.json() as ShortLinkResponse;
  })();

  shortLinkCache.set(normalizedTarget, request);
  void request.catch(() => {
    shortLinkCache.delete(normalizedTarget);
  });
  return request;
}
