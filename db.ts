import Database from 'better-sqlite3';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize database
const db = new Database(join(__dirname, 'cpts.db'));
db.pragma('journal_mode = WAL');

// Create tables
export function initDatabase(): void {
  db.exec(`
    -- Modules table
    CREATE TABLE IF NOT EXISTS modules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id INTEGER,
      type TEXT NOT NULL,
      difficulty TEXT DEFAULT 'medium',
      prompt TEXT NOT NULL,
      options TEXT,
      answer TEXT NOT NULL,
      explanation TEXT,
      validation_regex TEXT,
      hints TEXT,
      FOREIGN KEY (module_id) REFERENCES modules(id)
    );

    -- Flashcards table
    CREATE TABLE IF NOT EXISTS flashcards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id INTEGER,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      tags TEXT,
      ease_factor REAL DEFAULT 2.5,
      interval INTEGER DEFAULT 0,
      repetitions INTEGER DEFAULT 0,
      next_review TEXT,
      FOREIGN KEY (module_id) REFERENCES modules(id)
    );

    -- Mind maps table
    CREATE TABLE IF NOT EXISTS mindmaps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      mermaid_code TEXT NOT NULL,
      FOREIGN KEY (module_id) REFERENCES modules(id)
    );

    -- 30-Day Plan table
    CREATE TABLE IF NOT EXISTS plan_days (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body_md TEXT,
      tags TEXT,
      module_id INTEGER,
      template_type TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (module_id) REFERENCES modules(id)
    );

    -- Templates table
    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      content_md TEXT NOT NULL
    );

    -- Create FTS virtual table for search
    CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(
      title, content, type, item_id
    );

    -- User settings for plan preferences
    CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      plan_duration INTEGER DEFAULT 30,
      start_date TEXT,
      current_day INTEGER DEFAULT 1
    );

    -- Daily reflection notes
    CREATE TABLE IF NOT EXISTS reflections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day_number INTEGER NOT NULL UNIQUE,
      content TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Daily activities tracking
    CREATE TABLE IF NOT EXISTS daily_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day_number INTEGER NOT NULL,
      activity_type TEXT NOT NULL,
      activity_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      completed INTEGER DEFAULT 0,
      completed_at TEXT
    );

    -- Initialize default user settings if not exists
    INSERT OR IGNORE INTO user_settings (id, plan_duration, current_day) VALUES (1, 30, 1);
  `);

  console.log('Database schema initialized');
}

