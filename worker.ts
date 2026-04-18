import { app, startServer } from './server.js';
import serverless from 'serverless-http';

let initialized = false;
let handler: ReturnType<typeof serverless>;

async function ensureInitialized(env: Record<string, string>) {
  if (initialized) return;

  // Bridge Cloudflare env bindings → process.env (must happen before any import side-effects read env)
  const vars = ['DATABASE_URL', 'BETTER_AUTH_SECRET', 'BETTER_AUTH_URL', 'RESEND_API_KEY', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'];
  for (const key of vars) {
    if (env[key]) process.env[key] = env[key];
  }
  process.env.CF_PAGES = '1';

  await startServer();
  handler = serverless(app);
  initialized = true;
}

export default {
  async fetch(req: Request, env: any, ctx: any) {
    await ensureInitialized(env);
    return (handler as any)(req, env, ctx);
  }
};
