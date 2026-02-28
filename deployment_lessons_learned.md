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

## 3. The "Infinite Login Loop" (Session Cookie Parsing)
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

## 4. Dockerfile Case Sensitivity
**The Problem:** Dokploy failed to deploy the application completely, throwing errors that it couldn't locate the Docker container build file.
**The Cause:** File systems on Linux servers (where Dokploy runs) are strictly case-sensitive. The Git repository had standard capitalization `Dockerfile`, but Dokploy's build settings looked for `dockerfile` by default.
**The Fix:**
In Dokploy's **General Setup** tab, change the `Dockerfile Path` to explicitly match capitalization: `/Dockerfile`.

---

## 5. Security: Weak Better Auth Secrets
**The Problem:** Using simple words or phrases for `BETTER_AUTH_SECRET` can lead to session hijacking.
**The Cause:** Better Auth uses this secret to cryptographically sign session cookies. If guessed, attackers can forge admin sessions.
**The Fix:**
Always generate a cryptographically strong, 64-character random hex string for production deployments. Never commit this string to GitHub; keep it strictly in the Dokploy environment variable interface.
```bash
# Generate a strong secret locally
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Summary Stack Checklist for Future Deployments:
- [ ] Connect Neon Postgres URI correctly without local SSL overrides if required.
- [ ] Generate secure, random `BETTER_AUTH_SECRET`.
- [ ] Match `BETTER_AUTH_URL` identically to the deployment domain (no trailing slashes).
- [ ] Set `trust proxy` in Express.
- [ ] Add deployment domain to `trustedOrigins` for Better Auth.
- [ ] Use `fromNodeHeaders` for ALL session fetching on the server.