// Seed data from JSON files
export function seedDatabase(): void {
  const modulesCount = db.prepare('SELECT COUNT(*) as count FROM modules').get() as { count: number };
  
  if (modulesCount.count > 0) {
    console.log('Database already seeded, skipping...');
    return;
  }

  console.log('Seeding database...');

  // Seed modules
  const modulesPath = join(__dirname, 'seed', 'modules.json');
  if (existsSync(modulesPath)) {
    const modules = JSON.parse(readFileSync(modulesPath, 'utf-8'));
    const insertModule = db.prepare(`
      INSERT INTO modules (title, slug, category, summary, cheatsheet_md, pitfalls_md, exam_tips_md, order_index)
      VALUES (@title, @slug, @category, @summary, @cheatsheet_md, @pitfalls_md, @exam_tips_md, @order_index)
    `);
    for (const mod of modules) {
      insertModule.run(mod);
    }
    console.log(`Seeded ${modules.length} modules`);
  }

  // Seed exercises
  const exercisesPath = join(__dirname, 'seed', 'exercises.json');
  if (existsSync(exercisesPath)) {
    const exercises = JSON.parse(readFileSync(exercisesPath, 'utf-8'));
    const insertExercise = db.prepare(`
      INSERT INTO exercises (module_id, type, difficulty, prompt, options, answer, explanation, validation_regex, hints)
      VALUES (@module_id, @type, @difficulty, @prompt, @options, @answer, @explanation, @validation_regex, @hints)
    `);
    for (const ex of exercises) {
      insertExercise.run({
        ...ex,
        options: ex.options ? JSON.stringify(ex.options) : null,
        hints: ex.hints ? JSON.stringify(ex.hints) : null
      });
    }
    console.log(`Seeded ${exercises.length} exercises`);
  }

  // Seed flashcards
  const flashcardsPath = join(__dirname, 'seed', 'flashcards.json');
  if (existsSync(flashcardsPath)) {
    const flashcards = JSON.parse(readFileSync(flashcardsPath, 'utf-8'));
    const insertFlashcard = db.prepare(`
      INSERT INTO flashcards (module_id, question, answer, tags)
      VALUES (@module_id, @question, @answer, @tags)
    `);
    for (const fc of flashcards) {
      insertFlashcard.run({
        ...fc,
        tags: fc.tags ? JSON.stringify(fc.tags) : null
      });
    }
    console.log(`Seeded ${flashcards.length} flashcards`);
  }

  // Seed mindmaps
  const mindmapsPath = join(__dirname, 'seed', 'mindmaps.json');
  if (existsSync(mindmapsPath)) {
    const mindmaps = JSON.parse(readFileSync(mindmapsPath, 'utf-8'));
    const insertMindmap = db.prepare(`
      INSERT INTO mindmaps (module_id, title, description, mermaid_code)
      VALUES (@module_id, @title, @description, @mermaid_code)
    `);
    for (const mm of mindmaps) {
      insertMindmap.run(mm);
    }
    console.log(`Seeded ${mindmaps.length} mindmaps`);
  }

  // Seed 30-day plan
  const planPath = join(__dirname, 'seed', 'plan.json');
  if (existsSync(planPath)) {
    const plan = JSON.parse(readFileSync(planPath, 'utf-8'));
    const insertDay = db.prepare(`
      INSERT INTO plan_days (day_number, title, topics, estimated_hours, exercises, lab_focus, review_topics)
      VALUES (@day_number, @title, @topics, @estimated_hours, @exercises, @lab_focus, @review_topics)
    `);
    for (const day of plan) {
      insertDay.run({
        ...day,
        topics: day.topics ? JSON.stringify(day.topics) : null,
        exercises: day.exercises ? JSON.stringify(day.exercises) : null,
        review_topics: day.review_topics ? JSON.stringify(day.review_topics) : null
      });
    }
    console.log(`Seeded ${plan.length} plan days`);
  }

  // Seed templates
  const templatesPath = join(__dirname, 'seed', 'templates.json');
  if (existsSync(templatesPath)) {
    const templates = JSON.parse(readFileSync(templatesPath, 'utf-8'));
    const insertTemplate = db.prepare(`
      INSERT INTO templates (name, type, content_md)
      VALUES (@name, @type, @content_md)
    `);
    for (const tmpl of templates) {
      insertTemplate.run(tmpl);
    }
    console.log(`Seeded ${templates.length} templates`);
  }

  // Build search index
  buildSearchIndex();
  
  // Generate initial activities for day 1
  generateActivitiesForDay(1, 30);
  
  console.log('Database seeding complete!');
}

