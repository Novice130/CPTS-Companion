import json, os

root = os.path.join(os.path.dirname(__file__), '..')
seed = os.path.join(root, 'seed')

with open(os.path.join(seed, 'exercises-expanded.json')) as f:
    exercises_expanded = json.load(f)

# New exercises for modules 1-4 (5 per module, no duplicates with existing)
new_exercises = [

  # ── MODULE 1: Penetration Testing Process ──────────────────────────────────
  {
    "module_id": 1,
    "type": "case_file",
    "difficulty": "medium",
    "prompt": "Your client's IT manager emails you: 'While you're in there, can you also test the accounting server at 10.10.50.10? It's not in the scope doc but it's important.' The original RoE lists only 10.10.10.0/24.\nWhat is the correct response?",
    "options": None,
    "answer": "Decline to test it immediately. Request a formal scope amendment — a signed addendum to the RoE including the new IP, authorized by the appropriate executive. Testing unauthorized systems exposes you to criminal liability regardless of verbal permission.",
    "explanation": "Only written, signed authorization from the appropriate principal (not IT staff) protects you legally. A verbal or email request from an IT manager is insufficient. Always get scope changes documented and signed before testing new systems.",
    "validation_regex": "(?i)scope|signed|written|amendment|RoE|unauthorized",
    "hints": ["What document authorizes testing?", "Verbal permission from IT staff is not legally sufficient"]
  },
  {
    "module_id": 1,
    "type": "fill_command",
    "difficulty": "medium",
    "prompt": "Write the theHarvester command to gather emails, subdomains, and IPs from all sources for the domain targetcorp.com:",
    "options": None,
    "answer": "theHarvester -d targetcorp.com -b all",
    "explanation": "The -d flag specifies the domain and -b all uses all available OSINT sources (Google, Bing, LinkedIn, Shodan, etc.). This is the standard passive recon command for information gathering.",
    "validation_regex": "theHarvester.*-d.*targetcorp\\.com.*-b.*all|theHarvester.*-b.*all.*-d.*targetcorp\\.com",
    "hints": ["-d for domain", "-b specifies sources, 'all' uses everything"]
  },
  {
    "module_id": 1,
    "type": "decision_tree",
    "difficulty": "hard",
    "prompt": "During exploitation you discover evidence that another threat actor has already compromised the target system — you find a persistent backdoor and exfiltrated data. The RoE has an emergency contact clause. What is your IMMEDIATE first action?",
    "options": [
      "Continue testing — it's not your problem",
      "Remove the backdoor to help the client",
      "Stop testing the compromised system and immediately notify the emergency contact defined in the RoE",
      "Document it in the final report and mention it at the end"
    ],
    "answer": "Stop testing the compromised system and immediately notify the emergency contact defined in the RoE",
    "explanation": "Active threat actor evidence triggers the emergency escalation procedure defined in the RoE. You must stop testing (to avoid interfering with incident response), immediately contact the designated emergency contact, and document everything. Removing the backdoor would destroy forensic evidence. Continuing testing risks interfering with a live incident.",
    "validation_regex": None,
    "hints": ["What does the RoE emergency clause cover?", "Forensic integrity matters"]
  },
  {
    "module_id": 1,
    "type": "multiple_choice",
    "difficulty": "medium",
    "prompt": "During a black-box pentest, you find a critical RCE vulnerability that could allow you to compromise the entire production database. The RoE does not explicitly prohibit exploiting it. What should you do?",
    "options": [
      "Exploit it fully — the RoE doesn't say you can't",
      "Skip it and move on to less risky findings",
      "Document the vulnerability with a PoC that demonstrates access (e.g., id/hostname output) without destructive actions, then notify the client per the agreed escalation process",
      "Exploit it and exfiltrate a sample of data to prove business impact"
    ],
    "answer": "Document the vulnerability with a PoC that demonstrates access (e.g., id/hostname output) without destructive actions, then notify the client per the agreed escalation process",
    "explanation": "Professional pentesting requires demonstrating impact without causing harm. A PoC showing remote code execution (id, hostname, whoami) proves the vulnerability without risking production data. Exfiltrating real data without explicit written permission is a serious legal and ethical violation even during an authorized test.",
    "validation_regex": None,
    "hints": ["What's the minimum proof needed?", "Data exfiltration requires explicit written permission"]
  },
  {
    "module_id": 1,
    "type": "case_file",
    "difficulty": "hard",
    "prompt": "Review this draft finding title and severity:\nTitle: 'Web Server Issue'\nSeverity: High\nDescription: 'The web server has a problem that could allow attackers to get in.'\n\nIdentify ALL problems with this finding and rewrite it correctly.",
    "options": None,
    "answer": "Problems: (1) Vague title — does not describe the vulnerability or attack chain. (2) No specific vulnerability identified. (3) No CVSS score. (4) No affected host. (5) No PoC. (6) No business impact. (7) No remediation steps. Corrected example: Title: 'Apache 2.4.49 Path Traversal Allows Unauthenticated Remote Code Execution (CVE-2021-41773)' | Severity: Critical (CVSS 9.8) | Affected: 10.10.10.5:80 | PoC: curl -s --path-as-is 'http://10.10.10.5/cgi-bin/.%2e/.%2e/bin/sh' --data 'echo; id' returns uid=daemon | Impact: Unauthenticated attacker can execute arbitrary commands as daemon user, enabling full server compromise | Remediation: Upgrade Apache to 2.4.51 or later immediately.",
    "explanation": "Professional findings require: specific descriptive title, accurate severity with CVSS 3.1 vector, affected host(s), step-by-step reproducible PoC with evidence screenshots, business impact in non-technical language, and specific actionable remediation. Vague findings get ignored by development teams.",
    "validation_regex": "(?i)title|cvss|poc|remediat|impact|specific",
    "hints": ["Count how many fields are missing", "What does a CVSS score look like?"]
  },

  # ── MODULE 2: Network Enumeration with Nmap ────────────────────────────────
  {
    "module_id": 2,
    "type": "case_file",
    "difficulty": "hard",
    "prompt": "You ran: nmap -p- --min-rate 10000 10.10.10.5\nResults show only port 80 open after 30 seconds. A colleague says the host has many more services.\nWhat are TWO likely causes and how do you fix each?",
    "options": None,
    "answer": "Cause 1: Rate too aggressive — --min-rate 10000 on a lossy/slow network drops packets and misses ports. Fix: reduce to --min-rate 5000 or use -T4 instead. | Cause 2: Only TCP scanned — critical services like SNMP (UDP 161), NFS (UDP 2049) are UDP-only. Fix: run parallel UDP scan: nmap -sU --top-ports 20 10.10.10.5. Also verify with: nmap -Pn -sS -p- 10.10.10.5 to rule out ICMP block causing false results.",
    "explanation": "Aggressive rate limiting causes packet loss on any network with queuing or throttling. Additionally, -p- only covers TCP — all UDP services are invisible. Both are common causes of 'missing' services in Nmap scans.",
    "validation_regex": "(?i)udp|rate|T4|packet|loss",
    "hints": ["Does -p- cover UDP?", "What happens when you send too fast on a slow network?"]
  },
  {
    "module_id": 2,
    "type": "fill_command",
    "difficulty": "medium",
    "prompt": "Write the Nmap command to test whether 10.10.10.5 is vulnerable to MS08-067 (CVE-2008-4250) using the appropriate NSE script:",
    "options": None,
    "answer": "nmap --script smb-vuln-ms08-067 -p 445 10.10.10.5",
    "explanation": "The smb-vuln-ms08-067 NSE script tests for the MS08-067 vulnerability on Windows XP/2003. Always target port 445 (SMB) specifically to avoid running the script against unnecessary services.",
    "validation_regex": "nmap.*smb-vuln-ms08-067.*445.*10\\.10\\.10\\.5|nmap.*445.*smb-vuln-ms08-067.*10\\.10\\.10\\.5",
    "hints": ["NSE script name mirrors the CVE name", "SMB runs on port 445"]
  },
  {
    "module_id": 2,
    "type": "multiple_choice",
    "difficulty": "medium",
    "prompt": "You need to scan a target but must avoid detection by an IDS. Which Nmap technique uses a third-party host's IP ID sequence to make scans appear to originate from that host?",
    "options": [
      "Decoy scan (-D)",
      "Fragmentation scan (-f)",
      "Idle/Zombie scan (-sI)",
      "Source port spoofing (--source-port)"
    ],
    "answer": "Idle/Zombie scan (-sI)",
    "explanation": "The Idle scan (-sI zombie_host) uses an idle host's predictable IP ID counter to infer port states without sending a single packet from your real IP. The zombie's IP appears as the source in all probe packets. Requires a truly idle host with predictable IPID increments.",
    "validation_regex": None,
    "hints": ["Which technique truly hides your source IP?", "Requires a 'zombie' host with predictable IP ID"]
  },
  {
    "module_id": 2,
    "type": "decision_tree",
    "difficulty": "medium",
    "prompt": "Your full -p- scan shows ports 80, 443, 8080, 8443 open. Your -sV scan shows 8443 running an unknown service that only returns a TLS hello. What is the correct next step?",
    "options": [
      "Ignore port 8443 — it's probably just another web server",
      "Try connecting with openssl s_client -connect 10.10.10.5:8443 to inspect the certificate and banner",
      "Run nmap --script=all against it",
      "Mark it as filtered and move on"
    ],
    "answer": "Try connecting with openssl s_client -connect 10.10.10.5:8443 to inspect the certificate and banner",
    "explanation": "openssl s_client reveals the TLS certificate (hostname, organization, SANs which may expose additional vhosts), the server banner, and supported protocols. This is the correct tool for inspecting unknown TLS services. Running --script=all is too noisy and slow; ignoring it risks missing a management interface.",
    "validation_regex": None,
    "hints": ["What tool reveals TLS certificate details?", "Certificate SANs often expose hostnames"]
  },
  {
    "module_id": 2,
    "type": "fill_command",
    "difficulty": "easy",
    "prompt": "Write the Nmap command to perform OS detection combined with service version detection and default scripts against ports 22, 80, and 443 on 10.10.10.5, saving all output formats:",
    "options": None,
    "answer": "nmap -p 22,80,443 -sV -sC -O -oA targeted 10.10.10.5",
    "explanation": "-sV detects service versions, -sC runs default NSE scripts, -O attempts OS detection (requires root/sudo), -oA saves three output format files simultaneously. This is the standard targeted deep-scan command after port discovery.",
    "validation_regex": "nmap.*-p.*22.*80.*443.*-sV.*-sC.*-O.*-oA|nmap.*22,80,443.*-[sOCV]",
    "hints": ["-O for OS detection", "-oA saves all formats at once"]
  },

  # ── MODULE 3: Footprinting ─────────────────────────────────────────────────
  {
    "module_id": 3,
    "type": "case_file",
    "difficulty": "hard",
    "prompt": "snmpwalk -v2c -c public 10.10.10.5 1.3.6.1.2.1.25.4.2.1.2 returns:\nHR-SW-RUN-NAME.1 = STRING: '/usr/sbin/mysqld --basedir=/usr --datadir=/var/lib/mysql --user=mysql --password=S3cur3DB@dm1n!'\n\nWhat critical information is exposed and what is your immediate next step?",
    "options": None,
    "answer": "Exposed: MySQL database server running with the --password flag in the process command line. The MySQL root/admin password 'S3cur3DB@dm1n!' is visible in the SNMP running process list. Immediate next steps: (1) Test credential against MySQL: mysql -u root -p'S3cur3DB@dm1n!' -h 10.10.10.5; (2) Password spray the credential against all other discovered services (SSH, SMB, WinRM, FTP); (3) If MySQL allows external connections, attempt to read files via LOAD DATA INFILE or execute OS commands via SELECT sys_exec().",
    "explanation": "SNMP OID 1.3.6.1.2.1.25.4.2.1.2 (hrSWRunName) enumerates running processes including their full command lines. Developers who pass passwords as CLI arguments expose them to anyone with SNMP read access. This is a very common credential disclosure path in CPTS labs.",
    "validation_regex": "(?i)mysql|password|credential|spray|ssh|S3cur3",
    "hints": ["What OID shows running processes?", "Passwords in command-line arguments are visible to SNMP"]
  },
  {
    "module_id": 3,
    "type": "fill_command",
    "difficulty": "medium",
    "prompt": "Write the command to recursively list all contents of an SMB share named 'Backup' on host 10.10.10.5 using a null session with smbmap:",
    "options": None,
    "answer": "smbmap -H 10.10.10.5 -r Backup",
    "explanation": "The -r flag enables recursive listing of share contents. Without -r, smbmap only shows shares and their top-level permissions, missing nested files like config files, credentials, and database backups.",
    "validation_regex": "smbmap.*-H.*10\\.10\\.10\\.5.*-r.*Backup|smbmap.*Backup.*-r.*10\\.10\\.10\\.5",
    "hints": ["-r enables recursive listing", "smbmap shows permissions too"]
  },
  {
    "module_id": 3,
    "type": "multiple_choice",
    "difficulty": "medium",
    "prompt": "You find NFS is running on a target (port 2049). showmount -e 10.10.10.5 returns: '/home  *(rw,no_root_squash)'. What does no_root_squash mean in an exploitation context?",
    "options": [
      "The share is read-only",
      "Root on your attacker machine has root-level access to the NFS share — allowing SUID binary creation",
      "The share requires a password",
      "Root access is restricted to the server only"
    ],
    "answer": "Root on your attacker machine has root-level access to the NFS share — allowing SUID binary creation",
    "explanation": "By default, NFS maps the remote root user to 'nfsnobody' (root_squash). With no_root_squash, your local root UID (0) is trusted as root on the remote system. This allows copying a SUID bash binary to the share, then executing it on the target for a root shell.",
    "validation_regex": None,
    "hints": ["What UID does no_root_squash trust from the client?", "SUID bit + root copy = privilege escalation"]
  },
  {
    "module_id": 3,
    "type": "decision_tree",
    "difficulty": "medium",
    "prompt": "You connect to an SMTP server on port 25. VRFY admin returns '550 User unknown'. VRFY root returns '550 User unknown'. But RCPT TO:<admin@domain.com> during a fake mail session returns '250 OK'. What does this tell you?",
    "options": [
      "No users exist on this mail server",
      "VRFY is disabled but RCPT TO user enumeration works — admin is a valid user",
      "The server is misconfigured and not useful",
      "You need to authenticate first"
    ],
    "answer": "VRFY is disabled but RCPT TO user enumeration works — admin is a valid user",
    "explanation": "Many mail servers disable VRFY for security but leave RCPT TO enumeration open. RCPT TO: during a MAIL FROM session reveals valid recipients via 250 OK responses vs. 550 Unknown User responses. This is a reliable fallback user enumeration method when VRFY is blocked.",
    "validation_regex": None,
    "hints": ["SMTP has multiple user enumeration methods", "What does RCPT TO 250 mean?"]
  },
  {
    "module_id": 3,
    "type": "fill_command",
    "difficulty": "hard",
    "prompt": "Write the ldapsearch command to enumerate all user sAMAccountName values from an Active Directory domain controller at 10.10.10.5 with base DN DC=corp,DC=local using an anonymous bind:",
    "options": None,
    "answer": "ldapsearch -x -H ldap://10.10.10.5 -b 'DC=corp,DC=local' '(objectClass=user)' sAMAccountName",
    "explanation": "-x enables simple (anonymous) bind, -H specifies the LDAP URI, -b sets the search base, the filter (objectClass=user) limits to user objects, and sAMAccountName as the attribute returns only usernames. This is the foundational AD user enumeration command.",
    "validation_regex": "ldapsearch.*-x.*ldap://10\\.10\\.10\\.5.*DC=corp.*objectClass.*user.*sAMAccountName",
    "hints": ["-x for anonymous/simple bind", "Filter on objectClass=user", "Specify the attribute to return"]
  },

  # ── MODULE 4: Web Information Gathering ────────────────────────────────────
  {
    "module_id": 4,
    "type": "case_file",
    "difficulty": "medium",
    "prompt": "You visit http://10.10.10.5/robots.txt and see:\nUser-agent: *\nDisallow: /admin-panel/\nDisallow: /backup/\nDisallow: /api/internal/\nDisallow: /.git/\n\nList the paths in order of investigation priority and explain why.",
    "options": None,
    "answer": "Priority 1: /.git/ — An exposed .git directory allows complete source code extraction (including all credentials, API keys, and historical secrets) via git-dumper. Highest business impact. | Priority 2: /backup/ — Backup directories frequently contain database dumps, configuration archives, and credential files. Often directly downloadable. | Priority 3: /api/internal/ — Internal API endpoints may lack authentication checks, expose sensitive data, or enable privileged operations not intended for external access. | Priority 4: /admin-panel/ — Admin panels are high value but usually protected by authentication. Try default credentials and check for auth bypass vulnerabilities.",
    "explanation": "robots.txt Disallow entries are a roadmap to sensitive functionality. Administrators add paths to robots.txt to prevent search engine indexing, inadvertently advertising them to attackers. The .git directory is the highest priority because source code exposure is catastrophic and enables all subsequent attacks.",
    "validation_regex": "(?i)\\.git|backup|source|credential|priority",
    "hints": ["Which path gives access to ALL application secrets?", "What's inside a /backup/ directory?"]
  },
  {
    "module_id": 4,
    "type": "fill_command",
    "difficulty": "medium",
    "prompt": "Write the feroxbuster command to recursively fuzz http://10.10.10.5 with php, html, txt, and bak extensions, to a depth of 3, saving output to ferox.txt:",
    "options": None,
    "answer": "feroxbuster -u http://10.10.10.5 -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt -x php,html,txt,bak --depth 3 -o ferox.txt",
    "explanation": "Feroxbuster's automatic recursion (-depth) is its key advantage over ffuf/gobuster for deep directory structures. The -x flag appends extensions to each wordlist entry. -o saves results for later reference.",
    "validation_regex": "feroxbuster.*-u.*http.*10\\.10\\.10\\.5.*-x.*php.*bak.*--depth.*3.*-o|feroxbuster.*-u.*10\\.10\\.10\\.5.*--depth",
    "hints": ["feroxbuster handles recursion automatically", "--depth limits how deep it goes"]
  },
  {
    "module_id": 4,
    "type": "multiple_choice",
    "difficulty": "medium",
    "prompt": "You need to enumerate subdomains passively without sending any traffic to the target. Which source provides subdomain information from TLS certificate registrations for free, with no rate limiting?",
    "options": [
      "gobuster dns — active brute-force",
      "crt.sh (Certificate Transparency logs)",
      "nikto — web scanner",
      "ffuf VHost fuzzing"
    ],
    "answer": "crt.sh (Certificate Transparency logs)",
    "explanation": "Certificate Transparency (CT) logs record every TLS certificate issued, including the domain and all Subject Alternative Names (SANs). crt.sh aggregates these logs and provides a free, unauthenticated JSON API. Query: curl 'https://crt.sh/?q=%.domain.com&output=json' — entirely passive, no traffic to the target.",
    "validation_regex": None,
    "hints": ["Passive means no traffic to the target", "TLS certificates list all domain names they protect"]
  },
  {
    "module_id": 4,
    "type": "decision_tree",
    "difficulty": "hard",
    "prompt": "curl -I http://10.10.10.5 returns:\nHTTP/1.1 200 OK\nServer: Apache/2.4.49 (Unix)\nX-Powered-By: PHP/7.4.3\nSet-Cookie: PHPSESSID=abc123; path=/\n\nList all actionable intelligence from these headers.",
    "options": [
      "Nothing useful — these are default headers",
      "Apache version suggests checking CVE-2021-41773 (path traversal/RCE); PHP 7.4.3 is EOL with known CVEs; PHPSESSID confirms PHP session handling",
      "Only the cookie is useful for session hijacking",
      "The server type tells us to use sqlmap"
    ],
    "answer": "Apache version suggests checking CVE-2021-41773 (path traversal/RCE); PHP 7.4.3 is EOL with known CVEs; PHPSESSID confirms PHP session handling",
    "explanation": "Apache 2.4.49 is specifically vulnerable to CVE-2021-41773 (path traversal) and CVE-2021-42013 (RCE if mod_cgi enabled). PHP 7.4.3 is end-of-life and has multiple known CVEs. PHPSESSID identifies a PHP application, suggesting PHP-specific attack vectors (file inclusion, deserialization). Each header is a research direction.",
    "validation_regex": None,
    "hints": ["Look up Apache 2.4.49 CVEs", "What does PHP 7.4.3 EOL status mean?"]
  },
  {
    "module_id": 4,
    "type": "fill_command",
    "difficulty": "medium",
    "prompt": "Write the ffuf command to fuzz for virtual hosts on 10.10.10.5 using the Host header, filtering out responses of exactly 1547 bytes (the default page size), using the SecLists subdomains-top1million-5000.txt wordlist:",
    "options": None,
    "answer": "ffuf -u http://10.10.10.5 -H 'Host: FUZZ.domain.com' -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt -fs 1547",
    "explanation": "-H 'Host: FUZZ.domain.com' injects the FUZZ keyword into the Host header for VHost discovery. -fs [size] filters responses matching the default page size so only legitimate VHosts appear in results. Without -fs calibration, every request returns the same default page.",
    "validation_regex": "ffuf.*-H.*Host.*FUZZ.*-w.*subdomains.*-fs|ffuf.*FUZZ.*domain.*-fs",
    "hints": ["FUZZ goes in the Host header value", "-fs filters by response size"]
  }
]

# Append new exercises
exercises_expanded.extend(new_exercises)
with open(os.path.join(seed, 'exercises-expanded.json'), 'w') as f:
    json.dump(exercises_expanded, f, indent=2)

print(f"exercises-expanded.json: {len(exercises_expanded)} total entries (added {len(new_exercises)})")
