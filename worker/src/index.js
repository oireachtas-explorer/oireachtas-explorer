const DEFAULT_ALLOWED_ORIGINS = [
  'https://oireachtas-explorer.ie',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
];

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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

    if (request.method !== 'GET') {
      return json({ error: 'Method not allowed.' }, 405, request, env);
    }

    const url = new URL(request.url);
    if (url.pathname === '/health') {
      return json({ ok: true }, 200, request, env);
    }

    if (url.pathname === '/xml') {
      return handleXml(request, env);
    }

    return json({ error: 'Not found.' }, 404, request, env);
  },
};
