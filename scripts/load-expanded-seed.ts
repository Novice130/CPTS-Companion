/**
 * load-expanded-seed.ts
 *
 * Merges expanded seed data (modules, exercises, flashcards) into the live database.
 * Safe to run multiple times — uses ON CONFLICT DO NOTHING / upsert logic.
 *
 * Usage:
 *   npx tsx scripts/load-expanded-seed.ts
 *   npx tsx scripts/load-expanded-seed.ts --dry-run   (preview only, no writes)
 *   npx tsx scripts/load-expanded-seed.ts --modules   (modules only)
 *   npx tsx scripts/load-expanded-seed.ts --exercises  (exercises only)
 *   npx tsx scripts/load-expanded-seed.ts --flashcards (flashcards only)
 */

import pg from "pg";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, "..");
const seedDir = join(root, "seed");

// ──────────────────────────────────────────────────────────────
// CLI flags
// ──────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const ONLY_MODULES = args.includes("--modules");
const ONLY_EXERCISES = args.includes("--exercises");
const ONLY_FLASHCARDS = args.includes("--flashcards");
const ALL = !ONLY_MODULES && !ONLY_EXERCISES && !ONLY_FLASHCARDS;

if (DRY_RUN) console.log("🔍 DRY RUN — no changes will be written.\n");

// ──────────────────────────────────────────────────────────────
// DB connection
// ──────────────────────────────────────────────────────────────
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL not set. Create a .env file.");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
});

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
function readJson<T>(file: string): T {
  const p = join(seedDir, file);
  if (!existsSync(p)) {
    console.error(`❌ File not found: ${p}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(p, "utf-8")) as T;
}

interface ModuleRow {
  title: string;
  slug: string;
  category: string;
  summary?: string;
  cheatsheet_md?: string;
  pitfalls_md?: string;
  exam_tips_md?: string;
  order_index?: number;
}

interface ExerciseRow {
  module_id: number;
  type: string;
  difficulty?: string;
  prompt: string;
  options?: string[] | null;
  answer: string;
  explanation?: string;
  validation_regex?: string | null;
  hints?: string[] | null;
}

interface FlashcardRow {
  module_id: number;
  question: string;
  answer: string;
  tags?: string[];
}

// ──────────────────────────────────────────────────────────────
// Load modules
// ──────────────────────────────────────────────────────────────
async function loadModules(): Promise<void> {
  const modules = readJson<ModuleRow[]>("modules-expanded.json");
  console.log(`📦 Modules to import: ${modules.length}`);

  // Get existing slugs to detect duplicates
  const existing = await pool.query<{ slug: string; id: number }>(
    "SELECT slug, id FROM modules"
  );
  const slugToId = new Map(existing.rows.map((r) => [r.slug, r.id]));

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const mod of modules) {
    if (slugToId.has(mod.slug)) {
      // Upsert: update existing module with richer content
      if (!DRY_RUN) {
        await pool.query(
          `UPDATE modules
           SET title=$1, category=$2, summary=$3, cheatsheet_md=$4,
               pitfalls_md=$5, exam_tips_md=$6, order_index=$7
           WHERE slug=$8`,
          [
            mod.title,
            mod.category,
            mod.summary ?? null,
            mod.cheatsheet_md ?? null,
            mod.pitfalls_md ?? null,
            mod.exam_tips_md ?? null,
            mod.order_index ?? 0,
            mod.slug,
          ]
        );
      }
      updated++;
      console.log(`  ↻ Updated  [${mod.slug}]`);
    } else {
      // Insert new module
      if (!DRY_RUN) {
        const result = await pool.query<{ id: number }>(
          `INSERT INTO modules (title, slug, category, summary, cheatsheet_md, pitfalls_md, exam_tips_md, order_index)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
          [
            mod.title,
            mod.slug,
            mod.category,
            mod.summary ?? null,
            mod.cheatsheet_md ?? null,
            mod.pitfalls_md ?? null,
            mod.exam_tips_md ?? null,
            mod.order_index ?? 0,
          ]
        );
        slugToId.set(mod.slug, result.rows[0].id);
      }
      inserted++;
      console.log(`  + Inserted [${mod.slug}] (order ${mod.order_index})`);
    }
  }

  console.log(
    `\n✅ Modules done — ${inserted} inserted, ${updated} updated, ${skipped} skipped.\n`
  );
}

