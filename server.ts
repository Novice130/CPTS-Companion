import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  initDatabase,
  seedDatabase,
  queries,
  calculateNextReview,
  buildSearchIndex,
  generateActivitiesForDay,
  regenerateAllActivities,
} from "./db.ts";

type Request = express.Request;
type Response = express.Response;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, "public")));

// View engine setup
app.set("view engine", "ejs");
app.set("views", join(__dirname, "views"));

// Initialize database
initDatabase();
seedDatabase();

// Helper to get common template data
function getCommonData() {
  const stats = queries.getStats();
  const dueFlashcards = queries.getDueFlashcards();
  const settings = queries.getUserSettings() as any;
  return {
    stats,
    dueCount: dueFlashcards.length,
    nextReview: dueFlashcards.length > 0 ? "Now" : "None due",
    settings: settings || { plan_duration: 30, current_day: 1 },
  };
}

// ============================================
// ROUTES
// ============================================

// Dashboard
app.get("/", (req: Request, res: Response) => {
  const common = getCommonData();
  const modules = queries.getAllModules();
  const recentNotes = queries.getAllNotes().slice(0, 5);
  const settings = queries.getUserSettings() as any;

  // Get current day from settings
  const currentDay = settings.current_day || 1;

  // Get today's activities
  let todayActivities = queries.getActivitiesForDay(currentDay);

  // If no activities exist for today, generate them
  if ((todayActivities as any[]).length === 0) {
    generateActivitiesForDay(currentDay, settings.plan_duration || 30);
    todayActivities = queries.getActivitiesForDay(currentDay);
  }

  // Get day progress
  const dayProgress = queries.getDayProgress(currentDay);

  // Get today's reflection
  const reflection = queries.getReflection(currentDay);

  res.render("dashboard", {
    ...common,
    modules,
    recentNotes,
    settings,
    currentDay,
    todayActivities,
    dayProgress,
    reflection,
  });
});

// Study Plan (dynamic duration)
app.get("/plan", (req: Request, res: Response) => {
  const common = getCommonData();
  const settings = queries.getUserSettings() as any;
  const planDuration = settings.plan_duration || 30;
  const currentDay = settings.current_day || 1;

  // Generate dynamic plan based on settings
  const modules = queries.getAllModules() as any[];
  const totalModules = modules.length;
  const modulesPerDay = Math.max(1, Math.ceil(totalModules / planDuration));

  // Create dynamic plan days
  const dynamicPlanDays = [];
  for (let day = 1; day <= planDuration; day++) {
    const startModuleIndex = Math.min(
      (day - 1) * modulesPerDay,
      totalModules - 1
    );
    const endModuleIndex = Math.min(
      startModuleIndex + modulesPerDay,
      totalModules
    );
    const todayModules = modules.slice(startModuleIndex, endModuleIndex);

    // Get activities for this day
    const activities = queries.getActivitiesForDay(day) as any[];
    const dayProgress = queries.getDayProgress(day);

    dynamicPlanDays.push({
      id: day,
      day_number: day,
      title: todayModules.map((m: any) => m.title).join(" & ") || `Day ${day}`,
      topics: todayModules.map((m: any) => m.title),
      category: todayModules[0]?.category || "General",
      estimated_hours: planDuration <= 30 ? 4 : planDuration <= 60 ? 2.5 : 1.5,
      activities: activities,
      progress: dayProgress,
      isComplete: dayProgress.percentage === 100,
      isLocked: day > currentDay,
      isCurrent: day === currentDay,
    });
  }

  res.render("plan", {
    ...common,
    planDays: dynamicPlanDays,
    settings,
    currentDay,
  });
});