// Generate activities for a specific day based on plan duration
export function generateActivitiesForDay(dayNumber: number, planDuration: number): void {
  // Clear existing activities for this day
  db.prepare('DELETE FROM daily_activities WHERE day_number = ?').run(dayNumber);
  
  const modules = db.prepare('SELECT * FROM modules ORDER BY order_index, id').all() as any[];
  const exercises = db.prepare('SELECT * FROM exercises').all() as any[];
  const flashcards = db.prepare('SELECT * FROM flashcards').all() as any[];
  const mindmaps = db.prepare('SELECT * FROM mindmaps').all() as any[];
  
  // Calculate modules per day based on plan duration
  const totalModules = modules.length; // 26 modules
  const modulesPerDay = Math.max(1, Math.ceil(totalModules / planDuration));
  
  // Determine which module(s) to focus on for this day
  const startModuleIndex = Math.min((dayNumber - 1) * modulesPerDay, totalModules - 1);
  const endModuleIndex = Math.min(startModuleIndex + modulesPerDay, totalModules);
  
  const insertActivity = db.prepare(`
    INSERT INTO daily_activities (day_number, activity_type, activity_id, title, description)
    VALUES (@day_number, @activity_type, @activity_id, @title, @description)
  `);
  
  const todayModules = modules.slice(startModuleIndex, endModuleIndex);
  const moduleIds = todayModules.map(m => m.id);
  
  // 1. Add module reading activities - one per module for today
  todayModules.forEach((mod) => {
    insertActivity.run({
      day_number: dayNumber,
      activity_type: 'module',
      activity_id: mod.id,
      title: `📚 Study Module: ${mod.title}`,
      description: `Read the full module, review cheatsheet, and understand key concepts. Category: ${mod.category}`
    });
  });
  
  // 2. Add exercises for the current modules
  const exercisesPerDay = planDuration <= 30 ? 4 : (planDuration <= 60 ? 3 : 2);
  const relevantExercises = exercises.filter((e: any) => moduleIds.includes(e.module_id));
  const allExercises = relevantExercises.length >= exercisesPerDay 
    ? relevantExercises.slice(0, exercisesPerDay)
    : [...relevantExercises, ...exercises.filter((e: any) => !moduleIds.includes(e.module_id)).slice(0, exercisesPerDay - relevantExercises.length)];
  
  allExercises.forEach((ex: any) => {
    const exerciseModule = modules.find(m => m.id === ex.module_id);
    insertActivity.run({
      day_number: dayNumber,
      activity_type: 'exercise',
      activity_id: ex.id,
      title: `🎯 Complete Exercise: ${ex.type.replace(/_/g, ' ').toUpperCase()}`,
      description: exerciseModule ? `From: ${exerciseModule.title} | ${ex.prompt.substring(0, 60)}...` : ex.prompt.substring(0, 80)
    });
  });
  
  // 3. Add mindmap review for today's modules
  const relevantMindmaps = mindmaps.filter((mm: any) => moduleIds.includes(mm.module_id));
  relevantMindmaps.forEach((mm: any) => {
    insertActivity.run({
      day_number: dayNumber,
      activity_type: 'mindmap',
      activity_id: mm.id,
      title: `🗺️ Review Mind Map: ${mm.title}`,
      description: mm.description || 'Visual overview of key concepts'
    });
  });
  
  // 4. Add flashcard review
  const relevantFlashcards = flashcards.filter((fc: any) => moduleIds.includes(fc.module_id));
  const flashcardCount = Math.min(relevantFlashcards.length, planDuration <= 30 ? 10 : 6);
  
  if (flashcardCount > 0 || dayNumber > 1) {
    insertActivity.run({
      day_number: dayNumber,
      activity_type: 'flashcards',
      activity_id: null,
      title: `🃏 Review Flashcards`,
      description: `Spaced repetition review for: ${todayModules.map(m => m.title).join(', ')}`
    });
  }
  
  // 5. Add lab practice
  insertActivity.run({
    day_number: dayNumber,
    activity_type: 'lab',
    activity_id: null,
    title: `🔬 Lab Practice: ${todayModules.length > 0 ? todayModules[0].category : 'General'}`,
    description: planDuration <= 30 ? '2-3 hours hands-on practice' : '1-2 hours hands-on practice'
  });
  
  // 6. Add daily reflection
  insertActivity.run({
    day_number: dayNumber,
    activity_type: 'reflection',
    activity_id: null,
    title: `📝 Daily Reflection & Notes`,
    description: 'Document key learnings, challenges, and commands used'
  });
  
  const totalActivities = todayModules.length + allExercises.length + relevantMindmaps.length + 3;
  console.log(`Generated ${totalActivities} activities for day ${dayNumber}`);
}

// Regenerate all activities for a new plan duration
export function regenerateAllActivities(planDuration: number): void {
  db.exec('DELETE FROM daily_activities');
  
  for (let day = 1; day <= planDuration; day++) {
    generateActivitiesForDay(day, planDuration);
  }
  
  console.log(`Regenerated activities for ${planDuration}-day plan`);
}

// Build full-text search index
export function buildSearchIndex(): void {
  db.exec('DELETE FROM search_index');
  
  // Index modules
  const modules = db.prepare('SELECT id, title, summary, cheatsheet_md FROM modules').all() as any[];
  const insertSearch = db.prepare('INSERT INTO search_index (title, content, type, item_id) VALUES (?, ?, ?, ?)');
  
  for (const mod of modules) {
    insertSearch.run(mod.title, `${mod.summary || ''} ${mod.cheatsheet_md || ''}`, 'module', mod.id);
  }

  // Index exercises
  const exercises = db.prepare('SELECT id, prompt, explanation FROM exercises').all() as any[];
  for (const ex of exercises) {
    insertSearch.run(ex.prompt.substring(0, 100), `${ex.prompt} ${ex.explanation || ''}`, 'exercise', ex.id);
  }

  // Index flashcards
  const flashcards = db.prepare('SELECT id, question, answer FROM flashcards').all() as any[];
  for (const fc of flashcards) {
    insertSearch.run(fc.question.substring(0, 100), `${fc.question} ${fc.answer}`, 'flashcard', fc.id);
  }

  // Index notes
  const notes = db.prepare('SELECT id, title, body_md FROM notes').all() as any[];
  for (const note of notes) {
    insertSearch.run(note.title, note.body_md || '', 'note', note.id);
  }

  console.log('Search index built');
}