// ──────────────────────────────────────────────────────────────
// Load exercises
// ──────────────────────────────────────────────────────────────
async function loadExercises(): Promise<void> {
  const exercises = readJson<ExerciseRow[]>("exercises-expanded.json");
  console.log(`📦 Exercises to import: ${exercises.length}`);

  // Get max module_id to validate references
  const { rows: mods } = await pool.query<{ count: number }>(
    "SELECT COUNT(*)::int as count FROM modules"
  );
  const moduleCount = mods[0].count;

  // Get existing exercise prompts (to avoid exact duplicates)
  const { rows: existing } = await pool.query<{ prompt: string }>(
    "SELECT prompt FROM exercises"
  );
  const existingPrompts = new Set(existing.map((r) => r.prompt));

  let inserted = 0;
  let skipped = 0;
  let invalid = 0;

  for (const ex of exercises) {
    // Validate module_id
    if (ex.module_id < 1 || ex.module_id > moduleCount) {
      console.warn(
        `  ⚠ Skipping exercise (module_id=${ex.module_id} out of range): ${ex.prompt.substring(0, 60)}...`
      );
      invalid++;
      continue;
    }

    // Skip if exact prompt already exists
    if (existingPrompts.has(ex.prompt)) {
      skipped++;
      continue;
    }

    if (!DRY_RUN) {
      await pool.query(
        `INSERT INTO exercises (module_id, type, difficulty, prompt, options, answer, explanation, validation_regex, hints)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          ex.module_id,
          ex.type,
          ex.difficulty ?? "medium",
          ex.prompt,
          ex.options ? JSON.stringify(ex.options) : null,
          ex.answer,
          ex.explanation ?? null,
          ex.validation_regex ?? null,
          ex.hints ? JSON.stringify(ex.hints) : null,
        ]
      );
    }

    existingPrompts.add(ex.prompt);
    inserted++;
  }

  console.log(
    `\n✅ Exercises done — ${inserted} inserted, ${skipped} skipped (duplicates), ${invalid} invalid.\n`
  );
}

// ──────────────────────────────────────────────────────────────
// Load flashcards
// ──────────────────────────────────────────────────────────────
async function loadFlashcards(): Promise<void> {
  const flashcards = readJson<FlashcardRow[]>("flashcards-expanded.json");
  console.log(`📦 Flashcards to import: ${flashcards.length}`);

  // Get max module_id
  const { rows: mods } = await pool.query<{ count: number }>(
    "SELECT COUNT(*)::int as count FROM modules"
  );
  const moduleCount = mods[0].count;

  // Get existing questions to avoid duplicates
  const { rows: existing } = await pool.query<{ question: string }>(
    "SELECT question FROM flashcards"
  );
  const existingQuestions = new Set(existing.map((r) => r.question));

  let inserted = 0;
  let skipped = 0;
  let invalid = 0;

  for (const fc of flashcards) {
    if (fc.module_id < 1 || fc.module_id > moduleCount) {
      console.warn(
        `  ⚠ Skipping flashcard (module_id=${fc.module_id} out of range): ${fc.question.substring(0, 60)}`
      );
      invalid++;
      continue;
    }

    if (existingQuestions.has(fc.question)) {
      skipped++;
      continue;
    }

    if (!DRY_RUN) {
      await pool.query(
        `INSERT INTO flashcards (module_id, question, answer, tags)
         VALUES ($1,$2,$3,$4)`,
        [
          fc.module_id,
          fc.question,
          fc.answer,
          fc.tags ? JSON.stringify(fc.tags) : null,
        ]
      );
    }

    existingQuestions.add(fc.question);
    inserted++;
  }

  console.log(
    `\n✅ Flashcards done — ${inserted} inserted, ${skipped} skipped (duplicates), ${invalid} invalid.\n`
  );
}

// ──────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log("🚀 CPTS Companion — Expanded Seed Loader");
  console.log("=========================================\n");

  try {
    // Verify DB connectivity
    const { rows } = await pool.query("SELECT NOW() as time");
    console.log(`🔌 Connected to database at ${rows[0].time}\n`);

    if (ALL || ONLY_MODULES) await loadModules();
    if (ALL || ONLY_EXERCISES) await loadExercises();
    if (ALL || ONLY_FLASHCARDS) await loadFlashcards();

    console.log("🎉 All done!");
    if (DRY_RUN) {
      console.log("\n(No changes were written — run without --dry-run to apply.)");
    }
  } catch (err) {
    console.error("❌ Fatal error:", err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