// Modules list
app.get("/modules", (req: Request, res: Response) => {
  const common = getCommonData();
  let modules = queries.getAllModules();
  const progress = queries.getAllProgress();

  const categoryFilterRaw =
    (req.query.category as string | undefined) ?? undefined;
  const categoryFilter = categoryFilterRaw?.trim();
  if (categoryFilter) {
    modules = (modules as any[]).filter(
      (mod: any) =>
        (mod.category || "").toLowerCase() === categoryFilter.toLowerCase()
    );
  }

  // Group modules by category
  const categories: Record<string, any[]> = {};
  modules.forEach((mod: any) => {
    const modProgress = progress.find(
      (p: any) => p.item_type === "module" && p.item_id === mod.id
    );
    const enrichedMod = {
      ...mod,
      status: modProgress?.status || "not_started",
    };

    if (!categories[mod.category]) {
      categories[mod.category] = [];
    }
    categories[mod.category].push(enrichedMod);
  });

  res.render("modules", {
    ...common,
    categories,
    categoryFilter: categoryFilter || null,
  });
});

// Module detail
app.get("/modules/:id", (req: Request, res: Response) => {
  const common = getCommonData();
  const module =
    queries.getModuleById(parseInt(req.params.id)) ||
    queries.getModuleBySlug(req.params.id);

  if (!module) {
    return res
      .status(404)
      .render("error", { ...common, message: "Module not found" });
  }

  // Auto-complete activity for this module
  const settings = queries.getUserSettings() as any;
  const currentDay = settings.current_day || 1;
  const activities = queries.getActivitiesForDay(currentDay) as any[];
  const moduleActivity = activities.find(
    (a) => a.activity_type === "module" && a.activity_id === (module as any).id
  );
  if (moduleActivity && !moduleActivity.completed) {
    queries.completeActivity(moduleActivity.id);
  }

  const exercises = queries.getExercisesByModule((module as any).id);
  const flashcards = queries.getFlashcardsByModule((module as any).id);
  const mindmaps = queries.getMindmapsByModule((module as any).id);

  function stripHtml(input: string): string {
    return input
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function describeHeading(heading: string): string {
    const key = heading.toLowerCase().trim();
    const map: Record<string, string> = {
      phases:
        "Use these examples as a quick checklist of the workflow and what to do in each phase.",
      "key commands":
        "Common commands you can run during this phase/module. Adjust targets, ports, and wordlists to your scope.",
      "host discovery":
        "Discover which hosts are alive before you spend time scanning ports/services.",
      "port scanning":
        "Identify open TCP ports (and common service ports) to decide what to enumerate next.",
      "service/version":
        "Confirm what software is running and which versions/features are exposed.",
      scripts:
        "Run focused script checks for quick validation and extra enumeration.",
      output:
        "Save your results so you can reference them later and avoid re-scanning.",
      subdomains:
        "Enumerate subdomains to expand your attack surface and find hidden apps.",
      "directory fuzzing":
        "Find hidden paths, files, and endpoints that aren’t linked in the UI.",
      "tech stack":
        "Fingerprint technologies to guide payloads, exploits, and common misconfigs to check.",
      "virtual hosts":
        "Discover name-based vhosts that only respond when the Host header matches.",
      dns: "Use DNS enumeration to find hosts, records, and misconfigurations.",
      smb: "Enumerate shares and access patterns to find readable files and credentials.",
      snmp: "Query SNMP for device/system information that often leaks usernames, services, and configs.",
      nfs: "List exports and mount shares to inspect accessible files.",
      "basic usage":
        "A typical workflow for the tool; adapt options to the service and target.",
      "reverse shells":
        "Examples of common reverse shell one-liners; use the one that fits the target environment.",
      listeners: "Start a listener to catch a reverse shell connection.",
      "shell upgrade":
        "Improve shell usability (PTY, terminal settings) once you have access.",
      enumeration:
        "Run these to identify what you’re running as and what the host looks like.",
      tools:
        "Common helper tools used for faster enumeration; run them only when appropriate.",
    };

    return (
      map[key] ||
      `Example commands for ${heading}. Use these as a starting point and tailor to your target and scope.`
    );
  }

  function buildCommandExamplesFromCheatsheet(
    cheatsheetHtml: string | null | undefined
  ): string | null {
    if (!cheatsheetHtml) return null;

    const blocks: string[] = [];
    const preRe = /<pre>([\s\S]*?)<\/pre>/gi;
    let match: RegExpExecArray | null;
    let counter = 0;

    while ((match = preRe.exec(cheatsheetHtml)) !== null) {
      counter += 1;
      const preBody = match[1] || "";

      // Try to grab the closest preceding <h3> as a label for this <pre> block.
      const before = cheatsheetHtml.slice(0, match.index);
      const tail = before.slice(Math.max(0, before.length - 1500));
      const h3Matches = Array.from(
        tail.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi)
      );
      const lastHeadingRaw =
        h3Matches.length > 0 ? h3Matches[h3Matches.length - 1][1] : null;
      const heading =
        (lastHeadingRaw && stripHtml(lastHeadingRaw)) ||
        `Command Example ${counter}`;
      const description = describeHeading(heading);

      blocks.push(
        [
          `<h4 style="margin:0 0 0.5rem;">${heading}</h4>`,
          `<p class="text-muted" style="margin:0 0 0.75rem;">${description}</p>`,
          `<pre>${preBody}</pre>`,
        ].join("\n")
      );
    }

    if (blocks.length === 0) return null;
    return blocks.join("\n\n");
  }

  const commandExamplesHtml = buildCommandExamplesFromCheatsheet(
    (module as any).cheatsheet_md
  );

  res.render("module-detail", {
    ...common,
    module,
    exercises,
    flashcards,
    mindmaps,
    commandExamplesHtml,
  });
});

