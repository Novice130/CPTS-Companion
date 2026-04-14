/* ============================================
   CPTS Companion - Module Learning Flow Engine
   5-step animated learning: concept → cheatsheet →
   exercise → flashcards → completion
   ============================================ */

(function () {
  'use strict';

  const data = window.__learnData;
  if (!data) return;

  let currentStep = 1;
  let exerciseIndex = 0;
  let exerciseWrongAttempts = 0;
  let exerciseHintIndex = 0;
  let exerciseStats = { done: 0, correct: 0 };
  let flashIndex = 0;
  let flashFlipped = false;
  let flashStats = { reviewed: 0 };
  let animTimeline = null;
  let animPlaying = true;

  // ============================================
  // Step Navigation
  // ============================================

  window.goToStep = function (step) {
    if (step < 1 || step > 5) return;

    // Hide current
    const panels = document.querySelectorAll('.learn-panel');
    panels.forEach(p => p.classList.remove('active'));

    // Update step buttons
    for (let i = 1; i <= 5; i++) {
      const btn = document.getElementById(`stepBtn${i}`);
      if (!btn) continue;
      btn.classList.remove('active');
      if (i < step) btn.classList.add('completed');
      else btn.classList.remove('completed');
    }

    // Fill connectors
    for (let i = 1; i < 5; i++) {
      const conn = document.getElementById(`conn${i}${i + 1}`);
      if (conn) conn.style.width = i < step ? '100%' : '0%';
    }

    // Show target
    const target = document.getElementById(`step${step}`);
    if (target) target.classList.add('active');
    const btn = document.getElementById(`stepBtn${step}`);
    if (btn) btn.classList.add('active');

    currentStep = step;

    // Run step-specific init
    if (step === 1) initConceptAnimation();
    if (step === 3) initExerciseStep();
    if (step === 4) initFlashcardStep();
    if (step === 5) initCompletionStep();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ============================================
  // STEP 1: Concept Animation
  // ============================================

  const CATEGORY_ANIMATIONS = {
    enumeration: buildNetworkAnimation,
    'post-exploitation': buildNetworkAnimation,
    fundamentals: buildNetworkAnimation,
    web: buildWebAnimation,
    exploitation: buildExploitAnimation,
    assessments: buildReportAnimation,
  };

  function initConceptAnimation() {
    const svg = document.getElementById('conceptSvg');
    const group = document.getElementById('animGroup');
    if (!svg || !group) return;
    group.innerHTML = '';

    const category = (data.moduleCategory || '').toLowerCase();
    const builder = CATEGORY_ANIMATIONS[category] || buildNetworkAnimation;
    builder(group);

    startAnimTimeline();
  }

  function buildNetworkAnimation(g) {
    // Attacker machine
    addRect(g, 50, 160, 100, 80, '#161b22', '#1d9e75', 'Attacker');
    addText(g, 100, 205, '>_', '#1d9e75', 20);

    // Packet
    const packet = addCircle(g, 160, 200, 8, '#1d9e75');
    packet.id = 'anim-packet';
    packet.style.opacity = '0';

    // Ports
    for (let i = 0; i < 5; i++) {
      const x = 350 + i * 80;
      const port = addRect(g, x, 170, 50, 60, '#161b22', '#30363d', '');
      port.classList.add('anim-port');
      addText(g, x + 25, 205, `${[22,80,443,445,3389][i]}`, '#8b949e', 11);
      const lbl = ['SSH','HTTP','HTTPS','SMB','RDP'][i];
      addText(g, x + 25, 255, lbl, '#484f58', 9);
    }

    // Target
    addRect(g, 650, 160, 100, 80, '#161b22', '#e74c3c', 'Target');
    addText(g, 700, 205, '#', '#e74c3c', 20);

    setNarration('An attacker sends probes across the network to discover open ports on the target.');
  }

  function buildWebAnimation(g) {
    // Browser
    addRect(g, 30, 120, 180, 160, '#161b22', '#378add', 'Browser');
    addText(g, 120, 175, 'GET /login', '#378add', 12);
    addRect(g, 50, 195, 140, 60, '#0d1117', '#30363d', '');
    addText(g, 120, 220, "id=1' OR 1=1--", '#ff4444', 10);
    addText(g, 120, 240, 'Injection Point', '#e74c3c', 8);

    // Arrow
    addLine(g, 220, 200, 420, 200, '#378add');

    // Server
    addRect(g, 430, 120, 180, 160, '#161b22', '#ba7517', 'Server');
    addText(g, 520, 175, 'SQL Query', '#ba7517', 12);
    addRect(g, 450, 195, 140, 60, '#0d1117', '#30363d', '');
    addText(g, 520, 220, "SELECT * FROM users", '#8b949e', 10);
    addText(g, 520, 240, "WHERE id='1' OR 1=1", '#ff4444', 10);

    // Response arrow
    addLine(g, 420, 210, 220, 210, '#e74c3c');

    // DB
    addRect(g, 650, 150, 110, 100, '#161b22', '#a855f7', 'Database');
    addText(g, 705, 210, 'Dumped!', '#a855f7', 11);
    addLine(g, 610, 200, 650, 200, '#a855f7');

    setNarration('The attacker injects malicious SQL through a web form. The server passes it unsanitized to the database.');
  }

  function buildExploitAnimation(g) {
    // User at bottom
    addCircle(g, 100, 340, 20, '#378add');
    addText(g, 100, 345, 'U', '#378add', 14);
    addText(g, 100, 375, 'Low Priv', '#8b949e', 9);

    // Staircase
    const steps = ['SUID', 'Sudo', 'Cron', 'Kernel', 'Root'];
    const colors = ['#1d9e75', '#378add', '#ba7517', '#a855f7', '#e74c3c'];
    steps.forEach((s, i) => {
      const x = 170 + i * 120;
      const y = 320 - i * 55;
      addRect(g, x, y, 100, 40, '#161b22', colors[i], '');
      addText(g, x + 50, y + 25, s, colors[i], 11);
      if (i < steps.length - 1) {
        addLine(g, x + 100, y + 20, x + 120, y - 35, '#30363d');
      }
    });

    // Root at top
    addCircle(g, 700, 50, 25, '#e74c3c');
    addText(g, 700, 55, '#', '#e74c3c', 18);
    addText(g, 700, 85, 'Root', '#e74c3c', 10);

    setNarration('Privilege escalation chains multiple technique steps — each one lifts you higher toward root access.');
  }

  function buildReportAnimation(g) {
    // Report pages
    const sections = ['Cover Page', 'Exec Summary', 'Scope', 'Findings', 'Appendices'];
    const colors = ['#1d9e75', '#378add', '#ba7517', '#a855f7', '#00d4ff'];
    sections.forEach((s, i) => {
      const x = 80 + i * 140;
      addRect(g, x, 100, 110, 200, '#161b22', colors[i], '');
      addText(g, x + 55, 140, s, colors[i], 10);
      // Lines representing text
      for (let j = 0; j < 6; j++) {
        addLine(g, x + 15, 165 + j * 20, x + 95, 165 + j * 20, '#21262d');
      }
    });

    setNarration('A professional pentest report follows a clear structure: cover, executive summary, scope, findings, and appendices.');
  }

  // SVG helpers
  function addRect(g, x, y, w, h, fill, stroke, label) {
    const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    r.setAttribute('x', x); r.setAttribute('y', y);
    r.setAttribute('width', w); r.setAttribute('height', h);
    r.setAttribute('rx', '6'); r.setAttribute('fill', fill);
    r.setAttribute('stroke', stroke); r.setAttribute('stroke-width', '1.5');
    g.appendChild(r);
    if (label) {
      addText(g, x + w/2, y - 8, label, stroke, 10);
    }
    return r;
  }
  function addCircle(g, cx, cy, r, color) {
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', r);
    c.setAttribute('fill', color + '20'); c.setAttribute('stroke', color);
    c.setAttribute('stroke-width', '2');
    g.appendChild(c);
    return c;
  }
  function addLine(g, x1, y1, x2, y2, color) {
    const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l.setAttribute('x1', x1); l.setAttribute('y1', y1);
    l.setAttribute('x2', x2); l.setAttribute('y2', y2);
    l.setAttribute('stroke', color); l.setAttribute('stroke-width', '1.5');
    l.setAttribute('stroke-dasharray', '6 3');
    g.appendChild(l);
    return l;
  }
  function addText(g, x, y, text, fill, size) {
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', x); t.setAttribute('y', y);
    t.setAttribute('text-anchor', 'middle'); t.setAttribute('fill', fill);
    t.setAttribute('font-size', size); t.setAttribute('font-family', "'JetBrains Mono', monospace");
    t.textContent = text;
    g.appendChild(t);
    return t;
  }

  function setNarration(text) {
    const el = document.getElementById('narrationText');
    if (el) el.textContent = text;
  }

  function startAnimTimeline() {
    if (typeof gsap === 'undefined') return;
    if (animTimeline) animTimeline.kill();

    const elements = document.querySelectorAll('#animGroup > *');
    animTimeline = gsap.timeline({ repeat: -1, repeatDelay: 2 });

    elements.forEach((el, i) => {
      animTimeline.from(el, { opacity: 0, duration: 0.4, ease: 'power2.out' }, i * 0.15);
    });

    // Progress bar
    const progressBar = document.getElementById('animProgressBar');
    if (progressBar) {
      animTimeline.eventCallback('onUpdate', () => {
        const p = animTimeline.progress() * 100;
        progressBar.style.width = p + '%';
      });
    }

    // Play/pause button
    const btn = document.getElementById('animPlayPause');
    if (btn) {
      btn.onclick = () => {
        if (animPlaying) {
          animTimeline.pause();
          document.getElementById('animPlayIcon').textContent = '>';
        } else {
          animTimeline.play();
          document.getElementById('animPlayIcon').textContent = '||';
        }
        animPlaying = !animPlaying;
      };
    }
  }

  // ============================================
  // STEP 2: Interactive Cheatsheet
  // ============================================

  function initCheatsheet() {
    const raw = document.getElementById('cheatsheetRaw');
    const container = document.getElementById('interactiveCheatsheet');
    if (!raw || !container) return;

    const text = raw.textContent || '';
    // Parse code blocks and headings
    const blocks = [];
    let currentHeading = 'Commands';
    const lines = text.split('\n');
    let codeBuffer = [];
    let inCode = false;

    lines.forEach(line => {
      if (line.startsWith('###') || line.startsWith('## ')) {
        currentHeading = line.replace(/^#+\s*/, '').trim();
      } else if (line.trim().startsWith('```')) {
        if (inCode) {
          blocks.push({ heading: currentHeading, commands: codeBuffer.slice() });
          codeBuffer = [];
          inCode = false;
        } else {
          inCode = true;
        }
      } else if (inCode && line.trim()) {
        codeBuffer.push(line.trim());
      }
    });
    if (codeBuffer.length > 0) {
      blocks.push({ heading: currentHeading, commands: codeBuffer });
    }

    container.innerHTML = '';
    blocks.forEach((block, blockIdx) => {
      const el = document.createElement('div');
      el.className = 'cmd-block';
      el.innerHTML = `
        <div class="cmd-block-header">
          <span class="cmd-block-title">${escHtml(block.heading)}</span>
          <div class="cmd-block-actions">
            <button class="cmd-action-btn" onclick="copyBlock(this, ${blockIdx})" title="Copy all">Copy</button>
            <button class="cmd-action-btn" onclick="showContext(${blockIdx})" title="See in context">Try in Context</button>
          </div>
        </div>
        <div class="cmd-block-body">
          ${block.commands.map(cmd => `
            <div class="cmd-line">
              <span class="cmd-prompt">$</span>
              <span class="cmd-text">${highlightFlags(escHtml(cmd))}</span>
            </div>
          `).join('')}
        </div>
      `;
      container.appendChild(el);
    });

    window.__cheatBlocks = blocks;
  }

  window.copyBlock = function (btn, idx) {
    const blocks = window.__cheatBlocks;
    if (!blocks || !blocks[idx]) return;
    const text = blocks[idx].commands.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1500);
    });
  };

  window.showContext = function (idx) {
    const blocks = window.__cheatBlocks;
    if (!blocks || !blocks[idx]) return;
    const cmd = blocks[idx].commands[0] || '';

    // Generate realistic fake output based on command
    const output = generateFakeOutput(cmd);

    const overlay = document.createElement('div');
    overlay.className = 'context-modal-overlay';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = `
      <div class="context-modal">
        <div class="context-modal-header">
          <h4>Command in Context</h4>
          <button class="context-modal-close" onclick="this.closest('.context-modal-overlay').remove()">&times;</button>
        </div>
        <div class="context-modal-body">
          <div class="context-terminal"><span style="color:#1d9e75">$</span> ${escHtml(cmd)}\n\n${escHtml(output)}</div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  };

  function highlightFlags(cmdHtml) {
    // Wrap -flags and --flags in span
    return cmdHtml.replace(/(\s)(--?[\w-]+)/g, (m, space, flag) => {
      const desc = getFlagDesc(flag);
      return `${space}<span class="cmd-flag">${flag}<span class="cmd-flag-tooltip">${desc}</span></span>`;
    });
  }

  function getFlagDesc(flag) {
    const flags = {
      '-sS': 'SYN scan — stealthy, half-open connection',
      '-sV': 'Probe open ports for service/version info',
      '-sC': 'Run default NSE scripts',
      '-p': 'Specify port(s) to scan',
      '-p-': 'Scan all 65535 ports',
      '-oA': 'Output in all formats (nmap, greppable, XML)',
      '-oN': 'Output in normal format',
      '-T4': 'Aggressive timing template (faster)',
      '-A': 'Enable OS detection, version, scripts, traceroute',
      '-Pn': 'Skip host discovery (treat as online)',
      '--script': 'Specify NSE script(s) to run',
      '-w': 'Wordlist file path',
      '-u': 'Target URL',
      '-H': 'HTTP header (e.g. Host: FUZZ)',
      '-mc': 'Match HTTP status codes',
      '-fc': 'Filter HTTP status codes',
      '-x': 'Proxy to use',
      '-e': 'Payload/extension',
      '-r': 'Recursive mode',
      '-t': 'Number of threads',
      '-o': 'Output file',
      '-i': 'Input file',
      '-v': 'Verbose output',
      '-vv': 'Very verbose',
      '-l': 'Login/username',
      '-P': 'Password',
      '-L': 'Username list',
      '--passwords': 'Password wordlist',
    };
    return flags[flag] || `Flag: ${flag}`;
  }

  function generateFakeOutput(cmd) {
    if (cmd.includes('nmap')) {
      return `Starting Nmap 7.94 ( https://nmap.org )
Nmap scan report for 10.129.14.128
Host is up (0.032s latency).

PORT     STATE  SERVICE      VERSION
22/tcp   open   ssh          OpenSSH 8.2p1 Ubuntu
80/tcp   open   http         Apache httpd 2.4.41
443/tcp  open   ssl/http     Apache httpd 2.4.41
445/tcp  open   microsoft-ds Windows Server 2019
3389/tcp closed ms-wbt-server

Service detection performed. 5 services scanned.
Nmap done: 1 IP address (1 host up) scanned in 12.34 seconds`;
    }
    if (cmd.includes('ffuf') || cmd.includes('gobuster')) {
      return `        /'___\\  /'___\\           /'___\\
       /\\ \\__/ /\\ \\__/  __  __  /\\ \\__/
       \\ \\ ,__\\\\ \\ ,__\\/\\ \\/\\ \\ \\ \\ ,__\\
        \\ \\ \\_/ \\ \\ \\_/\\ \\ \\_\\ \\ \\ \\ \\_/
         \\ \\_\\   \\ \\_\\  \\ \\____/  \\ \\_\\
          \\/_/    \\/_/   \\/___/    \\/_/

[Status: 200, Size: 1523, Words: 234, Lines: 42] /admin
[Status: 301, Size: 312, Words: 20, Lines: 10] /uploads
[Status: 200, Size: 854, Words: 103, Lines: 28] /login.php
[Status: 403, Size: 277, Words: 20, Lines: 10] /config
:: Progress: [4614/4614] :: Job [1/1] :: 214 req/sec`;
    }
    if (cmd.includes('sqlmap')) {
      return `[*] starting @ 14:32:17
[14:32:17] [INFO] testing connection to the target URL
[14:32:18] [INFO] checking if the target is protected by WAF/IPS
[14:32:18] [INFO] testing if the parameter 'id' is dynamic
[14:32:19] [INFO] parameter 'id' appears to be dynamic
[14:32:20] [INFO] parameter 'id' is vulnerable
  Type: boolean-based blind
  Title: AND boolean-based blind
  Payload: id=1 AND 5234=5234

[14:32:22] [INFO] the back-end DBMS is MySQL
Database: webapp
[3 tables]
+----------+
| users    |
| products |
| orders   |
+----------+`;
    }
    return `[*] Executing command...
[*] Target: 10.129.14.128
[+] Connection established
[+] Command completed successfully
[*] Results saved to output.txt`;
  }

  function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // ============================================
  // STEP 3: Terminal Emulator Exercises
  // ============================================

  function initExerciseStep() {
    exerciseIndex = 0;
    exerciseWrongAttempts = 0;
    exerciseHintIndex = 0;
    loadExercise();
    setupTerminal();
  }

  function loadExercise() {
    const ex = data.exercises[exerciseIndex];
    if (!ex) return;

    document.getElementById('scenarioText').innerHTML = ex.prompt;
    document.getElementById('exerciseStepCurrent').textContent = exerciseIndex + 1;
    document.getElementById('exerciseStepTotal').textContent = data.exercises.length;
    document.getElementById('exerciseBarFill').style.width = ((exerciseIndex / data.exercises.length) * 100) + '%';

    // Reset terminal
    const output = document.getElementById('terminalOutput');
    output.innerHTML = '<div class="term-line"><span class="term-prompt">$</span> <span class="term-comment"># ' + escHtml(ex.prompt.substring(0, 80)) + '</span></div>';

    // Reset hints
    exerciseWrongAttempts = 0;
    exerciseHintIndex = 0;
    const hintBtn = document.getElementById('hintBtn');
    if (hintBtn) hintBtn.textContent = `Show Hint (0/${ex.hints.length})`;
    const hintText = document.getElementById('hintText');
    if (hintText) hintText.style.display = 'none';
    document.getElementById('solutionArea').style.display = 'none';
    const solContent = document.getElementById('solutionContent');
    if (solContent) solContent.style.display = 'none';
  }

  function setupTerminal() {
    const input = document.getElementById('terminalInput');
    if (!input) return;

    // Remove previous listeners by replacing element
    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);

    newInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const cmd = newInput.value.trim();
        if (!cmd) return;
        processCommand(cmd);
        newInput.value = '';
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        // Recall last command
        const lastCmd = document.querySelector('.term-user-cmd:last-child');
        if (lastCmd) newInput.value = lastCmd.textContent;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        // Basic tab completion
        const partial = newInput.value.trim();
        const tools = ['nmap','ffuf','gobuster','sqlmap','hydra','hashcat','john','chisel','ligolo','msfconsole','python3','curl','wget','nc','netcat','socat','ssh','scp','crackmapexec','evil-winrm','impacket','certipy','bloodhound','powerview','mimikatz','rubeus'];
        const match = tools.find(t => t.startsWith(partial));
        if (match) newInput.value = match + ' ';
      }
    });

    newInput.focus();
  }

  function processCommand(cmd) {
    const output = document.getElementById('terminalOutput');
    const ex = data.exercises[exerciseIndex];
    if (!ex) return;

    // Show command in terminal
    const cmdLine = document.createElement('div');
    cmdLine.className = 'term-line';
    cmdLine.innerHTML = `<span class="term-prompt">$</span> <span class="term-user-cmd">${escHtml(cmd)}</span>`;
    output.appendChild(cmdLine);

    // Check answer
    const correct = checkAnswer(cmd, ex.answer, ex.type);

    if (correct) {
      addTermLine(output, `<span class="term-success">[+] Correct! Well done.</span>`);
      if (ex.explanation) {
        addTermLine(output, `<span class="term-output">${escHtml(ex.explanation)}</span>`);
      }
      exerciseStats.done++;
      exerciseStats.correct++;

      // Move to next after delay
      setTimeout(() => {
        exerciseIndex++;
        if (exerciseIndex < data.exercises.length) {
          loadExercise();
        } else {
          // All exercises done
          addTermLine(output, '');
          addTermLine(output, `<span class="term-success">=== All exercises completed! ===</span>`);
          addTermLine(output, `<span class="term-success">Accuracy: ${Math.round((exerciseStats.correct / exerciseStats.done) * 100)}%</span>`);
          document.getElementById('exerciseBarFill').style.width = '100%';
        }
      }, 1500);

    } else {
      exerciseWrongAttempts++;

      // Specific hint based on what they typed
      const hint = getSpecificHint(cmd, ex);
      addTermLine(output, `<span class="term-error">[!] ${hint}</span>`);

      if (exerciseWrongAttempts >= 3) {
        document.getElementById('solutionArea').style.display = 'block';
      }
    }

    // Scroll to bottom
    output.scrollTop = output.scrollHeight;
  }

  function checkAnswer(input, answer, type) {
    const normalize = s => s.toLowerCase().replace(/\s+/g, ' ').trim();
    const ni = normalize(input);
    const na = normalize(answer);

    // Exact match
    if (ni === na) return true;

    // Fuzzy: same tool + same flags in any order
    const iParts = ni.split(/\s+/);
    const aParts = na.split(/\s+/);
    if (iParts[0] === aParts[0]) {
      const iFlags = iParts.slice(1).sort().join(' ');
      const aFlags = aParts.slice(1).sort().join(' ');
      if (iFlags === aFlags) return true;
    }

    // Regex from validation_regex if present
    // For multiple choice, direct compare
    if (type === 'multiple_choice' || type === 'decision_tree') {
      return ni === na || input === answer;
    }

    return false;
  }

  function getSpecificHint(cmd, ex) {
    if (!cmd.trim()) return 'Empty command. Try typing the tool name first.';
    const tool = cmd.split(/\s+/)[0].toLowerCase();
    const expectedTool = (ex.answer || '').split(/\s+/)[0].toLowerCase();

    if (tool !== expectedTool && expectedTool) {
      return `Wrong tool. Consider using: ${expectedTool}`;
    }
    if (!cmd.includes('-') && ex.answer.includes('-')) {
      return 'Missing flags. Check which options the tool needs.';
    }
    return 'Not quite right. Check the syntax and flags carefully.';
  }

  function addTermLine(output, html) {
    const line = document.createElement('div');
    line.className = 'term-line';
    line.innerHTML = html;
    output.appendChild(line);
  }

  window.showExerciseHint = function () {
    const ex = data.exercises[exerciseIndex];
    if (!ex || !ex.hints || exerciseHintIndex >= ex.hints.length) return;

    const hintText = document.getElementById('hintText');
    hintText.textContent = ex.hints[exerciseHintIndex];
    hintText.style.display = 'block';
    exerciseHintIndex++;
    document.getElementById('hintBtn').textContent = `Show Hint (${exerciseHintIndex}/${ex.hints.length})`;
  };

  window.showSolution = function () {
    const ex = data.exercises[exerciseIndex];
    if (!ex) return;
    const content = document.getElementById('solutionContent');
    content.innerHTML = `<strong>Answer:</strong> ${escHtml(ex.answer)}\n\n${ex.explanation ? escHtml(ex.explanation) : ''}`;
    content.style.display = 'block';
    exerciseStats.done++;
  };

  // ============================================
  // STEP 4: Flashcard Review
  // ============================================

  function initFlashcardStep() {
    flashIndex = 0;
    flashFlipped = false;
    flashStats.reviewed = 0;
    showLearnFlashcard();
  }

  function showLearnFlashcard() {
    const cards = data.flashcards;
    if (!cards || flashIndex >= cards.length) {
      document.getElementById('flashcardArena').style.display = 'none';
      document.getElementById('flashDone').style.display = 'block';
      return;
    }

    const card = cards[flashIndex];
    document.getElementById('flashQuestion').textContent = card.question;
    document.getElementById('flashAnswer').textContent = card.answer;
    document.getElementById('flashCurrentIdx').textContent = flashIndex + 1;

    const flashcard = document.getElementById('learnFlashcard');
    flashcard.classList.remove('flipped');
    document.getElementById('flashRatings').style.display = 'none';
    document.getElementById('flashInstruction').textContent = 'Click card or press Space to flip';
    flashFlipped = false;
  }

  window.flipLearnCard = function () {
    const flashcard = document.getElementById('learnFlashcard');
    flashcard.classList.toggle('flipped');
    flashFlipped = !flashFlipped;

    if (flashFlipped) {
      document.getElementById('flashRatings').style.display = 'flex';
      document.getElementById('flashInstruction').textContent = 'Rate how well you knew this';
    } else {
      document.getElementById('flashRatings').style.display = 'none';
      document.getElementById('flashInstruction').textContent = 'Click card or press Space to flip';
    }
  };

  window.rateLearnCard = function (quality) {
    const card = data.flashcards[flashIndex];
    if (!card) return;

    // Submit review to API
    if (data.userId) {
      fetch(`/api/flashcards/${card.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quality })
      }).catch(err => console.warn('Flashcard review failed:', err));
    }

    flashStats.reviewed++;
    flashIndex++;
    showLearnFlashcard();
  };

  // Keyboard shortcuts for flashcards
  document.addEventListener('keydown', (e) => {
    if (currentStep !== 4) return;
    if (e.code === 'Space') {
      e.preventDefault();
      flipLearnCard();
    } else if (flashFlipped) {
      if (e.key === '1') rateLearnCard(1);
      else if (e.key === '2') rateLearnCard(2);
      else if (e.key === '3') rateLearnCard(3);
      else if (e.key === '4') rateLearnCard(4);
    }
  });

  // ============================================
  // STEP 5: Completion + Confetti
  // ============================================

  function initCompletionStep() {
    // Update stats
    document.getElementById('compExCount').textContent = exerciseStats.done;
    document.getElementById('compFlashCount').textContent = flashStats.reviewed;
    const accuracy = exerciseStats.done > 0
      ? Math.round((exerciseStats.correct / exerciseStats.done) * 100)
      : 100;
    document.getElementById('compAccuracy').textContent = accuracy + '%';

    // Animate elements
    if (typeof gsap !== 'undefined') {
      const tl = gsap.timeline();
      tl.to('.completion-badge', { opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(2)' });
      tl.to('.completion-terminal', { opacity: 1, duration: 0.4 }, '-=0.2');
      tl.to('.completion-title', { opacity: 1, duration: 0.4 }, '-=0.1');
      tl.to('.completion-subtitle', { opacity: 1, duration: 0.4 }, '-=0.1');
      tl.to('.completion-stats', { opacity: 1, duration: 0.4 }, '-=0.1');
      tl.to('.completion-actions', { opacity: 1, duration: 0.4 }, '-=0.1');
    } else {
      // No GSAP fallback
      document.querySelectorAll('.completion-badge, .completion-terminal, .completion-title, .completion-subtitle, .completion-stats, .completion-actions').forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
    }

    // Terminal typing
    typeCompletionText();

    // Confetti
    launchConfetti();

    // Mark module progress
    if (data.userId && data.moduleId) {
      fetch(`/api/exercises/${data.moduleId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: 'module_complete' })
      }).catch(() => {});
    }
  }

  function typeCompletionText() {
    const body = document.getElementById('completionTermBody');
    if (!body) return;

    const lines = [
      { delay: 500, text: '[*] Exercises completed: ' + exerciseStats.done, cls: 'term-output' },
      { delay: 300, text: '[*] Flashcards reviewed: ' + flashStats.reviewed, cls: 'term-output' },
      { delay: 300, text: '[+] Access granted — module cleared', cls: 'term-success' },
    ];

    let totalDelay = 800;
    lines.forEach(line => {
      setTimeout(() => {
        const div = document.createElement('div');
        div.className = 'term-line';
        div.innerHTML = `<span class="${line.cls}">${line.text}</span>`;
        body.appendChild(div);
      }, totalDelay);
      totalDelay += line.delay;
    });
  }

  function launchConfetti() {
    const canvas = document.getElementById('confettiCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const particles = [];
    const colors = ['#9fef00', '#1d9e75', '#378add', '#00d4ff', '#ba7517', '#a855f7'];

    for (let i = 0; i < 100; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * 200,
        w: 4 + Math.random() * 6,
        h: 4 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        vx: (Math.random() - 0.5) * 3,
        vy: 1.5 + Math.random() * 3,
        rot: Math.random() * 360,
        rotV: (Math.random() - 0.5) * 10,
        opacity: 1,
      });
    }

    let frame = 0;
    function animate() {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.03;
        p.rot += p.rotV;
        if (frame > 60) p.opacity -= 0.005;

        if (p.opacity <= 0 || p.y > canvas.height + 20) return;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot * Math.PI / 180);
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });

      if (frame < 300 && particles.some(p => p.opacity > 0)) {
        requestAnimationFrame(animate);
      }
    }
    animate();
  }

  // ============================================
  // Init
  // ============================================

  function init() {
    initConceptAnimation();
    initCheatsheet();

    // Step button clicks
    for (let i = 1; i <= 5; i++) {
      const btn = document.getElementById(`stepBtn${i}`);
      if (btn) {
        btn.addEventListener('click', () => goToStep(i));
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
