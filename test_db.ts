// Quick connection test - run with: node --experimental-strip-types test_db.ts
import "dotenv/config";

console.log("DATABASE_URL:", process.env.DATABASE_URL ? "✅ set (" + process.env.DATABASE_URL.substring(0, 30) + "...)" : "❌ NOT SET");
console.log("BETTER_AUTH_SECRET:", process.env.BETTER_AUTH_SECRET ? "✅ set" : "❌ NOT SET");

import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  const client = await pool.connect();
  const result = await client.query("SELECT NOW() as time, current_database() as db");
  console.log("✅ Connected to Neon Postgres!");
  console.log("   Database:", result.rows[0].db);
  console.log("   Server time:", result.rows[0].time);
  client.release();
} catch (err: any) {
  console.error("❌ Connection failed:", err.message);
}

await pool.end();