// Exercises list
app.get("/exercises", (req: Request, res: Response) => {
  const common = getCommonData();
  let exercises = queries.getAllExercises();
  const progress = queries.getAllProgress();
  const modules = queries.getAllModules();

  // Apply filters
  const { type, module, difficulty } = req.query;
  if (type) {
    exercises = exercises.filter((e: any) => e.type === type);
  }
  if (module) {
    exercises = exercises.filter(
      (e: any) => e.module_id === parseInt(module as string)
    );
  }
  if (difficulty) {
    exercises = exercises.filter((e: any) => e.difficulty === difficulty);
  }

  // Enrich with progress
  const enrichedExercises = exercises.map((ex: any) => {
    const exProgress = progress.find(
      (p: any) => p.item_type === "exercise" && p.item_id === ex.id
    );
    return {
      ...ex,
      options: ex.options ? JSON.parse(ex.options) : null,
      status: exProgress?.status || "not_started",
      score: exProgress?.score,
    };
  });

  const types = [
    "multiple_choice",
    "fill_command",
    "decision_tree",
    "case_file",
    "command_builder",
  ];

  res.render("exercises", {
    ...common,
    exercises: enrichedExercises,
    modules,
    types,
    filters: { type, module, difficulty },
  });
});

// Exercise detail
app.get("/exercises/:id", (req: Request, res: Response) => {
  const common = getCommonData();
  const exercise = queries.getExerciseById(parseInt(req.params.id)) as any;

  if (!exercise) {
    return res
      .status(404)
      .render("error", { ...common, message: "Exercise not found" });
  }

  exercise.options = exercise.options ? JSON.parse(exercise.options) : null;
  exercise.hints = exercise.hints ? JSON.parse(exercise.hints) : null;

  const progress = queries.getProgress("exercise", exercise.id);

  res.render("exercise-detail", { ...common, exercise, progress });
});

