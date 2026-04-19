import { Readable } from 'node:stream';
import { app, startServer } from './server.js';
import { auth } from './auth.js';

let initialized = false;

async function ensureInitialized(env: Record<string, string>) {
  if (initialized) return;
  const vars = ['DATABASE_URL', 'BETTER_AUTH_SECRET', 'BETTER_AUTH_URL', 'RESEND_API_KEY', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];
  for (const key of vars) {
    if (env[key]) process.env[key] = env[key];
  }
  process.env.CF_PAGES = '1';
  await startServer();
  initialized = true;
}

// Converts a Fetch API Request/Response ↔ Express (Node IncomingMessage/ServerResponse)
async function fetchToExpress(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const bodyBuf = request.body ? Buffer.from(await request.arrayBuffer()) : Buffer.alloc(0);

  return new Promise<Response>((resolve) => {
    // --- Mock IncomingMessage ---
    const readable = new Readable({ read() {} });
    const req: any = readable;
    req.method = request.method;
    req.url = url.pathname + url.search;
    req.headers = Object.fromEntries(request.headers.entries());
    req.socket = { remoteAddress: '127.0.0.1', encrypted: url.protocol === 'https:' };
    req.connection = req.socket;
    req.ip = '127.0.0.1';
    if (bodyBuf.length) readable.push(bodyBuf);
    readable.push(null);

    // --- Mock ServerResponse ---
    const chunks: Buffer[] = [];
    const resHeaders: Record<string, string | string[]> = {};
    let statusCode = 200;
    let finished = false;

    const res: any = {
      get statusCode() { return statusCode; },
      set statusCode(v: number) { statusCode = v; },
      finished,
      writableEnded: false,
      headersSent: false,
      locals: {},
      app,
      req,
      setHeader(name: string, val: string | string[]) {
        resHeaders[name.toLowerCase()] = val;
        return this;
      },
      writeHead(code: number, headers?: Record<string, string | string[]>) {
        statusCode = code;
        if (headers) for (const [k, v] of Object.entries(headers)) resHeaders[k.toLowerCase()] = v;
        return this;
      },
      flushHeaders() {},
      getHeader(name: string) { return resHeaders[name.toLowerCase()]; },
      getHeaders() { return resHeaders; },
      removeHeader(name: string) { delete resHeaders[name.toLowerCase()]; },
      hasHeader(name: string) { return name.toLowerCase() in resHeaders; },
      write(chunk: any, _enc?: any, cb?: () => void) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        cb?.();
        return true;
      },
      end(chunk?: any, _enc?: any, cb?: () => void) {
        if (chunk && chunk !== '') chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        this.finished = true;
        this.writableEnded = true;
        cb?.();
        const headers = new Headers();
        for (const [k, v] of Object.entries(resHeaders)) {
          if (Array.isArray(v)) v.forEach(val => headers.append(k, val));
          else headers.set(k, v);
        }
        resolve(new Response(Buffer.concat(chunks), { status: statusCode, headers }));
      },
      on() { return this; },
      once() { return this; },
      emit() { return false; },
      removeListener() { return this; },
    };

    (app as any)(req, res);
  });
}

export default {
  async fetch(req: Request, env: any, _ctx: any) {
    await ensureInitialized(env);
    // Bypass Express for auth routes — use native Web handler (no stream shim issues)
    if (new URL(req.url).pathname.startsWith('/api/auth/')) {
      return auth.handler(req);
    }
    return fetchToExpress(req);
  }
};
