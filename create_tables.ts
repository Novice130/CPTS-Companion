// Run this once to create all database tables in Neon
// node --experimental-strip-types create_tables.ts

import "dotenv/config";
import { initDatabase, seedDatabase } from "./db.ts";

console.log("🔌 Connecting to Neon Postgres...");
console.log("   URL:", process.env.DATABASE_URL?.substring(0, 40) + "...");

try {
  await initDatabase();
  console.log("✅ All app tables created!");
  await seedDatabase();
  console.log("✅ Database seeded!");
} catch (err: any) {
  console.error("❌ Error:", err.message);
  console.error(err.stack);
}

process.exit(0);
