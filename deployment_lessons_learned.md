# 🚀 Deployment Lessons Learned: Dokploy, Better Auth & Express

This document serves as a master reference for everything that went wrong (and how we fixed it) while deploying the CPTS Companion app to a self-hosted Dokploy instance using Neon Postgres for the database and Better Auth for authentication. 

Use this guide to avoid these identical traps in future projects!

---

## 1. The "Invalid Origin" Error (Better Auth)
**The Problem:** Google OAuth login clicks resulted in an instant `[Better Auth]: Invalid origin: https://cpts.learnnovice.com` error in the server logs.
**The Cause:** `better-auth` is strictly bound to the origin URL configured in its environment setup to prevent spoofing. If the origin doesn't match perfectly, it drops the request.
**The Fix:** 
Ensure the Dokploy Environment variable for `BETTER_AUTH_URL` is perfectly identical to the actual URL, including `https://` and **NO trailing slash**.
```env
# Correct
BETTER_AUTH_URL="https://cpts.learnnovice.com"

# Incorrect (will cause Invalid Origin)
BETTER_AUTH_URL="https://cpts.learnnovice.com/"
```

---

## 2. The "403 Forbidden" Error (Reverse Proxy Block)
**The Problem:** Even after fixing the origin, the `/api/auth/sign-in/social` POST request returned a strict `403 Forbidden`.
**The Cause:** Dokploy uses **Traefik** as a reverse proxy to route traffic into the Docker container. By default, Express and Better Auth do not trust requests forwarded by a proxy because the IP/Headers have been rewritten by Traefik.
**The Fix:**
You must configure *both* Express and Better Auth to trust the reverse proxy.

**Step A (Express):** Tell the Express server to trust the proxy.
```typescript
// server.ts
const app = express();
app.set("trust proxy", 1); // <--- Add this before any routes
```

**Step B (Better Auth):** Add the production domain to `trustedOrigins` in the Better Auth configuration.
```typescript
// auth.ts
export const auth = betterAuth({
  // ... other config
  trustedOrigins: process.env.BETTER_AUTH_TRUSTED_ORIGINS ? 
                  process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(",") : [],
});
```
*(And add `BETTER_AUTH_TRUSTED_ORIGINS="https://cpts.learnnovice.com"` to Dokploy env vars).*

---

### 2. EJS Template Rendering Masking Valid Sessions ("Ghost Logouts")
**Problem:** Users would successfully log in, see their identity on the Dashboard, but immediately appear "logged out" (shown a guest login prompt curtain) when navigating to `/exercises` or `/mindmaps`. Navigating back to the Dashboard instantly "restored" the session without requiring a re-login. Extensive debugging suspected cookie path dropping or `fetch` credentials overriding the session.
**Root Cause:** The `better-auth` session was perfectly valid and persisting in the browser. However, on specific Express routes like `app.get("/exercises")`, the route handler compiled data using a generic `getCommonData()` helper and completely forgot to inject `user: req.user` into the `res.render()` context object. Because EJS templates strictly check `if (user)` to display the authenticated header, the UI assumed the user was a guest simply because the backend forgot to tell the frontend who was logged in.
**Fix:** We audited `server.ts` and injected `user: (req as any).user` into every single `res.render()` pipeline (Exercises, Mindmaps, Notes, Search, Settings, Flashcards, and Error routes), ensuring the sidebar and topbar always receive the session state.
**Lesson:** Visual "logout" bugs in monolithic template apps are not always authentication failures. If a session instantly "restores" on another page, verify that the active route handler is actually passing the `user` context down to the view engine.

### 3. Path-Isolated Cookie Scope Default
**Problem:** The session cookie wasn't automatically propagating to all nested URL paths `(/exercises/123)` resulting in 401s on initial testing.
**The Cause:** Modern browsers restrict cookies strictly by `path`, `domain`, and `sameSite` policies. If Better Auth sets the session path ambiguously during login, the browser may refuse to send the session cookie to deeper sub-routes.
**The Fix:**
Explicitly force Better Auth's `defaultCookieAttributes` to enforce the absolute root path `/`.

