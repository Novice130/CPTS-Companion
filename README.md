# CPTS Companion

A comprehensive learning dashboard to help you prepare for the **Hack The Box CPTS certification** in 30 days.

![HTB Dark Theme](https://img.shields.io/badge/Theme-HTB%20Dark-1a2332?style=flat&logo=hackthebox&logoColor=9FEF00)
![Node.js](https://img.shields.io/badge/Node.js-23-339933?style=flat&logo=node.js)
![TypeScript](https://img.shields.io/badge/TypeScript-No%20Build-3178C6?style=flat&logo=typescript)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat&logo=docker)

## ⚡ Quick Start

### With Docker (Recommended)

```bash
# Build the image
docker build -t cpts-companion .

# Run the container
docker run -p 3000:3000 cpts-companion

# Open http://localhost:3000
```

### Without Docker

```bash
# Install dependencies
npm install

# Run the app
npm start

# Or with watch mode for development
npm run dev
```

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
├── Dockerfile          # Docker configuration
├── package.json        # Dependencies
├── server.ts           # Express server
├── db.ts               # SQLite + queries
├── seed/               # Learning content
│   ├── modules.json    # 26 modules
│   ├── exercises.json  # 50+ exercises
│   ├── flashcards.json # 60 flashcards
│   ├── mindmaps.json   # 19 mind maps
│   ├── plan.json       # 30-day plan
│   └── templates.json  # Note templates
├── views/              # EJS templates
│   ├── partials/       # Shared components
│   └── *.ejs           # Page templates
└── public/
    ├── css/style.css   # HTB theme
    └── js/app.js       # Client JS
```

## 🛠️ Tech Stack

- **Runtime**: Node.js 23 with `--experimental-strip-types`
- **Server**: Express.js
- **Database**: SQLite (better-sqlite3)
- **Templates**: EJS
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
