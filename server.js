'use strict';

const http = require('node:http');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { URL } = require('node:url');

// Optional .env support for self-hosted deployments.
const ENV_FILE = path.join(__dirname, '.env');
if (fsSync.existsSync(ENV_FILE)) {
  for (const line of fsSync.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!match || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
  }
}

const PORT = Number(process.env.PORT || 4318);
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = __dirname;
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(ROOT, 'data');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const ADMIN_TOKEN = String(process.env.ADMIN_TOKEN || '').trim();
const MAX_BODY_BYTES = 8 * 1024 * 1024;

const API_PATHS = new Set(['/api/state', '/.netlify/functions/state']);
const BLOCKED_STATIC_ROOTS = new Set([
  '.git',
  '.netlify',
  'data',
  'netlify',
  'node_modules',
  'server.js',
  'server-control.ps1',
  'start.cmd',
  'stop.cmd',
  'open.cmd',
  'edgeone-deploy',
  'package.json',
  'package-lock.json',
  'netlify.toml',
  '.env',
  '.env.example'
]);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'no-store'
};

let writeQueue = Promise.resolve();

function lanUrls() {
  const urls = [];
  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (
        entry
        && entry.family === 'IPv4'
        && !entry.internal
        && /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(entry.address)
      ) {
        urls.push(`http://${entry.address}:${PORT}`);
      }
    }
  }
  return [...new Set(urls)];
}

function sendJson(res, status, body, extraHeaders = {}) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    ...CORS_HEADERS,
    ...extraHeaders,
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data)
  });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('请求体过大'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function isAuthorized(req) {
  if (!ADMIN_TOKEN) return false;
  const header = req.headers.authorization || '';
  const provided = header.startsWith('Bearer ') ? header.slice(7) : '';
  const left = Buffer.from(provided);
  const right = Buffer.from(ADMIN_TOKEN);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

async function readState() {
  try {
    const raw = await fs.readFile(STATE_FILE, 'utf8');
    const payload = JSON.parse(raw);
    return payload && payload.state ? payload : null;
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

function writeState(state) {
  const payload = { state, updatedAt: new Date().toISOString() };
  writeQueue = writeQueue.catch(() => {}).then(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tempFile = `${STATE_FILE}.${process.pid}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(payload), 'utf8');
    await fs.rename(tempFile, STATE_FILE);
  });
  return writeQueue.then(() => payload);
}

async function handleApi(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS_HEADERS);
    res.end();
    return;
  }

  if (req.method === 'GET') {
    try {
      const payload = await readState();
      sendJson(res, 200, {
        ok: true,
        state: payload ? payload.state : null,
        updatedAt: payload ? payload.updatedAt : null
      });
    } catch (error) {
      console.error('读取服务器数据失败', error);
      sendJson(res, 500, { error: '读取服务器数据失败' });
    }
    return;
  }

  if (req.method === 'PUT') {
    if (!ADMIN_TOKEN) {
      sendJson(res, 500, { error: 'ADMIN_TOKEN is not configured' });
      return;
    }
    if (!isAuthorized(req)) {
      sendJson(res, 401, { error: 'Unauthorized' });
      return;
    }

    let body;
    try {
      body = JSON.parse(await readBody(req) || '{}');
    } catch {
      sendJson(res, 400, { error: 'Invalid JSON body' });
      return;
    }

    const state = body && body.state ? body.state : body;
    if (!state || typeof state !== 'object' || !Array.isArray(state.teams) || !state.teams.length) {
      sendJson(res, 400, { error: 'Invalid scoreboard state' });
      return;
    }

    try {
      const payload = await writeState(state);
      sendJson(res, 200, { ok: true, updatedAt: payload.updatedAt });
    } catch (error) {
      console.error('写入服务器数据失败', error);
      sendJson(res, 500, { error: '写入服务器数据失败' });
    }
    return;
  }

  sendJson(res, 405, { error: 'Method not allowed' }, { Allow: 'GET, PUT, OPTIONS' });
}

const server = http.createServer(async (req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Bad Request');
    return;
  }

  if (API_PATHS.has(pathname)) {
    await handleApi(req, res);
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method Not Allowed');
    return;
  }

  if (pathname === '/' || pathname === '') pathname = '/index.html';
  const firstSegment = pathname.replace(/^\/+/, '').split('/')[0];
  if (BLOCKED_STATIC_ROOTS.has(firstSegment)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
    return;
  }

  const filePath = path.resolve(ROOT, '.' + pathname);

  if (!filePath.startsWith(ROOT + path.sep) && filePath !== path.join(ROOT, 'index.html')) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) throw new Error('not a file');
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const isAsset = pathname.startsWith('/assets/');
    const cacheControl = ext === '.html'
      ? 'no-store, max-age=0'
      : (isAsset ? 'public, max-age=2592000, immutable' : 'public, max-age=300');
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': data.length,
      'Cache-Control': cacheControl,
      'X-Content-Type-Options': 'nosniff'
    });
    if (req.method === 'HEAD') res.end();
    else res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<!doctype html><meta charset="utf-8"><title>404</title><body style="background:#080a0e;color:#eef2f8;font-family:sans-serif;padding:40px"><h1>404</h1><p>页面不存在。请从首页进入记分板。</p><p><a style="color:#ff4f2e" href="/">返回记分板</a></p></body>');
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n  端口 ${PORT} 已被占用。请关闭占用该端口的程序，或用 PORT=其他端口 npm start 启动。\n`);
  } else {
    console.error('\n  服务启动失败：', error.message, '\n');
  }
  process.exitCode = 1;
});

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('  APEX SCOREBOARD · Server Mode');
  console.log(`  Local: http://127.0.0.1:${PORT}`);
  for (const url of lanUrls()) console.log(`  LAN:   ${url}`);
  console.log(`  Data:  ${STATE_FILE}`);
  console.log(`  API:   http://127.0.0.1:${PORT}/api/state`);
  if (!ADMIN_TOKEN) console.log('  ADMIN_TOKEN 未设置：读取正常，上传会被拒绝。');
  console.log('  按 Ctrl+C 停止服务。');
  console.log('');
});
