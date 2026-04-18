# CPTS Companion — Master Implementation Registry (Source of Truth)

**Execution Protocol for AI:** This document is the project "DNA." When a user requests a specific [TASK ID], use the detailed specifications under that ID. Do not summarize. Deliver production-ready code, JSON, or Markdown content according to the Global Formatting Rules.

---

## 1. Global Project DNA

- **Site:** cpts.learnnovice.com
- **Core Goal:** A definitive HTB CPTS study companion — as engaging as boot.dev, as comprehensive as HackTricks, and as visually intuitive as Obsidian.
- **Tech Stack:** Express.js (EJS), TypeScript, PostgreSQL (Neon), Tailwind CSS alternative (custom CSS), GSAP (Animations), D3.js (Mind Map).
- **Design Aesthetic:** Dark terminal theme (`#0d1117`), Monospace fonts (JetBrains Mono/Fira Code), HackTheBox green/teal accents.

---

## 2. Global Formatting Rules

- **Code:** Use bash and powershell blocks with inline flag explanations.
- **Content:** No placeholders. No summaries. No "overviews." Provide actual exam-ready technical data.
- **Interactivity:** Always specify animation scenes, triggers, and state-changes.
- **Data:** Seed data must follow the established schema for modules.json, exercises.json, and flashcards.json.

---

## 3. The Task Library (Full Specifications)

### [TASK 1.1] Animated Site Roadmap (Onboarding)
**Status: COMPLETE** — `views/onboarding.ejs`, `public/css/onboarding.css`, `public/js/onboarding.js`

- 4-scene GSAP cinematic intro (24s)
- Scene 1: Typewriter terminal effect
- Scene 2: Network map node reveal (D3-style SVG)
- Scene 3: Hacker avatar walks knowledge path
- Scene 4: CTA with counter animation
- localStorage flag to skip on repeat visits
- Reduced-motion fallback with static card grid

### [TASK 1.2] Interactive Obsidian Mind Map
**Status: COMPLETE** — `views/explore.ejs`, `public/css/mindmap-interactive.css`, `public/js/mindmap-interactive.js`

- D3.js v7 Force-Directed Graph
- 43 nodes across 6 branches (Networking, Web, AD, Exploitation, PrivEsc, Reporting)
- Color-coded by difficulty (Green/Amber/Red)
- Prerequisite arrows, side panel, zoom/pan, minimap, search, PNG export
- Demo progress mode

### [TASK 2.1] Module Learning Flow (Gamification)
**Status: COMPLETE** — `views/module-learn.ejs`, `public/css/module-learn.css`, `public/js/module-learn.js`

5-step per-module flow:
1. Animated concept intro (SVG + GSAP, category-based animations)
2. Interactive cheatsheet (flag tooltips, copy buttons, context modals, fake terminal output)
3. Terminal emulator exercise (tab completion, fuzzy matching, hint system, 3-attempt solution reveal)
4. Flashcard arena (3D flip, SRS integration via /api/flashcards/:id/review)
5. Completion moment (canvas confetti, badge animation, next module auto-link)

### [TASK 2.2] Report Writing Tutorial
**Status: COMPLETE** — `views/report-course.ejs`, `public/css/report-course.css`, `public/js/report-course.js`

6 stages:
1. Comic strip "Why Reports Matter" (CSS slide-in animations)
2. Report structure walkthrough (expandable sections with example modals)
3. The Finding Builder (title selection → CVSS 3.1 calculator → fill-blanks → drag PoC → impact → remediation)
4. Executive Summary editor (jargon detector, word counter, auto-checklist)
5. Report assembly drag-and-drop + compile animation
6. Tool walkthroughs (SysReptor / Pwndoc / Markdown+Pandoc)

### [TASK 3.0] Expansion Seed Data
**Status: COMPLETE**

- `seed/modules-expanded.json` — 3 new modules (order_index 38-40)
- `seed/exercises-expanded.json` — ~60 new exercises (module_id 1-40)
- `seed/flashcards-expanded.json` — 400+ new flashcards (module_id 1-40)
- `scripts/load-expanded-seed.ts` — Seed loader merging expanded data into DB

**New Modules:**
- 38: Credential Hunting (`credential-hunting`) — Post-Exploitation
- 39: OPSEC & AV Evasion (`opsec-evasion`) — Post-Exploitation
- 40: Report Writing Deep Dive (`report-writing-deep-dive`) — Assessments

### [TASK 3.1 – 3.37] High-Fidelity Module Content
**Status: PENDING**