```typescript
// auth.ts
export const auth = betterAuth({
  session: { /* ... */ },
  advanced: {
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/", // <--- CRITICAL FIX: Forces cookie to work across ALL sub-routes
    },
    useSecureCookies: process.env.NODE_ENV === "production",
  }
});
```

---

### 4. Google OAuth `redirect_uri_mismatch` (Local vs. Production)
**The Problem:** Google Login fails with an "Access blocked" screen and Error 400: `redirect_uri_mismatch` when testing on `localhost:3000`.
**The Cause:** Better Auth generates a specific callback URL (e.g., `http://localhost:3000/api/auth/callback/google`). If this exact string is not whitelisted in the Google Cloud Console "Authorized redirect URIs" for the Client ID, Google will reject the request.
**The Fix:**
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Select your project and navigate to **APIs & Services > Credentials**.
3. Edit your OAuth 2.0 Client ID.
4. Add `http://localhost:3000/api/auth/callback/google` to the **Authorized redirect URIs** list.
5. Save changes (might take a few minutes to propagate).
**Lesson:** Always maintain separate whitelists for local (`localhost:3000`) and production (`cpts.learnnovice.com`) within the same Google project or use separate projects for dev/prod.

---

## 5. The "Infinite Login Loop" (Session Cookie Parsing)
**The Problem:** Even after successful authentication via Google, the server would forget the user session immediately. Navigating to any protected page resulted in being kicked back to the login screen over and over.
**The Cause:** Express's `req.headers` object acts differently than standard Web APIs. Using the native Web `new Headers(req.headers)` in Node.js strips or incorrectly parses the `cookie` header. Better Auth could not see the session token cookie we just set.
**The Fix:**
Never use `new Headers(req.headers)` with Express + Better Auth. Instead, import Better Auth's dedicated `fromNodeHeaders` helper to safely parse Express request headers.

```typescript
// auth.ts
import { fromNodeHeaders } from "better-auth/node"; // <--- MUST use this

export async function getSession(req: any) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers), // <--- Replaces new Headers()
    });
    return session;
  } catch {
    return null;
  }
}
```

---

## 4. The "Path-Isolated Session" Bug (Cross-Route Persistent Logout)
**The Problem:** Navigating to `cpts.learnnovice.com/` (Dashboard) worked fine, but if the user navigated to `cpts.learnnovice.com/exercises` or another sub-route, the server thought they were totally logged out and the "Save Your Progress" curtain would trigger. Returning to the dashboard showed they were still logged in.
**The Cause:** Modern browsers restrict cookies strictly by `path`, `domain`, and `sameSite` policies. If Better Auth sets the session path ambiguously during login, the browser may refuse to send the session cookie to deeper sub-routes.
**The Fix:**
Explicitly force Better Auth's `defaultCookieAttributes` to enforce the absolute root path `/`.

```typescript
// auth.ts
export const auth = betterAuth({
  session: { /* ... */ },
  advanced: {
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/", // <--- CRITICAL FIX: Forces cookie to work across ALL sub-routes
    },
    useSecureCookies: process.env.NODE_ENV === "production",
  }
});
```

---

## 5. View Templates Losing Global Themes (White Background Bug)
**The Problem:** The `/login` page was completely white and generic, dropping the entire CPTS Companion dark-mode Hacker Theme, despite using CSS Custom Properties like `var(--bg)` and `var(--surface)`.
**The Cause:** The `login.ejs` view file lacked standard `<html>`, `<head>`, and `<body>` tags. Express simply spat out raw `<div>`s to the browser. As a result, the `<link rel="stylesheet" href="/css/style.css">` was completely missing from the HTML document.
**The Fix:**
Ensure every standalone `.ejs` view template either `include()`s a layout/header partial or explicitly defines the HTML boilerplate at the very top.

