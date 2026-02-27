import pg from "pg";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Postgres connection pool (Neon)
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL not set. Create a .env file (see .env.example)");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
});

// Test connection on startup
pool.on("error", (err) => {
  console.error("Unexpected Postgres error:", err);
});

// ============================================
// Schema Initialization
// ============================================

export async function initDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    // ── Better Auth required tables ──────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS "user" (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        "emailVerified" BOOLEAN NOT NULL DEFAULT false,
        image TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS session (
        id TEXT PRIMARY KEY,
        "expiresAt" TIMESTAMP NOT NULL,
        token TEXT NOT NULL UNIQUE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "ipAddress" TEXT,
        "userAgent" TEXT,
        "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS account (
        id TEXT PRIMARY KEY,
        "accountId" TEXT NOT NULL,
        "providerId" TEXT NOT NULL,
        "userId" TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        "accessToken" TEXT,
        "refreshToken" TEXT,
        "idToken" TEXT,
        "accessTokenExpiresAt" TIMESTAMP,
        "refreshTokenExpiresAt" TIMESTAMP,
        scope TEXT,
        password TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS verification (
        id TEXT PRIMARY KEY,
        identifier TEXT NOT NULL,
        value TEXT NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "createdAt" TIMESTAMP,
        "updatedAt" TIMESTAMP
      );
    `);

    // ── App tables ────────────────────────────────────────────────────
    await client.query(`
      -- Modules table
      CREATE TABLE IF NOT EXISTS modules (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        category TEXT NOT NULL,
        summary TEXT,
        cheatsheet_md TEXT,
        pitfalls_md TEXT,
        exam_tips_md TEXT,
        order_index INTEGER DEFAULT 0
      );

      -- Exercises table
      CREATE TABLE IF NOT EXISTS exercises (
        id SERIAL PRIMARY KEY,
        module_id INTEGER REFERENCES modules(id),
        type TEXT NOT NULL,
        difficulty TEXT DEFAULT 'medium',
        prompt TEXT NOT NULL,
        options TEXT,
        answer TEXT NOT NULL,
        explanation TEXT,
        validation_regex TEXT,
        hints TEXT
      );

      -- Flashcards table
      CREATE TABLE IF NOT EXISTS flashcards (
        id SERIAL PRIMARY KEY,
        module_id INTEGER REFERENCES modules(id),
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        tags TEXT,
        ease_factor REAL DEFAULT 2.5,
        interval INTEGER DEFAULT 0,
        repetitions INTEGER DEFAULT 0,
        next_review TEXT
      );

      -- Mind maps table
      CREATE TABLE IF NOT EXISTS mindmaps (
        id SERIAL PRIMARY KEY,
        module_id INTEGER REFERENCES modules(id),
        title TEXT NOT NULL,
        description TEXT,
        mermaid_code TEXT NOT NULL
      );

      -- Plan days table
      CREATE TABLE IF NOT EXISTS plan_days (
        id SERIAL PRIMARY KEY,
        day_number INTEGER NOT NULL,
        title TEXT NOT NULL,
        topics TEXT,
        estimated_hours REAL DEFAULT 4,
        exercises TEXT,
        lab_focus TEXT,
        review_topics TEXT
      );

      -- Progress tracking
      CREATE TABLE IF NOT EXISTS progress (
        id SERIAL PRIMARY KEY,
        item_type TEXT NOT NULL,
        item_id INTEGER NOT NULL,
        status TEXT DEFAULT 'not_started',
        completed_at TEXT,
        score INTEGER,
        last_seen TEXT,
        due_at TEXT,
        UNIQUE(item_type, item_id)
      );

      -- Notes table
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        body_md TEXT,
        tags TEXT,
        module_id INTEGER REFERENCES modules(id),
        template_type TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Templates table
      CREATE TABLE IF NOT EXISTS templates (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        content_md TEXT NOT NULL
      );

      -- User settings
      CREATE TABLE IF NOT EXISTS user_settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        plan_duration INTEGER DEFAULT 30,
        start_date TEXT,
        current_day INTEGER DEFAULT 1
      );

      -- Reflections
      CREATE TABLE IF NOT EXISTS reflections (
        id SERIAL PRIMARY KEY,
        day_number INTEGER NOT NULL UNIQUE,
        content TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      -- Daily activities
      CREATE TABLE IF NOT EXISTS daily_activities (
        id SERIAL PRIMARY KEY,
        day_number INTEGER NOT NULL,
        activity_type TEXT NOT NULL,
        activity_id INTEGER,
        title TEXT NOT NULL,
        description TEXT,
        completed INTEGER DEFAULT 0,
        completed_at TEXT
      );

      -- Initialize default user settings
      INSERT INTO user_settings (id, plan_duration, current_day)
      VALUES (1, 30, 1)
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log("Database schema initialized");
  } finally {
    client.release();
  }
}