// Submit exercise answer
app.post("/api/exercises/:id/submit", (req: Request, res: Response) => {
  const exercise = queries.getExerciseById(parseInt(req.params.id)) as any;

  if (!exercise) {
    return res.status(404).json({ error: "Exercise not found" });
  }

  const { answer } = req.body;
  let isCorrect = false;

  if (exercise.type === "fill_command" && exercise.validation_regex) {
    const regex = new RegExp(exercise.validation_regex, "i");
    isCorrect = regex.test(answer);
  } else {
    isCorrect =
      answer.toLowerCase().trim() === exercise.answer.toLowerCase().trim();
  }

  // Update progress
  queries.upsertProgress.run({
    item_type: "exercise",
    item_id: exercise.id,
    status: isCorrect ? "completed" : "attempted",
    completed_at: isCorrect ? new Date().toISOString() : null,
    score: isCorrect ? 100 : 0,
    last_seen: new Date().toISOString(),
  });

  // Auto-complete activity for this exercise if correct
  if (isCorrect) {
    const settings = queries.getUserSettings() as any;
    const currentDay = settings.current_day || 1;
    const activities = queries.getActivitiesForDay(currentDay) as any[];
    const exerciseActivity = activities.find(
      (a) => a.activity_type === "exercise" && a.activity_id === exercise.id
    );
    if (exerciseActivity && !exerciseActivity.completed) {
      queries.completeActivity(exerciseActivity.id);
    }
  }

  res.json({
    correct: isCorrect,
    explanation: exercise.explanation,
    correctAnswer: exercise.answer,
  });
});

// Mind maps list
app.get("/mindmaps", (req: Request, res: Response) => {
  const common = getCommonData();
  const mindmaps = queries.getAllMindmaps();
  const modules = queries.getAllModules();

  res.render("mindmaps", { ...common, mindmaps, modules });
});

// Mind map detail
app.get("/mindmaps/:id", (req: Request, res: Response) => {
  const common = getCommonData();
  const mindmap = queries.getMindmapById(parseInt(req.params.id)) as any;

  if (!mindmap) {
    return res
      .status(404)
      .render("error", { ...common, message: "Mind map not found" });
  }

  const allModules = queries.getAllModules();

  // Get related modules (same module or all if global mindmap)
  let relatedModules: any[] = [];
  if (mindmap.module_id) {
    relatedModules = [queries.getModuleById(mindmap.module_id)].filter(Boolean);
  } else {
    // Global mindmap - show first 6 modules
    relatedModules = (allModules as any[]).slice(0, 6);
  }

  // Create node data map for interactive info
  const nodeDataMap: Record<string, string> = {};
  (allModules as any[]).forEach((mod: any) => {
    const key = mod.title.toLowerCase();
    nodeDataMap[key] = `
      <h4 style="color: var(--htb-green); margin-bottom: 0.5rem;">${
        mod.title
      }</h4>
      <p style="margin-bottom: 1rem;">${
        mod.summary || "No description available."
      }</p>
      <div style="margin-bottom: 1rem;">
        <span class="chip">${mod.category}</span>
      </div>
      <a href="/modules/${
        mod.id
      }" class="btn btn-primary">View Full Module & Cheatsheet →</a>
    `;
    // Also add category as key
    const catKey = mod.category.toLowerCase();
    if (!nodeDataMap[catKey]) {
      nodeDataMap[catKey] = `
        <h4 style="color: var(--htb-green);">${mod.category}</h4>
        <p>This category contains modules related to ${mod.category.toLowerCase()} techniques.</p>
        <a href="/modules?category=${encodeURIComponent(
          mod.category
        )}" class="btn">View ${mod.category} Modules</a>
      `;
    }
  });

  // Add common pentest phase definitions
  const phaseInfo: Record<string, string> = {
    reconnaissance:
      '<h4>Reconnaissance Phase</h4><p>Gathering information about the target passively and actively. This includes OSINT, DNS enumeration, and identifying the attack surface.</p><a href="/modules/pentest-process" class="btn btn-primary">View Pentest Process Module →</a>',
    enumeration:
      '<h4>Enumeration Phase</h4><p>Actively probing services to extract detailed information like usernames, shares, and service versions.</p><a href="/modules/nmap" class="btn btn-primary">View Nmap Module →</a>',
    exploitation:
      '<h4>Exploitation Phase</h4><p>Using discovered vulnerabilities to gain initial access to the target system.</p><a href="/modules/shells-payloads" class="btn btn-primary">View Shells Module →</a>',
    "post-exploitation":
      '<h4>Post-Exploitation Phase</h4><p>Actions after gaining access: privilege escalation, persistence, lateral movement, and data exfiltration.</p><a href="/modules/linux-privesc" class="btn btn-primary">View Linux PrivEsc →</a> <a href="/modules/pivoting" class="btn">View Pivoting →</a>',
    "privilege escalation":
      '<h4>Privilege Escalation</h4><p>Elevating access from a low-privileged user to root/SYSTEM. Critical for full system compromise.</p><a href="/modules/linux-privesc" class="btn btn-primary">Linux PrivEsc →</a> <a href="/modules/windows-privesc" class="btn">Windows PrivEsc →</a>',
    "lateral movement":
      '<h4>Lateral Movement</h4><p>Moving from one compromised system to others in the network to expand access.</p><a href="/modules/pivoting" class="btn btn-primary">View Pivoting Module →</a>',
    "initial access":
      '<h4>Initial Access</h4><p>The first foothold on the target network through exploitation of a vulnerability or misconfiguration.</p><a href="/modules/shells-payloads" class="btn btn-primary">View Shells Module →</a>',
  };

  Object.assign(nodeDataMap, phaseInfo);

  // Generate quick reference for the module
  let nodeInfo = "";
  if (mindmap.module_id) {
    const mod = queries.getModuleById(mindmap.module_id) as any;
    if (mod && mod.cheatsheet_md) {
      nodeInfo = mod.cheatsheet_md;
    }
  }

  // Auto-complete activity for this mindmap
  const settings = queries.getUserSettings() as any;
  const currentDay = settings.current_day || 1;
  const activities = queries.getActivitiesForDay(currentDay) as any[];
  const mindmapActivity = activities.find(
    (a) => a.activity_type === "mindmap" && a.activity_id === mindmap.id
  );
  if (mindmapActivity && !mindmapActivity.completed) {
    queries.completeActivity(mindmapActivity.id);
  }

  res.render("mindmap-detail", {
    ...common,
    mindmap,
    relatedModules,
    allModules,
    nodeDataMap,
    nodeInfo,
  });
});

