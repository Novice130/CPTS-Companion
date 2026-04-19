import { betterAuth } from "better-auth";
import { Pool, neon } from "@neondatabase/serverless";
import { NeonDialect } from "kysely-neon";

let authInstance: any = null;

// Lightweight PBKDF2 hasher via Web Crypto — stays under CF Workers free-tier CPU budget
// (default better-auth scrypt is too expensive for 10ms CPU limit)
const b64 = (u: Uint8Array) => Buffer.from(u).toString("base64");
const ub64 = (s: string) => new Uint8Array(Buffer.from(s, "base64"));
const PBKDF2_ITER = 100_000;

async function pbkdf2Hash(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: PBKDF2_ITER, hash: "SHA-256" }, key, 256);
  return `pbkdf2$${PBKDF2_ITER}$${b64(salt)}$${b64(new Uint8Array(bits))}`;
}

async function pbkdf2Verify({ password, hash }: { password: string; hash: string }): Promise<boolean> {
  const parts = hash.split("$");
  if (parts[0] !== "pbkdf2") return false;
  const iter = parseInt(parts[1]);
  const salt = ub64(parts[2]);
  const expected = ub64(parts[3]);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" }, key, expected.length * 8));
  if (bits.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < bits.length; i++) diff |= bits[i] ^ expected[i];
  return diff === 0;
}

export function getAuth() {
  if (!authInstance) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL not set for auth");

    // Workers: HTTP dialect (stateless). Node: WebSocket Pool.
    const database: any = process.env.CF_PAGES
      ? { dialect: new NeonDialect({ neon: neon(url) }), type: "postgres" }
      : new Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, max: 5 });

    authInstance = betterAuth({
      database,
      emailAndPassword: {
        enabled: true,
        password: { hash: pbkdf2Hash, verify: pbkdf2Verify },
      },
      session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24,     // refresh every 24h
      },
      advanced: {
        defaultCookieAttributes: {
          sameSite: "lax",
          secure: !!process.env.BETTER_AUTH_URL && process.env.BETTER_AUTH_URL.startsWith("https"),
          path: "/",
        },
        useSecureCookies: !!process.env.BETTER_AUTH_URL && process.env.BETTER_AUTH_URL.startsWith("https"),
      },
      trustedOrigins: [
        "http://localhost:3000",
        ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS ? process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(",") : [])
      ],
      baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    });
  }
  return authInstance;
}

// For backward compatibility during migration, we can export a proxy but better to use getAuth()
export const auth = new Proxy({} as any, {
  get: (target, prop) => getAuth()[prop]
});


// Middleware to get current user from session
import { fromNodeHeaders } from "better-auth/node";

export async function getSession(req: any) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    return session;
  } catch {
    return null;
  }
}
