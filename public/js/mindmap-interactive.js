/* ============================================
   CPTS Companion - Interactive Mind Map Engine
   D3.js force-directed graph with full CPTS node tree
   ============================================ */

(function () {
  'use strict';

  // ============================================
  // COMPLETE CPTS NODE TREE
  // ============================================

  const BRANCHES = [
    {
      id: 'networking', label: 'Networking &\nEnumeration', color: '#1d9e75', difficulty: 'beginner',
      desc: 'Master network scanning, service enumeration, and vulnerability discovery — the foundation of every pentest.',
      time: '15 hrs', cards: 45, exercises: 30,
      children: [
        {
          id: 'nmap', label: 'Nmap', difficulty: 'beginner', color: '#1d9e75',
          desc: 'The essential network scanner. Master SYN scans, version detection, NSE scripts, timing templates, and output formats.',
          time: '3 hrs', cards: 12, exercises: 8,
          techniques: ['SYN Scan (-sS)', 'Version Detection (-sV)', 'NSE Scripts (--script)', 'Timing Templates (-T0 to -T5)', 'Output Formats (-oA/-oN/-oG/-oX)'],
          prereqs: [],
          slug: 'network-enumeration-nmap'
        },
        {
          id: 'footprinting', label: 'Footprinting', difficulty: 'beginner', color: '#1d9e75',
          desc: 'Enumerate services through protocol-specific techniques: DNS, SMTP, SMB, SNMP, NFS, LDAP, and FTP.',
          time: '4 hrs', cards: 15, exercises: 10,
          techniques: ['DNS Zone Transfer', 'SMTP User Enum', 'SMB Null Sessions', 'SNMP Community Strings', 'NFS Share Enumeration', 'LDAP Anonymous Bind'],
          prereqs: ['nmap'],
          slug: 'footprinting'
        },
        {
          id: 'service-fingerprinting', label: 'Service\nFingerprinting', difficulty: 'beginner', color: '#1d9e75',
          desc: 'Identify running services, versions, and potential vulnerabilities through banner grabbing and probing.',
          time: '2 hrs', cards: 6, exercises: 4,
          techniques: ['Banner Grabbing', 'Protocol Probing', 'Version Matching'],
          prereqs: ['nmap'],
          slug: 'footprinting'
        },
        {
          id: 'nessus', label: 'Nessus', difficulty: 'intermediate', color: '#ba7517',
          desc: 'Commercial vulnerability scanner — learn to configure scans, interpret results, and validate findings.',
          time: '3 hrs', cards: 6, exercises: 4,
          techniques: ['Credentialed Scans', 'Plugin Families', 'Compliance Audits', 'Report Export'],
          prereqs: ['nmap', 'footprinting'],
          slug: 'vulnerability-assessment'
        },
        {
          id: 'openvas', label: 'OpenVAS', difficulty: 'intermediate', color: '#ba7517',
          desc: 'Open-source vulnerability scanner for comprehensive network vulnerability assessments.',
          time: '3 hrs', cards: 6, exercises: 4,
          techniques: ['GVM Setup', 'Scan Configs', 'NVT Feeds', 'Result Analysis'],
          prereqs: ['nmap', 'footprinting'],
          slug: 'vulnerability-assessment'
        },
      ]
    },
    {
      id: 'web', label: 'Web Application\nAttacks', color: '#378add', difficulty: 'intermediate',
      desc: 'Discover and exploit web vulnerabilities — from reconnaissance through injection attacks and access control bypasses.',
      time: '25 hrs', cards: 80, exercises: 50,
      children: [
        {
          id: 'web-recon', label: 'Web Recon', difficulty: 'beginner', color: '#1d9e75',
          desc: 'WHOIS lookups, subdomain enumeration, directory brute forcing, and technology fingerprinting.',
          time: '3 hrs', cards: 8, exercises: 5,
          techniques: ['WHOIS/DNS Recon', 'Subdomain Enum (Sublist3r, Amass)', 'Directory Brute Force (Gobuster)', 'Tech Fingerprinting (Wappalyzer)'],
          prereqs: [],
          slug: 'web-information-gathering'
        },
        {
          id: 'proxies', label: 'Web Proxies', difficulty: 'beginner', color: '#1d9e75',
          desc: 'Intercept, modify, and replay HTTP traffic with Burp Suite and Caido.',
          time: '2 hrs', cards: 6, exercises: 4,
          techniques: ['Burp Suite Intercept', 'Repeater', 'Intruder', 'Decoder', 'Caido Workflow'],
          prereqs: ['web-recon'],
          slug: 'using-web-proxies'
        },
        {
          id: 'fuzzing', label: 'Fuzzing (ffuf)', difficulty: 'intermediate', color: '#ba7517',
          desc: 'Fast web fuzzer for directories, virtual hosts, and parameter discovery.',
          time: '2 hrs', cards: 8, exercises: 6,
          techniques: ['Directory Fuzzing', 'VHost Discovery', 'Parameter Fuzzing', 'Recursive Fuzzing', 'Matcher/Filter Chains'],
          prereqs: ['web-recon', 'proxies'],
          slug: 'attacking-web-apps-ffuf'
        },
        {
          id: 'sqli', label: 'SQL Injection', difficulty: 'intermediate', color: '#ba7517',
          desc: 'Exploit SQL injection vulnerabilities — UNION, blind, error-based, and second-order attacks.',
          time: '4 hrs', cards: 12, exercises: 8,
          techniques: ['UNION Injection', 'Blind Boolean', 'Blind Time-Based', 'Error-Based', 'Second-Order SQLi', 'SQLMap Automation'],
          prereqs: ['proxies'],
          slug: 'sql-injection-fundamentals'
        },
        {
          id: 'xss', label: 'XSS', difficulty: 'intermediate', color: '#ba7517',
          desc: 'Cross-Site Scripting — reflected, stored, and DOM-based with cookie theft and session hijacking.',
          time: '3 hrs', cards: 8, exercises: 6,
          techniques: ['Reflected XSS', 'Stored XSS', 'DOM-Based XSS', 'Cookie Theft', 'Session Hijacking', 'Filter Bypass'],
          prereqs: ['proxies'],
          slug: 'cross-site-scripting'
        },
        {
          id: 'cmdi', label: 'Command\nInjection', difficulty: 'intermediate', color: '#ba7517',
          desc: 'OS command injection through web inputs — bypass filters and chain commands.',
          time: '2 hrs', cards: 6, exercises: 5,
          techniques: ['Basic Injection (;, |, &&)', 'Blind Injection', 'Filter Bypass', 'Out-of-Band Exfil'],
          prereqs: ['proxies'],
          slug: 'command-injections'
        },
        {
          id: 'file-inclusion', label: 'File Inclusion\n(LFI/RFI)', difficulty: 'intermediate', color: '#ba7517',
          desc: 'Local and Remote File Inclusion — path traversal, filter chains, and log poisoning to RCE.',
          time: '2 hrs', cards: 6, exercises: 5,
          techniques: ['Path Traversal', 'PHP Wrappers', 'Log Poisoning', 'LFI to RCE', 'RFI'],
          prereqs: ['proxies'],
          slug: 'file-inclusion'
        },
        {
          id: 'file-upload', label: 'File Upload\nAttacks', difficulty: 'intermediate', color: '#ba7517',
          desc: 'Bypass file upload restrictions to achieve code execution on the server.',
          time: '2 hrs', cards: 5, exercises: 4,
          techniques: ['Extension Bypass', 'Content-Type Bypass', 'Magic Bytes', 'Web Shell Upload', 'Double Extension'],
          prereqs: ['proxies'],
          slug: 'file-upload-attacks'
        },
        {
          id: 'access-control', label: 'Access Control\n(IDOR/SSRF)', difficulty: 'intermediate', color: '#ba7517',
          desc: 'Insecure Direct Object References, Server-Side Request Forgery, and HTTP verb tampering.',
          time: '2 hrs', cards: 6, exercises: 4,
          techniques: ['IDOR', 'SSRF (Internal Services)', 'HTTP Verb Tampering', 'Parameter Pollution'],
          prereqs: ['proxies'],
          slug: 'web-attacks'
        },
        {
          id: 'xxe', label: 'XXE', difficulty: 'advanced', color: '#e74c3c',
          desc: 'XML External Entity injection — file disclosure, SSRF, and blind exfiltration.',
          time: '1.5 hrs', cards: 4, exercises: 3,
          techniques: ['Classic XXE', 'Blind XXE (OOB)', 'XXE to SSRF', 'XXE File Read'],
          prereqs: ['proxies'],
          slug: 'web-attacks'
        },
        {
          id: 'ssti', label: 'SSTI', difficulty: 'advanced', color: '#e74c3c',
          desc: 'Server-Side Template Injection in Jinja2, Twig, Freemarker, and more.',
          time: '1.5 hrs', cards: 4, exercises: 3,
          techniques: ['Template Detection', 'Jinja2 RCE', 'Twig RCE', 'Polyglot Payloads'],
          prereqs: ['proxies', 'cmdi'],
          slug: 'web-attacks'
        },
        {
          id: 'cms-attacks', label: 'CMS Attacks', difficulty: 'intermediate', color: '#ba7517',
          desc: 'Attack common applications — WordPress, Joomla, Tomcat, Jenkins, and more.',
          time: '3 hrs', cards: 8, exercises: 5,
          techniques: ['WPScan', 'Joomla CVEs', 'Tomcat Manager', 'Jenkins Script Console', 'Default Credentials'],
          prereqs: ['web-recon', 'fuzzing'],
          slug: 'attacking-common-applications'
        },
      ]
    },
    {
      id: 'ad', label: 'Active\nDirectory', color: '#a855f7', difficulty: 'advanced',
      desc: 'Master Active Directory attacks — from initial foothold through domain dominance and persistence.',
      time: '30 hrs', cards: 100, exercises: 60,
      children: [
        {
          id: 'ad-enum', label: 'AD\nEnumeration', difficulty: 'intermediate', color: '#ba7517',
          desc: 'Enumerate Active Directory with PowerView, BloodHound, ldapsearch, and enum4linux.',
          time: '4 hrs', cards: 12, exercises: 8,
          techniques: ['PowerView Commands', 'BloodHound Collection (SharpHound)', 'ldapsearch Queries', 'enum4linux-ng', 'kerbrute User Enum'],
          prereqs: [],
          slug: 'active-directory-enumeration'
        },
        {
          id: 'ad-foothold', label: 'Initial\nFoothold', difficulty: 'intermediate', color: '#ba7517',
          desc: 'LLMNR/NBT-NS poisoning, password spraying, and AS-REP roasting for initial domain access.',
          time: '3 hrs', cards: 8, exercises: 6,
          techniques: ['LLMNR Poisoning (Responder)', 'Password Spraying (kerbrute)', 'AS-REP Roasting (GetNPUsers)', 'SCF/URL File Attacks'],
          prereqs: ['ad-enum'],
          slug: 'active-directory-attacks'
        },
        {
          id: 'ad-lateral', label: 'Lateral\nMovement', difficulty: 'advanced', color: '#e74c3c',
          desc: 'Move laterally with Pass-the-Hash, Pass-the-Ticket, and OverPass-the-Hash.',
          time: '3 hrs', cards: 10, exercises: 6,
          techniques: ['Pass-the-Hash (PtH)', 'Pass-the-Ticket (PtT)', 'OverPass-the-Hash', 'WMI/WinRM Execution', 'PSExec/SMBExec'],
          prereqs: ['ad-foothold'],
          slug: 'active-directory-attacks'
        },
        {
          id: 'ad-privesc', label: 'AD Privilege\nEscalation', difficulty: 'advanced', color: '#e74c3c',
          desc: 'Kerberoasting, DCSync, ACL abuse, and GPO abuse for domain privilege escalation.',
          time: '4 hrs', cards: 14, exercises: 8,
          techniques: ['Kerberoasting (GetUserSPNs)', 'DCSync (secretsdump)', 'ACL Abuse (GenericAll/Write)', 'GPO Abuse', 'LAPS Dumping'],
          prereqs: ['ad-lateral'],
          slug: 'active-directory-attacks'
        },
        {
          id: 'ad-persistence', label: 'Persistence', difficulty: 'advanced', color: '#e74c3c',
          desc: 'Maintain access with Golden, Silver, and Diamond tickets.',
          time: '3 hrs', cards: 8, exercises: 5,
          techniques: ['Golden Ticket', 'Silver Ticket', 'Diamond Ticket', 'Skeleton Key', 'AdminSDHolder'],
          prereqs: ['ad-privesc'],
          slug: 'active-directory-attacks'
        },
        {
          id: 'ad-trusts', label: 'Trust\nAttacks', difficulty: 'advanced', color: '#e74c3c',
          desc: 'Exploit domain trusts — SID history injection, cross-forest attacks, and trust tickets.',
          time: '3 hrs', cards: 8, exercises: 5,
          techniques: ['SID History Injection', 'Cross-Forest Attacks', 'Trust Ticket Forging', 'Extra SID Attack'],
          prereqs: ['ad-privesc'],
          slug: 'active-directory-attacks'
        },
        {
          id: 'ad-delegation', label: 'Delegation\nAttacks', difficulty: 'advanced', color: '#e74c3c',
          desc: 'Unconstrained, constrained, and resource-based constrained delegation attacks.',
          time: '4 hrs', cards: 10, exercises: 6,
          techniques: ['Unconstrained Delegation', 'Constrained Delegation (S4U2Self/S4U2Proxy)', 'RBCD (Resource-Based)', 'Printer Bug / PetitPotam'],
          prereqs: ['ad-privesc'],
          slug: 'active-directory-attacks'
        },
        {
          id: 'ad-cs', label: 'AD CS\nAttacks', difficulty: 'advanced', color: '#e74c3c',
          desc: 'Active Directory Certificate Services — ESC1 through ESC8 with Certipy and shadow credentials.',
          time: '4 hrs', cards: 12, exercises: 8,
          techniques: ['ESC1 (Misconfigured Templates)', 'ESC4 (Template ACL)', 'ESC8 (NTLM Relay)', 'Certipy', 'Shadow Credentials'],
          prereqs: ['ad-enum', 'ad-privesc'],
          slug: 'active-directory-attacks'
        },
      ]
    },
    {
      id: 'exploitation', label: 'Exploitation &\nPost-Exploitation', color: '#ba7517', difficulty: 'intermediate',
      desc: 'Gain and maintain access — shells, Metasploit, password attacks, service exploitation, and pivoting.',
      time: '20 hrs', cards: 60, exercises: 40,
      children: [
        {
          id: 'shells', label: 'Shells &\nPayloads', difficulty: 'beginner', color: '#1d9e75',
          desc: 'Reverse shells, bind shells, web shells, and TTY upgrade techniques.',
          time: '3 hrs', cards: 10, exercises: 6,
          techniques: ['Bash Reverse Shell', 'Python/PHP/PowerShell Shells', 'Bind Shell Setup', 'Web Shells (cmd.php, aspx)', 'TTY Upgrade (pty, script, socat)'],
          prereqs: [],
          slug: 'shells-payloads'
        },
        {
          id: 'metasploit', label: 'Metasploit', difficulty: 'intermediate', color: '#ba7517',
          desc: 'msfconsole, Meterpreter sessions, post-exploitation modules, and pivoting through Metasploit.',
          time: '3 hrs', cards: 10, exercises: 6,
          techniques: ['Module Search', 'Handler Setup', 'Meterpreter Commands', 'Post Modules', 'Pivoting (route/autoroute)'],
          prereqs: ['shells'],
          slug: 'metasploit-framework'
        },
        {
          id: 'password-attacks', label: 'Password\nAttacks', difficulty: 'intermediate', color: '#ba7517',
          desc: 'Hashcat modes, John the Ripper rules, password spraying, and credential stuffing.',
          time: '3 hrs', cards: 10, exercises: 6,
          techniques: ['Hashcat Mode Selection', 'John Rules', 'CrackMapExec Spraying', 'Hydra Brute Force', 'Credential Stuffing'],
          prereqs: [],
          slug: 'password-attacks'
        },
        {
          id: 'service-exploit', label: 'Service\nExploitation', difficulty: 'intermediate', color: '#ba7517',
          desc: 'Attack SSH, FTP, SMB, RDP, WinRM, and MSSQL services for initial access.',
          time: '4 hrs', cards: 12, exercises: 8,
          techniques: ['SSH Key Theft', 'FTP Anonymous/Credential', 'SMB Relay (ntlmrelayx)', 'RDP Hijacking', 'WinRM (evil-winrm)', 'MSSQL xp_cmdshell'],
          prereqs: ['shells', 'password-attacks'],
          slug: 'attacking-common-services'
        },
        {
          id: 'pivoting', label: 'Pivoting &\nTunneling', difficulty: 'advanced', color: '#e74c3c',
          desc: 'SSH tunneling, Chisel, Ligolo-ng, proxychains, and double pivots to reach internal networks.',
          time: '5 hrs', cards: 12, exercises: 8,
          techniques: ['SSH Local/Remote/Dynamic Port Forward', 'Chisel Reverse Proxy', 'Ligolo-ng Agent/Proxy', 'Proxychains Config', 'Double Pivot Setup', 'sshuttle'],
          prereqs: ['shells', 'service-exploit'],
          slug: 'pivoting-tunneling-port-forwarding'
        },
        {
          id: 'file-transfer', label: 'File\nTransfers', difficulty: 'beginner', color: '#1d9e75',
          desc: 'Transfer tools and data between attacker and target — Python HTTP server, certutil, PowerShell, SCP.',
          time: '2 hrs', cards: 6, exercises: 4,
          techniques: ['Python HTTP Server', 'certutil Download', 'PowerShell Download Cradle', 'SCP/SFTP', 'Base64 Encoding'],
          prereqs: [],
          slug: 'file-transfers'
        },
      ]
    },
    {
      id: 'privesc', label: 'Privilege\nEscalation', color: '#e74c3c', difficulty: 'advanced',
      desc: 'Escalate from low-privilege to root/SYSTEM — Linux and Windows techniques, credential hunting, and evasion.',
      time: '20 hrs', cards: 60, exercises: 40,
      children: [
        {
          id: 'linux-privesc', label: 'Linux\nPriv Esc', difficulty: 'intermediate', color: '#ba7517',
          desc: 'SUID binaries, sudo misconfigurations, cron jobs, capabilities, PATH hijacking, NFS, Docker escapes, and kernel exploits.',
          time: '5 hrs', cards: 15, exercises: 10,
          techniques: ['SUID/SGID Abuse', 'Sudo Misconfig (GTFOBins)', 'Cron Job Hijacking', 'Linux Capabilities', 'PATH Hijacking', 'NFS no_root_squash', 'Docker/LXD Escape', 'Kernel Exploits'],
          prereqs: ['shells'],
          slug: 'linux-privilege-escalation'
        },
        {
          id: 'windows-privesc', label: 'Windows\nPriv Esc', difficulty: 'intermediate', color: '#ba7517',
          desc: 'Potato attacks, token impersonation, DLL hijacking, weak services, AlwaysInstallElevated, and more.',
          time: '5 hrs', cards: 15, exercises: 10,
          techniques: ['PrintSpoofer/GodPotato/JuicyPotato', 'Token Impersonation (Incognito)', 'DLL Hijacking', 'Weak Service Permissions', 'AlwaysInstallElevated', 'Scheduled Tasks', 'Registry Autoruns', 'Unquoted Service Paths'],
          prereqs: ['shells'],
          slug: 'windows-privilege-escalation'
        },
        {
          id: 'cred-hunting', label: 'Credential\nHunting', difficulty: 'intermediate', color: '#ba7517',
          desc: 'Find credentials in config files, registries, LSASS, SAM, browsers, and application data.',
          time: '3 hrs', cards: 10, exercises: 6,
          techniques: ['Linux Config Files (/etc/shadow, .bashrc)', 'Windows Registry (LSA Secrets)', 'LSASS Dump (Mimikatz/pypykatz)', 'SAM Database', 'Browser Credential Stores', 'Application Config Files'],
          prereqs: ['linux-privesc', 'windows-privesc'],
          slug: 'password-attacks'
        },
        {
          id: 'opsec', label: 'OPSEC &\nAV Evasion', difficulty: 'advanced', color: '#e74c3c',
          desc: 'AMSI bypass, LOLBins, AV evasion, and obfuscation techniques for operational security.',
          time: '4 hrs', cards: 10, exercises: 6,
          techniques: ['AMSI Bypass (Patching/Reflection)', 'LOLBins (certutil, mshta, regsvr32)', 'PowerShell Obfuscation', 'Payload Encoding', 'In-Memory Execution', 'Process Injection'],
          prereqs: ['windows-privesc'],
          slug: 'windows-privilege-escalation'
        },
      ]
    },
    {
      id: 'reporting', label: 'Reporting &\nDocumentation', color: '#00d4ff', difficulty: 'beginner',
      desc: 'Write professional pentest reports — note-taking, evidence collection, CVSS scoring, and report tools.',
      time: '10 hrs', cards: 20, exercises: 15,
      children: [
        {
          id: 'note-taking', label: 'Note-Taking\nMethodology', difficulty: 'beginner', color: '#1d9e75',
          desc: 'Structure your notes for maximum efficiency during engagements — Cherry Tree, Obsidian, and markdown.',
          time: '1.5 hrs', cards: 4, exercises: 3,
          techniques: ['Folder Structure', 'Screenshot Workflow', 'Command Logging', 'Cherry Tree Templates', 'Obsidian Vault Setup'],
          prereqs: [],
          slug: 'documentation-reporting'
        },
        {
          id: 'evidence', label: 'Evidence\nCollection', difficulty: 'beginner', color: '#1d9e75',
          desc: 'Capture screenshots, command output, and timestamps that support your findings.',
          time: '1.5 hrs', cards: 4, exercises: 3,
          techniques: ['Screenshot Best Practices', 'Command Output Capture', 'Timestamp Documentation', 'Evidence Chain'],
          prereqs: ['note-taking'],
          slug: 'documentation-reporting'
        },
        {
          id: 'cvss', label: 'Finding\nClassification', difficulty: 'intermediate', color: '#ba7517',
          desc: 'CVSS 3.1 scoring, severity ratings, and finding categorization for professional reports.',
          time: '2 hrs', cards: 4, exercises: 3,
          techniques: ['CVSS 3.1 Calculator', 'Severity Mapping', 'Business Impact Assessment', 'Risk Prioritization'],
          prereqs: ['evidence'],
          slug: 'documentation-reporting'
        },
        {
          id: 'report-structure', label: 'Report\nStructure', difficulty: 'intermediate', color: '#ba7517',
          desc: 'Executive summary, technical findings, appendices — the anatomy of a professional pentest report.',
          time: '2 hrs', cards: 4, exercises: 3,
          techniques: ['Executive Summary Writing', 'Technical Findings Format', 'Appendix Organization', 'Scope & Methodology Section'],
          prereqs: ['cvss'],
          slug: 'documentation-reporting'
        },
        {
          id: 'writing-findings', label: 'Writing\nFindings', difficulty: 'intermediate', color: '#ba7517',
          desc: 'Write clear findings with severity, description, proof-of-concept, and remediation guidance.',
          time: '2 hrs', cards: 4, exercises: 3,
          techniques: ['Finding Title Best Practices', 'PoC Documentation', 'Remediation Guidance', 'Business Impact Statements'],
          prereqs: ['report-structure'],
          slug: 'documentation-reporting'
        },
        {
          id: 'report-tools', label: 'Report\nTools', difficulty: 'beginner', color: '#1d9e75',
          desc: 'SysReptor, Pwndoc, and Markdown + Pandoc for generating professional PDF reports.',
          time: '1 hr', cards: 3, exercises: 2,
          techniques: ['SysReptor Workflow', 'Pwndoc Setup', 'Markdown + Pandoc Pipeline'],
          prereqs: ['report-structure'],
          slug: 'documentation-reporting'
        },
      ]
    },
  ];

  // ============================================
  // Build flat nodes + links from tree
  // ============================================

  function buildGraphData() {
    const nodes = [];
    const links = [];

    // Central node
    nodes.push({
      id: 'cpts', label: 'CPTS', type: 'center',
      difficulty: 'center', color: '#9fef00', radius: 40,
      desc: 'HTB Certified Penetration Testing Specialist', time: '', cards: 0, exercises: 0,
      techniques: [], prereqs: [], slug: '', branch: ''
    });

    BRANCHES.forEach((branch) => {
      // Branch node
      nodes.push({
        id: branch.id, label: branch.label, type: 'branch',
        difficulty: branch.difficulty, color: branch.color, radius: 28,
        desc: branch.desc, time: branch.time, cards: branch.cards, exercises: branch.exercises,
        techniques: [], prereqs: [], slug: '', branch: branch.label
      });

      // Link center -> branch
      links.push({ source: 'cpts', target: branch.id, type: 'branch' });

      // Child nodes
      (branch.children || []).forEach((child) => {
        nodes.push({
          id: child.id, label: child.label, type: 'leaf',
          difficulty: child.difficulty, color: child.color, radius: 18,
          desc: child.desc, time: child.time, cards: child.cards, exercises: child.exercises,
          techniques: child.techniques || [], prereqs: child.prereqs || [],
          slug: child.slug || '', branch: branch.label
        });

        // Link branch -> child
        links.push({ source: branch.id, target: child.id, type: 'child' });

        // Prerequisite links
        (child.prereqs || []).forEach((prereqId) => {
          links.push({ source: prereqId, target: child.id, type: 'prereq' });
        });
      });
    });

    return { nodes, links };
  }

  // ============================================
  // D3.js Force Graph
  // ============================================

  let simulation, svg, graphGroup, linkElements, nodeElements;
  let zoom;
  let graphData;
  let selectedNodeId = null;

  function initGraph() {
    graphData = buildGraphData();

    const container = document.getElementById('graphViewport');
    const width = container.clientWidth;
    const height = container.clientHeight;

    svg = d3.select('#graphSvg');
    graphGroup = d3.select('#graphGroup');

    // Zoom + pan
    zoom = d3.zoom()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        graphGroup.attr('transform', event.transform);
        updateMinimap();
      });

    svg.call(zoom);

    // Force simulation
    simulation = d3.forceSimulation(graphData.nodes)
      .force('link', d3.forceLink(graphData.links).id(d => d.id).distance(d => {
        if (d.type === 'branch') return 200;
        if (d.type === 'child') return 100;
        return 150;
      }).strength(d => {
        if (d.type === 'branch') return 0.5;
        if (d.type === 'child') return 0.7;
        return 0.2;
      }))
      .force('charge', d3.forceManyBody().strength(d => {
        if (d.type === 'center') return -800;
        if (d.type === 'branch') return -400;
        return -150;
      }))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(d => d.radius + 20))
      .alphaDecay(0.02);

    // Render links
    linkElements = d3.select('#linksGroup')
      .selectAll('line')
      .data(graphData.links)
      .join('line')
      .attr('class', d => `graph-link ${d.type}`)
      .attr('stroke', d => d.type === 'prereq' ? '#30363d' : '#21262d')
      .attr('stroke-width', d => d.type === 'branch' ? 1.5 : 1)
      .attr('stroke-dasharray', d => d.type === 'prereq' ? '4 3' : 'none')
      .attr('marker-end', d => d.type === 'prereq' ? 'url(#arrowhead)' : '');

    // Render nodes
    nodeElements = d3.select('#nodesGroup')
      .selectAll('g')
      .data(graphData.nodes)
      .join('g')
      .attr('class', d => `graph-node ${d.type} ${d.difficulty}`)
      .call(d3.drag()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded))
      .on('click', (event, d) => {
        event.stopPropagation();
        selectNode(d);
      })
      .on('mouseenter', (event, d) => {
        highlightConnected(d);
      })
      .on('mouseleave', () => {
        resetHighlights();
      });

    // Node circles
    nodeElements.append('circle')
      .attr('class', 'node-fill')
      .attr('r', d => d.radius)
      .attr('fill', d => d.type === 'center' ? 'rgba(159, 239, 0, 0.08)' : `${d.color}15`)
      .attr('stroke', d => d.color)
      .attr('stroke-width', d => d.type === 'center' ? 2.5 : d.type === 'branch' ? 2 : 1.5);

    // Progress ring (hidden by default)
    nodeElements.append('circle')
      .attr('class', 'progress-ring')
      .attr('r', d => d.radius + 5)
      .attr('fill', 'none')
      .attr('stroke', 'transparent')
      .attr('stroke-width', 2);

    // Node labels
    nodeElements.each(function(d) {
      const g = d3.select(this);
      const lines = d.label.split('\n');

      lines.forEach((line, i) => {
        g.append('text')
          .attr('dy', d.type === 'center' ? 5 : (lines.length > 1 ? -4 + i * 14 : 4))
          .attr('text-anchor', 'middle')
          .attr('font-size', d.type === 'center' ? '16px' : d.type === 'branch' ? '11px' : '9px')
          .attr('font-weight', d.type === 'center' || d.type === 'branch' ? '700' : '500')
          .attr('fill', d.type === 'center' ? '#9fef00' : '#e6edf3')
          .text(line);
      });
    });

    // Tick handler
    simulation.on('tick', () => {
      linkElements
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      nodeElements.attr('transform', d => `translate(${d.x}, ${d.y})`);
    });

    // Initial zoom to fit
    simulation.on('end', () => {
      zoomToFit();
      updateMinimap();
    });

    // Click background to deselect
    svg.on('click', () => {
      deselectNode();
    });

    // Setup controls
    setupControls();
    initMinimap();
  }

  // ============================================
  // Drag handlers
  // ============================================

  function dragStarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragEnded(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  // ============================================
  // Node selection & detail panel
  // ============================================

  function selectNode(d) {
    if (d.type === 'center') return;

    selectedNodeId = d.id;
    const panel = document.getElementById('detailPanel');

    document.getElementById('detailTitle').textContent = d.label.replace('\n', ' ');
    document.getElementById('detailBranch').textContent = d.branch || '';
    document.getElementById('detailDesc').textContent = d.desc || '';
    document.getElementById('detailTime').textContent = d.time || '--';
    document.getElementById('detailCards').textContent = d.cards || 0;
    document.getElementById('detailExercises').textContent = d.exercises || 0;

    const diffEl = document.getElementById('detailDifficulty');
    diffEl.textContent = d.difficulty;
    diffEl.className = `detail-difficulty ${d.difficulty}`;

    // Techniques
    const techList = document.getElementById('detailTechniques');
    const techSection = document.getElementById('detailTechniquesSection');
    techList.innerHTML = '';
    if (d.techniques && d.techniques.length > 0) {
      techSection.style.display = 'block';
      d.techniques.forEach(t => {
        const li = document.createElement('li');
        li.textContent = t;
        techList.appendChild(li);
      });
    } else {
      techSection.style.display = 'none';
    }

    // Prerequisites
    const prereqList = document.getElementById('detailPrereqs');
    const prereqSection = document.getElementById('detailPrereqsSection');
    prereqList.innerHTML = '';
    if (d.prereqs && d.prereqs.length > 0) {
      prereqSection.style.display = 'block';
      d.prereqs.forEach(pId => {
        const pNode = graphData.nodes.find(n => n.id === pId);
        if (pNode) {
          const li = document.createElement('li');
          li.textContent = pNode.label.replace('\n', ' ');
          prereqList.appendChild(li);
        }
      });
    } else {
      prereqSection.style.display = 'none';
    }

    // Start button link
    const startBtn = document.getElementById('detailStartBtn');
    if (d.slug) {
      startBtn.href = `/modules/${d.slug}`;
      startBtn.style.display = 'block';
    } else {
      startBtn.style.display = 'none';
    }

    panel.classList.add('open');

    // Highlight the node
    nodeElements.classed('selected', nd => nd.id === d.id);
  }

  function deselectNode() {
    selectedNodeId = null;
    document.getElementById('detailPanel').classList.remove('open');
    nodeElements.classed('selected', false);
  }

  // ============================================
  // Hover highlighting
  // ============================================

  function highlightConnected(d) {
    const connectedIds = new Set([d.id]);
    graphData.links.forEach(l => {
      const srcId = typeof l.source === 'object' ? l.source.id : l.source;
      const tgtId = typeof l.target === 'object' ? l.target.id : l.target;
      if (srcId === d.id) connectedIds.add(tgtId);
      if (tgtId === d.id) connectedIds.add(srcId);
    });

    nodeElements.classed('dimmed', nd => !connectedIds.has(nd.id));
    linkElements.classed('dimmed', ld => {
      const srcId = typeof ld.source === 'object' ? ld.source.id : ld.source;
      const tgtId = typeof ld.target === 'object' ? ld.target.id : ld.target;
      return !connectedIds.has(srcId) || !connectedIds.has(tgtId);
    });
  }

  function resetHighlights() {
    nodeElements.classed('dimmed', false);
    linkElements.classed('dimmed', false);
  }

  // ============================================
  // Controls
  // ============================================

  function setupControls() {
    // Search
    const searchInput = document.getElementById('mapSearch');
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase().trim();
      if (!query) {
        resetHighlights();
        return;
      }
      nodeElements.classed('dimmed', d =>
        !d.label.toLowerCase().includes(query) &&
        !d.id.toLowerCase().includes(query) &&
        !(d.techniques || []).some(t => t.toLowerCase().includes(query))
      );
      linkElements.classed('dimmed', true);
    });

    // Keyboard shortcut for search
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== searchInput) {
        e.preventDefault();
        searchInput.focus();
      }
      if (e.key === 'Escape') {
        searchInput.value = '';
        searchInput.blur();
        resetHighlights();
        deselectNode();
      }
    });

    // Difficulty filters
    ['filterBeginner', 'filterIntermediate', 'filterAdvanced'].forEach(filterId => {
      const el = document.getElementById(filterId);
      if (el) {
        el.addEventListener('change', applyFilters);
      }
    });

    // Show prerequisites
    const prereqToggle = document.getElementById('showPrereqs');
    if (prereqToggle) {
      prereqToggle.addEventListener('change', (e) => {
        linkElements.attr('stroke-dasharray', d => {
          if (d.type === 'prereq') return e.target.checked ? '4 3' : '4 3';
          return 'none';
        });
        linkElements.style('opacity', d => {
          if (d.type === 'prereq') return e.target.checked ? 1 : 0;
          return 1;
        });
      });
    }

    // Reset zoom
    const resetBtn = document.getElementById('resetZoom');
    if (resetBtn) {
      resetBtn.addEventListener('click', zoomToFit);
    }

    // Export PNG
    const exportBtn = document.getElementById('exportPng');
    if (exportBtn) {
      exportBtn.addEventListener('click', exportPng);
    }

    // Close detail panel
    const closeBtn = document.getElementById('detailClose');
    if (closeBtn) {
      closeBtn.addEventListener('click', deselectNode);
    }

    // Show progress toggle
    const progressToggle = document.getElementById('showProgress');
    if (progressToggle) {
      progressToggle.addEventListener('change', toggleProgress);
    }
  }

  function applyFilters() {
    const showBeginner = document.getElementById('filterBeginner')?.checked ?? true;
    const showIntermediate = document.getElementById('filterIntermediate')?.checked ?? true;
    const showAdvanced = document.getElementById('filterAdvanced')?.checked ?? true;

    nodeElements.classed('dimmed', d => {
      if (d.type === 'center') return false;
      if (d.difficulty === 'beginner' && !showBeginner) return true;
      if (d.difficulty === 'intermediate' && !showIntermediate) return true;
      if (d.difficulty === 'advanced' && !showAdvanced) return true;
      return false;
    });
  }

  function toggleProgress(e) {
    // This would integrate with actual user progress data
    // For now, just toggle visual state as a demo
    if (e.target.checked) {
      nodeElements.each(function(d) {
        // Demo: mark a few nodes as completed or in-progress
        if (['nmap', 'footprinting', 'shells', 'web-recon', 'note-taking'].includes(d.id)) {
          d3.select(this).classed('completed', true);
        }
        if (['proxies', 'fuzzing', 'linux-privesc'].includes(d.id)) {
          d3.select(this).classed('in-progress', true);
          d3.select(this).select('.progress-ring')
            .attr('stroke', '#1d9e75')
            .attr('stroke-dasharray', '4 3');
        }
      });
    } else {
      nodeElements.classed('completed', false).classed('in-progress', false);
      nodeElements.select('.progress-ring').attr('stroke', 'transparent');
    }
  }

  // ============================================
  // Zoom to fit
  // ============================================

  function zoomToFit() {
    const container = document.getElementById('graphViewport');
    const width = container.clientWidth;
    const height = container.clientHeight;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    graphData.nodes.forEach(d => {
      if (d.x < minX) minX = d.x;
      if (d.x > maxX) maxX = d.x;
      if (d.y < minY) minY = d.y;
      if (d.y > maxY) maxY = d.y;
    });

    const padding = 80;
    const dx = maxX - minX + padding * 2;
    const dy = maxY - minY + padding * 2;
    const scale = Math.min(width / dx, height / dy, 1.5);
    const tx = width / 2 - (minX + maxX) / 2 * scale;
    const ty = height / 2 - (minY + maxY) / 2 * scale;

    svg.transition().duration(750).call(
      zoom.transform,
      d3.zoomIdentity.translate(tx, ty).scale(scale)
    );
  }

  // ============================================
  // Minimap
  // ============================================

  function initMinimap() {
    updateMinimap();
  }

  function updateMinimap() {
    const canvas = document.getElementById('minimapCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cw = canvas.width;
    const ch = canvas.height;

    ctx.clearRect(0, 0, cw, ch);

    if (!graphData || !graphData.nodes.length) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    graphData.nodes.forEach(d => {
      if (d.x < minX) minX = d.x;
      if (d.x > maxX) maxX = d.x;
      if (d.y < minY) minY = d.y;
      if (d.y > maxY) maxY = d.y;
    });

    const padding = 50;
    const dx = maxX - minX + padding * 2;
    const dy = maxY - minY + padding * 2;
    const scale = Math.min(cw / dx, ch / dy);

    const offsetX = (cw - dx * scale) / 2 - minX * scale + padding * scale;
    const offsetY = (ch - dy * scale) / 2 - minY * scale + padding * scale;

    // Draw links
    ctx.strokeStyle = '#21262d';
    ctx.lineWidth = 0.5;
    graphData.links.forEach(l => {
      const sx = (typeof l.source === 'object' ? l.source.x : 0) * scale + offsetX;
      const sy = (typeof l.source === 'object' ? l.source.y : 0) * scale + offsetY;
      const tx = (typeof l.target === 'object' ? l.target.x : 0) * scale + offsetX;
      const ty = (typeof l.target === 'object' ? l.target.y : 0) * scale + offsetY;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
    });

    // Draw nodes
    graphData.nodes.forEach(d => {
      const nx = d.x * scale + offsetX;
      const ny = d.y * scale + offsetY;
      const nr = Math.max(d.radius * scale * 0.3, 2);

      ctx.beginPath();
      ctx.arc(nx, ny, nr, 0, Math.PI * 2);
      ctx.fillStyle = d.color || '#1d9e75';
      ctx.globalAlpha = d.type === 'center' ? 1 : 0.7;
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Draw viewport rectangle
    const transform = d3.zoomTransform(svg.node());
    const container = document.getElementById('graphViewport');
    if (container && transform) {
      const vw = container.clientWidth / transform.k;
      const vh = container.clientHeight / transform.k;
      const vx = -transform.x / transform.k;
      const vy = -transform.y / transform.k;

      const vpEl = document.getElementById('minimapViewport');
      if (vpEl) {
        vpEl.style.left = (vx * scale + offsetX) + 'px';
        vpEl.style.top = (vy * scale + offsetY) + 'px';
        vpEl.style.width = (vw * scale) + 'px';
        vpEl.style.height = (vh * scale) + 'px';
      }
    }
  }

  // ============================================
  // Export PNG
  // ============================================

  function exportPng() {
    const svgEl = document.getElementById('graphSvg');
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgEl);
    const canvas = document.createElement('canvas');
    canvas.width = 2000;
    canvas.height = 1400;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, 2000, 1400);

    const img = new Image();
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 2000, 1400);
      URL.revokeObjectURL(url);
      const link = document.createElement('a');
      link.download = 'cpts-knowledge-map.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = url;
  }

  // ============================================
  // Boot
  // ============================================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGraph);
  } else {
    initGraph();
  }
})();
