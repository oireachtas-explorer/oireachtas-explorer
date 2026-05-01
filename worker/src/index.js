const DEFAULT_ALLOWED_ORIGINS = [
  'https://oireachtas-explorer.ie',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
];
const MAX_COLLECTION_ITEMS = 100;
const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 400;
const MAX_BODY_BYTES = 250000;
const SHORTLINK_CODE_LENGTH = 10;
const DEFAULT_APP_BASE_URL = 'https://oireachtas-explorer.ie';

function allowedOrigins(env) {
  const raw = env.ALLOWED_ORIGINS || '';
  const configured = raw.split(',').map((origin) => origin.trim()).filter(Boolean);
  return configured.length > 0 ? configured : DEFAULT_ALLOWED_ORIGINS;
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = allowedOrigins(env);
  const allowOrigin = allowed.includes(origin) ? origin : allowed[0];
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function json(data, status, request, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(request, env),
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function validateXmlUrl(rawUrl) {
  if (!rawUrl) return { error: 'Missing url query parameter.' };

  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return { error: 'Invalid url query parameter.' };
  }

  if (url.protocol !== 'https:' || url.hostname !== 'data.oireachtas.ie') {
    return { error: 'Only https://data.oireachtas.ie XML URLs are allowed.' };
  }

  if (!url.pathname.endsWith('.xml')) {
    return { error: 'Only XML transcript documents are allowed.' };
  }

  return { url };
}

function collectionStore(env) {
  return env.RESEARCH_COLLECTIONS || null;
}

function appBaseUrl(env) {
  return (env.APP_BASE_URL || DEFAULT_APP_BASE_URL).replace(/\/+$/, '');
}

function slugifySegment(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

function generateCollectionSlug(title) {
  const prefix = slugifySegment(title) || 'collection';
  const entropy = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return `${prefix}-${entropy}`;
}

async function readJsonBody(request) {
  const contentLength = Number(request.headers.get('Content-Length') || '0');
  if (contentLength > MAX_BODY_BYTES) {
    throw new Error('Collection payload is too large.');
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    throw new Error('Collection payload is too large.');
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON body.');
  }
}

async function sha256Hex(input) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function sanitizeCollectionItem(item) {
  if (!item || typeof item !== 'object') return null;

  const sanitized = {
    id: isNonEmptyString(item.id) ? item.id.trim().slice(0, 200) : null,
    type: isNonEmptyString(item.type) ? item.type.trim().slice(0, 32) : null,
    title: isNonEmptyString(item.title) ? item.title.trim().slice(0, 220) : null,
    subtitle: typeof item.subtitle === 'string' ? item.subtitle.trim().slice(0, 280) : undefined,
    citation: typeof item.citation === 'string' ? item.citation.trim().slice(0, 400) : undefined,
    quote: typeof item.quote === 'string' ? item.quote.trim().slice(0, 6000) : undefined,
    sourceDate: typeof item.sourceDate === 'string' ? item.sourceDate.trim().slice(0, 40) : undefined,
    urlHash: isNonEmptyString(item.urlHash) ? item.urlHash.trim().slice(0, 800) : null,
    chamber: item.chamber === 'seanad' ? 'seanad' : 'dail',
    houseNo: Number.isFinite(item.houseNo) ? Number(item.houseNo) : null,
    savedAt: typeof item.savedAt === 'string' ? item.savedAt.trim().slice(0, 40) : new Date().toISOString(),
  };

  if (!sanitized.id || !sanitized.type || !sanitized.title || !sanitized.urlHash || !sanitized.houseNo) {
    return null;
  }

  return sanitized;
}

function sanitizeCollectionPayload(body) {
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  const description = typeof body?.description === 'string' ? body.description.trim() : '';
  const items = Array.isArray(body?.items) ? body.items : [];

  if (!title) {
    return { error: 'Collection title is required.' };
  }

  if (title.length > MAX_TITLE_LENGTH) {
    return { error: `Collection title must be ${MAX_TITLE_LENGTH} characters or fewer.` };
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return { error: `Collection description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.` };
  }

  if (items.length === 0) {
    return { error: 'Add at least one saved item before publishing.' };
  }

  if (items.length > MAX_COLLECTION_ITEMS) {
    return { error: `Collections are limited to ${MAX_COLLECTION_ITEMS} items.` };
  }

  const sanitizedItems = items.map(sanitizeCollectionItem).filter(Boolean);
  if (sanitizedItems.length !== items.length) {
    return { error: 'One or more saved items could not be published.' };
  }

  return {
    value: {
      title,
      description,
      items: sanitizedItems,
    },
  };
}

function allowedShortlinkOrigins(env) {
  return [...new Set([...allowedOrigins(env), appBaseUrl(env)])];
}

function sanitizeTargetUrl(rawTargetUrl, env) {
  if (!isNonEmptyString(rawTargetUrl)) {
    return { error: 'targetUrl is required.' };
  }

  let targetUrl;
  try {
    targetUrl = new URL(rawTargetUrl.trim());
  } catch {
    return { error: 'Invalid targetUrl.' };
  }

  const allowed = allowedShortlinkOrigins(env);
  const normalizedOrigin = targetUrl.origin.replace(/\/+$/, '');
  if (!allowed.includes(normalizedOrigin)) {
    return { error: 'Short links can only point to configured Oireachtas Explorer origins.' };
  }

  return { value: targetUrl.toString() };
}

async function allocateShortCode(store, targetUrl) {
  const digest = await sha256Hex(targetUrl);
  const variants = [
    digest.slice(0, SHORTLINK_CODE_LENGTH),
    `${digest.slice(0, SHORTLINK_CODE_LENGTH - 2)}${digest.slice(-2)}`,
    `${digest.slice(2, SHORTLINK_CODE_LENGTH + 2)}`,
  ];

  for (const code of variants) {
    const existing = await store.get(`shortlink:${code}`, 'json');
    if (!existing || existing.targetUrl === targetUrl) {
      return code;
    }
  }

  throw new Error('Unable to allocate a unique short link code.');
}

function shortLinkUrl(request, code) {
  const requestUrl = new URL(request.url);
  return `${requestUrl.origin}/s/${code}`;
}

async function handleCreateShortLink(request, env) {
  const store = collectionStore(env);
  if (!store) {
    return json({ error: 'Workers KV is not configured for short links yet.' }, 503, request, env);
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Invalid request body.' }, 400, request, env);
  }

  const target = sanitizeTargetUrl(body?.targetUrl, env);
  if (target.error) {
    return json({ error: target.error }, 400, request, env);
  }

  let code;
  try {
    code = await allocateShortCode(store, target.value);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unable to create short link.' }, 503, request, env);
  }

  const payload = {
    targetUrl: target.value,
    createdAt: new Date().toISOString(),
  };

  await store.put(`shortlink:${code}`, JSON.stringify(payload), {
    metadata: { targetUrl: target.value, createdAt: payload.createdAt },
  });

  return json({
    code,
    shortUrl: shortLinkUrl(request, code),
    targetUrl: target.value,
  }, 201, request, env);
}

async function handleShortLinkRedirect(request, env, code) {
  const store = collectionStore(env);
  if (!store) {
    return json({ error: 'Workers KV is not configured for short links yet.' }, 503, request, env);
  }

  if (!/^[a-f0-9-]{6,20}$/.test(code)) {
    return json({ error: 'Invalid short link code.' }, 400, request, env);
  }

  const entry = await store.get(`shortlink:${code}`, 'json');
  if (!entry || !isNonEmptyString(entry.targetUrl)) {
    return json({ error: 'Short link not found.' }, 404, request, env);
  }

  return Response.redirect(entry.targetUrl, 302);
}

async function handleCreateCollection(request, env) {
  const store = collectionStore(env);
  if (!store) {
    return json({ error: 'Workers KV is not configured for public collections yet.' }, 503, request, env);
  }

  let body;
  try {
    body = await readJsonBody(request);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Invalid request body.' }, 400, request, env);
  }

  const sanitized = sanitizeCollectionPayload(body);
  if (sanitized.error) {
    return json({ error: sanitized.error }, 400, request, env);
  }

  const createdAt = new Date().toISOString();
  let slug = '';
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const candidate = generateCollectionSlug(sanitized.value.title);
    const existing = await store.get(`collection:${candidate}`);
    if (!existing) {
      slug = candidate;
      break;
    }
  }

  if (!slug) {
    return json({ error: 'Unable to allocate a unique collection id. Please try again.' }, 503, request, env);
  }

  const collection = {
    slug,
    title: sanitized.value.title,
    description: sanitized.value.description || undefined,
    createdAt,
    itemCount: sanitized.value.items.length,
    items: sanitized.value.items,
  };

  await store.put(`collection:${slug}`, JSON.stringify(collection), {
    metadata: {
      createdAt,
      itemCount: collection.itemCount,
      title: collection.title,
    },
  });

  return json(collection, 201, request, env);
}

async function handleGetCollection(request, env, slug) {
  const store = collectionStore(env);
  if (!store) {
    return json({ error: 'Workers KV is not configured for public collections yet.' }, 503, request, env);
  }

  if (!/^[a-z0-9-]{1,64}$/.test(slug)) {
    return json({ error: 'Invalid collection id.' }, 400, request, env);
  }

  const raw = await store.get(`collection:${slug}`);
  if (!raw) {
    return json({ error: 'Collection not found.' }, 404, request, env);
  }

  return new Response(raw, {
    status: 200,
    headers: {
      ...corsHeaders(request, env),
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}

async function handleXml(request, env) {
  const requestUrl = new URL(request.url);
  const validation = validateXmlUrl(requestUrl.searchParams.get('url'));
  if (validation.error) return json({ error: validation.error }, 400, request, env);

  const sourceUrl = validation.url.toString();
  const cache = caches.default;
  const cacheKey = new Request(`https://oireachtas-explorer-transcripts.local/xml/${encodeURIComponent(sourceUrl)}`);
  const cached = await cache.match(cacheKey);
  if (cached) {
    return new Response(cached.body, {
      status: cached.status,
      headers: {
        ...corsHeaders(request, env),
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': cached.headers.get('Cache-Control') || 'public, max-age=86400',
        'X-Transcript-Cache': 'HIT',
      },
    });
  }

  const upstream = await fetch(sourceUrl, {
    cf: {
      cacheEverything: true,
      cacheTtl: Number(env.CACHE_TTL_SECONDS || 86400),
    },
    headers: {
      'Accept': 'application/xml,text/xml,*/*',
      'User-Agent': 'oireachtas-explorer-transcripts/1.0',
    },
  });

  if (!upstream.ok) {
    return json({ error: `Oireachtas XML unavailable (${upstream.status}).` }, upstream.status, request, env);
  }

  const body = await upstream.text();
  const cacheControl = `public, max-age=${env.CACHE_TTL_SECONDS || '86400'}`;
  const cacheResponse = new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': cacheControl,
    },
  });

  await cache.put(cacheKey, cacheResponse.clone());

  return new Response(body, {
    status: 200,
    headers: {
      ...corsHeaders(request, env),
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': cacheControl,
      'X-Transcript-Cache': 'MISS',
    },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }

    if (request.method !== 'GET' && request.method !== 'POST') {
      return json({ error: 'Method not allowed.' }, 405, request, env);
    }

    const url = new URL(request.url);
    if (url.pathname === '/health') {
      return json({ ok: true }, 200, request, env);
    }

    if (url.pathname === '/xml') {
      if (request.method !== 'GET') {
        return json({ error: 'Method not allowed.' }, 405, request, env);
      }
      return handleXml(request, env);
    }

    if (url.pathname === '/collections') {
      if (request.method !== 'POST') {
        return json({ error: 'Method not allowed.' }, 405, request, env);
      }
      return handleCreateCollection(request, env);
    }

    if (url.pathname === '/shortlinks') {
      if (request.method !== 'POST') {
        return json({ error: 'Method not allowed.' }, 405, request, env);
      }
      return handleCreateShortLink(request, env);
    }

    const collectionMatch = url.pathname.match(/^\/collections\/([a-z0-9-]+)$/);
    if (collectionMatch) {
      if (request.method !== 'GET') {
        return json({ error: 'Method not allowed.' }, 405, request, env);
      }
      return handleGetCollection(request, env, collectionMatch[1]);
    }

    const shortlinkMatch = url.pathname.match(/^\/s\/([a-f0-9-]+)$/);
    if (shortlinkMatch) {
      if (request.method !== 'GET') {
        return json({ error: 'Method not allowed.' }, 405, request, env);
      }
      return handleShortLinkRedirect(request, env, shortlinkMatch[1]);
    }

    return json({ error: 'Not found.' }, 404, request, env);
  },
};
