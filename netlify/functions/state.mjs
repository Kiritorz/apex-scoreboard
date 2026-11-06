import { createHash } from 'node:crypto';
import { getStore } from '@netlify/blobs';

const STORE_NAME = 'apex-scoreboard';
const STATE_KEY = 'state';

// Netlify site "apex-scoreboard". This ID is not a secret.
const BLOBS_SITE_ID = '229ff481-6464-4553-a075-8454f4b49256';

// Optional manual Blobs fallback when Netlify's automatic injection fails.
// Create a Netlify personal access token and put it here if the function still
// reports MissingBlobsEnvironmentError after deploying the v2 function.
// Keep this repository private when using this fallback.
const BLOBS_ACCESS_TOKEN = '';

// Optional no-environment-variable fallback.
// Put a SHA-256 hash of a long random admin token here, then enter the raw
// token in the scoreboard storage settings. Leave empty when ADMIN_TOKEN exists.
const ADMIN_TOKEN_SHA256 = '2e0e95dbd7f99a10940afb6547e5a2f553b765864a89c7f400c2183a484e9db7';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'no-store'
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
}

function isAuthorized(request) {
  const header = request.headers.get('authorization') || '';
  const provided = header.startsWith('Bearer ') ? header.slice(7) : '';
  const envToken = process.env.ADMIN_TOKEN;
  if (envToken) return provided === envToken;

  const expectedHash = ADMIN_TOKEN_SHA256.trim().toLowerCase();
  if (!expectedHash) return false;
  const actualHash = createHash('sha256').update(provided).digest('hex');
  return actualHash === expectedHash;
}

function store() {
  const siteID = process.env.SITE_ID || BLOBS_SITE_ID;
  const token = BLOBS_ACCESS_TOKEN || process.env.NETLIFY_BLOBS_TOKEN;
  if (token) {
    return getStore({ name: STORE_NAME, siteID, token, consistency: 'strong' });
  }
  return getStore({ name: STORE_NAME, consistency: 'strong' });
}

export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    if (request.method === 'GET') {
      const payload = await store().get(STATE_KEY, { type: 'json' });
      return json({
        ok: true,
        state: payload && payload.state ? payload.state : null,
        updatedAt: payload && payload.updatedAt ? payload.updatedAt : null
      });
    }

    if (request.method === 'PUT') {
      const adminToken = process.env.ADMIN_TOKEN;
      const fallbackHash = ADMIN_TOKEN_SHA256.trim();
      if (!adminToken && !fallbackHash) {
        return json({ error: 'ADMIN_TOKEN is not configured' }, 500);
      }
      if (!isAuthorized(request)) return json({ error: 'Unauthorized' }, 401);

      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: 'Invalid JSON body' }, 400);
      }

      const state = body && body.state ? body.state : body;
      if (!state || typeof state !== 'object' || !Array.isArray(state.teams) || !state.teams.length) {
        return json({ error: 'Invalid scoreboard state' }, 400);
      }

      const payload = {
        state,
        updatedAt: new Date().toISOString()
      };
      await store().setJSON(STATE_KEY, payload);
      return json({ ok: true, updatedAt: payload.updatedAt });
    }

    return json({ error: 'Method not allowed' }, 405);
  } catch (error) {
    console.error('Netlify state function failed', error);
    return json({ error: error.message || 'Storage error' }, 500);
  }
};
