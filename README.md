# CPTS Companion

A comprehensive learning dashboard to help you prepare for the **Hack The Box CPTS certification** in 30 days.

![HTB Dark Theme](https://img.shields.io/badge/Theme-HTB%20Dark-1a2332?style=flat&logo=hackthebox&logoColor=9FEF00)
![Node.js](https://img.shields.io/badge/Node.js-23-339933?style=flat&logo=node.js)
![TypeScript](https://img.shields.io/badge/TypeScript-No%20Build-3178C6?style=flat&logo=typescript)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?style=flat&logo=cloudflare&logoColor=white)

## ⚡ Quick Start

### Deployed Application

CPTS Companion is deployed on **Cloudflare Workers** and accessible at [cpts.learnnovice.com](https://cpts.learnnovice.com).

### Running Locally (Node.js)

```bash
# Install dependencies
npm install

# Run the app (standard Node.js / Express)
npm start

# Or with watch mode for development
npm run dev
```

The local dev path preserves the full Express runtime — WebSocket Pool, live template rendering, scrypt hashing — everything you expect from Node.

### Deploying to Cloudflare Workers

```bash
# Set secrets once
npx wrangler secret put DATABASE_URL
npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler secret put BETTER_AUTH_URL

# Bundle worker + views and deploy
npm run deploy
```

## 🚚 Migration: Dokploy/Docker → Cloudflare Workers

The app originally ran on a self-hosted **Dokploy** VPS (Docker + Traefik reverse proxy). We migrated to **Cloudflare Workers** for:

- **Cost**: Workers free tier (100k requests/day) eliminated VPS hosting fees.
- **Global edge**: Requests terminate at the nearest CF data center instead of a single region.
- **Zero infra**: No Docker images, no Traefik labels, no container restarts, no SSL renewal — Wrangler handles it.
- **Simpler deploys**: `npm run deploy` replaces Git push → Dokploy webhook → Docker build → Traefik reload.

The migration was non-trivial because Workers is **not Node.js** — it's a V8 isolate with different constraints (no `new Function()`, no long-lived TCP, 10ms CPU on free tier, no filesystem). The architecture was adapted rather than rewritten — see [deployment_lessons_learned.md](deployment_lessons_learned.md) for the full breakdown.

Key architectural changes:

- **Templates**: Eta templates are **pre-compiled** at build time (`scripts/bundle-views.mjs`) into a manifest because Workers bans runtime `new Function()`.
- **Database**: Neon Postgres uses the **HTTP** client (`neon()`) on Workers instead of the **WebSocket Pool** — Workers forbids I/O that crosses request boundaries.
- **Password hashing**: Swapped Better Auth's default scrypt for **PBKDF2 via Web Crypto** (100k iterations) to fit the 10ms CPU budget.
- **Express shim**: `worker.ts` adapts the Fetch API `Request`/`Response` to Express's `IncomingMessage`/`ServerResponse`. Auth routes bypass the shim and call `auth.handler(req)` directly.
- **Dual-mode**: All the above is gated on `process.env.CF_PAGES` so local Node.js development still uses the original Pool + scrypt path.

## 🎯 Features

### 📅 30-Day Study Plan

- Structured daily schedule covering all CPTS modules
- Track completion and progress
- Estimated time per day
- Lab focus and review tasks

### 📚 Module Library

- 26 comprehensive modules
- Cheatsheets with commands
- Common pitfalls
- Exam survival tips

### 🎯 Interactive Exercises

- **200+ exercises** including:
  - Multiple choice questions
  - Fill-in-the-command
  - Decision trees
  - Case file analysis
- Automatic validation
- Explanations for each answer

### 🃏 Flashcards with Spaced Repetition

- 60+ Q&A flashcards
- SM-2 algorithm for optimal review scheduling
- Track learning progress

### 🗺️ Mind Maps

- 19 Mermaid.js diagrams
- CPTS Kill Chain overview
- Attack flow visualizations
- Module-specific concept maps

### 📝 Notes System

- Personal note-taking
- Pre-built templates:
  - Enumeration template
  - Web testing checklist
  - AD attack flow
  - Linux/Windows privesc checklists
  - Reporting template

### 🔍 Full-Text Search

- Search across all content
- Find commands, concepts, techniques

### ⌨️ Command Palette

- Quick navigation with `Ctrl+K`
- Search pages, modules, exercises

## 🎨 HTB Dark Terminal Theme

The app features a custom dark terminal theme inspired by Hack The Box:

- Dark backgrounds (`#111927`, `#1a2332`)
- Neon green accent (`#9FEF00`)
- Monospace fonts
- Terminal-styled components
- Subtle scanline effects

## 📁 Project Structure

```
cpts-companion/
├── wrangler.toml              # Cloudflare Workers config
├── worker.ts                  # Fetch-API entry (Express shim + auth bypass)
├── server.ts                  # Express app (runs on Node locally, shimmed on Workers)
├── auth.ts                    # Better Auth (PBKDF2 on Workers, scrypt on Node)
├── db.ts                      # Neon client (HTTP on Workers, Pool on Node)
├── package.json               # Dependencies & scripts
├── scripts/
│   ├── build-worker.mjs       # esbuild bundler → dist/_worker.js
│   └── bundle-views.mjs       # Pre-compiles Eta templates → views-manifest.ts
├── views-manifest.ts          # Auto-generated compiled templates
├── seed/                      # Learning content
│   ├── modules.json           # 26 modules
│   ├── exercises.json         # 50+ exercises
│   ├── flashcards.json        # 60 flashcards
│   ├── mindmaps.json          # 19 mind maps
│   ├── plan.json              # 30-day plan
│   └── templates.json         # Note templates
├── views/                     # EJS/Eta source templates
│   ├── partials/
│   └── *.ejs
├── public/                    # Static assets (served by CF [assets])
│   ├── css/style.css
│   └── js/app.js
└── dist/                      # Build output (gitignored)
    └── _worker.js
```

## 🛠️ Tech Stack

- **Runtime (prod)**: Cloudflare Workers (V8 isolate, `nodejs_compat`)
- **Runtime (local)**: Node.js 23 with `--experimental-strip-types`
- **Server**: Express.js (via Fetch-API shim on Workers)
- **Bundler**: esbuild (`scripts/build-worker.mjs`)
- **Database**: Neon Postgres — `@neondatabase/serverless` HTTP (Workers) / WebSocket Pool (Node)
- **ORM**: Drizzle + Kysely (via `kysely-neon` for Better Auth on Workers)
- **Authentication**: Better Auth — PBKDF2 via Web Crypto on Workers, scrypt on Node
- **Emails**: Resend API
- **Templates**: Eta (pre-compiled at build time for Workers)
- **Styling**: Vanilla CSS (no build required)
- **Diagrams**: Mermaid.js (client-side)

## 📖 Modules Covered

1. Penetration Testing Process
2. Network Enumeration with Nmap
3. Footprinting
4. Web Information Gathering
5. Vulnerability Assessment
6. File Transfers
7. Shells & Payloads
8. Metasploit Framework
9. Password Attacks
10. Attacking Common Services
11. Pivoting, Tunneling & Port Forwarding
12. Active Directory Enumeration
13. Active Directory Attacks
14. Using Web Proxies
15. Attacking Web Apps with Ffuf
16. Login Brute Forcing
17. SQL Injection Fundamentals
18. SQLMap Essentials
19. Cross-Site Scripting (XSS)
20. File Inclusion
21. File Upload Attacks
22. Command Injections
23. Web Attacks (SSRF, XXE, IDOR)
24. Attacking Common Applications
25. Linux Privilege Escalation
26. Windows Privilege Escalation

## ⚠️ Disclaimer

**This application is for educational purposes only.**

Only use the techniques and knowledge gained from this application on systems you have explicit authorization to test. Unauthorized access to computer systems is illegal and unethical.

Always practice in authorized environments such as:

- Hack The Box
- TryHackMe
- Your own lab environment
- Authorized penetration testing engagements

## 📝 License

MIT License - See LICENSE file for details.

---

Built with 💚 for the CPTS community