// ============================================
// Seed Data
// ============================================

export async function seedDatabase(): Promise<void> {
  const { rows } = await pool.query("SELECT COUNT(*)::int as count FROM modules");
  if (rows[0].count > 0) {
    console.log("Database already seeded, skipping...");
    return;
  }

  console.log("Seeding database...");

  // Seed modules
  const modulesPath = join(__dirname, "seed", "modules.json");
  if (existsSync(modulesPath)) {
    const modules = JSON.parse(readFileSync(modulesPath, "utf-8"));
    for (const mod of modules) {
      await pool.query(
        `INSERT INTO modules (title, slug, category, summary, cheatsheet_md, pitfalls_md, exam_tips_md, order_index)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [mod.title, mod.slug, mod.category, mod.summary, mod.cheatsheet_md, mod.pitfalls_md, mod.exam_tips_md, mod.order_index]
      );
    }
    console.log(`Seeded ${modules.length} modules`);
  }

  // Seed exercises
  const exercisesPath = join(__dirname, "seed", "exercises.json");
  if (existsSync(exercisesPath)) {
    const exercises = JSON.parse(readFileSync(exercisesPath, "utf-8"));
    for (const ex of exercises) {
      await pool.query(
        `INSERT INTO exercises (module_id, type, difficulty, prompt, options, answer, explanation, validation_regex, hints)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [ex.module_id, ex.type, ex.difficulty, ex.prompt,
         ex.options ? JSON.stringify(ex.options) : null,
         ex.answer, ex.explanation, ex.validation_regex,
         ex.hints ? JSON.stringify(ex.hints) : null]
      );
    }
    console.log(`Seeded ${exercises.length} exercises`);
  }

  // Seed flashcards
  const flashcardsPath = join(__dirname, "seed", "flashcards.json");
  if (existsSync(flashcardsPath)) {
    const flashcards = JSON.parse(readFileSync(flashcardsPath, "utf-8"));
    for (const fc of flashcards) {
      await pool.query(
        `INSERT INTO flashcards (module_id, question, answer, tags) VALUES ($1, $2, $3, $4)`,
        [fc.module_id, fc.question, fc.answer, fc.tags ? JSON.stringify(fc.tags) : null]
      );
    }
    console.log(`Seeded ${flashcards.length} flashcards`);
  }

  // Seed mindmaps
  const mindmapsPath = join(__dirname, "seed", "mindmaps.json");
  if (existsSync(mindmapsPath)) {
    const mindmaps = JSON.parse(readFileSync(mindmapsPath, "utf-8"));
    for (const mm of mindmaps) {
      await pool.query(
        `INSERT INTO mindmaps (module_id, title, description, mermaid_code) VALUES ($1, $2, $3, $4)`,
        [mm.module_id, mm.title, mm.description, mm.mermaid_code]
      );
    }
    console.log(`Seeded ${mindmaps.length} mindmaps`);
  }

  // Seed plan
  const planPath = join(__dirname, "seed", "plan.json");
  if (existsSync(planPath)) {
    const plan = JSON.parse(readFileSync(planPath, "utf-8"));
    for (const day of plan) {
      await pool.query(
        `INSERT INTO plan_days (day_number, title, topics, estimated_hours, exercises, lab_focus, review_topics)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [day.day_number, day.title,
         day.topics ? JSON.stringify(day.topics) : null,
         day.estimated_hours,
         day.exercises ? JSON.stringify(day.exercises) : null,
         day.lab_focus,
         day.review_topics ? JSON.stringify(day.review_topics) : null]
      );
    }
    console.log(`Seeded ${plan.length} plan days`);
  }

  // Seed templates
  const templatesPath = join(__dirname, "seed", "templates.json");
  if (existsSync(templatesPath)) {
    const templates = JSON.parse(readFileSync(templatesPath, "utf-8"));
    for (const tmpl of templates) {
      await pool.query(
        `INSERT INTO templates (name, type, content_md) VALUES ($1, $2, $3)`,
        [tmpl.name, tmpl.type, tmpl.content_md]
      );
    }
    console.log(`Seeded ${templates.length} templates`);
  }

  // Build search index
  await buildSearchIndex();

  // Generate initial activities for day 1
  await generateActivitiesForDay(1, 30);

  console.log("Database seeding complete!");
}

// ============================================
// Activity Generation
// ============================================

export async function generateActivitiesForDay(dayNumber: number, planDuration: number): Promise<void> {
  await pool.query("DELETE FROM daily_activities WHERE day_number = $1", [dayNumber]);

  const modules = (await pool.query("SELECT * FROM modules ORDER BY order_index, id")).rows;
  const exercises = (await pool.query("SELECT * FROM exercises")).rows;
  const flashcards = (await pool.query("SELECT * FROM flashcards")).rows;
  const mindmaps = (await pool.query("SELECT * FROM mindmaps")).rows;

  const totalModules = modules.length;
  const modulesPerDay = Math.max(1, Math.ceil(totalModules / planDuration));
  const startModuleIndex = Math.min((dayNumber - 1) * modulesPerDay, totalModules - 1);
  const endModuleIndex = Math.min(startModuleIndex + modulesPerDay, totalModules);

  const todayModules = modules.slice(startModuleIndex, endModuleIndex);
  const moduleIds = todayModules.map((m: any) => m.id);

  const insertActivity = async (act: any) => {
    await pool.query(
      `INSERT INTO daily_activities (day_number, activity_type, activity_id, title, description)
       VALUES ($1, $2, $3, $4, $5)`,
      [act.day_number, act.activity_type, act.activity_id, act.title, act.description]
    );
  };

  // 1. Module reading activities
  for (const mod of todayModules) {
    await insertActivity({
      day_number: dayNumber,
      activity_type: "module",
      activity_id: mod.id,
      title: `📚 Study Module: ${mod.title}`,
      description: `Read the full module, review cheatsheet, and understand key concepts. Category: ${mod.category}`,
    });
  }

  // 2. Exercises for current modules
  const exercisesPerDay = planDuration <= 30 ? 4 : planDuration <= 60 ? 3 : 2;
  const relevantExercises = exercises.filter((e: any) => moduleIds.includes(e.module_id));
  const allExercises =
    relevantExercises.length >= exercisesPerDay
      ? relevantExercises.slice(0, exercisesPerDay)
      : [
          ...relevantExercises,
          ...exercises
            .filter((e: any) => !moduleIds.includes(e.module_id))
            .slice(0, exercisesPerDay - relevantExercises.length),
        ];

  for (const ex of allExercises) {
    const exerciseModule = modules.find((m: any) => m.id === ex.module_id);
    await insertActivity({
      day_number: dayNumber,
      activity_type: "exercise",
      activity_id: ex.id,
      title: `🎯 Complete Exercise: ${ex.type.replace(/_/g, " ").toUpperCase()}`,
      description: exerciseModule
        ? `From: ${exerciseModule.title} | ${ex.prompt.substring(0, 60)}...`
        : ex.prompt.substring(0, 80),
    });
  }

  // 3. Mindmap review
  const relevantMindmaps = mindmaps.filter((mm: any) => moduleIds.includes(mm.module_id));
  for (const mm of relevantMindmaps) {
    await insertActivity({
      day_number: dayNumber,
      activity_type: "mindmap",
      activity_id: mm.id,
      title: `🗺️ Review Mind Map: ${mm.title}`,
      description: mm.description || "Visual overview of key concepts",
    });
  }

  // 4. Flashcard review
  const relevantFlashcards = flashcards.filter((fc: any) => moduleIds.includes(fc.module_id));
  const flashcardCount = Math.min(relevantFlashcards.length, planDuration <= 30 ? 10 : 6);
  if (flashcardCount > 0 || dayNumber > 1) {
    await insertActivity({
      day_number: dayNumber,
      activity_type: "flashcards",
      activity_id: null,
      title: `🃏 Review Flashcards`,
      description: `Spaced repetition review for: ${todayModules.map((m: any) => m.title).join(", ")}`,
    });
  }

  // 5. Lab practice
  await insertActivity({
    day_number: dayNumber,
    activity_type: "lab",
    activity_id: null,
    title: `🔬 Lab Practice: ${todayModules.length > 0 ? todayModules[0].category : "General"}`,
    description: planDuration <= 30 ? "2-3 hours hands-on practice" : "1-2 hours hands-on practice",
  });

  // 6. Daily reflection
  await insertActivity({
    day_number: dayNumber,
    activity_type: "reflection",
    activity_id: null,
    title: `📝 Daily Reflection & Notes`,
    description: "Document key learnings, challenges, and commands used",
  });

  const totalActivities = todayModules.length + allExercises.length + relevantMindmaps.length + 3;
  console.log(`Generated ${totalActivities} activities for day ${dayNumber}`);
}

export async function regenerateAllActivities(planDuration: number): Promise<void> {
  await pool.query("DELETE FROM daily_activities");
  for (let day = 1; day <= planDuration; day++) {
    await generateActivitiesForDay(day, planDuration);
  }
  console.log(`Regenerated activities for ${planDuration}-day plan`);
}

// ============================================
// Search Index (Postgres text search)
// ============================================

export async function buildSearchIndex(): Promise<void> {
  // For Postgres, we'll use simple ILIKE search instead of FTS5
  // The search_index table stores denormalized content for fast search
  await pool.query(`
    CREATE TABLE IF NOT EXISTS search_index (
      id SERIAL PRIMARY KEY,
      title TEXT,
      content TEXT,
      type TEXT,
      item_id INTEGER
    )
  `);
  await pool.query("DELETE FROM search_index");

  const modules = (await pool.query("SELECT id, title, summary, cheatsheet_md FROM modules")).rows;
  for (const mod of modules) {
    await pool.query(
      "INSERT INTO search_index (title, content, type, item_id) VALUES ($1, $2, $3, $4)",
      [mod.title, `${mod.summary || ""} ${mod.cheatsheet_md || ""}`, "module", mod.id]
    );
  }

  const exercises = (await pool.query("SELECT id, prompt, explanation FROM exercises")).rows;
  for (const ex of exercises) {
    await pool.query(
      "INSERT INTO search_index (title, content, type, item_id) VALUES ($1, $2, $3, $4)",
      [ex.prompt.substring(0, 100), `${ex.prompt} ${ex.explanation || ""}`, "exercise", ex.id]
    );
  }

  const flashcards = (await pool.query("SELECT id, question, answer FROM flashcards")).rows;
  for (const fc of flashcards) {
    await pool.query(
      "INSERT INTO search_index (title, content, type, item_id) VALUES ($1, $2, $3, $4)",
      [fc.question.substring(0, 100), `${fc.question} ${fc.answer}`, "flashcard", fc.id]
    );
  }

  const notes = (await pool.query("SELECT id, title, body_md FROM notes")).rows;
  for (const note of notes) {
    await pool.query(
      "INSERT INTO search_index (title, content, type, item_id) VALUES ($1, $2, $3, $4)",
      [note.title, note.body_md || "", "note", note.id]
    );
  }

  console.log("Search index built");
}

// ============================================
// SM-2 Spaced Repetition Algorithm
// ============================================

export function calculateNextReview(quality: number, flashcard: any) {
  let { ease_factor, interval, repetitions } = flashcard;

  if (quality < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * ease_factor);
    repetitions++;
  }

  ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (ease_factor < 1.3) ease_factor = 1.3;

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + interval);

  return {
    ease_factor,
    interval,
    repetitions,
    next_review: nextDate.toISOString().split("T")[0],
  };
}

// ============================================
// Async Query Helpers
// ============================================

export const queries = {
  // Modules
  getAllModules: async () => (await pool.query("SELECT * FROM modules ORDER BY order_index")).rows,
  getModuleById: async (id: number) => (await pool.query("SELECT * FROM modules WHERE id = $1", [id])).rows[0],
  getModuleBySlug: async (slug: string) => (await pool.query("SELECT * FROM modules WHERE slug = $1", [slug])).rows[0],

  // Exercises
  getAllExercises: async () =>
    (await pool.query("SELECT e.*, m.title as module_title FROM exercises e LEFT JOIN modules m ON e.module_id = m.id")).rows,
  getExerciseById: async (id: number) =>
    (await pool.query("SELECT e.*, m.title as module_title FROM exercises e LEFT JOIN modules m ON e.module_id = m.id WHERE e.id = $1", [id])).rows[0],
  getExercisesByModule: async (moduleId: number) =>
    (await pool.query("SELECT * FROM exercises WHERE module_id = $1", [moduleId])).rows,
  getExercisesByType: async (type: string) =>
    (await pool.query("SELECT * FROM exercises WHERE type = $1", [type])).rows,

  // Flashcards
  getAllFlashcards: async () =>
    (await pool.query("SELECT f.*, m.title as module_title FROM flashcards f LEFT JOIN modules m ON f.module_id = m.id")).rows,
  getFlashcardById: async (id: number) =>
    (await pool.query("SELECT * FROM flashcards WHERE id = $1", [id])).rows[0],
  getFlashcardsByModule: async (moduleId: number) =>
    (await pool.query("SELECT * FROM flashcards WHERE module_id = $1", [moduleId])).rows,
  getDueFlashcards: async () =>
    (await pool.query("SELECT * FROM flashcards WHERE next_review IS NULL OR next_review <= CURRENT_DATE::text ORDER BY next_review LIMIT 20")).rows,
  updateFlashcard: async (params: any) =>
    await pool.query("UPDATE flashcards SET ease_factor = $1, interval = $2, repetitions = $3, next_review = $4 WHERE id = $5",
      [params.ease_factor, params.interval, params.repetitions, params.next_review, params.id]),

  // Mind maps
  getAllMindmaps: async () =>
    (await pool.query("SELECT mm.*, m.title as module_title FROM mindmaps mm LEFT JOIN modules m ON mm.module_id = m.id")).rows,
  getMindmapById: async (id: number) =>
    (await pool.query("SELECT mm.*, m.title as module_title FROM mindmaps mm LEFT JOIN modules m ON mm.module_id = m.id WHERE mm.id = $1", [id])).rows[0],
  getMindmapsByModule: async (moduleId: number) =>
    (await pool.query("SELECT * FROM mindmaps WHERE module_id = $1", [moduleId])).rows,

  // Plan
  getAllPlanDays: async () =>
    (await pool.query("SELECT * FROM plan_days ORDER BY day_number")).rows,
  getPlanDay: async (dayNumber: number) =>
    (await pool.query("SELECT * FROM plan_days WHERE day_number = $1", [dayNumber])).rows[0],

  // Progress
  getProgress: async (itemType: string, itemId: number) =>
    (await pool.query("SELECT * FROM progress WHERE item_type = $1 AND item_id = $2", [itemType, itemId])).rows[0],
  getAllProgress: async () =>
    (await pool.query("SELECT * FROM progress")).rows,
  upsertProgress: async (params: any) =>
    await pool.query(
      `INSERT INTO progress (item_type, item_id, status, completed_at, score, last_seen)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT(item_type, item_id) DO UPDATE SET
         status = $3, completed_at = $4, score = $5, last_seen = $6`,
      [params.item_type, params.item_id, params.status, params.completed_at, params.score, params.last_seen]
    ),
  resetProgress: async () => await pool.query("DELETE FROM progress"),

  // Notes
  getAllNotes: async () =>
    (await pool.query("SELECT n.*, m.title as module_title FROM notes n LEFT JOIN modules m ON n.module_id = m.id ORDER BY updated_at DESC")).rows,
  getNoteById: async (id: number) =>
    (await pool.query("SELECT * FROM notes WHERE id = $1", [id])).rows[0],
  createNote: async (params: any) => {
    const result = await pool.query(
      "INSERT INTO notes (title, body_md, tags, module_id, template_type) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [params.title, params.body_md, params.tags, params.module_id, params.template_type]
    );
    return result.rows[0].id;
  },
  updateNote: async (params: any) =>
    await pool.query(
      "UPDATE notes SET title = $1, body_md = $2, tags = $3, module_id = $4, updated_at = NOW() WHERE id = $5",
      [params.title, params.body_md, params.tags, params.module_id, params.id]
    ),
  deleteNote: async (id: number) =>
    await pool.query("DELETE FROM notes WHERE id = $1", [id]),

  // Templates
  getAllTemplates: async () => (await pool.query("SELECT * FROM templates")).rows,
  getTemplateById: async (id: number) =>
    (await pool.query("SELECT * FROM templates WHERE id = $1", [id])).rows[0],

  // Search (ILIKE instead of FTS5)
  search: async (query: string) =>
    (await pool.query(
      "SELECT * FROM search_index WHERE title ILIKE $1 OR content ILIKE $1 ORDER BY title LIMIT 50",
      [`%${query}%`]
    )).rows,

  // Stats
  getStats: async () => {
    const [
      totalModulesRes,
      totalExercisesRes,
      totalFlashcardsRes,
      completedExercisesRes,
      completedDaysRes,
      dueFlashcardsRes
    ] = await Promise.all([
      pool.query("SELECT COUNT(*)::int as count FROM modules"),
      pool.query("SELECT COUNT(*)::int as count FROM exercises"),
      pool.query("SELECT COUNT(*)::int as count FROM flashcards"),
      pool.query("SELECT COUNT(*)::int as count FROM progress WHERE item_type = 'exercise' AND status = 'completed'"),
      pool.query("SELECT COUNT(*)::int as count FROM progress WHERE item_type = 'plan_day' AND status = 'completed'"),
      pool.query("SELECT COUNT(*)::int as count FROM flashcards WHERE next_review IS NULL OR next_review <= CURRENT_DATE::text")
    ]);

    const totalModules = totalModulesRes.rows[0].count;
    const totalExercises = totalExercisesRes.rows[0].count;
    const totalFlashcards = totalFlashcardsRes.rows[0].count;
    const completedExercises = completedExercisesRes.rows[0].count;
    const completedDays = completedDaysRes.rows[0].count;
    const dueFlashcards = dueFlashcardsRes.rows[0].count;

    return {
      totalModules,
      totalExercises,
      totalFlashcards,
      completedExercises,
      completedDays,
      dueFlashcards,
      overallProgress: totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0,
    };
  },

  // User Settings
  clearAllSessions: async () => {
    try {
      await pool.query("TRUNCATE TABLE session CASCADE");
    } catch (e) {
      console.log("No session table to truncate yet.");
    }
  },
  getUserSettings: async () =>
    (await pool.query("SELECT * FROM user_settings WHERE id = 1")).rows[0] || { plan_duration: 30, current_day: 1 },
  updateUserSettings: async (params: any) =>
    await pool.query(
      "UPDATE user_settings SET plan_duration = $1, start_date = $2, current_day = $3 WHERE id = 1",
      [params.plan_duration, params.start_date, params.current_day]
    ),
  advanceDay: async () =>
    await pool.query("UPDATE user_settings SET current_day = current_day + 1 WHERE id = 1"),
  resetPlan: async (duration: number) => {
    await pool.query("UPDATE user_settings SET plan_duration = $1, current_day = 1, start_date = $2 WHERE id = 1",
      [duration, new Date().toISOString().split("T")[0]]);
    await pool.query("DELETE FROM daily_activities");
    await pool.query("DELETE FROM reflections");
    await pool.query("DELETE FROM progress");
  },

  // Reflections
  getReflection: async (dayNumber: number) =>
    (await pool.query("SELECT * FROM reflections WHERE day_number = $1", [dayNumber])).rows[0],
  getAllReflections: async () =>
    (await pool.query("SELECT * FROM reflections ORDER BY day_number")).rows,
  upsertReflection: async (params: any) =>
    await pool.query(
      `INSERT INTO reflections (day_number, content, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT(day_number) DO UPDATE SET content = $2, updated_at = NOW()`,
      [params.day_number, params.content]
    ),

  // Daily Activities
  getActivitiesForDay: async (dayNumber: number) =>
    (await pool.query("SELECT * FROM daily_activities WHERE day_number = $1 ORDER BY id", [dayNumber])).rows,
  getAllActivities: async () =>
    (await pool.query("SELECT * FROM daily_activities ORDER BY day_number, id")).rows,
  createActivity: async (params: any) =>
    await pool.query(
      "INSERT INTO daily_activities (day_number, activity_type, activity_id, title, description) VALUES ($1, $2, $3, $4, $5)",
      [params.day_number, params.activity_type, params.activity_id, params.title, params.description]
    ),
  completeActivity: async (id: number) =>
    await pool.query("UPDATE daily_activities SET completed = 1, completed_at = $1 WHERE id = $2",
      [new Date().toISOString(), id]),
  uncompleteActivity: async (id: number) =>
    await pool.query("UPDATE daily_activities SET completed = 0, completed_at = NULL WHERE id = $1", [id]),
  getDayProgress: async (dayNumber: number) => {
    const total = (await pool.query("SELECT COUNT(*)::int as count FROM daily_activities WHERE day_number = $1", [dayNumber])).rows[0].count;
    const completed = (await pool.query("SELECT COUNT(*)::int as count FROM daily_activities WHERE day_number = $1 AND completed = 1", [dayNumber])).rows[0].count;
    return { total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  },
  isDayComplete: async (dayNumber: number) => {
    const progress = await queries.getDayProgress(dayNumber);
    return progress.total > 0 && progress.completed === progress.total;
  },
  clearActivities: async () => await pool.query("DELETE FROM daily_activities"),
};

export default pool;
