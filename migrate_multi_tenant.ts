import pg from "pg";
import "dotenv/config";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log("Starting multi-tenant database migration...");

    // 1. Wipe existing unassociated data from tracking tables
    console.log("Truncating existing progress, user_settings, notes, daily_activities, reflections...");
    await client.query(`TRUNCATE TABLE progress CASCADE;`);
    await client.query(`TRUNCATE TABLE user_settings CASCADE;`);
    await client.query(`TRUNCATE TABLE notes CASCADE;`);
    await client.query(`TRUNCATE TABLE daily_activities CASCADE;`);
    await client.query(`TRUNCATE TABLE reflections CASCADE;`);

    // 2. Alter Tables to add user_id
    console.log("Adding user_id columns...");
    
    // progress
    await client.query(`ALTER TABLE progress ADD COLUMN user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE;`);
    await client.query(`ALTER TABLE progress DROP CONSTRAINT progress_item_type_item_id_key;`);
    await client.query(`ALTER TABLE progress ADD CONSTRAINT progress_user_item_unique UNIQUE (user_id, item_type, item_id);`);

    // user_settings
    await client.query(`ALTER TABLE user_settings DROP CONSTRAINT user_settings_pkey CASCADE;`);
    await client.query(`ALTER TABLE user_settings DROP COLUMN id;`);
    await client.query(`ALTER TABLE user_settings ADD COLUMN user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE;`);

    // notes
    await client.query(`ALTER TABLE notes ADD COLUMN user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE;`);

    // daily_activities
    await client.query(`ALTER TABLE daily_activities ADD COLUMN user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE;`);

    // reflections
    await client.query(`ALTER TABLE reflections ADD COLUMN user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE;`);
    await client.query(`ALTER TABLE reflections DROP CONSTRAINT reflections_day_number_key;`);
    await client.query(`ALTER TABLE reflections ADD CONSTRAINT reflections_user_day_unique UNIQUE (user_id, day_number);`);

    console.log("✅ Migration completed successfully!");
  } catch (err) {
    console.error("❌ Migration failed:", err);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