---

## 6. Dockerfile Case Sensitivity
**The Problem:** Dokploy failed to deploy the application completely, throwing errors that it couldn't locate the Docker container build file.
**The Cause:** File systems on Linux servers (where Dokploy runs) are strictly case-sensitive. The Git repository had standard capitalization `Dockerfile`, but Dokploy's build settings looked for `dockerfile` by default.
**The Fix:**
In Dokploy's **General Setup** tab, change the `Dockerfile Path` to explicitly match capitalization: `/Dockerfile`.

---

## 7. Security: Weak Better Auth Secrets
**The Problem:** Using simple words or phrases for `BETTER_AUTH_SECRET` can lead to session hijacking.
**The Cause:** Better Auth uses this secret to cryptographically sign session cookies. If guessed, attackers can forge admin sessions.
**The Fix:**
Always generate a cryptographically strong, 64-character random hex string for production deployments. Never commit this string to GitHub; keep it strictly in the Dokploy environment variable interface.
```bash
# Generate a strong secret locally
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 8. Multi-Tenant Data Isolation & Query Scoping
**The Problem:** Newly registered test users were seeing the progress, notes, and reflections of previously active accounts. The application functioned essentially as a global shared whiteboard.
**The Cause:** While Better Auth successfully provisioned separate `user` accounts, the underlying core domain tables (`progress`, `notes`, `daily_activities`, `user_settings`) lacked a `user_id` foreign key. Furthermore, the `db.ts` queries did not accept or filter by a specific user.
**The Fix:** 
1. `ALTER TABLE` to add `user_id TEXT REFERENCES "user"(id) ON DELETE CASCADE` to all user-configurable tables.
2. Update all queries in `db.ts` to demand a `userId: string` parameter and filter via `WHERE user_id = $1`.
3. Read the `user.id` from the active session (`req.user.id`) in the Express route handlers and pass it down to the database operations.
**Lesson:** When migrating a single-player SQLite application to a multi-tenant PostgreSQL cloud architecture, strictly scoping the database queries via a Foreign Key is an absolute baseline requirement.

---

## 9. Silent Backend Crashes (`ERR_CONNECTION_REFUSED`)
**The Problem:** Checking off an exercise answer completely crashed the backend server, forcing a `localhost refused to connect` screen upon the next click.
**The Cause:** During the multi-tenant refactor, replacing the local single-user query with the scoped query (`queries.upsertProgress(userId, ...)`) was missed in the `POST /api/exercises/:id/submit` router handler. Because an expected variable was undefined, Node's database driver threw an unhandled Promise Rejection, which fatally killed the entire `ts-node` instance.
**The Fix:**
Always ensure the Express request object successfully negotiates the session authentication and extracts the valid ID (`const userId = req.user.id;`) before attempting to write to PostgreSQL. 

---

## 10. The Perceived "Latency" Problem and SPA Routing
**The Problem:** Pressing "Next Question" felt sluggish because each press sequentially fired 6 distinct `COUNT()` queries to Postgres over the network, wait to compile the EJS template, and reload the browser DOM completely.
**The Cause:** Standard monolithic SSR (Server-Side Rendered) HTML templates destroy and re-download identical layout components (sidebars, CSS) upon every route change.
**The Fix:**
1. **Query Consolidation:** Combined 6 distinct `pool.query` reads in `getStats()` down to a single compound `SELECT` query utilizing nested subqueries.
2. **Transparent SPA Prefetching:** Injected a PJAX script that quietly pre-fetches the subsequent exercise URLs in the background and hot-swaps the core `<main>` element using `DOMParser()` and `history.pushState()`.
**Lesson:** Don't rebuild SPA functionality strictly with React; vanilla JS fetch swapping (`PJAX`) is incredibly fast and preserves backend server-side templating infrastructure while granting zero-latency transitions.

---

## 11. Google OAuth `redirect_uri_mismatch` in Production
**The Problem:** Google returned a 400 `redirect_uri_mismatch` on the production deployed app, even though the production URI was explicitly whitelisted in Google Cloud Console.
**The Cause:** In `auth.ts`, the `baseURL` property was originally conditioned on `NODE_ENV === "production" ? process.env.BETTER_AUTH_URL : "http://localhost:3000"`. If Dokploy did not explicitly define `NODE_ENV="production"` in the environment variables, the backend falsely assumed it was running locally. It then instructed Google to use `http://localhost:3000/api/auth/callback/google` as the redirect, triggering Google's security block because the request originated from `cpts.learnnovice.com`.
**The Fix:**
Never rely on `NODE_ENV` as a strict gate for generating URLs. Bind directly to the provided origin variable.
```typescript
baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
```

