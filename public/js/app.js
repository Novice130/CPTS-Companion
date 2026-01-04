// CPTS Companion - Client-Side JavaScript

// ============================================
// Command Palette (Ctrl+K)
// ============================================

let searchItems = [];
let selectedIndex = 0;

// Fetch searchable items
async function loadSearchItems() {
  try {
    const res = await fetch('/api/search-items');
    searchItems = await res.json();
  } catch (err) {
    console.error('Failed to load search items:', err);
  }
}

// Open command palette
function openCommandPalette() {
  const overlay = document.getElementById('cmdPalette');
  const input = document.getElementById('cmdPaletteInput');
  
  if (overlay) {
    overlay.classList.add('active');
    input.value = '';
    input.focus();
    selectedIndex = 0;
    renderPaletteResults('');
  }
}

// Close command palette
function closeCommandPalette() {
  const overlay = document.getElementById('cmdPalette');
  if (overlay) {
    overlay.classList.remove('active');
  }
}

// Render palette results
function renderPaletteResults(query) {
  const container = document.getElementById('cmdPaletteResults');
  if (!container) return;
  
  let filtered = searchItems;
  if (query.trim()) {
    const q = query.toLowerCase();
    filtered = searchItems.filter(item => 
      item.title.toLowerCase().includes(q) || 
      item.type.toLowerCase().includes(q)
    );
  }
  
  filtered = filtered.slice(0, 15);
  
  container.innerHTML = filtered.map((item, idx) => `
    <div class="cmd-palette-item ${idx === selectedIndex ? 'selected' : ''}" 
         onclick="navigateTo('${item.url}')"
         data-index="${idx}">
      <span class="cmd-palette-item-type">${item.type}</span>
      <span class="cmd-palette-item-title">${escapeHtml(item.title)}</span>
    </div>
  `).join('');
}

// Navigate to URL
function navigateTo(url) {
  closeCommandPalette();
  window.location.href = url;
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// Event Listeners
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  loadSearchItems();
  
  // Command palette input
  const paletteInput = document.getElementById('cmdPaletteInput');
  if (paletteInput) {
    paletteInput.addEventListener('input', (e) => {
      selectedIndex = 0;
      renderPaletteResults(e.target.value);
    });
    
    paletteInput.addEventListener('keydown', (e) => {
      const items = document.querySelectorAll('.cmd-palette-item');
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        updateSelected(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        updateSelected(items);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (items[selectedIndex]) {
          items[selectedIndex].click();
        }
      } else if (e.key === 'Escape') {
        closeCommandPalette();
      }
    });
  }
  
  // Click outside to close
  const overlay = document.getElementById('cmdPalette');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeCommandPalette();
      }
    });
  }
  
  // Initialize Mermaid if present
  if (typeof mermaid !== 'undefined') {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'dark',
      themeVariables: {
        primaryColor: '#9FEF00',
        primaryTextColor: '#f8fafc',
        primaryBorderColor: '#2d3748',
        lineColor: '#6b7280',
        secondaryColor: '#1f2937',
        tertiaryColor: '#111927'
      }
    });
  }
});

// Update selected item styling
function updateSelected(items) {
  items.forEach((item, idx) => {
    item.classList.toggle('selected', idx === selectedIndex);
  });
  
  // Scroll into view
  if (items[selectedIndex]) {
    items[selectedIndex].scrollIntoView({ block: 'nearest' });
  }
}

// Global keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ctrl+K or Cmd+K to open command palette
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    openCommandPalette();
  }
  
  // Escape to close command palette
  if (e.key === 'Escape') {
    closeCommandPalette();
  }
});

// ============================================
// Command Builder Utilities
// ============================================

const commandBuilders = {
  nmap: {
    base: 'nmap',
    options: {
      scanType: { label: 'Scan Type', values: ['-sS (SYN)', '-sT (TCP)', '-sU (UDP)', '-sV (Version)'] },
      timing: { label: 'Timing', values: ['-T0 (Paranoid)', '-T1 (Sneaky)', '-T2 (Polite)', '-T3 (Normal)', '-T4 (Aggressive)', '-T5 (Insane)'] },
      output: { label: 'Output', values: ['-oN (Normal)', '-oX (XML)', '-oG (Grepable)', '-oA (All)'] },
      scripts: { label: 'Scripts', values: ['--script=default', '--script=vuln', '--script=safe', '--script=auth'] }
    }
  },
  ffuf: {
    base: 'ffuf',
    options: {
      wordlist: { label: 'Wordlist (-w)', values: ['/usr/share/wordlists/dirb/common.txt', '/usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt'] },
      filter: { label: 'Filter', values: ['-fc 404', '-fs 0', '-fw 1', '-mc 200,301,302'] }
    }
  },
  sqlmap: {
    base: 'sqlmap',
    options: {
      level: { label: 'Level', values: ['--level=1', '--level=2', '--level=3', '--level=4', '--level=5'] },
      risk: { label: 'Risk', values: ['--risk=1', '--risk=2', '--risk=3'] },
      technique: { label: 'Technique', values: ['--technique=B', '--technique=E', '--technique=U', '--technique=S', '--technique=T'] }
    }
  },
  hydra: {
    base: 'hydra',
    options: {
      service: { label: 'Service', values: ['ssh', 'ftp', 'http-post-form', 'smb', 'rdp', 'mysql'] },
      threads: { label: 'Threads', values: ['-t 4', '-t 8', '-t 16', '-t 32', '-t 64'] }
    }
  },
  chisel: {
    base: 'chisel',
    options: {
      mode: { label: 'Mode', values: ['server --reverse', 'client'] },
      port: { label: 'Port', values: ['8080', '9999', '1337'] }
    }
  }
};

function initCommandBuilder(tool, containerId) {
  const builder = commandBuilders[tool];
  if (!builder) return;
  
  const container = document.getElementById(containerId);
  if (!container) return;
  
  let html = '';
  for (const [key, opt] of Object.entries(builder.options)) {
    html += `
      <div class="command-builder-option">
        <label>${opt.label}</label>
        <select id="builder-${key}" onchange="updateCommand('${tool}')">
          <option value="">--</option>
          ${opt.values.map(v => `<option value="${v.split(' ')[0]}">${v}</option>`).join('')}
        </select>
      </div>
    `;
  }
  
  html += `
    <div class="command-builder-option">
      <label>Target</label>
      <input type="text" id="builder-target" placeholder="IP or URL" onkeyup="updateCommand('${tool}')">
    </div>
  `;
  
  container.innerHTML = html;
  updateCommand(tool);
}

function updateCommand(tool) {
  const builder = commandBuilders[tool];
  if (!builder) return;
  
  let cmd = builder.base;
  
  for (const key of Object.keys(builder.options)) {
    const el = document.getElementById(`builder-${key}`);
    if (el && el.value) {
      cmd += ' ' + el.value;
    }
  }
  
  const target = document.getElementById('builder-target');
  if (target && target.value) {
    cmd += ' ' + target.value;
  }
  
  const output = document.getElementById('generatedCommand');
  const input = document.getElementById('commandInput');
  
  if (output) output.textContent = cmd;
  if (input) input.value = cmd;
}

// ============================================
// Utility Functions
// ============================================

// Copy to clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copied to clipboard!');
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
}

// Show toast notification
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 24px;
    background: ${type === 'success' ? 'var(--htb-green)' : 'var(--htb-red)'};
    color: var(--htb-black);
    border-radius: var(--border-radius);
    font-weight: 600;
    z-index: 10000;
    animation: fadeIn 0.3s ease-out;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Format date
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

console.log('CPTS Companion loaded. Press Ctrl+K for quick navigation.');
