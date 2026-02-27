// Minimal startup test — import each module one by one to find the crash
import "dotenv/config";
console.log("✅ dotenv loaded");
console.log("   DATABASE_URL:", process.env.DATABASE_URL ? "set" : "MISSING");
console.log("   BETTER_AUTH_SECRET:", process.env.BETTER_AUTH_SECRET ? "set" : "MISSING");
console.log("   RESEND_API_KEY:", process.env.RESEND_API_KEY ? "set" : "not set (ok)");

try {
  console.log("Loading express...");
  const { default: express } = await import("express");
  console.log("✅ express OK");
} catch (e: any) { console.error("❌ express:", e.message); }

try {
  console.log("Loading db.ts...");
  const db = await import("./db.ts");
  console.log("✅ db.ts OK");
} catch (e: any) { console.error("❌ db.ts:", e.message); }

try {
  console.log("Loading email.ts...");
  const email = await import("./email.ts");
  console.log("✅ email.ts OK");
} catch (e: any) { console.error("❌ email.ts:", e.message); }

try {
  console.log("Loading auth.ts...");
  const auth = await import("./auth.ts");
  console.log("✅ auth.ts OK");
} catch (e: any) { console.error("❌ auth.ts:", e.message, e.stack?.substring(0, 500)); }

try {
  console.log("Loading better-auth/node...");
  const { toNodeHandler } = await import("better-auth/node");
  console.log("✅ better-auth/node OK");
} catch (e: any) { console.error("❌ better-auth/node:", e.message); }

console.log("All imports done. Exiting.");
process.exit(0);
