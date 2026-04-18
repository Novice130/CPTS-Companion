import { betterAuth } from "better-auth";
import { Pool } from "@neondatabase/serverless";

let authPool: Pool | null = null;
let authInstance: any = null;

export function getAuth() {
  if (!authInstance) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL not set for auth");
    }
    
    authPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });

    authInstance = betterAuth({
      database: authPool,
      emailAndPassword: {
        enabled: true,
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