---

## Summary Stack Checklist for Future Deployments:
- [ ] Connect Neon Postgres URI correctly without local SSL overrides if required.
- [ ] Generate secure, random `BETTER_AUTH_SECRET`.
- [ ] Match `BETTER_AUTH_URL` identically to the deployment domain (no trailing slashes).
- [ ] Set `trust proxy` in Express.
- [ ] Add deployment domain to `trustedOrigins` for Better Auth.
- [ ] Use `fromNodeHeaders` for ALL session fetching on the server.
- [ ] Explicitly configure `advanced.defaultCookieAttributes` to `path: "/"` and `secure: !!process.env.BETTER_AUTH_URL` in Better Auth.
- [ ] Verify HTML `<head>` and stylesheet link injection on standalone .ejs files.
- [ ] Ensure `user_id` Foreign Keys are scoped on all non-global entity tables.
- [ ] Validate unhandled Promise Rejections are caught in POST routes to prevent hard server crashing.
- [ ] Do not condition Better Auth's `baseURL` strictly on `NODE_ENV`; fallback gracefully.

---

# Part 2: Migrating from Dokploy/Docker to Cloudflare Workers

Lessons 1–11 above describe the Dokploy era. After stabilizing on a self-hosted VPS, the app was migrated to **Cloudflare Workers** for cost (free tier), global edge, and zero infra overhead. The migration surfaced a different class of problem: Workers is not Node.js, and several architectural assumptions the Express app relied on had to be replaced. Lessons 12–15 below cover those.

---

## 12. The `new Function()` Ban (Template Engine Runtime Compilation)
**The Problem:** First deploy to Workers crashed immediately with `EvalError: Code generation from strings disallowed` whenever any route rendered a view. Eta's default behavior is to compile `.ejs` templates into functions via `new Function(...)` at request time.
**The Cause:** Cloudflare Workers runs on V8 isolates with a strict CSP-like policy — `eval`, `new Function()`, and `Function()` constructors are banned. Any template engine, JIT evaluator, or runtime code-gen library fails at first use.
**The Fix:**
Pre-compile **every** template at build time into a manifest object, then have Eta look up the compiled function by name instead of re-parsing source.

```js
// scripts/bundle-views.mjs (runs before wrangler deploy)
import { Eta } from "eta";
const eta = new Eta({ views: "./views" });
// Walk views/*.ejs, compile each with eta.compile(src), emit views-manifest.ts
```

```ts
// server.ts — override eta.render to use the manifest
const _etaRender = (eta as any).render.bind(eta);
(eta as any).render = (template: string, data: any, opts?: any) => {
  const key = template.replace(/\.ejs$/, '').replace(/^\.?\//, '');
  const fn = manifest[key] ?? manifest[`partials/${key}`]; // fallback for include('login-prompt')
  if (typeof fn === 'function') return (fn as Function).call(eta, data, opts);
  return _etaRender(template, data, opts);
};
```
**Lesson:** Anything that advertises "just-in-time" or "runtime compilation" is suspect on Workers. Audit dependencies before porting — Eta, EJS, Pug, Handlebars-with-compile, and any JS-in-string evaluator will all need the same pre-compile treatment.