// SM-2 Spaced Repetition Algorithm
export function calculateNextReview(quality: number, flashcard: any): { ease_factor: number; interval: number; repetitions: number; next_review: string } {
  let { ease_factor, interval, repetitions } = flashcard;
  
  if (quality < 3) {
    repetitions = 0;
    interval = 1;
  } else {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * ease_factor);
    }
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
    next_review: nextDate.toISOString().split('T')[0]
  };
}

// Database query helpers
export const queries = {
  // Modules
  getAllModules: () => db.prepare('SELECT * FROM modules ORDER BY order_index').all(),
  getModuleById: (id: number) => db.prepare('SELECT * FROM modules WHERE id = ?').get(id),
  getModuleBySlug: (slug: string) => db.prepare('SELECT * FROM modules WHERE slug = ?').get(slug),
  
  // Exercises
  getAllExercises: () => db.prepare('SELECT e.*, m.title as module_title FROM exercises e LEFT JOIN modules m ON e.module_id = m.id').all(),
  getExerciseById: (id: number) => db.prepare('SELECT e.*, m.title as module_title FROM exercises e LEFT JOIN modules m ON e.module_id = m.id WHERE e.id = ?').get(id),
  getExercisesByModule: (moduleId: number) => db.prepare('SELECT * FROM exercises WHERE module_id = ?').all(moduleId),
  getExercisesByType: (type: string) => db.prepare('SELECT * FROM exercises WHERE type = ?').all(type),
  
  // Flashcards
  getAllFlashcards: () => db.prepare('SELECT f.*, m.title as module_title FROM flashcards f LEFT JOIN modules m ON f.module_id = m.id').all(),
  getFlashcardById: (id: number) => db.prepare('SELECT * FROM flashcards WHERE id = ?').get(id),
  getFlashcardsByModule: (moduleId: number) => db.prepare('SELECT * FROM flashcards WHERE module_id = ?').all(moduleId),
  getDueFlashcards: () => db.prepare("SELECT * FROM flashcards WHERE next_review IS NULL OR next_review <= date('now') ORDER BY next_review LIMIT 20").all(),
  updateFlashcard: { run: (params: any) => db.prepare('UPDATE flashcards SET ease_factor = @ease_factor, interval = @interval, repetitions = @repetitions, next_review = @next_review WHERE id = @id').run(params) },
  
  // Mind maps
  getAllMindmaps: () => db.prepare('SELECT mm.*, m.title as module_title FROM mindmaps mm LEFT JOIN modules m ON mm.module_id = m.id').all(),
  getMindmapById: (id: number) => db.prepare('SELECT mm.*, m.title as module_title FROM mindmaps mm LEFT JOIN modules m ON mm.module_id = m.id WHERE mm.id = ?').get(id),
  getMindmapsByModule: (moduleId: number) => db.prepare('SELECT * FROM mindmaps WHERE module_id = ?').all(moduleId),
  
  // Plan
  getAllPlanDays: () => db.prepare('SELECT * FROM plan_days ORDER BY day_number').all(),
  getPlanDay: (dayNumber: number) => db.prepare('SELECT * FROM plan_days WHERE day_number = ?').get(dayNumber),
  
  // Progress
  getProgress: (itemType: string, itemId: number) => db.prepare('SELECT * FROM progress WHERE item_type = ? AND item_id = ?').get(itemType, itemId),
  getAllProgress: () => db.prepare('SELECT * FROM progress').all(),
  upsertProgress: { run: (params: any) => db.prepare(`
    INSERT INTO progress (item_type, item_id, status, completed_at, score, last_seen)
    VALUES (@item_type, @item_id, @status, @completed_at, @score, @last_seen)
    ON CONFLICT(item_type, item_id) DO UPDATE SET
      status = @status, completed_at = @completed_at, score = @score, last_seen = @last_seen
  `).run(params) },
  resetProgress: () => db.exec('DELETE FROM progress'),
  
  getAllNotes: () => db.prepare('SELECT n.*, m.title as module_title FROM notes n LEFT JOIN modules m ON n.module_id = m.id ORDER BY updated_at DESC').all(),
  getNoteById: (id: number) => db.prepare('SELECT * FROM notes WHERE id = ?').get(id),
  createNote: { run: (params: any) => db.prepare('INSERT INTO notes (title, body_md, tags, module_id, template_type) VALUES (@title, @body_md, @tags, @module_id, @template_type)').run(params), get lastInsertRowid() { return db.prepare('SELECT last_insert_rowid() as id').get() as any; } },
  updateNote: { run: (params: any) => db.prepare('UPDATE notes SET title = @title, body_md = @body_md, tags = @tags, module_id = @module_id, updated_at = CURRENT_TIMESTAMP WHERE id = @id').run(params) },
  deleteNote: (id: number) => db.prepare('DELETE FROM notes WHERE id = ?').run(id),
  
  // Templates
  getAllTemplates: () => db.prepare('SELECT * FROM templates').all(),
  getTemplateById: (id: number) => db.prepare('SELECT * FROM templates WHERE id = ?').get(id),
  
  // Search
  search: (query: string) => db.prepare("SELECT * FROM search_index WHERE search_index MATCH ? ORDER BY rank LIMIT 50").all(query),
  
  // Stats
  getStats: () => {
    const totalModules = (db.prepare('SELECT COUNT(*) as count FROM modules').get() as any).count;
    const totalExercises = (db.prepare('SELECT COUNT(*) as count FROM exercises').get() as any).count;
    const totalFlashcards = (db.prepare('SELECT COUNT(*) as count FROM flashcards').get() as any).count;
    const completedExercises = (db.prepare("SELECT COUNT(*) as count FROM progress WHERE item_type = 'exercise' AND status = 'completed'").get() as any).count;
    const completedDays = (db.prepare("SELECT COUNT(*) as count FROM progress WHERE item_type = 'plan_day' AND status = 'completed'").get() as any).count;
    const dueFlashcards = (db.prepare("SELECT COUNT(*) as count FROM flashcards WHERE next_review IS NULL OR next_review <= date('now')").get() as any).count;
    
    return {
      totalModules,
      totalExercises,
      totalFlashcards,
      completedExercises,
      completedDays,
      dueFlashcards,
      overallProgress: totalExercises > 0 ? Math.round((completedExercises / totalExercises) * 100) : 0
    };
  },

  // User Settings
  getUserSettings: () => db.prepare('SELECT * FROM user_settings WHERE id = 1').get() || { plan_duration: 30, current_day: 1 },
  updateUserSettings: { run: (params: any) => db.prepare('UPDATE user_settings SET plan_duration = @plan_duration, start_date = @start_date, current_day = @current_day WHERE id = 1').run(params) },
  advanceDay: () => db.prepare('UPDATE user_settings SET current_day = current_day + 1 WHERE id = 1').run(),
  resetPlan: (duration: number) => {
    db.prepare('UPDATE user_settings SET plan_duration = ?, current_day = 1, start_date = ? WHERE id = 1').run(duration, new Date().toISOString().split('T')[0]);
    db.exec('DELETE FROM daily_activities');
    db.exec('DELETE FROM reflections');
    db.exec('DELETE FROM progress');
  },

  // Reflections
  getReflection: (dayNumber: number) => db.prepare('SELECT * FROM reflections WHERE day_number = ?').get(dayNumber),
  getAllReflections: () => db.prepare('SELECT * FROM reflections ORDER BY day_number').all(),
  upsertReflection: { run: (params: any) => db.prepare(`
    INSERT INTO reflections (day_number, content, updated_at)
    VALUES (@day_number, @content, CURRENT_TIMESTAMP)
    ON CONFLICT(day_number) DO UPDATE SET content = @content, updated_at = CURRENT_TIMESTAMP
  `).run(params) },

  // Daily Activities
  getActivitiesForDay: (dayNumber: number) => db.prepare('SELECT * FROM daily_activities WHERE day_number = ? ORDER BY id').all(dayNumber),
  getAllActivities: () => db.prepare('SELECT * FROM daily_activities ORDER BY day_number, id').all(),
  createActivity: { run: (params: any) => db.prepare('INSERT INTO daily_activities (day_number, activity_type, activity_id, title, description) VALUES (@day_number, @activity_type, @activity_id, @title, @description)').run(params) },
  completeActivity: (id: number) => db.prepare('UPDATE daily_activities SET completed = 1, completed_at = ? WHERE id = ?').run(new Date().toISOString(), id),
  uncompleteActivity: (id: number) => db.prepare('UPDATE daily_activities SET completed = 0, completed_at = NULL WHERE id = ?').run(id),
  getDayProgress: (dayNumber: number) => {
    const total = (db.prepare('SELECT COUNT(*) as count FROM daily_activities WHERE day_number = ?').get(dayNumber) as any).count;
    const completed = (db.prepare('SELECT COUNT(*) as count FROM daily_activities WHERE day_number = ? AND completed = 1').get(dayNumber) as any).count;
    return { total, completed, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  },
  isDayComplete: (dayNumber: number) => {
    const progress = queries.getDayProgress(dayNumber);
    return progress.total > 0 && progress.completed === progress.total;
  },
  clearActivities: () => db.exec('DELETE FROM daily_activities')
};

export default db;