// Flashcards
app.get("/flashcards", (req: Request, res: Response) => {
  const common = getCommonData();
  const flashcards = queries.getAllFlashcards();
  const dueFlashcards = queries.getDueFlashcards();
  const modules = queries.getAllModules();

  res.render("flashcards", { ...common, flashcards, dueFlashcards, modules });
});

// Flashcard review
app.get("/flashcards/review", (req: Request, res: Response) => {
  const common = getCommonData();
  const dueFlashcards = queries.getDueFlashcards();

  res.render("flashcard-review", { ...common, flashcards: dueFlashcards });
});

// Submit flashcard review
app.post("/api/flashcards/:id/review", (req: Request, res: Response) => {
  const flashcard = queries.getFlashcardById(parseInt(req.params.id)) as any;

  if (!flashcard) {
    return res.status(404).json({ error: "Flashcard not found" });
  }

  const { quality } = req.body; // 0-5 scale
  const nextReview = calculateNextReview(quality, flashcard);

  queries.updateFlashcard.run({
    id: flashcard.id,
    ...nextReview,
  });

  res.json({ success: true, nextReview: nextReview.next_review });
});

// Notes
app.get("/notes", (req: Request, res: Response) => {
  const common = getCommonData();
  const notes = queries.getAllNotes();
  const templates = queries.getAllTemplates();
  const modules = queries.getAllModules();

  res.render("notes", { ...common, notes, templates, modules });
});

// New note form
app.get("/notes/new", (req: Request, res: Response) => {
  const common = getCommonData();
  const templates = queries.getAllTemplates();
  const modules = queries.getAllModules();
  const templateId = req.query.template;

  let template = null;
  if (templateId) {
    template = queries.getTemplateById(parseInt(templateId as string));
  }

  res.render("note-edit", {
    ...common,
    note: null,
    templates,
    modules,
    template,
  });
});

