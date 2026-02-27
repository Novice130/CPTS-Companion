// Test the full server startup flow
import "dotenv/config";
import { initDatabase, seedDatabase } from "./db.ts";
import { auth } from "./auth.ts";

console.log("Testing startServer...");

try {
  console.log("1. initDatabase...");
  await initDatabase();
  console.log("✅ initDatabase done");

  console.log("2. seedDatabase...");
  await seedDatabase();
  console.log("✅ seedDatabase done");

  console.log("Auth object:", typeof auth);
  console.log("✅ All startup tasks completed!");
} catch (err: any) {
  console.error("❌ Startup failed at:", err.message);
  console.error(err.stack);
}

process.exit(0);