For each module, generate sections A through L:
- **A:** Concept explanation (300-500 words)
- **B:** Animation script (for module-learn.ejs step 1)
- **C:** Cheatsheet (production-ready HTML for cheatsheet_md field)
- **D:** Attack methodology (step-by-step workflow)
- **E:** Real-world CVEs (3-5 relevant CVEs with scores and exploitation notes)
- **F:** Common Mistakes (5 bulleted mistakes with explanations)
- **G:** Exam Tips (5 CPTS-specific tips)
- **H:** Tool Comparison Table (3-5 tools with features/use cases)
- **I:** 5 Exercises (case_file, fill_command, spot_mistake, decision_tree, report_finding types)
- **J:** 10 Flashcards (question/answer pairs)
- **K:** HTB/THM Machine Mappings (machines that teach this module's concepts)
- **L:** External Resources (3-5 links with descriptions)

### [TASK 4] Deep-Dive Research
**Status: PENDING**

Research tasks for 15 topics:
1. BloodHound advanced queries and shortest path analysis
2. Ligolo-ng double pivot setup
3. AD CS ESC1-ESC8 complete attack chains
4. RBCD (Resource-Based Constrained Delegation) full walkthrough
5. Potato attacks (PrintSpoofer, JuicyPotato, GodPotato) comparison
6. Responder + NTLMRelayx complete attack chain
7. AMSI bypass techniques (2026 working methods)
8. GPO abuse for persistence and lateral movement
9. SysReptor complete setup and template creation
10. HTB machines mapped to CPTS modules
11. Certipy complete usage guide
12. Shadow Credentials attack chain
13. NFS exploitation (no_root_squash, uid=0)
14. Docker/LXD escape techniques
15. Credential hunting automation scripts

### [TASK 5] Gamification — Boss Challenges & Mock Exams
**Status: PENDING**

- 10 Boss Challenges (full scenarios with hints and solutions)
- 5 Mock Exam Simulation Days (hour-by-hour schedules, 10-box scenarios)

### [TASK 6] Community & Launch Content
**Status: PENDING**

- Public CPTS Path page (`/path`) — shareable progress tracker
- Exam Tips page (`/exam-tips`) — 25 curated tips
- Hall of Fame page (`/hall-of-fame`) — CPTS passers showcase

### [TASK 7] SEO & Discoverability
**Status: PENDING**

- Meta tags and Open Graph for every page
- Blog post: "How I'm Preparing for HTB CPTS in 30 Days"
- Sitemap.xml
- robots.txt

---

## 4. Module ID Reference Table

| ID | Slug | Title | Category |
|----|------|-------|----------|
| 1 | pentest-process | Penetration Testing Process | Fundamentals |
| 2 | nmap | Network Enumeration with Nmap | Enumeration |
| 3 | footprinting | Footprinting | Enumeration |
| 4 | web-info-gathering | Web Information Gathering | Web |
| 5 | vuln-assessment | Vulnerability Assessment | Fundamentals |
| 6 | file-transfers | File Transfers | Fundamentals |
| 7 | shells-payloads | Shells & Payloads | Exploitation |
| 8 | metasploit | Metasploit Framework | Exploitation |
| 9 | password-attacks | Password Attacks | Exploitation |
| 10 | common-services | Attacking Common Services | Exploitation |
| 11 | pivoting | Pivoting, Tunneling & Port Forwarding | Post-Exploitation |
| 12 | ad-enum | Active Directory Enumeration | Active Directory |
| 13 | ad-attacks | Active Directory Attacks | Active Directory |
| 14 | web-proxies | Using Web Proxies | Web |
| 15 | ffuf | Attacking Web Apps with Ffuf | Web |
| 16 | login-bruteforce | Login Brute Forcing | Web |
| 17 | sqli | SQL Injection Fundamentals | Web |
| 18 | sqlmap | SQLMap Essentials | Web |
| 19 | xss | Cross-Site Scripting (XSS) | Web |
| 20 | file-inclusion | File Inclusion | Web |
| 21 | file-upload | File Upload Attacks | Web |
| 22 | command-injection | Command Injections | Web |
| 23 | web-attacks | Web Attacks | Web |
| 24 | common-apps | Attacking Common Applications | Web |
| 25 | linux-privesc | Linux Privilege Escalation | Privilege Escalation |
| 26 | windows-privesc | Windows Privilege Escalation | Privilege Escalation |
| 27 | getting-started | Getting Started | Fundamentals |
| 28 | nessus | Vulnerability Scanning with Nessus | Enumeration |
| 29 | openvas | Vulnerability Scanning with OpenVAS | Enumeration |
| 30 | documentation-reporting | Documentation & Reporting | Fundamentals |
| 31 | attacking-enterprise | Attacking Enterprise Networks | Fundamentals |
| 32 | llmnr-poisoning | LLMNR/NBT-NS Poisoning | Active Directory |
| 33 | ptt-pth | Pass the Ticket & Pass the Certificate | Active Directory |
| 34 | acl-abuse | ACL Abuse | Active Directory |
| 35 | domain-trusts | Domain Trust Attacks | Active Directory |
| 36 | delegation-attacks | Constrained & Unconstrained Delegation | Active Directory |
| 37 | adcs-attacks | AD CS Attacks | Active Directory |
| 38 | credential-hunting | Credential Hunting | Post-Exploitation |
| 39 | opsec-evasion | OPSEC & AV Evasion | Post-Exploitation |
| 40 | report-writing-deep-dive | Report Writing Deep Dive | Assessments |

---

## 5. Key File Locations

```
c:/Users/Syed Amer/Documents/Phet/cpts companion/
├── server.ts                          — Express routes (main server)
├── views/
│   ├── layout.ejs                     — Main layout (sidebar + topbar)
│   ├── onboarding.ejs                 — Standalone animated intro
│   ├── explore.ejs                    — Interactive D3 mind map
│   ├── module-learn.ejs               — 5-step learning flow
│   ├── report-course.ejs              — 6-stage report writing course
│   └── module-detail.ejs              — Module detail page (has "Start Learning" button)
├── public/
│   ├── css/
│   │   ├── onboarding.css
│   │   ├── mindmap-interactive.css
│   │   ├── module-learn.css
│   │   └── report-course.css
│   └── js/
│       ├── onboarding.js
│       ├── mindmap-interactive.js
│       ├── module-learn.js
│       └── report-course.js
├── seed/
│   ├── modules.json                   — Original 37 modules
│   ├── modules-expanded.json          — 3 new modules (38-40)
│   ├── exercises.json                 — Original exercises
│   ├── exercises-expanded.json        — ~60 new exercises
│   ├── flashcards.json                — Original flashcards
│   └── flashcards-expanded.json       — 400+ new flashcards
└── scripts/
    ├── validate-seed.mjs              — Seed validation script
    └── load-expanded-seed.ts          — Seed loader for expanded data
```
