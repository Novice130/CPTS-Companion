import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import "dotenv/config";
import cookieParser from "cookie-parser";
import {
  initDatabase,
  seedDatabase,
  queries,
  calculateNextReview,
  buildSearchIndex,
  generateActivitiesForDay,
  regenerateAllActivities,
} from "./db.ts";
import { auth, getSession } from "./auth.ts";
import { toNodeHandler } from "better-auth/node";
import { sendWelcomeEmail } from "./email.ts";

type Request = express.Request;
type Response = express.Response;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 3000;

// ============================================
// Better Auth handler — MUST be before body parsers!
// ============================================
app.all("/api/auth/*", toNodeHandler(auth));

// Middleware (after auth handler to avoid conflicts)
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(join(__dirname, "public")));

// Basic native XSS Sanitizer to strip script tags and onload handlers
function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript\s*:/gi, "disabled-js:");
}

app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.locals.sanitize = sanitizeHtml;
  next();
});

// Basic Native Rate Limiting Middleware
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 100; // max 100 requests per 15 min window

function rateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  let record = rateLimitMap.get(ip);
  
  if (!record || now - record.lastReset > RATE_LIMIT_WINDOW) {
    record = { count: 0, lastReset: now };
  }
  
  record.count++;
  rateLimitMap.set(ip, record);
  
  if (record.count > RATE_LIMIT_MAX) {
    return res.status(429).send('Too many requests, please try again later.');
  }
  next();
}

app.use('/api/', rateLimiter);
app.use('/login', rateLimiter);

// View engine setup
app.set("view engine", "ejs");
app.set("views", join(__dirname, "views"));

