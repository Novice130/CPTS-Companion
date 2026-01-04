import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const root = join(__dirname, "..");
const seedDir = join(root, "seed");

function readJson(relPath) {
  const raw = readFileSync(join(seedDir, relPath), "utf-8");
  return JSON.parse(raw);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function uniq(arr) {
  return Array.from(new Set(arr));
}

function validate() {
  const modules = readJson("modules.json");
  const exercises = readJson("exercises.json");
  const flashcards = readJson("flashcards.json");
  const mindmaps = readJson("mindmaps.json");
  const plan = readJson("plan.json");
  const templates = readJson("templates.json");

  const errors = [];
  const warnings = [];

  const moduleCount = modules.length;

  // Modules sanity
  const slugs = modules.map((m) => m.slug);
  const duplicateSlugs = uniq(slugs.filter((s, i) => slugs.indexOf(s) !== i));
  if (duplicateSlugs.length) {
    errors.push(`Duplicate module slugs: ${duplicateSlugs.join(", ")}`);
  }

  for (const [idx, mod] of modules.entries()) {
    if (!mod.title || !mod.slug || !mod.category) {
      errors.push(
        `modules.json[${idx}] missing required fields (title/slug/category)`
      );
    }
  }

  // Helper for module_id references
  const checkModuleId = (item, idx, file) => {
    if (item.module_id === null || item.module_id === undefined) return;
    if (!Number.isInteger(item.module_id)) {
      errors.push(`${file}[${idx}].module_id is not an integer`);
      return;
    }
    if (item.module_id < 1 || item.module_id > moduleCount) {
      errors.push(
        `${file}[${idx}].module_id=${item.module_id} out of range (1..${moduleCount})`
      );
    }
  };

  exercises.forEach((ex, i) => {
    checkModuleId(ex, i, "exercises.json");
    if (!ex.type || !ex.prompt || !ex.answer)
      errors.push(
        `exercises.json[${i}] missing required fields (type/prompt/answer)`
      );
  });

  flashcards.forEach((fc, i) => {
    checkModuleId(fc, i, "flashcards.json");
    if (!fc.question || !fc.answer)
      errors.push(
        `flashcards.json[${i}] missing required fields (question/answer)`
      );
  });

  mindmaps.forEach((mm, i) => {
    checkModuleId(mm, i, "mindmaps.json");
    if (!mm.title || !mm.mermaid_code)
      errors.push(
        `mindmaps.json[${i}] missing required fields (title/mermaid_code)`
      );
    if (typeof mm.mermaid_code === "string" && !mm.mermaid_code.trim())
      errors.push(`mindmaps.json[${i}].mermaid_code is empty`);
  });

  plan.forEach((day, i) => {
    if (!Number.isInteger(day.day_number) || day.day_number < 1)
      errors.push(`plan.json[${i}] invalid day_number`);
    if (!day.title) errors.push(`plan.json[${i}] missing title`);
    if (
      day.estimated_hours !== undefined &&
      typeof day.estimated_hours !== "number"
    )
      warnings.push(`plan.json[${i}].estimated_hours not a number`);
  });

  templates.forEach((t, i) => {
    if (!t.name || !t.type || !t.content_md)
      errors.push(
        `templates.json[${i}] missing required fields (name/type/content_md)`
      );
  });

  // Cross-file warnings (heuristics)
  const moduleIdsUsed = uniq([
    ...exercises.map((e) => e.module_id).filter(Boolean),
    ...flashcards.map((f) => f.module_id).filter(Boolean),
    ...mindmaps
      .map((m) => m.module_id)
      .filter((x) => x !== null && x !== undefined),
  ]);

  if (moduleIdsUsed.length === 0)
    warnings.push("No module_id references found in seed data");

  return {
    errors,
    warnings,
    stats: {
      moduleCount,
      exercises: exercises.length,
      flashcards: flashcards.length,
      mindmaps: mindmaps.length,
      planDays: plan.length,
      templates: templates.length,
    },
  };
}

try {
  const result = validate();
  console.log("Seed validation stats:", result.stats);
  if (result.warnings.length) {
    console.warn("\nWarnings:");
    result.warnings.forEach((w) => console.warn("-", w));
  }
  if (result.errors.length) {
    console.error("\nErrors:");
    result.errors.forEach((e) => console.error("-", e));
    process.exitCode = 1;
  } else {
    console.log("\nOK: seed data looks internally consistent.");
  }
} catch (e) {
  console.error("Seed validation failed:", e?.message || e);
  process.exitCode = 1;
}
