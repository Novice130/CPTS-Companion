# CPTS Companion

A comprehensive learning dashboard to help you prepare for the **Hack The Box CPTS certification** in 30 days.

![HTB Dark Theme](https://img.shields.io/badge/Theme-HTB%20Dark-1a2332?style=flat&logo=hackthebox&logoColor=9FEF00)
![Node.js](https://img.shields.io/badge/Node.js-23-339933?style=flat&logo=node.js)
![TypeScript](https://img.shields.io/badge/TypeScript-No%20Build-3178C6?style=flat&logo=typescript)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?style=flat&logo=cloudflare&logoColor=white)

## ⚡ Quick Start

### Deployed Application

CPTS Companion is deployed on **Cloudflare Workers** and accessible at [cpts.learnnovice.com](https://cpts.learnnovice.com).

### Running Locally (Linux / macOS / Windows)

```bash
# 1. Clone the repository
git clone https://github.com/Novice130/CPTS-Companion.git
cd CPTS-Companion

# 2. Install dependencies
npm install

# 3. Create .env (or use existing Neon Postgres connection)
# Optional: Set DATABASE_URL, BETTER_AUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

# 4. Start the application
npm start
```
The app will automatically compile the views and launch on `http://localhost:3000`.

---

## 🎯 Features & Navigation Hub

- **📅 30-Day / 60-Day / 90-Day Plan** (`/plan`): Dynamic day-by-day roadmap with automated activity tracking and progress metrics.
- **📚 40 Comprehensive Modules** (`/modules`): In-depth cheatsheets, syntax examples, and Reader Mode (`/modules/:id/learn`).
- **🎯 200+ Interactive Exercises** (`/exercises`): MCQs, command puzzles, and case file evaluations with real-time feedback.
- **🃏 Spaced Repetition Flashcards** (`/flashcards`): Powered by the SM-2 algorithm to optimize memory retention for the exam.
- **🗺️ Interactive Mind Maps & Explorer** (`/mindmaps`, `/explore`): Interactive kill-chain diagrams and conceptual visualizers.
- **⚔️ Boss Challenges** (`/challenges`): Real-world multi-step scenario challenges to test attack chains.
- **🎓 Mock Exam Simulator** (`/mock-exam`): 5-day methodology timetable, pacing benchmarks, and curated **Hack The Box** & **TryHackMe** lab mappings.
- **📝 Pentest Report Course** (`/report-course`): Full guide and interactive template for writing the official 20+ page CPTS exam report.
- **🔬 Research Hub** (`/research`): Deep dives on BloodHound, ADCS, Kerberoasting, and lateral movement.
- **💡 Exam Tips & Hall of Fame** (`/exam-tips`, `/hall-of-fame`): Practical survival strategies and student debriefs.
- **📝 Notes System** (`/notes`): Markdown note editor with pre-built engagement and methodology templates.
- **🔐 Modern Authentication**: Email/Password + **Sign in with Google** via Better Auth.

---

## 🧪 Mock Exam vs. Live Hands-On Labs

The **Mock Exam Simulator** (`/mock-exam`) provides the **5-day methodology framework, hour-by-hour schedules, timing benchmarks, and attack flowcharts** simulating the 10-day exam environment.

For live hands-on practice, connect your Kali machine to **Hack The Box (HTB)** and **TryHackMe (THM)** to practice against the mapped labs:
- **🟢 Hack The Box**: *Sau*, *Pilgrimage*, *Keeper*, *Delivery*, *Forest*, *Active*, *Resolute*, *Cascade*, *Dante ProLab*, *Zephyr ProLab*.
- **🔵 TryHackMe**: *Wreath Network* (Pivoting), *Attacktive Directory*, *Holo Network*, *Linux/Windows PrivEsc Arena*.

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
