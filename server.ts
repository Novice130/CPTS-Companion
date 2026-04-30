import express from "express";
import { fileURLToPath } from "url";
import { dirname, join, relative } from "path";
import "dotenv/config";
import cookieParser from "cookie-parser";
import { Eta } from "eta";
import { viewsManifest } from "./views-manifest.ts";
import { researchTopics, getTopicBySlug, getAdjacentTopics } from "./data/research-topics.ts";
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

const __filename = 'index.js';
const __dirname = '.';

const eta = new Eta({
  views: join(__dirname, "views"),
  useWith: true, // Use ejs-style scoping (e.g. <%= title %> instead of <%= it.title %>)
  tags: ["<%", "%>"]
});

console.log('Initializing Express app...');
export const app = express();
console.log('Express app initialized.');
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

if (!process.env.CF_PAGES) {
  app.use(express.static(join(__dirname, "public")));
}


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

// Override eta.render so include() calls inside precompiled templates hit the manifest
// instead of calling new Function() for runtime compilation (banned in CF Workers)
const _etaRender = (eta as any).render.bind(eta);
(eta as any).render = (template: string, data: any, opts?: any) => {
  const key = template.replace(/\.ejs$/, '').replace(/^\.?\//, '');
  const manifest = viewsManifest as any;
  const fn = manifest[key] ?? manifest[`partials/${key}`];
  if (typeof fn === 'function') return (fn as Function).call(eta, data, opts);
  return _etaRender(template, data, opts);
};

// View engine — calls precompiled template functions (no new Function / eval at runtime)
app.engine("ejs", (path: string, options: any, callback: any) => {
  const viewsDir = join(__dirname, "views");
  let key = relative(viewsDir, path).replace(/\\/g, "/");
  if (key.endsWith(".ejs")) key = key.slice(0, -4);

  const fn = (viewsManifest as any)[key];
  if (typeof fn !== 'function') {
    return callback(new Error(`Template not found in manifest: ${key}`));
  }

  try {
    let html = (fn as Function).call(eta, options);

    // Smart layout wrapping: only wrap if the view doesn't already contain the full layout boilerplate.
    if (!html.includes('<!DOCTYPE html>')) {
      const layoutFn = (viewsManifest as any)['layout'];
      if (typeof layoutFn === 'function') {
        html = (layoutFn as Function).call(eta, { ...options, body: html });
      }
    }

    callback(null, html);
  } catch (err) {
    console.error(`Render error for ${key}:`, err);
    callback(err);
  }
});

app.set("view engine", "ejs");
app.set("views", join(__dirname, "views"));

// CF Workers have no filesystem — override Express's View class to skip fs.stat lookup
if (process.env.CF_PAGES) {
  class ManifestView {
    name: string; path: string; ext: string; engine: Function;
    constructor(name: string, opts: any) {
      this.name = name;
      this.ext = '.' + (opts.defaultEngine || 'ejs');
      const root = Array.isArray(opts.root) ? opts.root[0] : opts.root;
      this.path = join(root, name.includes('.') ? name : name + this.ext);
      this.engine = opts.engines[this.ext];
    }
    render(options: any, fn: Function) { this.engine(this.path, options, fn); }
  }
  app.set('view', ManifestView);
}


// ============================================
// Initialize DB (async — start server after init)
// ============================================
export async function startServer() {

  await initDatabase();
  await seedDatabase();
  await queries.clearAllSessions();

  // Helper to get common template data
  async function getCommonData(userId?: string) {
    if (!userId) {
      return {
        stats: { totalModules: 0, totalExercises: 0, totalFlashcards: 0, completedExercises: 0, completedDays: 0, dueFlashcards: 0, overallProgress: 0 },
        dueCount: 0,
        nextReview: "None due",
        settings: { plan_duration: 30, current_day: 1 }
      };
    }
    const [stats, dueFlashcards, settings] = await Promise.all([
      queries.getStats(userId),
      queries.getDueFlashcards(),
      queries.getUserSettings(userId)
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
    console.log(`\n[softAuth] --- Checking session for ${req.path} ---`);
    console.log(`[softAuth] Raw Cookie Header:`, req.headers.cookie);
    
    try {
      const session = await getSession(req);
      console.log(`[softAuth] getSession() Result:`, session ? `Valid for ${session.user.email}` : "NULL returned");
      
      if (session) {
        (req as any).user = session.user;
        return next();
      }
    } catch (e) {
      console.error(`[softAuth] ERROR getting session:`, e);
    }

    (req as any).user = null; // Guest user — popup handled client-side
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
    
    const common = await getCommonData(session?.user?.id);
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

  // Onboarding — animated intro (standalone, no layout)
  app.get("/onboarding", (req: Request, res: Response) => {
    res.render("onboarding");
  });

  // Explore — interactive CPTS knowledge mind map
  app.get("/explore", softAuth, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const common = await getCommonData(user?.id);
    res.render("explore", {
      ...common,
      currentPage: "explore",
      user,
      title: "Explore the CPTS Knowledge Map",
    });
  });

  // Dashboard
  app.get("/", softAuth, async (req: Request, res: Response) => {
    const user = (req as any).user;
    
    // Fetch initial parallel data
    const [common, modules, allNotes] = await Promise.all([
      getCommonData(user?.id),
      queries.getAllModules(),
      user ? queries.getAllNotes(user.id) : Promise.resolve([])
    ]);
    const recentNotes = allNotes.slice(0, 5);
    const settings = common.settings;

    const currentDay = settings.current_day || 1;
    let todayActivities = user ? await queries.getActivitiesForDay(user.id, currentDay) : [];

    if (user && (todayActivities as any[]).length === 0) {
      await generateActivitiesForDay(user.id, currentDay, settings.plan_duration || 30);
      todayActivities = await queries.getActivitiesForDay(user.id, currentDay);
    }

    const [dayProgress, reflection] = user ? await Promise.all([
      queries.getDayProgress(user.id, currentDay),
      queries.getReflection(user.id, currentDay)
    ]) : [ { total: 0, completed: 0, percentage: 0 }, null ];

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
      getCommonData(user?.id),
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

        const [activities, dayProgress] = user ? await Promise.all([
          queries.getActivitiesForDay(user.id, day),
          queries.getDayProgress(user.id, day)
        ]) : [ [], { total: 0, completed: 0, percentage: 0 } ];

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
    const user = (req as any).user;
    const [common, modulesRaw, progress] = await Promise.all([
      getCommonData(user?.id),
      queries.getAllModules(),
      user ? queries.getAllProgress(user.id) : Promise.resolve([])
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
    const user = (req as any).user;
    const [common, moduleRaw] = await Promise.all([
      getCommonData(user?.id),
      (/^\d+$/.test(req.params.id) ? queries.getModuleById(parseInt(req.params.id)) : queries.getModuleBySlug(req.params.id))
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
      user ? queries.getActivitiesForDay(user.id, currentDay) : Promise.resolve([])
    ]);
    const activities = activitiesRaw as any[];

    const moduleActivity = activities.find(
      (a) => a.activity_type === "module" && a.activity_id === module.id
    );
    if (user && moduleActivity && !moduleActivity.completed) {
      await queries.completeActivity(user.id, moduleActivity.id);
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

  // Module learn — 5-step animated learning flow
  app.get("/modules/:id/learn", softAuth, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const [common, moduleRaw, allModules] = await Promise.all([
      getCommonData(user?.id),
      (/^\d+$/.test(req.params.id) ? queries.getModuleById(parseInt(req.params.id)) : queries.getModuleBySlug(req.params.id)),
      queries.getAllModules()
    ]);
    const module = moduleRaw as any;
    if (!module) {
      return res.status(404).render("error", { ...common, message: "Module not found", user });
    }

    const [exercises, flashcards] = await Promise.all([
      queries.getExercisesByModule(module.id),
      queries.getFlashcardsByModule(module.id)
    ]);

    res.render("module-learn", {
      ...common,
      currentPage: "modules",
      module,
      modules: allModules,
      exercises,
      flashcards,
      user,
      title: module.title + " — Learn",
    });
  });

  // Report Writing Course — 6-stage interactive experience
  app.get("/report-course", softAuth, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const common = await getCommonData(user?.id);
    res.render("report-course", {
      ...common,
      currentPage: "modules",
      user,
      title: "Report Writing Course",
    });
  });

  // Exercises list
  app.get("/exercises", softAuth, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const [common, exercisesRaw, progress, modules] = await Promise.all([
      getCommonData(user?.id),
      queries.getAllExercises(),
      user ? queries.getAllProgress(user.id) : Promise.resolve([]),
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
      user: (req as any).user,
    });
  });

  // Exercise detail
  app.get("/exercises/:id", softAuth, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const exerciseId = parseInt(req.params.id);
    
    const [common, exerciseRaw, progress] = await Promise.all([
      getCommonData(user?.id),
      queries.getExerciseById(exerciseId),
      user ? queries.getProgress(user.id, "exercise", exerciseId) : Promise.resolve(null)
    ]);
    
    const exercise = exerciseRaw as any;

    if (!exercise) {
      return res
        .status(404)
        .render("error", { ...common, message: "Exercise not found" });
    }

    exercise.options = exercise.options ? JSON.parse(exercise.options) : null;
    exercise.hints = exercise.hints ? JSON.parse(exercise.hints) : null;

    res.render("exercise-detail", { ...common, exercise, progress, user });
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

    res.json({
      correct: isCorrect,
      explanation: exercise.explanation,
      correctAnswer: exercise.answer,
    });

    const userId = (req as any).user.id;
    
    // Background the database updates to prevent slow Postgres UI blocking
    (async () => {
      try {
        const updateTask = queries.upsertProgress(userId, {
          item_type: "exercise",
          item_id: exercise.id,
          status: isCorrect ? "completed" : "attempted",
          completed_at: isCorrect ? new Date().toISOString() : null,
          score: isCorrect ? 100 : 0,
          last_seen: new Date().toISOString(),
        });

        if (isCorrect) {
          // Run the settings/activity lookups concurrently with the upsert
          const [_, settings] = await Promise.all([
            updateTask,
            queries.getUserSettings(userId)
          ]);
          const currentDay = (settings as any).current_day || 1;
          const activities = (await queries.getActivitiesForDay(userId, currentDay)) as any[];
          const exerciseActivity = activities.find(
            (a) => a.activity_type === "exercise" && a.activity_id === exercise.id
          );
          if (exerciseActivity && !exerciseActivity.completed) {
            await queries.completeActivity(userId, exerciseActivity.id);
          }
        } else {
          await updateTask;
        }
      } catch (err) {
        console.error("Async exercise progress update failed:", err);
      }
    })();
  });

  // Mind maps list
  app.get("/mindmaps", softAuth, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const [common, mindmaps, modules] = await Promise.all([
      getCommonData(user?.id),
      queries.getAllMindmaps(),
      queries.getAllModules()
    ]);

    res.render("mindmaps", { ...common, mindmaps, modules, user: (req as any).user });
  });

  // Mind map detail
  app.get("/mindmaps/:id", softAuth, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const common = await getCommonData(user?.id);
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
    if (user) {
      const settings = (await queries.getUserSettings(user.id)) as any;
      const currentDay = settings.current_day || 1;
      const activities = (await queries.getActivitiesForDay(user.id, currentDay)) as any[];
      const mindmapActivity = activities.find(
        (a) => a.activity_type === "mindmap" && a.activity_id === mindmap.id
      );
      if (mindmapActivity && !mindmapActivity.completed) {
        await queries.completeActivity(user.id, mindmapActivity.id);
      }
    }

    res.render("mindmap-detail", {
      ...common,
      mindmap,
      relatedModules,
      allModules,
      nodeDataMap,
      nodeInfo,
      user: (req as any).user,
    });
  });

  // Flashcards
  app.get("/flashcards", softAuth, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const [common, flashcards, dueFlashcards, modules] = await Promise.all([
      getCommonData(user?.id),
      queries.getAllFlashcards(),
      queries.getDueFlashcards(),
      queries.getAllModules()
    ]);

    res.render("flashcards", { ...common, flashcards, dueFlashcards, modules, user: (req as any).user });
  });

  // Flashcard review
  app.get("/flashcards/review", softAuth, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const [common, dueFlashcards] = await Promise.all([
      getCommonData(user?.id),
      queries.getDueFlashcards()
    ]);

    res.render("flashcard-review", { ...common, flashcards: dueFlashcards, user: (req as any).user });
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
    const user = (req as any).user;
    const [common, notes, templates, modules] = await Promise.all([
      getCommonData(user?.id),
      user ? queries.getAllNotes(user.id) : Promise.resolve([]),
      queries.getAllTemplates(),
      queries.getAllModules()
    ]);

    res.render("notes", { ...common, notes, templates, modules, user });
  });

  // New note form
  app.get("/notes/new", requireAuth, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const templateId = req.query.template;
    const [common, templates, modules, template] = await Promise.all([
      getCommonData(user?.id),
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
      user,
    });
  });

  // Edit note
  app.get("/notes/:id/edit", requireAuth, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const common = await getCommonData(user?.id);
    const note = await queries.getNoteById(user.id, parseInt(req.params.id));
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
      user,
    });
  });

  // View note
  app.get("/notes/:id", softAuth, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const common = await getCommonData(user?.id);
    const note = user ? await queries.getNoteById(user.id, parseInt(req.params.id)) : null;

    if (!note) {
      return res
        .status(404)
        .render("error", { ...common, message: "Note not found" });
    }

    res.render("note-view", { ...common, note, user });
  });

  // Create note
  app.post("/notes", requireAuth, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { title, body_md, tags, module_id, template_type } = req.body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).send("Bad Request: Title is required.");
    }

    const lastId = await queries.createNote(user.id, {
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
    const user = (req as any).user;
    const { title, body_md, tags, module_id } = req.body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).send("Bad Request: Title is required.");
    }

    await queries.updateNote(user.id, {
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
    const user = (req as any).user;
    await queries.deleteNote(user.id, parseInt(req.params.id));
    await buildSearchIndex();
    res.redirect(`/notes`);
  });

  // Search
  app.get("/search", softAuth, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const common = await getCommonData(user?.id);
    const query = req.query.q as string;

    let results: any[] = [];
    if (query && query.trim()) {
      try {
        results = await queries.search(query);
      } catch (e) {
        results = [];
      }
    }

    res.render("search", { ...common, query, results, user });
  });

  // Settings
  app.get("/settings", requireAuth, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const common = await getCommonData(user?.id);
    const settings = await queries.getUserSettings(user.id);
    res.render("settings", { ...common, settings, user });
  });

  // Reset progress
  app.post("/api/settings/reset-progress", requireAuth, async (req: Request, res: Response) => {
    const user = (req as any).user;
    await queries.resetProgress(user.id);
    res.json({ success: true });
  });

  // Export data
  app.get("/api/export", requireAuth, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const notes = await queries.getAllNotes(user.id);
    const progress = await queries.getAllProgress(user.id);
    res.json({ notes, progress, exportedAt: new Date().toISOString() });
  });

  // Import data
  app.post("/api/import", requireAuth, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { notes, progress } = req.body;

    if (notes && Array.isArray(notes)) {
      for (const note of notes) {
        await queries.createNote(user.id, {
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
    const user = (req as any).user;
    const dayId = parseInt(req.params.dayId);
    const current = (await queries.getProgress(user.id, "plan_day", dayId)) as any;

    const newStatus =
      current?.status === "completed" ? "not_started" : "completed";

    await queries.upsertProgress(user.id, {
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
    const user = (req as any).user;
    const activityId = parseInt(req.params.id);
    const { completed } = req.body;

    if (completed) {
      await queries.completeActivity(user.id, activityId);
    } else {
      await queries.uncompleteActivity(user.id, activityId);
    }

    const settings = (await queries.getUserSettings(user.id)) as any;
    const dayComplete = await queries.isDayComplete(user.id, settings.current_day);

    res.json({ success: true, dayComplete });
  });

  // Advance to next day
  app.post("/api/plan/advance-day", requireAuth, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const settings = (await queries.getUserSettings(user.id)) as any;
    const currentDay = settings.current_day || 1;
    const planDuration = settings.plan_duration || 30;

    if (currentDay < planDuration) {
      const newDay = currentDay + 1;
      await queries.advanceDay(user.id);
      await generateActivitiesForDay(user.id, newDay, planDuration);
      res.json({ success: true, newDay });
    } else {
      res.json({ success: false, message: "Plan completed!" });
    }
  });

  // Save reflection
  app.post("/api/reflections/:day", requireAuth, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const dayNumber = parseInt(req.params.day);
    const { content } = req.body;

    await queries.upsertReflection(user.id, {
      day_number: dayNumber,
      content: content || "",
    });

    res.json({ success: true });
  });

  // Change plan duration
  app.post("/api/settings/plan-duration", requireAuth, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const { duration } = req.body;

    if (![30, 60, 90, 180].includes(duration)) {
      return res.status(400).json({ error: "Invalid duration" });
    }

    await queries.resetPlan(user.id, duration);
    await generateActivitiesForDay(user.id, 1, duration);

    res.json({ success: true, duration });
  });

  // API: Searchable items for command palette
  app.get("/api/search-items", requireAuth, async (req: Request, res: Response) => {
    const user = (req as any).user;
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

    const notes = (await queries.getAllNotes(user.id)).map((n: any) => ({
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

  // ============================================
  // Task 6 — Community & Launch Pages
  // ============================================

  app.get("/exam-tips", softAuth, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const common = await getCommonData(user?.id);
    res.render("exam-tips", {
      ...common,
      currentPage: "exam-tips",
      user,
      pageTitle: "Exam Tips",
      metaDesc: "25 battle-tested CPTS exam tips from certified passers — methodology, technical tactics, and report writing strategies to help you pass HTB CPTS.",
      ogPath: "/exam-tips",
      layout: "layout",
    });
  });

  app.get("/hall-of-fame", softAuth, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const common = await getCommonData(user?.id);
    res.render("hall-of-fame", {
      ...common,
      currentPage: "hall-of-fame",
      user,
      pageTitle: "Hall of Fame",
      metaDesc: "CPTS passers share their tips, timelines, and lessons learned. Learn from those who've already earned the HTB CPTS certification.",
      ogPath: "/hall-of-fame",
      layout: "layout",
    });
  });

  app.get("/path", softAuth, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const [common, modulesRaw, progressRaw] = await Promise.all([
      getCommonData(user?.id),
      queries.getAllModules(),
      user?.id ? queries.getUserProgress(user.id) : Promise.resolve([]),
    ]);
    const modules = modulesRaw as any[];
    const progress = progressRaw as any[];
    res.render("path", {
      ...common,
      currentPage: "path",
      user,
      modules,
      progress,
      pageTitle: "CPTS Learning Path",
      metaDesc: "Track your progress through all 40 CPTS modules. Shareable progress card for Twitter/LinkedIn. Complete the HTB CPTS learning path.",
      ogPath: "/path",
      layout: "layout",
    });
  });

  // ============================================
  // Task 7 — SEO: Sitemap & Robots
  // ============================================

  app.get("/sitemap.xml", async (_req: Request, res: Response) => {
    const modules = (await queries.getAllModules()) as any[];
    const moduleUrls = modules.map((m: any) => `
  <url>
    <loc>https://cpts.learnnovice.com/modules/${m.slug || m.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://cpts.learnnovice.com/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://cpts.learnnovice.com/modules</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://cpts.learnnovice.com/exercises</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://cpts.learnnovice.com/flashcards</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://cpts.learnnovice.com/explore</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://cpts.learnnovice.com/path</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://cpts.learnnovice.com/exam-tips</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://cpts.learnnovice.com/hall-of-fame</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>https://cpts.learnnovice.com/report-course</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://cpts.learnnovice.com/onboarding</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>https://cpts.learnnovice.com/blog/cpts-30-days</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://cpts.learnnovice.com/research</loc>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://cpts.learnnovice.com/challenges</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://cpts.learnnovice.com/mock-exam</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>${researchTopics.map(t => `
  <url>
    <loc>https://cpts.learnnovice.com/research/${t.slug}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`).join("")}${moduleUrls}
</urlset>`;
    res.set("Content-Type", "application/xml");
    res.send(xml);
  });

  app.get("/blog/cpts-30-days", softAuth, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const common = await getCommonData(user?.id);
    res.render("blog-cpts-30-days", {
      ...common,
      currentPage: "blog",
      user,
      pageTitle: "How I'm Preparing for HTB CPTS in 30 Days",
      metaDesc: "A practical 30-day CPTS prep guide — resources, daily schedule, tool setup, and tactics for passing the HTB Certified Penetration Testing Specialist exam.",
      ogPath: "/blog/cpts-30-days",
      layout: "layout",
    });
  });

  app.get("/robots.txt", (_req: Request, res: Response) => {
    res.set("Content-Type", "text/plain");
    res.send(`User-agent: *
Allow: /
Allow: /modules
Allow: /exercises
Allow: /flashcards
Allow: /explore
Allow: /path
Allow: /exam-tips
Allow: /hall-of-fame
Allow: /report-course
Allow: /onboarding
Allow: /research
Allow: /challenges
Allow: /mock-exam
Disallow: /api/
Disallow: /settings
Disallow: /notes
Disallow: /admin
Sitemap: https://cpts.learnnovice.com/sitemap.xml`);
  });

  // ============================================
  // TASK 4 — Research Hub Routes
  // ============================================
  app.get("/research", softAuth, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const common = await getCommonData(user?.id);
    res.render("research", {
      ...common,
      pageTitle: "Deep-Dive Research Hub",
      metaDesc: "Advanced CPTS research: BloodHound queries, AD CS ESC1-8, Ligolo-ng pivoting, RBCD, Potato attacks, Certipy, Shadow Credentials, and more.",
      ogPath: "/research",
      currentPage: "research",
      user,
      layout: "layout",
    });
  });

  app.get("/research/:slug", softAuth, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const topic = getTopicBySlug(req.params.slug);
    if (!topic) {
      const common = await getCommonData(user?.id);
      return res.status(404).render("error", { ...common, message: "Research topic not found", user });
    }
    const common = await getCommonData(user?.id);
    const { prev, next } = getAdjacentTopics(req.params.slug);
    res.render("research-topic", {
      ...common,
      topic,
      prev: prev ? { slug: prev.slug, title: prev.title } : null,
      next: next ? { slug: next.slug, title: next.title } : null,
      currentPage: "research",
      user,
      layout: "layout",
    });
  });

  // ============================================
  // TASK 5 — Gamification Routes
  // ============================================
  app.get("/challenges", softAuth, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const common = await getCommonData(user?.id);
    res.render("boss-challenges", {
      ...common,
      pageTitle: "Boss Challenges",
      metaDesc: "Test your CPTS skills with 10 boss challenge scenarios — full penetration test simulations with progressive hints and full solutions.",
      ogPath: "/challenges",
      currentPage: "challenges",
      user,
      layout: "layout",
    });
  });

  app.get("/mock-exam", softAuth, async (req: Request, res: Response) => {
    const user = (req as any).user;
    const common = await getCommonData(user?.id);
    res.render("mock-exam", {
      ...common,
      pageTitle: "Mock Exam Simulator",
      metaDesc: "5 CPTS mock exam simulation days with hour-by-hour schedules, 10-machine scenarios, and timed methodology to prepare for the real 10-day exam.",
      ogPath: "/mock-exam",
      currentPage: "mock-exam",
      user,
      layout: "layout",
    });
  });

  // Start server (only if PORT is defined, typically Node environment)
  if (process.env.PORT && !process.env.CF_PAGES) {
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
}

// Start the server if this file is run directly (Node)
if (typeof process !== "undefined" && process.env && process.env.PORT && !process.env.CF_PAGES) {
  startServer().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
}


