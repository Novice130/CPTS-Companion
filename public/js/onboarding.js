/* ============================================
   CPTS Companion - Onboarding Animation Engine
   GSAP-powered 4-scene cinematic intro
   ============================================ */

(function () {
  'use strict';

  // ── Check localStorage — skip if already seen ──
  if (localStorage.getItem('cpts_onboarding_seen') === '1') {
    window.location.href = '/';
    return;
  }

  // ── Check reduced motion preference ──
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return; // CSS handles fallback display
  }

  // ── Constants ──
  const SCENE_COUNT = 4;
  let currentScene = 1;
  let masterTimeline = null;
  let isAnimating = false;

  // ── Domain nodes for the network map ──
  const DOMAINS = [
    { id: 'net', label: 'Networking &\nEnumeration', x: 200, y: 300, color: '#1d9e75', icon: '>' },
    { id: 'web', label: 'Web Application\nAttacks', x: 400, y: 120, color: '#378add', icon: '#' },
    { id: 'ad', label: 'Active\nDirectory', x: 600, y: 300, color: '#a855f7', icon: '$' },
    { id: 'exploit', label: 'Exploitation &\nPost-Exploitation', x: 800, y: 120, color: '#ba7517', icon: '!' },
    { id: 'privesc', label: 'Privilege\nEscalation', x: 700, y: 480, color: '#e74c3c', icon: '^' },
    { id: 'report', label: 'Reporting &\nDocumentation', x: 350, y: 480, color: '#00d4ff', icon: '@' },
  ];

  const CONNECTIONS = [
    ['net', 'web'], ['net', 'ad'], ['web', 'exploit'],
    ['ad', 'exploit'], ['exploit', 'privesc'], ['ad', 'privesc'],
    ['privesc', 'report'], ['web', 'report'], ['net', 'report'],
  ];

  // ── Journey nodes (left to right path) ──
  const JOURNEY_NODES = [
    { id: 'j1', label: 'Networking', x: 100, y: 250, info: '8 modules | Flashcards | Labs', week: 1 },
    { id: 'j2', label: 'Web Attacks', x: 300, y: 180, info: '10 modules | Exercises | Labs', week: 1 },
    { id: 'j3', label: 'Exploitation', x: 500, y: 300, info: '6 modules | Flashcards | Labs', week: 2 },
    { id: 'j4', label: 'Active Directory', x: 700, y: 200, info: '8 modules | Exercises | Labs', week: 3 },
    { id: 'j5', label: 'Priv Escalation', x: 900, y: 320, info: '4 modules | Flashcards | Labs', week: 3 },
    { id: 'j6', label: 'Reporting', x: 1100, y: 230, info: '3 modules | Report Builder', week: 4 },
  ];

  const MILESTONES = [
    { label: 'Week 1', x: 200, y: 420 },
    { label: 'Week 2', x: 500, y: 420 },
    { label: 'Week 3', x: 800, y: 420 },
    { label: 'Week 4', x: 1100, y: 420 },
  ];

  // ── DOM references ──
  const scenes = {};
  const dots = {};

  function init() {
    for (let i = 1; i <= SCENE_COUNT; i++) {
      scenes[i] = document.getElementById(`scene${i}`);
      dots[i] = document.querySelector(`.scene-dot[data-scene="${i}"]`);
    }

    // Skip button
    document.getElementById('skipBtn').addEventListener('click', skipToEnd);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') skipToEnd();
    });

    // Scene indicator clicks
    document.querySelectorAll('.scene-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        const target = parseInt(dot.dataset.scene);
        if (target !== currentScene) jumpToScene(target);
      });
    });

    // Build SVG content
    buildNetworkMap();
    buildJourneyMap();

    // Start the show
    startAnimation();
  }

  // ============================================
  // SVG Builders
  // ============================================

  function buildNetworkMap() {
    const svg = document.getElementById('networkMap');
    const linesGroup = document.getElementById('connectionLines');
    const nodesGroup = document.getElementById('networkNodes');

    // Add glow filter
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <filter id="nodeGlow">
        <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
        <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <filter id="glowStrong">
        <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
        <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
    `;
    svg.insertBefore(defs, svg.firstChild);

    // Draw connections
    CONNECTIONS.forEach(([fromId, toId]) => {
      const from = DOMAINS.find(d => d.id === fromId);
      const to = DOMAINS.find(d => d.id === toId);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', from.x);
      line.setAttribute('y1', from.y);
      line.setAttribute('x2', to.x);
      line.setAttribute('y2', to.y);
      line.classList.add('connection-line');
      line.style.opacity = '0';
      line.dataset.from = fromId;
      line.dataset.to = toId;
      linesGroup.appendChild(line);
    });

    // Draw nodes
    DOMAINS.forEach((domain) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.classList.add('network-node');
      g.dataset.id = domain.id;
      g.style.opacity = '0';

      // Outer ring
      const outerRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      outerRing.setAttribute('cx', domain.x);
      outerRing.setAttribute('cy', domain.y);
      outerRing.setAttribute('r', '50');
      outerRing.setAttribute('fill', 'none');
      outerRing.setAttribute('stroke', domain.color);
      outerRing.setAttribute('stroke-width', '1');
      outerRing.setAttribute('opacity', '0.3');
      g.appendChild(outerRing);

      // Inner circle
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', domain.x);
      circle.setAttribute('cy', domain.y);
      circle.setAttribute('r', '35');
      circle.setAttribute('fill', domain.color);
      circle.setAttribute('fill-opacity', '0.15');
      circle.setAttribute('stroke', domain.color);
      circle.setAttribute('stroke-width', '2');
      circle.classList.add('node-circle');
      g.appendChild(circle);

      // Icon text
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      icon.setAttribute('x', domain.x);
      icon.setAttribute('y', domain.y + 5);
      icon.setAttribute('text-anchor', 'middle');
      icon.setAttribute('fill', domain.color);
      icon.setAttribute('font-size', '20');
      icon.setAttribute('font-family', "'JetBrains Mono', monospace");
      icon.setAttribute('font-weight', '700');
      icon.textContent = domain.icon;
      g.appendChild(icon);

      // Label
      const labelLines = domain.label.split('\n');
      labelLines.forEach((line, i) => {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', domain.x);
        text.setAttribute('y', domain.y + 65 + (i * 16));
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', '#e6edf3');
        text.setAttribute('font-size', '12');
        text.setAttribute('font-family', "'JetBrains Mono', monospace");
        text.textContent = line;
        g.appendChild(text);
      });

      nodesGroup.appendChild(g);
    });
  }

  function buildJourneyMap() {
    const pathGroup = document.getElementById('journeyPath');
    const nodesGroup = document.getElementById('journeyNodes');
    const msGroup = document.getElementById('journeyMilestones');
    const avatarGroup = document.getElementById('journeyAvatar');
    const tooltipsGroup = document.getElementById('journeyTooltips');

    // Build path line
    let pathD = `M ${JOURNEY_NODES[0].x} ${JOURNEY_NODES[0].y}`;
    for (let i = 1; i < JOURNEY_NODES.length; i++) {
      const prev = JOURNEY_NODES[i - 1];
      const curr = JOURNEY_NODES[i];
      const cpx = (prev.x + curr.x) / 2;
      pathD += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    // Background path
    const bgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    bgPath.setAttribute('d', pathD);
    bgPath.classList.add('journey-path-line');
    bgPath.style.opacity = '0';
    pathGroup.appendChild(bgPath);

    // Active/animated path
    const activePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    activePath.setAttribute('d', pathD);
    activePath.classList.add('journey-path-active');
    activePath.id = 'journeyActivePath';
    pathGroup.appendChild(activePath);

    // Draw journey nodes
    JOURNEY_NODES.forEach((node) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.classList.add('journey-node');
      g.dataset.id = node.id;
      g.style.opacity = '0';

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', node.x);
      circle.setAttribute('cy', node.y);
      circle.setAttribute('r', '24');
      circle.classList.add('journey-node-circle');
      g.appendChild(circle);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', node.x);
      text.setAttribute('y', node.y - 35);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('fill', '#e6edf3');
      text.setAttribute('font-size', '12');
      text.setAttribute('font-family', "'JetBrains Mono', monospace");
      text.setAttribute('font-weight', '600');
      text.textContent = node.label;
      g.appendChild(text);

      nodesGroup.appendChild(g);

      // Tooltip
      const tg = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      tg.classList.add('tooltip-box');
      tg.dataset.for = node.id;

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', node.x - 85);
      rect.setAttribute('y', node.y + 32);
      rect.setAttribute('width', '170');
      rect.setAttribute('height', '28');
      rect.classList.add('tooltip-bg');
      tg.appendChild(rect);

      const tt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      tt.setAttribute('x', node.x);
      tt.setAttribute('y', node.y + 50);
      tt.setAttribute('text-anchor', 'middle');
      tt.classList.add('tooltip-text');
      tt.textContent = node.info;
      tg.appendChild(tt);

      tooltipsGroup.appendChild(tg);
    });

    // Milestone markers
    MILESTONES.forEach((ms) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.style.opacity = '0';
      g.classList.add('milestone-group');

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', ms.x);
      line.setAttribute('y1', ms.y - 10);
      line.setAttribute('x2', ms.x);
      line.setAttribute('y2', ms.y + 10);
      line.setAttribute('stroke', '#ba7517');
      line.setAttribute('stroke-width', '2');
      g.appendChild(line);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', ms.x);
      text.setAttribute('y', ms.y + 28);
      text.setAttribute('text-anchor', 'middle');
      text.classList.add('milestone-marker');
      text.textContent = ms.label;
      g.appendChild(text);

      msGroup.appendChild(g);
    });

    // Avatar (simple hacker figure)
    const avatar = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    avatar.id = 'avatarFigure';
    avatar.classList.add('avatar-group');

    // Hoodie body
    const body = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    body.setAttribute('d', 'M-10,8 L-10,-5 Q-10,-12 0,-12 Q10,-12 10,-5 L10,8 Q10,12 5,12 L-5,12 Q-10,12 -10,8 Z');
    body.classList.add('avatar-body');
    avatar.appendChild(body);

    // Screen face
    const screen = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    screen.setAttribute('x', '-6');
    screen.setAttribute('y', '-9');
    screen.setAttribute('width', '12');
    screen.setAttribute('height', '8');
    screen.setAttribute('rx', '2');
    screen.classList.add('avatar-screen');
    avatar.appendChild(screen);

    // Screen text
    const screenText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    screenText.setAttribute('x', '0');
    screenText.setAttribute('y', '-3');
    screenText.setAttribute('text-anchor', 'middle');
    screenText.setAttribute('fill', '#1d9e75');
    screenText.setAttribute('font-size', '5');
    screenText.setAttribute('font-family', 'monospace');
    screenText.textContent = '>_';
    avatar.appendChild(screenText);

    avatar.setAttribute('transform', `translate(${JOURNEY_NODES[0].x}, ${JOURNEY_NODES[0].y})`);
    avatarGroup.appendChild(avatar);
  }

  // ============================================
  // Animation Timeline
  // ============================================

  function startAnimation() {
    masterTimeline = gsap.timeline({
      onComplete: () => {
        localStorage.setItem('cpts_onboarding_seen', '1');
      }
    });

    // ── SCENE 1: The Mission (0–5s) ──
    const scene1TL = gsap.timeline();

    // Terminal window appears
    scene1TL.to('.terminal-window', {
      opacity: 1, scale: 1, y: 0, duration: 0.6, ease: 'power3.out'
    });

    // Type the target text
    const targetText = 'cat /etc/objective && echo "Target: HTB CPTS Certification"';
    scene1TL.add(() => typeText('typedTarget', targetText, 40), '+=0.3');
    scene1TL.to({}, { duration: targetText.length * 0.04 + 0.3 }); // wait for typing

    // Show progress line
    scene1TL.add(() => {
      document.getElementById('progressLine').classList.remove('hidden');
      document.getElementById('progressBar').classList.remove('hidden');
    });
    scene1TL.from('#progressLine', { opacity: 0, y: 10, duration: 0.3 });
    scene1TL.from('.progress-bar-container', { opacity: 0, y: 10, duration: 0.3 }, '-=0.1');

    // Animate progress bar
    scene1TL.to('#progressFill', { width: '15%', duration: 1.2, ease: 'power2.out' }, '+=0.2');
    scene1TL.add(() => { document.getElementById('progressPct').textContent = '15%'; });

    // Show ready line
    scene1TL.add(() => {
      document.getElementById('readyLine').classList.remove('hidden');
    }, '+=0.3');
    scene1TL.from('#readyLine', { opacity: 0, y: 10, duration: 0.4 });

    // Hold then transition
    scene1TL.to({}, { duration: 1 });

    masterTimeline.add(scene1TL);
    masterTimeline.add(() => transitionToScene(2), '+=0.2');

    // ── SCENE 2: The Roadmap Reveal (5–13s) ──
    const scene2TL = gsap.timeline({ paused: true });

    // Grid background fades in
    scene2TL.to('#gridBg', { opacity: 1, duration: 0.8 });

    // Nodes appear one by one with pulse
    const nodeEls = document.querySelectorAll('.network-node');
    nodeEls.forEach((node, i) => {
      scene2TL.to(node, {
        opacity: 1,
        duration: 0.5,
        ease: 'back.out(1.5)',
        onStart: () => {
          // Pulse animation on the circle
          const circle = node.querySelector('.node-circle');
          gsap.fromTo(circle,
            { attr: { r: 25 } },
            { attr: { r: 35 }, duration: 0.4, ease: 'elastic.out(1, 0.5)' }
          );
        }
      }, i === 0 ? '+=0' : '-=0.2');
    });

    // Connection lines draw in
    const lineEls = document.querySelectorAll('.connection-line');
    lineEls.forEach((line, i) => {
      const len = Math.sqrt(
        Math.pow(line.getAttribute('x2') - line.getAttribute('x1'), 2) +
        Math.pow(line.getAttribute('y2') - line.getAttribute('y1'), 2)
      );
      line.style.strokeDasharray = len;
      line.style.strokeDashoffset = len;

      scene2TL.to(line, {
        opacity: 1, strokeDashoffset: 0,
        duration: 0.6, ease: 'power2.inOut'
      }, '-=0.4');
    });

    // Hold
    scene2TL.to({}, { duration: 1.5 });

    masterTimeline.add(() => {
      scene2TL.play();
    });
    masterTimeline.add(() => transitionToScene(3), `+=${scene2TL.duration() + 0.3}`);

    // ── SCENE 3: The Journey (13–21s) ──
    const scene3TL = gsap.timeline({ paused: true });

    // Background path appears
    scene3TL.to('.journey-path-line', { opacity: 1, duration: 0.5 });

    // Active path draws itself
    const activePath = document.getElementById('journeyActivePath');
    if (activePath) {
      const pathLength = activePath.getTotalLength ? activePath.getTotalLength() : 2000;
      activePath.style.strokeDasharray = pathLength;
      activePath.style.strokeDashoffset = pathLength;

      scene3TL.to(activePath, {
        strokeDashoffset: 0,
        duration: 4,
        ease: 'power1.inOut'
      }, '+=0.2');
    }

    // Milestone markers appear
    const msEls = document.querySelectorAll('.milestone-group');
    msEls.forEach((ms, i) => {
      scene3TL.to(ms, { opacity: 1, duration: 0.3 }, 1 + i * 1);
    });

    // Nodes appear as path reaches them
    const jNodeEls = document.querySelectorAll('.journey-node');
    jNodeEls.forEach((node, i) => {
      const delay = 0.3 + i * 0.65;
      scene3TL.to(node, {
        opacity: 1, duration: 0.4, ease: 'back.out(1.5)',
        onComplete: () => {
          node.querySelector('.journey-node-circle').classList.add('lit');
        }
      }, delay);

      // Show tooltip briefly
      const tooltip = document.querySelector(`.tooltip-box[data-for="${JOURNEY_NODES[i].id}"]`);
      if (tooltip) {
        scene3TL.to(tooltip, { opacity: 1, duration: 0.3 }, delay + 0.3);
        scene3TL.to(tooltip, { opacity: 0, duration: 0.3 }, delay + 1.2);
      }
    });

    // Avatar walks along the path
    const avatarEl = document.getElementById('avatarFigure');
    if (avatarEl) {
      scene3TL.to(avatarEl, { opacity: 1, duration: 0.3 }, 0.2);

      JOURNEY_NODES.forEach((node, i) => {
        if (i === 0) return;
        scene3TL.to(avatarEl, {
          attr: { transform: `translate(${node.x}, ${node.y})` },
          duration: 0.6,
          ease: 'power2.inOut'
        }, 0.3 + i * 0.65);
      });
    }

    // Hold
    scene3TL.to({}, { duration: 1 });

    masterTimeline.add(() => {
      scene3TL.play();
    });
    masterTimeline.add(() => transitionToScene(4), `+=${scene3TL.duration() + 0.3}`);

    // ── SCENE 4: The Call to Action (21–24s) ──
    const scene4TL = gsap.timeline({ paused: true });

    // Grid bg
    scene4TL.to('#ctaBg', { opacity: 1, duration: 0.8 });

    // Badge
    scene4TL.to('.cta-badge', {
      opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(2)'
    }, '+=0.2');

    // Title
    scene4TL.to('.cta-title', {
      opacity: 1, duration: 0.6, ease: 'power2.out'
    }, '-=0.2');

    // Subtitle
    scene4TL.to('.cta-subtitle', {
      opacity: 1, duration: 0.5, ease: 'power2.out'
    }, '-=0.2');

    // Buttons
    scene4TL.to('.cta-buttons', {
      opacity: 1, duration: 0.5, ease: 'power2.out'
    }, '-=0.1');

    // Stats counter
    scene4TL.to('.cta-stats', {
      opacity: 1, duration: 0.5, ease: 'power2.out'
    }, '-=0.2');

    // Counter animation
    scene4TL.add(() => {
      animateCounter('.cta-stat:nth-child(1) .cta-stat-value', 0, 37, 1, '+');
      animateCounter('.cta-stat:nth-child(2) .cta-stat-value', 0, 500, 1, '+');
      animateCounter('.cta-stat:nth-child(3) .cta-stat-value', 0, 200, 1, '+');
      animateCounter('.cta-stat:nth-child(4) .cta-stat-value', 0, 30, 1, '');
    }, '-=0.3');

    masterTimeline.add(() => {
      scene4TL.play();
    });
  }

  // ============================================
  // Helpers
  // ============================================

  function typeText(elementId, text, speed) {
    const el = document.getElementById(elementId);
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        el.textContent += text.charAt(i);
        i++;
      } else {
        clearInterval(interval);
      }
    }, speed);
  }

  function animateCounter(selector, start, end, duration, suffix) {
    const el = document.querySelector(selector);
    if (!el) return;
    const obj = { val: start };
    gsap.to(obj, {
      val: end,
      duration: duration,
      ease: 'power1.out',
      onUpdate: () => {
        el.textContent = Math.round(obj.val) + suffix;
      }
    });
  }

  function transitionToScene(sceneNum) {
    if (sceneNum < 1 || sceneNum > SCENE_COUNT) return;

    // Fade out current scene
    if (scenes[currentScene]) {
      scenes[currentScene].classList.remove('active');
    }
    if (dots[currentScene]) {
      dots[currentScene].classList.remove('active');
      dots[currentScene].classList.add('completed');
    }

    currentScene = sceneNum;

    // Fade in new scene
    if (scenes[currentScene]) {
      scenes[currentScene].classList.add('active');
    }
    if (dots[currentScene]) {
      dots[currentScene].classList.add('active');
    }
  }

  function jumpToScene(sceneNum) {
    if (masterTimeline) {
      masterTimeline.kill();
    }

    // Hide all scenes
    for (let i = 1; i <= SCENE_COUNT; i++) {
      scenes[i].classList.remove('active');
      dots[i].classList.remove('active', 'completed');
      if (i < sceneNum) dots[i].classList.add('completed');
    }

    currentScene = sceneNum;
    scenes[sceneNum].classList.add('active');
    dots[sceneNum].classList.add('active');

    // If jumping to scene 4, show CTA content immediately
    if (sceneNum === 4) {
      gsap.set(['.cta-badge', '.cta-title', '.cta-subtitle', '.cta-buttons', '.cta-stats', '#ctaBg'], { opacity: 1 });
      gsap.set('.cta-badge', { scale: 1 });
    }
  }

  function skipToEnd() {
    localStorage.setItem('cpts_onboarding_seen', '1');
    window.location.href = '/';
  }

  // ── Boot ──
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