---

## 13. Cross-Request I/O Forbidden (`Cannot perform I/O on behalf of a different request`)
**The Problem:** After fixing templates, the first DB-bound route 500'd with `Cannot perform I/O on behalf of a different request`. Better Auth sign-in hung forever. The error was non-deterministic — sometimes requests succeeded, sometimes they failed.
**The Cause:** Neon's `Pool` client uses **WebSockets** and keeps long-lived connections. On Workers, every request runs in its own I/O context — a WebSocket opened during request A cannot be reused by request B, even within the same isolate. Because the `Pool` is module-scoped, the first request "wins" it, and every subsequent request crashes.
**The Fix:**
Swap `Pool` (WebSocket, stateful) for `neon()` (HTTP, stateless) on Workers. Gate on `process.env.CF_PAGES` so local Node keeps the faster Pool:

```ts
// db.ts
function makeClient(): Client {
  const url = process.env.DATABASE_URL!;
  if (process.env.CF_PAGES) {
    const sql: any = neon(url);                       // HTTP — one-shot per query
    return {
      async query(text: string, params: any[] = []) {
        const rows = await sql.query(text, params);
        return { rows: Array.isArray(rows) ? rows : rows?.rows || [] };
      },
    };
  }
  return new Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, max: 10 });
}
```

Better Auth needs the same dual-mode treatment. Its Kysely adapter expects a real dialect, so use `kysely-neon`'s `NeonDialect` with the HTTP client:

```ts
// auth.ts
const database: any = process.env.CF_PAGES
  ? { dialect: new NeonDialect({ neon: neon(url) }), type: "postgres" }
  : new Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, max: 5 });
```
**Side note:** `neon()` HTTP silently returns an empty result if you pass `NaN` as a bind parameter. One route had `parseInt(req.params.id)` — for slug-style IDs like `nmap`, this became `NaN` and the query returned nothing instead of erroring. Fix with a regex guard: `/^\d+$/.test(req.params.id) ? getById(parseInt(...)) : getBySlug(...)`.
**Lesson:** Workers is the anti-pattern for stateful clients. Any library that says "pool", "keep-alive", or "persistent connection" needs to be replaced with its HTTP/stateless counterpart on Workers.

---

## 14. The 10ms CPU Budget (Scrypt Kills Sign-In)
**The Problem:** Sign-up worked. Sign-in returned `exceededCpu` 503 errors. Only sign-in failed, and only on Workers.
**The Cause:** Better Auth's default password hasher is **scrypt** with parameters tuned for modern Node servers (dozens of ms of CPU time). Cloudflare Workers free tier allows **10ms** of CPU per request. Scrypt hash **verification** (computed on every sign-in) blew the budget instantly. Hash generation during sign-up also pushed the limit but sometimes squeaked through.
**The Fix:**
Replace scrypt with PBKDF2-SHA256 via Web Crypto (100k iterations — still cryptographically sound, but ~20x faster on Workers because it runs in native code instead of a WASM-style polyfill):

```ts
// auth.ts
async function pbkdf2Hash(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100_000, hash: "SHA-256" }, key, 256);
  return `pbkdf2$100000$${b64(salt)}$${b64(new Uint8Array(bits))}`;
}
// + constant-time pbkdf2Verify

betterAuth({
  emailAndPassword: {
    enabled: true,
    password: { hash: pbkdf2Hash, verify: pbkdf2Verify },   // override default scrypt
  },
  // ...
});
```
**Caveat:** Existing users in the DB who signed up with scrypt-hashed passwords can no longer log in — the hash prefix won't match `pbkdf2$`. Accept this migration cost or implement a rehash-on-login path if user data is load-bearing.
**`wrangler.toml` `[limits] cpu_ms = 30000` does not work on the free plan.** Wrangler will deploy but the runtime silently ignores it. Upgrade to paid or optimize the code.
**Lesson:** Before porting any auth/crypto code to Workers, audit for scrypt, bcrypt, argon2, and anything else that deliberately burns CPU. Web Crypto's PBKDF2 is the pragmatic choice. Also: don't trust config options that silently no-op on the free tier.