// Edit note
app.get("/notes/:id/edit", (req: Request, res: Response) => {
  const common = getCommonData();
  const note = queries.getNoteById(parseInt(req.params.id));
  const templates = queries.getAllTemplates();
  const modules = queries.getAllModules();

  if (!note) {
    return res
      .status(404)
      .render("error", { ...common, message: "Note not found" });
  }

  res.render("note-edit", {
    ...common,
    note,
    templates,
    modules,
    template: null,
  });
});

// View note
app.get("/notes/:id", (req: Request, res: Response) => {
  const common = getCommonData();
  const note = queries.getNoteById(parseInt(req.params.id));

  if (!note) {
    return res
      .status(404)
      .render("error", { ...common, message: "Note not found" });
  }

  res.render("note-view", { ...common, note });
});

// Create note
app.post("/notes", (req: Request, res: Response) => {
  const { title, body_md, tags, module_id, template_type } = req.body;

  queries.createNote.run({
    title,
    body_md,
    tags: tags || null,
    module_id: module_id || null,
    template_type: template_type || null,
  });

  const lastId = (queries.createNote.lastInsertRowid as any).id;
  buildSearchIndex();
  res.redirect(`/notes/${lastId}`);
});

// Update note
app.post("/notes/:id", (req: Request, res: Response) => {
  const { title, body_md, tags, module_id } = req.body;

  queries.updateNote.run({
    id: parseInt(req.params.id),
    title,
    body_md,
    tags: tags || null,
    module_id: module_id || null,
  });

  buildSearchIndex();
  res.redirect(`/notes/${req.params.id}`);
});

// Delete note
app.post("/notes/:id/delete", (req: Request, res: Response) => {
  queries.deleteNote(parseInt(req.params.id));
  buildSearchIndex();
  res.redirect("/notes");
});

// Search
app.get("/search", (req: Request, res: Response) => {
  const common = getCommonData();
  const query = req.query.q as string;

  let results: any[] = [];
  if (query && query.trim()) {
    try {
      results = queries.search(query + "*");
    } catch (e) {
      // FTS5 query error, try simpler search
      results = [];
    }
  }

  res.render("search", { ...common, query, results });
});

// Settings
app.get("/settings", (req: Request, res: Response) => {
  const common = getCommonData();
  const settings = queries.getUserSettings();
  res.render("settings", { ...common, settings });
});

// Reset progress
app.post("/api/settings/reset-progress", (req: Request, res: Response) => {
  queries.resetProgress();
  res.json({ success: true });
});

// Export data
app.get("/api/export", (req: Request, res: Response) => {
  const notes = queries.getAllNotes();
  const progress = queries.getAllProgress();

  res.json({ notes, progress, exportedAt: new Date().toISOString() });
});

// Import data
app.post("/api/import", (req: Request, res: Response) => {
  const { notes, progress } = req.body;

  // Import notes
  if (notes && Array.isArray(notes)) {
    for (const note of notes) {
      queries.createNote.run({
        title: note.title,
        body_md: note.body_md,
        tags: note.tags,
        module_id: note.module_id,
        template_type: note.template_type,
      });
    }
  }

  buildSearchIndex();
  res.json({ success: true });
});

// Mark plan day complete
app.post("/api/plan/:dayId/toggle", (req: Request, res: Response) => {
  const dayId = parseInt(req.params.dayId);
  const current = queries.getProgress("plan_day", dayId) as any;

  const newStatus =
    current?.status === "completed" ? "not_started" : "completed";

  queries.upsertProgress.run({
    item_type: "plan_day",
    item_id: dayId,
    status: newStatus,
    completed_at: newStatus === "completed" ? new Date().toISOString() : null,
    score: null,
    last_seen: new Date().toISOString(),
  });

  res.json({ success: true, status: newStatus });
});

