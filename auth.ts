import "dotenv/config";
import { betterAuth } from "better-auth";
import pg from "pg";

// We create the pool once and reuse it
const authPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

// Better Auth configuration
// Docs: https://www.better-auth.com/docs
export const auth = betterAuth({
  database: authPool,
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,     // refresh every 24h
  },
  advanced: {
    disableTablesCheck: true,       // Our tables are created by initDatabase()
  },
  trustedOrigins: process.env.BETTER_AUTH_TRUSTED_ORIGINS ? process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(",") : [],
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