---

## 15. Express-on-Workers: The Fetch ↔ Node Req/Res Shim
**The Problem:** Express was the bulk of the codebase and a full rewrite was out of scope. Workers provides a Fetch API (`Request`/`Response`), not Node's `IncomingMessage`/`ServerResponse`. Directly calling `app(req, res)` exploded because `req` lacks `.socket`, `.headers` is a `Headers` object, and `res.end()` doesn't exist.
**The Cause:** Express couples tightly to Node's HTTP internals. It reads `req.socket.remoteAddress`, expects `req.headers` as a plain object, and drives responses through `writeHead`/`write`/`end` on a writable stream.
**The Fix:**
Write a minimal shim in `worker.ts` that translates between the two APIs — enough for Express to function without patching Express itself:

```ts
// worker.ts (abridged — see full file)
async function fetchToExpress(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const readable = new Readable({ read() {} });
  const req: any = readable;
  req.method = request.method;
  req.url = url.pathname + url.search;
  req.headers = Object.fromEntries(request.headers.entries());
  req.socket = { remoteAddress: '127.0.0.1', encrypted: url.protocol === 'https:' };
  // ... push body bytes into readable

  return new Promise<Response>((resolve) => {
    const chunks: Buffer[] = [];
    const res: any = {
      setHeader, writeHead, getHeader, getHeaders, removeHeader, hasHeader,
      write(chunk) { chunks.push(Buffer.from(chunk)); return true; },
      end(chunk) {
        if (chunk) chunks.push(Buffer.from(chunk));
        resolve(new Response(Buffer.concat(chunks), { status: statusCode, headers }));
      },
      on() { return this; }, once() { return this; }, emit() { return false; },
    };
    (app as any)(req, res);
  });
}
```

**The auth route gotcha:** Better Auth's native `auth.handler(request)` already speaks Fetch API. Putting it behind the Express shim double-processed bodies and caused sign-in POSTs to hang. Bypass the shim for auth:

```ts
// worker.ts
export default {
  async fetch(req: Request, env: any, _ctx: any) {
    await ensureInitialized(env);
    if (new URL(req.url).pathname.startsWith('/api/auth/')) {
      return auth.handler(req);                  // <-- native Fetch, no shim
    }
    return fetchToExpress(req);                  // <-- everything else
  }
};
```
**Lesson:** A thin shim can take Express most of the way — but anything that already speaks the native Fetch API (Better Auth, Hono routers, raw streaming handlers) should bypass the shim. Mixing the two wastes CPU and breaks streaming semantics.

---

## Summary Checklist for Cloudflare Workers Ports:
- [ ] Pre-compile **all** templates at build time — no `new Function()` / `eval` at runtime.
- [ ] Replace stateful DB clients (WebSocket `Pool`, Redis clients, etc.) with stateless HTTP equivalents.
- [ ] Gate everything Workers-specific on `process.env.CF_PAGES` (or similar) so local Node still works.
- [ ] Audit auth for scrypt/bcrypt/argon2 — replace with PBKDF2 via Web Crypto on the free tier.
- [ ] Guard integer-bound query params — `neon()` HTTP silently returns empty for `NaN`.
- [ ] Bypass any Express/Fetch shim for handlers that are already Fetch-native (Better Auth, etc.).
- [ ] Set secrets via `wrangler secret put`, not `[vars]` in `wrangler.toml`.
- [ ] Don't trust `[limits]` options — some (like `cpu_ms`) silently no-op on the free plan.
- [ ] Remember Workers has no filesystem — anything that reads `fs.readFile` at runtime must be bundled at build time.
- [ ] Gate all DDL (`initDatabase`, seed runs) behind `if (process.env.CF_PAGES) return;` — migrations belong in a separate local/CI job, not the request path.