// Toggle activity completion
app.post("/api/activities/:id/toggle", (req: Request, res: Response) => {
  const activityId = parseInt(req.params.id);
  const { completed } = req.body;

  if (completed) {
    queries.completeActivity(activityId);
  } else {
    queries.uncompleteActivity(activityId);
  }

  // Check if day is now complete
  const settings = queries.getUserSettings() as any;
  const dayComplete = queries.isDayComplete(settings.current_day);

  res.json({ success: true, dayComplete });
});

// Advance to next day
app.post("/api/plan/advance-day", (req: Request, res: Response) => {
  const settings = queries.getUserSettings() as any;
  const currentDay = settings.current_day || 1;
  const planDuration = settings.plan_duration || 30;

  if (currentDay < planDuration) {
    const newDay = currentDay + 1;
    queries.advanceDay();

    // Generate activities for the new day
    generateActivitiesForDay(newDay, planDuration);

    res.json({ success: true, newDay });
  } else {
    res.json({ success: false, message: "Plan completed!" });
  }
});

// Save reflection
app.post("/api/reflections/:day", (req: Request, res: Response) => {
  const dayNumber = parseInt(req.params.day);
  const { content } = req.body;

  queries.upsertReflection.run({
    day_number: dayNumber,
    content: content || "",
  });

  res.json({ success: true });
});

// Change plan duration
app.post("/api/settings/plan-duration", (req: Request, res: Response) => {
  const { duration } = req.body;

  if (![30, 60, 90, 180].includes(duration)) {
    return res.status(400).json({ error: "Invalid duration" });
  }

  // Reset plan with new duration
  queries.resetPlan(duration);

  // Generate activities for day 1
  generateActivitiesForDay(1, duration);

  res.json({ success: true, duration });
});

// API: Get all searchable items for command palette
app.get("/api/search-items", (req: Request, res: Response) => {
  const modules = queries.getAllModules().map((m: any) => ({
    type: "module",
    title: m.title,
    url: `/modules/${m.id}`,
  }));

  const exercises = queries
    .getAllExercises()
    .slice(0, 50)
    .map((e: any) => ({
      type: "exercise",
      title: e.prompt.substring(0, 60) + "...",
      url: `/exercises/${e.id}`,
    }));

  const mindmaps = queries.getAllMindmaps().map((m: any) => ({
    type: "mindmap",
    title: m.title,
    url: `/mindmaps/${m.id}`,
  }));

  const notes = queries.getAllNotes().map((n: any) => ({
    type: "note",
    title: n.title,
    url: `/notes/${n.id}`,
  }));

  const pages = [
    { type: "page", title: "Dashboard", url: "/" },
    { type: "page", title: "30-Day Plan", url: "/plan" },
    { type: "page", title: "Modules", url: "/modules" },
    { type: "page", title: "Exercises", url: "/exercises" },
    { type: "page", title: "Mind Maps", url: "/mindmaps" },
    { type: "page", title: "Flashcards", url: "/flashcards" },
    { type: "page", title: "Notes", url: "/notes" },
    { type: "page", title: "Search", url: "/search" },
    { type: "page", title: "Settings", url: "/settings" },
  ];

  res.json([...pages, ...modules, ...mindmaps, ...notes, ...exercises]);
});

// Error handling
app.use((req: Request, res: Response) => {
  const common = getCommonData();
  res.status(404).render("error", { ...common, message: "Page not found" });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ██████╗██████╗ ████████╗███████╗                        ║
║  ██╔════╝██╔══██╗╚══██╔══╝██╔════╝                        ║
║  ██║     ██████╔╝   ██║   ███████╗                        ║
║  ██║     ██╔═══╝    ██║   ╚════██║                        ║
║  ╚██████╗██║        ██║   ███████║                        ║
║   ╚═════╝╚═╝        ╚═╝   ╚══════╝                        ║
║                                                           ║
║   CPTS Companion v1.0.0                                   ║
║   Server running at http://localhost:${PORT}                 ║
║                                                           ║
║   Educational use only - Authorized labs only!            ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