// ============================================
// Initialize DB (async — start server after init)
// ============================================
async function startServer() {
  await initDatabase();
  await seedDatabase();
  await queries.clearAllSessions();

  // Helper to get common template data
  async function getCommonData() {
    const [stats, dueFlashcards, settings] = await Promise.all([
      queries.getStats(),
      queries.getDueFlashcards(),
      queries.getUserSettings()
    ]);
    return {
      stats,
      dueCount: dueFlashcards.length,
      nextReview: dueFlashcards.length > 0 ? "Now" : "None due",
      settings: settings || { plan_duration: 30, current_day: 1 },
    };
  }

  // ============================================
  // AUTH MIDDLEWARE
  // ============================================

  async function softAuth(req: Request, res: Response, next: express.NextFunction) {
    const session = await getSession(req);
    
    if (session) {
      (req as any).user = session.user;
      return next();
    }

    // Track unauthenticated page views using a cookie
    let views = parseInt(req.cookies?.guest_views || "0") + 1;
    res.cookie("guest_views", views.toString(), { maxAge: 900000, httpOnly: true });

    if (views >= 3) {
      return res.redirect("/login?reason=limit");
    }

    (req as any).user = null; // Guest user
    next();
  }

  // Keep requireAuth for API routes that strict require it (like POSTs)
  async function requireAuth(req: Request, res: Response, next: express.NextFunction) {
    const session = await getSession(req);
    if (!session) return res.status(401).json({ error: "Unauthorized" });
    (req as any).user = session.user;
    next();
  }

  // ============================================
  // AUTH ROUTES
  // ============================================

  // Login page
  app.get("/login", async (req: Request, res: Response) => {
    const session = await getSession(req);
    if (session) return res.redirect("/");
    const common = await getCommonData();
    res.render("login", { ...common, currentPage: "login", user: null });
  });

  // Logout — properly clear session
  app.get("/logout", async (req: Request, res: Response) => {
    try {
      await auth.api.signOut({
        headers: new Headers(req.headers as Record<string, string>)
      });
    } catch (error) {
      console.error("Error during sign out:", error);
    }
    // Clear the Better Auth session cookie
    res.clearCookie("better-auth.session_token");
    res.clearCookie("better-auth.session_token.sig");
    res.redirect("/login");
  });

  // ============================================
  // PAGE ROUTES
  // ============================================

  // Dashboard
  app.get("/", softAuth, async (req: Request, res: Response) => {
    const user = (req as any).user;
    
    // Fetch initial parallel data
    const [common, modules, allNotes] = await Promise.all([
      getCommonData(),
      queries.getAllModules(),
      queries.getAllNotes()
    ]);
    const recentNotes = allNotes.slice(0, 5);
    const settings = common.settings;

    const currentDay = settings.current_day || 1;
    let todayActivities = await queries.getActivitiesForDay(currentDay);

    if ((todayActivities as any[]).length === 0) {
      await generateActivitiesForDay(currentDay, settings.plan_duration || 30);
      todayActivities = await queries.getActivitiesForDay(currentDay);
    }

    const [dayProgress, reflection] = await Promise.all([
      queries.getDayProgress(currentDay),
      queries.getReflection(currentDay)
    ]);

    res.render("dashboard", {
      ...common,
      modules,
      recentNotes,
      settings,
      currentDay,
      todayActivities,
      dayProgress,
      reflection,
      user,
    });
  });

  // Study Plan
  app.get("/plan", softAuth, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const [common, modulesRaw] = await Promise.all([
      getCommonData(),
      queries.getAllModules()
    ]);
    const settings = common.settings || { plan_duration: 30, current_day: 1 };
    const planDuration = settings.plan_duration || 30;
    const currentDay = settings.current_day || 1;
    const modules = modulesRaw as any[];

    const totalModules = modules.length;
    const modulesPerDay = Math.max(1, Math.ceil(totalModules / planDuration));

    const dayPromises = [];
    for (let day = 1; day <= planDuration; day++) {
      dayPromises.push((async () => {
        const startModuleIndex = Math.min((day - 1) * modulesPerDay, totalModules - 1);
        const endModuleIndex = Math.min(startModuleIndex + modulesPerDay, totalModules);
        const todayModules = modules.slice(startModuleIndex, endModuleIndex);

        const [activities, dayProgress] = await Promise.all([
          queries.getActivitiesForDay(day),
          queries.getDayProgress(day)
        ]);

        return {
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
        };
      })());
    }

    const dynamicPlanDays = await Promise.all(dayPromises);

    res.render("plan", {
      ...common,
      planDays: dynamicPlanDays,
      settings,
      currentDay,
      user,
    });
  });

  // Modules list
  app.get("/modules", softAuth, async (req: Request, res: Response) => {
    const [common, modulesRaw, progress] = await Promise.all([
      getCommonData(),
      queries.getAllModules(),
      queries.getAllProgress()
    ]);
    let modules = modulesRaw as any[];

    const categoryFilterRaw =
      (req.query.category as string | undefined) ?? undefined;
    const categoryFilter = categoryFilterRaw?.trim();
    if (categoryFilter) {
      modules = (modules as any[]).filter(
        (mod: any) =>
          (mod.category || "").toLowerCase() === categoryFilter.toLowerCase()
      );
    }

    const categories: Record<string, any[]> = {};
    (modules as any[]).forEach((mod: any) => {
      const modProgress = (progress as any[]).find(
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
      user: (req as any).user,
    });
  });

  // Module detail
  app.get("/modules/:id", softAuth, async (req: Request, res: Response) => {
    const [common, moduleRaw] = await Promise.all([
      getCommonData(),
      queries.getModuleById(parseInt(req.params.id)).then(m => m || queries.getModuleBySlug(req.params.id))
    ]);
    const module = moduleRaw as any;

    if (!module) {
      return res
        .status(404)
        .render("error", { ...common, message: "Module not found" });
    }

    const currentDay = common.settings.current_day || 1;
    const [exercises, flashcards, mindmaps, activitiesRaw] = await Promise.all([
      queries.getExercisesByModule(module.id),
      queries.getFlashcardsByModule(module.id),
      queries.getMindmapsByModule(module.id),
      queries.getActivitiesForDay(currentDay)
    ]);
    const activities = activitiesRaw as any[];

    const moduleActivity = activities.find(
      (a) => a.activity_type === "module" && a.activity_id === module.id
    );
    if (moduleActivity && !moduleActivity.completed) {
      await queries.completeActivity(moduleActivity.id);
    }

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
          "Find hidden paths, files, and endpoints that aren't linked in the UI.",
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
          "Run these to identify what you're running as and what the host looks like.",
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
      user: (req as any).user,
    });
  });

  // Exercises list
  app.get("/exercises", softAuth, async (req: Request, res: Response) => {
    const [common, exercisesRaw, progress, modules] = await Promise.all([
      getCommonData(),
      queries.getAllExercises(),
      queries.getAllProgress(),
      queries.getAllModules()
    ]);
    let exercises = exercisesRaw as any[];

    const { type, module, difficulty } = req.query;
    if (type) {
      exercises = (exercises as any[]).filter((e: any) => e.type === type);
    }
    if (module) {
      exercises = (exercises as any[]).filter(
        (e: any) => e.module_id === parseInt(module as string)
      );
    }
    if (difficulty) {
      exercises = (exercises as any[]).filter((e: any) => e.difficulty === difficulty);
    }

    const enrichedExercises = (exercises as any[]).map((ex: any) => {
      const exProgress = (progress as any[]).find(
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
  app.get("/exercises/:id", softAuth, async (req: Request, res: Response) => {
    const [common, exerciseRaw] = await Promise.all([
      getCommonData(),
      queries.getExerciseById(parseInt(req.params.id))
    ]);
    const exercise = exerciseRaw as any;

    if (!exercise) {
      return res
        .status(404)
        .render("error", { ...common, message: "Exercise not found" });
    }

    exercise.options = exercise.options ? JSON.parse(exercise.options) : null;
    exercise.hints = exercise.hints ? JSON.parse(exercise.hints) : null;

    const progress = await queries.getProgress("exercise", exercise.id);

    res.render("exercise-detail", { ...common, exercise, progress });
  });

  // Submit exercise answer
  app.post("/api/exercises/:id/submit", requireAuth, async (req: Request, res: Response) => {
    const exercise = (await queries.getExerciseById(parseInt(req.params.id))) as any;

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

    await queries.upsertProgress({
      item_type: "exercise",
      item_id: exercise.id,
      status: isCorrect ? "completed" : "attempted",
      completed_at: isCorrect ? new Date().toISOString() : null,
      score: isCorrect ? 100 : 0,
      last_seen: new Date().toISOString(),
    });

    if (isCorrect) {
      const settings = (await queries.getUserSettings()) as any;
      const currentDay = settings.current_day || 1;
      const activities = (await queries.getActivitiesForDay(currentDay)) as any[];
      const exerciseActivity = activities.find(
        (a) => a.activity_type === "exercise" && a.activity_id === exercise.id
      );
      if (exerciseActivity && !exerciseActivity.completed) {
        await queries.completeActivity(exerciseActivity.id);
      }
    }

    res.json({
      correct: isCorrect,
      explanation: exercise.explanation,
      correctAnswer: exercise.answer,
    });
  });

  // Mind maps list
  app.get("/mindmaps", softAuth, async (req: Request, res: Response) => {
    const [common, mindmaps, modules] = await Promise.all([
      getCommonData(),
      queries.getAllMindmaps(),
      queries.getAllModules()
    ]);

    res.render("mindmaps", { ...common, mindmaps, modules });
  });

  // Mind map detail
  app.get("/mindmaps/:id", softAuth, async (req: Request, res: Response) => {
    const common = await getCommonData();
    const mindmap = (await queries.getMindmapById(parseInt(req.params.id))) as any;

    if (!mindmap) {
      return res
        .status(404)
        .render("error", { ...common, message: "Mind map not found" });
    }

    const allModules = await queries.getAllModules();

    let relatedModules: any[] = [];
    if (mindmap.module_id) {
      relatedModules = [await queries.getModuleById(mindmap.module_id)].filter(Boolean);
    } else {
      relatedModules = (allModules as any[]).slice(0, 6);
    }

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

    const phaseInfo: Record<string, string> = {
      reconnaissance:
        `<h4>Reconnaissance Phase</h4><p>Gathering information about the target passively and actively. This includes OSINT, DNS enumeration, and identifying the attack surface.</p><a href="/modules/pentest-process" class="btn btn-primary">View Pentest Process Module →</a>`,
      enumeration:
        `<h4>Enumeration Phase</h4><p>Actively probing services to extract detailed information like usernames, shares, and service versions.</p><a href="/modules/nmap" class="btn btn-primary">View Nmap Module →</a>`,
      exploitation:
        `<h4>Exploitation Phase</h4><p>Using discovered vulnerabilities to gain initial access to the target system.</p><a href="/modules/shells-payloads" class="btn btn-primary">View Shells Module →</a>`,
      "post-exploitation":
        `<h4>Post-Exploitation Phase</h4><p>Actions after gaining access: privilege escalation, persistence, lateral movement, and data exfiltration.</p><a href="/modules/linux-privesc" class="btn btn-primary">View Linux PrivEsc →</a> <a href="/modules/pivoting" class="btn">View Pivoting →</a>`,
      "privilege escalation":
        `<h4>Privilege Escalation</h4><p>Elevating access from a low-privileged user to root/SYSTEM. Critical for full system compromise.</p><a href="/modules/linux-privesc" class="btn btn-primary">Linux PrivEsc →</a> <a href="/modules/windows-privesc" class="btn">Windows PrivEsc →</a>`,
      "lateral movement":
        `<h4>Lateral Movement</h4><p>Moving from one compromised system to others in the network to expand access.</p><a href="/modules/pivoting" class="btn btn-primary">View Pivoting Module →</a>`,
      "initial access":
        `<h4>Initial Access</h4><p>The first foothold on the target network through exploitation of a vulnerability or misconfiguration.</p><a href="/modules/shells-payloads" class="btn btn-primary">View Shells Module →</a>`,
    };

    Object.assign(nodeDataMap, phaseInfo);

    let nodeInfo = "";
    if (mindmap.module_id) {
      const mod = (await queries.getModuleById(mindmap.module_id)) as any;
      if (mod && mod.cheatsheet_md) {
        nodeInfo = mod.cheatsheet_md;
      }
    }

    // Auto-complete activity
    const settings = (await queries.getUserSettings()) as any;
    const currentDay = settings.current_day || 1;
    const activities = (await queries.getActivitiesForDay(currentDay)) as any[];
    const mindmapActivity = activities.find(
      (a) => a.activity_type === "mindmap" && a.activity_id === mindmap.id
    );
    if (mindmapActivity && !mindmapActivity.completed) {
      await queries.completeActivity(mindmapActivity.id);
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
  app.get("/flashcards", softAuth, async (req: Request, res: Response) => {
    const [common, flashcards, dueFlashcards, modules] = await Promise.all([
      getCommonData(),
      queries.getAllFlashcards(),
      queries.getDueFlashcards(),
      queries.getAllModules()
    ]);

    res.render("flashcards", { ...common, flashcards, dueFlashcards, modules });
  });

  // Flashcard review
  app.get("/flashcards/review", softAuth, async (req: Request, res: Response) => {
    const [common, dueFlashcards] = await Promise.all([
      getCommonData(),
      queries.getDueFlashcards()
    ]);

    res.render("flashcard-review", { ...common, flashcards: dueFlashcards });
  });

  // Submit flashcard review
  app.post("/api/flashcards/:id/review", requireAuth, async (req: Request, res: Response) => {
    const flashcard = (await queries.getFlashcardById(parseInt(req.params.id))) as any;

    if (!flashcard) {
      return res.status(404).json({ error: "Flashcard not found" });
    }

    const { quality } = req.body;
    const nextReview = calculateNextReview(quality, flashcard);

    await queries.updateFlashcard({
      id: flashcard.id,
      ...nextReview,
    });

    res.json({ success: true, nextReview: nextReview.next_review });
  });

  // Notes
  app.get("/notes", softAuth, async (req: Request, res: Response) => {
    const [common, notes, templates, modules] = await Promise.all([
      getCommonData(),
      queries.getAllNotes(),
      queries.getAllTemplates(),
      queries.getAllModules()
    ]);

    res.render("notes", { ...common, notes, templates, modules });
  });

  // New note form
  app.get("/notes/new", requireAuth, async (req: Request, res: Response) => {
    const templateId = req.query.template;
    const [common, templates, modules, template] = await Promise.all([
      getCommonData(),
      queries.getAllTemplates(),
      queries.getAllModules(),
      templateId ? queries.getTemplateById(parseInt(templateId as string)) : Promise.resolve(null)
    ]);

    res.render("note-edit", {
      ...common,
      note: null,
      templates,
      modules,
      template,
    });
  });

  // Edit note
  app.get("/notes/:id/edit", requireAuth, async (req: Request, res: Response) => {
    const common = await getCommonData();
    const note = await queries.getNoteById(parseInt(req.params.id));
    const templates = await queries.getAllTemplates();
    const modules = await queries.getAllModules();

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
  app.get("/notes/:id", softAuth, async (req: Request, res: Response) => {
    const common = await getCommonData();
    const note = await queries.getNoteById(parseInt(req.params.id));

    if (!note) {
      return res
        .status(404)
        .render("error", { ...common, message: "Note not found" });
    }

    res.render("note-view", { ...common, note });
  });

  // Create note
  app.post("/notes", requireAuth, async (req: Request, res: Response) => {
    const { title, body_md, tags, module_id, template_type } = req.body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).send("Bad Request: Title is required.");
    }

    const lastId = await queries.createNote({
      title: title.substring(0, 200), // sanitize max length
      body_md,
      tags: tags ? String(tags).substring(0, 100) : null,
      module_id: module_id ? parseInt(module_id) : null,
      template_type: template_type || null,
    });

    await buildSearchIndex();
    res.redirect(`/notes/${lastId}`);
  });

  // Update note
  app.post("/notes/:id", requireAuth, async (req: Request, res: Response) => {
    const { title, body_md, tags, module_id } = req.body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).send("Bad Request: Title is required.");
    }

    await queries.updateNote({
      id: parseInt(req.params.id),
      title: title.substring(0, 200), // sanitize max length
      body_md,
      tags: tags ? String(tags).substring(0, 100) : null,
      module_id: module_id ? parseInt(module_id) : null,
    });

    await buildSearchIndex();
    res.redirect(`/notes/${req.params.id}`);
  });

  // Delete note
  app.post("/notes/:id/delete", requireAuth, async (req: Request, res: Response) => {
    await queries.deleteNote(parseInt(req.params.id));
    await buildSearchIndex();
    res.redirect(`/notes`);
  });

  // Search
  app.get("/search", requireAuth, async (req: Request, res: Response) => {
    const common = await getCommonData();
    const query = req.query.q as string;

    let results: any[] = [];
    if (query && query.trim()) {
      try {
        results = await queries.search(query);
      } catch (e) {
        results = [];
      }
    }

    res.render("search", { ...common, query, results });
  });

  // Settings
  app.get("/settings", requireAuth, async (req: Request, res: Response) => {
    const common = await getCommonData();
    const settings = await queries.getUserSettings();
    res.render("settings", { ...common, settings });
  });

  // Reset progress
  app.post("/api/settings/reset-progress", requireAuth, async (req: Request, res: Response) => {
    await queries.resetProgress();
    res.json({ success: true });
  });

  // Export data
  app.get("/api/export", requireAuth, async (req: Request, res: Response) => {
    const notes = await queries.getAllNotes();
    const progress = await queries.getAllProgress();
    res.json({ notes, progress, exportedAt: new Date().toISOString() });
  });

  // Import data
  app.post("/api/import", requireAuth, async (req: Request, res: Response) => {
    const { notes, progress } = req.body;

    if (notes && Array.isArray(notes)) {
      for (const note of notes) {
        await queries.createNote({
          title: note.title,
          body_md: note.body_md,
          tags: note.tags,
          module_id: note.module_id,
          template_type: note.template_type,
        });
      }
    }

    await buildSearchIndex();
    res.json({ success: true });
  });

  // Mark plan day complete
  app.post("/api/plan/:dayId/toggle", requireAuth, async (req: Request, res: Response) => {
    const dayId = parseInt(req.params.dayId);
    const current = (await queries.getProgress("plan_day", dayId)) as any;

    const newStatus =
      current?.status === "completed" ? "not_started" : "completed";

    await queries.upsertProgress({
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
  app.post("/api/activities/:id/toggle", requireAuth, async (req: Request, res: Response) => {
    const activityId = parseInt(req.params.id);
    const { completed } = req.body;

    if (completed) {
      await queries.completeActivity(activityId);
    } else {
      await queries.uncompleteActivity(activityId);
    }

    const settings = (await queries.getUserSettings()) as any;
    const dayComplete = await queries.isDayComplete(settings.current_day);

    res.json({ success: true, dayComplete });
  });

  // Advance to next day
  app.post("/api/plan/advance-day", requireAuth, async (req: Request, res: Response) => {
    const settings = (await queries.getUserSettings()) as any;
    const currentDay = settings.current_day || 1;
    const planDuration = settings.plan_duration || 30;

    if (currentDay < planDuration) {
      const newDay = currentDay + 1;
      await queries.advanceDay();
      await generateActivitiesForDay(newDay, planDuration);
      res.json({ success: true, newDay });
    } else {
      res.json({ success: false, message: "Plan completed!" });
    }
  });

  // Save reflection
  app.post("/api/reflections/:day", requireAuth, async (req: Request, res: Response) => {
    const dayNumber = parseInt(req.params.day);
    const { content } = req.body;

    await queries.upsertReflection({
      day_number: dayNumber,
      content: content || "",
    });

    res.json({ success: true });
  });

  // Change plan duration
  app.post("/api/settings/plan-duration", requireAuth, async (req: Request, res: Response) => {
    const { duration } = req.body;

    if (![30, 60, 90, 180].includes(duration)) {
      return res.status(400).json({ error: "Invalid duration" });
    }

    await queries.resetPlan(duration);
    await generateActivitiesForDay(1, duration);

    res.json({ success: true, duration });
  });

  // API: Searchable items for command palette
  app.get("/api/search-items", requireAuth, async (req: Request, res: Response) => {
    const modules = (await queries.getAllModules()).map((m: any) => ({
      type: "module",
      title: m.title,
      url: `/modules/${m.id}`,
    }));

    const exercises = (await queries.getAllExercises())
      .slice(0, 50)
      .map((e: any) => ({
        type: "exercise",
        title: e.prompt.substring(0, 60) + "...",
        url: `/exercises/${e.id}`,
      }));

    const mindmaps = (await queries.getAllMindmaps()).map((m: any) => ({
      type: "mindmap",
      title: m.title,
      url: `/mindmaps/${m.id}`,
    }));

    const notes = (await queries.getAllNotes()).map((n: any) => ({
      type: "note",
      title: n.title,
      url: `/notes/${n.id}`,
    }));

    const pages = [
      { type: "page", title: "Dashboard", url: `/` },
      { type: "page", title: "30-Day Plan", url: `/plan` },
      { type: "page", title: "Modules", url: `/modules` },
      { type: "page", title: "Exercises", url: `/exercises` },
      { type: "page", title: "Mind Maps", url: `/mindmaps` },
      { type: "page", title: "Flashcards", url: `/flashcards` },
      { type: "page", title: "Notes", url: `/notes` },
      { type: "page", title: "Search", url: `/search` },
      { type: "page", title: "Settings", url: `/settings` },
    ];

    res.json([...pages, ...modules, ...mindmaps, ...notes, ...exercises]);
  });

  // Error handling
  app.use(async (req: Request, res: Response) => {
    const common = await getCommonData();
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
║   CPTS Companion v2.0.0                                   ║
║   Server running at http://localhost:${PORT}                 ║
║   Auth: Better Auth + Google Sign-in                      ║
║   DB: Neon Postgres                                       ║
║                                                           ║
║   Educational use only - Authorized labs only!            ║
╚═══════════════════════════════════════════════════════════╝
    `);
  });
}

// Start the server
startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
