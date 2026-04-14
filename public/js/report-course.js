/* ============================================
   CPTS Companion - Report Writing Course Engine
   6-stage interactive report writing tutorial
   ============================================ */

(function () {
  'use strict';

  let currentStage = 1;
  let findingScore = 0;
  let findingFieldsCompleted = 0;
  const TOTAL_FINDING_FIELDS = 6;

  // ============================================
  // Stage Navigation
  // ============================================

  window.goToRcStage = function (stage) {
    if (stage < 1 || stage > 6) return;

    document.querySelectorAll('.rc-panel').forEach(p => p.classList.remove('active'));
    for (let i = 1; i <= 6; i++) {
      const btn = document.getElementById(`rcStage${i}`);
      if (!btn) continue;
      btn.classList.remove('active');
      if (i < stage) btn.classList.add('completed');
      else btn.classList.remove('completed');
    }

    const target = document.getElementById(`rcPanel${stage}`);
    if (target) target.classList.add('active');
    const btn = document.getElementById(`rcStage${stage}`);
    if (btn) btn.classList.add('active');

    // Progress bar
    const fill = document.getElementById('rcProgressFill');
    if (fill) fill.style.width = ((stage - 1) / 5 * 100) + '%';

    currentStage = stage;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Init stage-specific features
    if (stage === 3) initDragDrop('pocEvidence');
    if (stage === 4) initExecEditor();
    if (stage === 5) initDragDrop('assemblyZone');
  };

  // ============================================
  // Stage 2: Report Sections
  // ============================================

  window.selectSection = function (el) {
    document.querySelectorAll('.report-section').forEach(s => s.classList.remove('active'));
    el.classList.add('active');
  };

  const SECTION_EXAMPLES = {
    cover: `<strong>Penetration Test Report</strong>
Client: Acme Corporation
Assessment Type: External Network Penetration Test
Date: March 15-22, 2026
Classification: CONFIDENTIAL
Version: 1.0
Prepared by: Security Consultant, CyberSec Inc.
Contact: consultant@cybersec.com`,

    executive: `Acme Corporation engaged CyberSec Inc. to perform an external penetration test of their internet-facing infrastructure. During the assessment, <strong>1 Critical, 2 High, 1 Medium, and 1 Low severity</strong> vulnerabilities were identified.

The most significant finding was an anonymous FTP service exposing database credentials, which allowed full compromise of an internal database server. This vulnerability poses an immediate risk to customer data confidentiality.

<strong>Top Business Risks:</strong>
1. Customer data exposure through database compromise
2. Potential regulatory fines (GDPR/PCI-DSS non-compliance)
3. Reputational damage from a data breach

<strong>Recommendation:</strong> Address Critical and High findings within 7 days. Medium findings within 30 days.`,

    scope: `<strong>In Scope:</strong>
- External IP range: 203.0.113.0/24
- Web application: app.acme.com
- VPN endpoint: vpn.acme.com

<strong>Out of Scope:</strong>
- Internal network (unless pivoted from external)
- Denial of Service testing
- Social engineering

<strong>Methodology:</strong> PTES (Penetration Testing Execution Standard)
<strong>Tools:</strong> Nmap, Burp Suite, BloodHound, CrackMapExec, Metasploit
<strong>Limitations:</strong> WAF blocked some automated scanning; manual testing was prioritized.`,

    findings: `<strong>Finding: Anonymous FTP Access Leading to Full System Compromise</strong>
<strong>Severity:</strong> Critical (CVSS 9.8)
<strong>Affected Host:</strong> 203.0.113.42

<strong>Description:</strong> An anonymous FTP vulnerability was identified on the target which allows an unauthenticated attacker to retrieve database backup credentials, resulting in full SYSTEM-level access to the MSSQL server.

<strong>Proof of Concept:</strong>
1. Connected to FTP anonymously (screenshot: anonymous_ftp.png)
2. Retrieved backup.sql containing MSSQL credentials
3. Authenticated to MSSQL and enabled xp_cmdshell
4. Executed whoami — returned NT AUTHORITY\\SYSTEM

<strong>Business Impact:</strong> Full compromise of database server with access to all customer records.

<strong>Remediation:</strong>
1. Disable anonymous FTP access immediately
2. Rotate all database credentials
3. Disable xp_cmdshell on MSSQL
4. Implement network segmentation for database servers`,

    appendices: `<strong>Appendix A: Full Nmap Scan Results</strong>
[Attached: nmap_full_scan.txt]

<strong>Appendix B: Credentials Discovered</strong>
| Service | Username | Hash/Password | Source |
|---------|----------|---------------|--------|
| MSSQL   | sa       | [REDACTED]    | FTP backup |
| SSH     | admin    | [REDACTED]    | Config file |

<strong>Appendix C: Additional Screenshots</strong>
[Attached: 15 screenshots documenting full attack chain]`
  };

  window.showSectionExample = function (section) {
    const content = SECTION_EXAMPLES[section];
    if (!content) return;

    const overlay = document.createElement('div');
    overlay.className = 'context-modal-overlay';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    overlay.innerHTML = `
      <div class="context-modal">
        <div class="context-modal-header">
          <h4>Example: ${section.charAt(0).toUpperCase() + section.slice(1)}</h4>
          <button class="context-modal-close" onclick="this.closest('.context-modal-overlay').remove()">&times;</button>
        </div>
        <div class="context-modal-body">
          <div style="font-size:0.85rem;line-height:1.7;color:var(--text-secondary);">${content}</div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  };

  // ============================================
  // Stage 3: Finding Builder
  // ============================================

  function unlockField(fieldId) {
    const el = document.getElementById(`field-${fieldId}`);
    if (el) {
      el.classList.remove('locked');
      el.classList.add('unlocked');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  function showFeedback(id, msg, success) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = msg;
    el.className = `field-feedback ${success ? 'success' : 'error'}`;
  }

  // Field 1: Title
  window.selectTitle = function (btn) {
    document.querySelectorAll('.title-option').forEach(b => b.classList.remove('correct', 'incorrect'));
    const correct = btn.dataset.correct === 'true';
    btn.classList.add(correct ? 'correct' : 'incorrect');

    if (correct) {
      showFeedback('titleFeedback', 'Correct! A good finding title is specific and describes the full attack chain — not too vague, not too casual.', true);
      findingScore += 15;
      findingFieldsCompleted++;
      setTimeout(() => unlockField('cvss'), 600);
    } else {
      showFeedback('titleFeedback', 'Not quite. "FTP misconfiguration" is too vague — it doesn\'t describe the impact. "Server was hacked" is too casual. A professional title describes the vulnerability AND its consequence.', false);
    }
  };

  // Field 2: CVSS
  window.updateCvss = function () {
    const score = calculateCvss();
    document.getElementById('cvssScore').textContent = score.toFixed(1);

    const severityEl = document.getElementById('cvssSeverity');
    let severity, color;
    if (score >= 9.0) { severity = 'Critical'; color = '#e74c3c'; }
    else if (score >= 7.0) { severity = 'High'; color = '#ff8c00'; }
    else if (score >= 4.0) { severity = 'Medium'; color = '#ffb800'; }
    else if (score > 0) { severity = 'Low'; color = '#00d4ff'; }
    else { severity = 'None'; color = '#6b7280'; }

    severityEl.textContent = severity;
    severityEl.style.color = color;
    severityEl.style.background = color + '20';

    // Update vector string
    const av = document.getElementById('cvss-av').value;
    const ac = document.getElementById('cvss-ac').value;
    const pr = document.getElementById('cvss-pr').value;
    const ui = document.getElementById('cvss-ui').value;
    const s = document.getElementById('cvss-s').value;
    const c = document.getElementById('cvss-c').value;
    const i = document.getElementById('cvss-i').value;
    const a = document.getElementById('cvss-a').value;
    document.getElementById('cvssVector').textContent = `CVSS:3.1/AV:${av}/AC:${ac}/PR:${pr}/UI:${ui}/S:${s}/C:${c}/I:${i}/A:${a}`;
  };

  function calculateCvss() {
    // Simplified CVSS 3.1 base score calculation
    const avMap = { N: 0.85, A: 0.62, L: 0.55, P: 0.20 };
    const acMap = { L: 0.77, H: 0.44 };
    const sVal = document.getElementById('cvss-s').value;
    const prMapU = { N: 0.85, L: 0.62, H: 0.27 };
    const prMapC = { N: 0.85, L: 0.68, H: 0.50 };
    const prMap = sVal === 'C' ? prMapC : prMapU;
    const uiMap = { N: 0.85, R: 0.62 };
    const ciaMap = { H: 0.56, L: 0.22, N: 0 };

    const av = avMap[document.getElementById('cvss-av').value] || 0;
    const ac = acMap[document.getElementById('cvss-ac').value] || 0;
    const pr = prMap[document.getElementById('cvss-pr').value] || 0;
    const ui = uiMap[document.getElementById('cvss-ui').value] || 0;
    const c = ciaMap[document.getElementById('cvss-c').value] || 0;
    const i = ciaMap[document.getElementById('cvss-i').value] || 0;
    const a = ciaMap[document.getElementById('cvss-a').value] || 0;

    const iss = 1 - ((1 - c) * (1 - i) * (1 - a));
    let impact;
    if (sVal === 'U') {
      impact = 6.42 * iss;
    } else {
      impact = 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15);
    }

    if (impact <= 0) return 0;

    const exploitability = 8.22 * av * ac * pr * ui;
    let score;
    if (sVal === 'U') {
      score = Math.min(impact + exploitability, 10);
    } else {
      score = Math.min(1.08 * (impact + exploitability), 10);
    }

    return Math.ceil(score * 10) / 10;
  }

  window.submitCvss = function () {
    const score = calculateCvss();
    if (score >= 9.0) {
      showFeedback('cvssFeedback', `Score: ${score.toFixed(1)} — Critical. Correct! Anonymous network access + no authentication + full system compromise = Critical severity.`, true);
      findingScore += 15;
      findingFieldsCompleted++;
      setTimeout(() => unlockField('desc'), 600);
    } else {
      showFeedback('cvssFeedback', `Score: ${score.toFixed(1)} — This scenario should be Critical (9.0+). Think about it: the attacker needs no authentication (PR:None), the attack is over the network (AV:Network), and the impact is full system compromise (C:H, I:H, A:H).`, false);
    }
  };

  // Field 3: Description blanks
  window.submitDesc = function () {
    const blanks = {
      blank1: ['anonymous ftp', 'ftp', 'anonymous access', 'misconfiguration'],
      blank2: ['ftp server', 'mssql server', 'ftp service', 'target server', 'the ftp server'],
      blank3: ['retrieve credentials', 'access backup credentials', 'obtain database credentials', 'retrieve backup files', 'gain access'],
      blank4: ['full system compromise', 'system-level access', 'remote code execution', 'complete system compromise', 'nt authority\\system access']
    };

    let allCorrect = true;
    for (const [id, acceptable] of Object.entries(blanks)) {
      const input = document.getElementById(id);
      const val = (input.value || '').toLowerCase().trim();
      const match = acceptable.some(a => val.includes(a));
      input.classList.remove('correct', 'incorrect');
      input.classList.add(match ? 'correct' : 'incorrect');
      if (!match) allCorrect = false;
    }

    if (allCorrect) {
      showFeedback('descFeedback', 'All blanks correct! Your description clearly states the vulnerability type, affected target, attacker action, and impact.', true);
      findingScore += 15;
      findingFieldsCompleted++;
      setTimeout(() => unlockField('poc'), 600);
    } else {
      showFeedback('descFeedback', 'Some blanks need adjustment. The description should identify: the vulnerability type (anonymous FTP), the target, what an attacker can do, and the final outcome (system compromise).', false);
    }
  };

  // Field 4: PoC drag & drop
  window.submitPoc = function () {
    const items = document.querySelectorAll('#pocEvidence .poc-item');
    let correct = true;
    items.forEach((item, idx) => {
      const order = parseInt(item.dataset.order);
      item.classList.remove('correct-order', 'wrong-order');
      if (order === idx + 1) {
        item.classList.add('correct-order');
      } else {
        item.classList.add('wrong-order');
        correct = false;
      }
    });

    if (correct) {
      showFeedback('pocFeedback', 'Correct order! PoC evidence should follow the attack chain chronologically: 1) Initial access (FTP), 2) Exploitation (xp_cmdshell), 3) Impact (SYSTEM shell).', true);
      findingScore += 15;
      findingFieldsCompleted++;
      setTimeout(() => unlockField('impact'), 600);
    } else {
      showFeedback('pocFeedback', 'Wrong order. Evidence should be chronological — show the attack chain in the order it happened: initial access first, then exploitation, then final proof of impact.', false);
    }
  };

  // Field 5: Business Impact
  window.selectImpact = function (btn) {
    document.querySelectorAll('.impact-option').forEach(b => b.classList.remove('correct', 'incorrect'));
    const type = btn.dataset.type;

    if (type === 'business') {
      btn.classList.add('correct');
      showFeedback('impactFeedback', 'Correct! A business impact statement avoids technical jargon and focuses on what matters to the business: data exposure, regulatory risk, and operational disruption.', true);
      findingScore += 15;
      findingFieldsCompleted++;
      setTimeout(() => unlockField('remediation'), 600);
    } else if (type === 'technical') {
      btn.classList.add('incorrect');
      showFeedback('impactFeedback', 'This is a technical description, not a business impact. The CEO doesn\'t know what "xp_cmdshell" or "NT AUTHORITY\\SYSTEM" means. Rewrite in business terms.', false);
    } else {
      btn.classList.add('incorrect');
      showFeedback('impactFeedback', 'Too vague. "Bad vulnerability" tells the client nothing. They need to understand specifically what business risk this creates.', false);
    }
  };

  // Field 6: Remediation
  window.submitRemediation = function () {
    const selects = ['rem1', 'rem2', 'rem3', 'rem4'];
    let allCorrect = true;

    selects.forEach(id => {
      const el = document.getElementById(id);
      if (el.value !== 'correct') allCorrect = false;
    });

    if (allCorrect) {
      showFeedback('remediationFeedback', 'Excellent! Your remediation is specific, actionable, and covers all aspects: disable anonymous access, enforce authentication, disable dangerous procedures, and rotate credentials.', true);
      findingScore += 25;
      findingFieldsCompleted++;
      showAssembledFinding();
    } else {
      showFeedback('remediationFeedback', 'Some answers are incorrect. Good remediation must be specific and actionable — not vague ("fix the server") or overkill ("disable all services").', false);
    }
  };

  function showAssembledFinding() {
    const assembled = document.getElementById('assembledFinding');
    const preview = document.getElementById('findingPreview');
    const scoreEl = document.getElementById('findingScore');

    preview.innerHTML = `
      <h4 style="color:var(--htb-green);margin-bottom:0.5rem;">Anonymous FTP Access Leading to Full System Compromise via MSSQL Code Execution</h4>
      <p><strong>Severity:</strong> <span style="color:#e74c3c;font-weight:700;">Critical (CVSS 9.8)</span></p>
      <p><strong>Description:</strong> An anonymous FTP vulnerability was identified on the FTP server which allows an unauthenticated attacker to retrieve backup credentials, resulting in full system compromise via MSSQL xp_cmdshell.</p>
      <p><strong>Proof of Concept:</strong></p>
      <ol style="margin-left:1.5rem;margin-bottom:0.75rem;">
        <li>Anonymous FTP login with backup credentials</li>
        <li>xp_cmdshell execution returning SYSTEM</li>
        <li>SYSTEM shell with whoami output</li>
      </ol>
      <p><strong>Business Impact:</strong> An external attacker with no credentials could gain full administrative control of the database server, exposing all customer records and potentially disrupting business operations.</p>
      <p><strong>Remediation:</strong></p>
      <ol style="margin-left:1.5rem;">
        <li>Disable anonymous FTP access</li>
        <li>Require authenticated access with strong credentials</li>
        <li>Disable xp_cmdshell and other dangerous stored procedures</li>
        <li>Verify backup credentials are rotated and stored securely</li>
      </ol>
    `;

    scoreEl.textContent = findingScore;
    assembled.style.display = 'block';
    document.getElementById('toStage4Btn').style.display = 'inline-flex';
    assembled.scrollIntoView({ behavior: 'smooth' });
  }

  // ============================================
  // Stage 4: Executive Summary Editor
  // ============================================

  const JARGON_WORDS = [
    'xp_cmdshell', 'mssql', 'sql injection', 'rce', 'reverse shell',
    'meterpreter', 'metasploit', 'nmap', 'cve-', 'nt authority',
    'kerberoasting', 'dcsync', 'mimikatz', 'bloodhound', 'hashcat',
    'smb relay', 'ntlm', 'ldap', 'tcp', 'udp', 'ssh', 'ftp anonymous',
    'buffer overflow', 'privilege escalation', 'payload', 'exploit',
    'shellcode', 'lateral movement', 'pass-the-hash', 'golden ticket',
    'dll hijacking', 'suid', 'cron job', 'kernel exploit'
  ];

  function initExecEditor() {
    const textarea = document.getElementById('execTextarea');
    if (!textarea) return;

    textarea.addEventListener('input', () => {
      const text = textarea.value;
      updateWordCount(text);
      checkJargon(text);
      updateChecklist(text);
    });
  }

  function updateWordCount(text) {
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
    document.getElementById('execWordCount').textContent = words;
    const el = document.getElementById('execWordCount');
    if (words >= 150 && words <= 300) {
      el.style.color = 'var(--htb-green)';
    } else if (words > 300) {
      el.style.color = 'var(--htb-red)';
    } else {
      el.style.color = 'var(--text-muted)';
    }
  }

  function checkJargon(text) {
    const lower = text.toLowerCase();
    const found = JARGON_WORDS.filter(j => lower.includes(j));
    const warning = document.getElementById('jargonWarning');

    if (found.length > 0) {
      warning.style.display = 'inline';
      warning.textContent = `Jargon detected: ${found.join(', ')}`;
    } else {
      warning.style.display = 'none';
    }
    return found;
  }

  function updateChecklist(text) {
    const lower = text.toLowerCase();
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;

    const riskTerms = ['critical', 'high risk', 'overall risk', 'risk rating', 'significant risk', 'elevated risk'];
    document.getElementById('checkRisk').checked = riskTerms.some(t => lower.includes(t));

    const bizTerms = ['customer', 'data', 'business', 'financial', 'regulatory', 'reputation', 'compliance', 'operations'];
    const bizCount = bizTerms.filter(t => lower.includes(t)).length;
    document.getElementById('checkBiz').checked = bizCount >= 2;

    const prioTerms = ['priorit', 'recommend', 'immediate', 'within', 'address', 'remediat'];
    document.getElementById('checkPriority').checked = prioTerms.some(t => lower.includes(t));

    document.getElementById('checkLength').checked = words >= 150 && words <= 300;

    const jargon = checkJargon(text);
    document.getElementById('checkNoJargon').checked = jargon.length === 0;
  }

  window.submitExecSummary = function () {
    const text = document.getElementById('execTextarea').value;
    const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;

    const checks = ['checkRisk', 'checkBiz', 'checkPriority', 'checkLength', 'checkNoJargon'];
    const passed = checks.filter(id => document.getElementById(id).checked).length;

    if (passed === checks.length) {
      showFeedback('execFeedback', `Excellent executive summary! All requirements met. ${words} words, clear business language, risk rating included. This is what a CEO needs to see.`, true);
      document.getElementById('toStage5Btn').style.display = 'inline-flex';
    } else if (passed >= 3) {
      showFeedback('execFeedback', `Good effort — ${passed}/5 requirements met. Check the unchecked items in the checklist and revise.`, false);
    } else {
      showFeedback('execFeedback', `Only ${passed}/5 requirements met. Remember: no jargon, 150-300 words, include overall risk rating, business impacts, and remediation priority.`, false);
    }
  };

  // ============================================
  // Stage 5: Report Assembly
  // ============================================

  window.compileReport = function () {
    const items = document.querySelectorAll('#assemblyZone .assembly-item');
    let correct = true;

    items.forEach((item, idx) => {
      const order = parseInt(item.dataset.order);
      item.classList.remove('correct-pos', 'wrong-pos');
      if (order === idx + 1) {
        item.classList.add('correct-pos');
      } else {
        item.classList.add('wrong-pos');
        correct = false;
      }
    });

    if (!correct) {
      showFeedback('assemblyFeedback', 'Incorrect order. The standard report structure is: Cover Page, Executive Summary, Scope & Methodology, Technical Findings, Appendices.', false);
      return;
    }

    showFeedback('assemblyFeedback', 'Correct order! Compiling your report...', true);

    // Compile animation
    const progress = document.getElementById('compileProgress');
    progress.style.display = 'block';
    const fill = document.getElementById('compileBarFill');
    const text = document.getElementById('compileText');

    const steps = [
      { pct: 20, msg: 'Formatting cover page...' },
      { pct: 40, msg: 'Rendering executive summary...' },
      { pct: 60, msg: 'Compiling findings with screenshots...' },
      { pct: 80, msg: 'Building table of contents...' },
      { pct: 100, msg: 'Report compiled successfully!' },
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i >= steps.length) {
        clearInterval(interval);
        document.getElementById('reportPreviewArea').style.display = 'block';
        document.getElementById('toStage6Btn').style.display = 'inline-flex';
        document.getElementById('reportPreviewArea').scrollIntoView({ behavior: 'smooth' });
        return;
      }
      fill.style.width = steps[i].pct + '%';
      text.textContent = steps[i].msg;
      i++;
    }, 600);
  };

  // ============================================
  // Stage 6: Tool Tabs
  // ============================================

  window.showToolTab = function (tool, btn) {
    document.querySelectorAll('.tool-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.tool-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(`tool-${tool}`).style.display = 'block';
    btn.classList.add('active');
  };

  // ============================================
  // Generic Drag & Drop
  // ============================================

  function initDragDrop(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let draggedEl = null;

    container.querySelectorAll('[draggable="true"]').forEach(item => {
      item.addEventListener('dragstart', (e) => {
        draggedEl = item;
        item.style.opacity = '0.5';
        e.dataTransfer.effectAllowed = 'move';
      });

      item.addEventListener('dragend', () => {
        item.style.opacity = '1';
        container.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        draggedEl = null;
      });

      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        item.classList.add('drag-over');
      });

      item.addEventListener('dragleave', () => {
        item.classList.remove('drag-over');
      });

      item.addEventListener('drop', (e) => {
        e.preventDefault();
        item.classList.remove('drag-over');
        if (draggedEl && draggedEl !== item) {
          // Swap positions
          const parent = container;
          const items = Array.from(parent.children);
          const fromIdx = items.indexOf(draggedEl);
          const toIdx = items.indexOf(item);

          if (fromIdx < toIdx) {
            parent.insertBefore(draggedEl, item.nextSibling);
          } else {
            parent.insertBefore(draggedEl, item);
          }
        }
      });
    });

    // Touch support for mobile
    let touchItem = null;
    container.querySelectorAll('[draggable="true"]').forEach(item => {
      item.addEventListener('touchstart', (e) => {
        touchItem = item;
        item.style.opacity = '0.5';
      }, { passive: true });

      item.addEventListener('touchend', (e) => {
        if (item) item.style.opacity = '1';
        touchItem = null;
      });
    });
  }

  // ============================================
  // Init — unlock first finding field
  // ============================================

  function init() {
    // First finding field starts unlocked
    const titleField = document.getElementById('field-title');
    if (titleField) {
      titleField.classList.remove('locked');
      titleField.classList.add('unlocked');
    }

    // Update CVSS on load
    if (typeof updateCvss === 'function') {
      window.updateCvss();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
