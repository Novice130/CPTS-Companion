import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await client.query('SELECT name, email FROM "user"');
    console.log("Registered Users:", res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    client.end();
  }
}
run();
