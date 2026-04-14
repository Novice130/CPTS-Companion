import json, os

root = os.path.join(os.path.dirname(__file__), '..')
seed = os.path.join(root, 'seed')

with open(os.path.join(seed, 'flashcards-expanded.json')) as f:
    flashcards_expanded = json.load(f)

# Collect existing questions to avoid duplicates
existing_questions = set(fc['question'] for fc in flashcards_expanded)

# Load original flashcards too
with open(os.path.join(seed, 'flashcards.json')) as f:
    orig = json.load(f)
for fc in orig:
    existing_questions.add(fc['question'])

new_flashcards = [

  # ── MODULE 1: Penetration Testing Process ──────────────────────────────────
  {
    "module_id": 1,
    "question": "What does the Rules of Engagement (RoE) document define?",
    "answer": "In-scope IP ranges/domains, out-of-scope systems, testing windows (allowed hours), emergency contacts, escalation procedures, and what techniques are authorized.",
    "tags": ["pentest", "methodology", "legal"]
  },
  {
    "module_id": 1,
    "question": "What is the legal document that provides written authorization for penetration testing?",
    "answer": "Permission to Test letter (or equivalent written authorization), signed by an executive with authority over the in-scope systems. The RoE alone may not be sufficient — the permission letter specifically authorizes the testing activity.",
    "tags": ["pentest", "legal", "documentation"]
  },
  {
    "module_id": 1,
    "question": "What distinguishes a grey-box penetration test from black-box and white-box?",
    "answer": "Grey-box: tester has partial knowledge (e.g., low-privilege credentials, network diagram). Black-box: zero prior knowledge. White-box: full knowledge (source code, architecture). CPTS uses grey-box — you receive scope and low-priv creds.",
    "tags": ["pentest", "methodology", "testing-types"]
  },
  {
    "module_id": 1,
    "question": "What CVSS 3.1 score range constitutes a Critical severity finding?",
    "answer": "9.0 to 10.0. Critical findings require immediate remediation — typically unauthenticated RCE, domain compromise, or similar catastrophic impact.",
    "tags": ["pentest", "cvss", "reporting"]
  },
  {
    "module_id": 1,
    "question": "During post-exploitation, what is the purpose of 'lateral movement'?",
    "answer": "Lateral movement is compromising additional systems in the network from an initial foothold — demonstrating that an attacker can reach sensitive resources beyond the first compromised host. Techniques include Pass-the-Hash, Pass-the-Ticket, and credential reuse.",
    "tags": ["pentest", "post-exploitation", "methodology"]
  },
  {
    "module_id": 1,
    "question": "What is the NDA's purpose in a penetration test engagement?",
    "answer": "Non-Disclosure Agreement protects client confidentiality — the tester agrees not to disclose client data, vulnerabilities, or findings to third parties. It also protects the testing firm from liability if confidential data is accessed during testing.",
    "tags": ["pentest", "legal", "pre-engagement"]
  },
  {
    "module_id": 1,
    "question": "What is the PTES framework?",
    "answer": "Penetration Testing Execution Standard (ptes.org) — defines 7 phases: Pre-engagement, Intelligence Gathering, Threat Modeling, Vulnerability Analysis, Exploitation, Post-Exploitation, Reporting. The industry standard for professional pentest methodology.",
    "tags": ["pentest", "methodology", "frameworks"]
  },
  {
    "module_id": 1,
    "question": "Why should you document findings and take screenshots AS YOU GO rather than at the end?",
    "answer": "Evidence cannot be recreated after lab expiry or system remediation. CPTS lab access expires — if you don't screenshot your initial shell, privilege escalation, and flags during testing, you cannot prove those findings in the report.",
    "tags": ["pentest", "reporting", "documentation"]
  },
  {
    "module_id": 1,
    "question": "What should you do immediately upon discovering evidence of an active threat actor during a pentest?",
    "answer": "Stop testing the affected system immediately (to avoid interfering with potential IR), document everything observed, and contact the emergency contact defined in the RoE. Do NOT remove the threat actor's tools — this destroys forensic evidence.",
    "tags": ["pentest", "methodology", "incident-response"]
  },
  {
    "module_id": 1,
    "question": "What is the key difference between a vulnerability assessment and a penetration test deliverable?",
    "answer": "A vuln assessment deliverable is a list of identified vulnerabilities with severity ratings. A pentest deliverable proves real-world exploitability with PoC evidence, demonstrates business impact through exploitation chains, and provides specific remediation guidance based on confirmed attack paths.",
    "tags": ["pentest", "methodology", "deliverables"]
  },

  # ── MODULE 2: Network Enumeration with Nmap ────────────────────────────────
  {
    "module_id": 2,
    "question": "What is the Nmap two-pass method and why is it used?",
    "answer": "Pass 1: nmap -p- --min-rate 10000 (fast full-port discovery). Pass 2: nmap -sV -sC -O -p [discovered ports] (deep targeted scan). Used because scanning all 65535 ports with full version detection is very slow — separating discovery from analysis is dramatically faster.",
    "tags": ["nmap", "methodology", "scanning"]
  },
  {
    "module_id": 2,
    "question": "Why must you use -sT (TCP Connect) when scanning through proxychains?",
    "answer": "Proxychains operates at the TCP socket level and requires full 3-way handshakes. -sS (SYN stealth) uses raw sockets that bypass the TCP stack — proxychains cannot intercept them. Only -sT works through SOCKS proxies.",
    "tags": ["nmap", "proxychains", "pivoting"]
  },
  {
    "module_id": 2,
    "question": "What Nmap flag performs OS detection and what does it require?",
    "answer": "-O enables OS detection based on TCP/IP stack fingerprinting. Requires root/sudo privileges (raw socket access). Works best when at least one open and one closed port are available on the target.",
    "tags": ["nmap", "os-detection", "scanning"]
  },
  {
    "module_id": 2,
    "question": "What does the -oA flag do and what three file formats does it produce?",
    "answer": "-oA [basename] saves scan results in all three formats simultaneously: .nmap (normal/human-readable), .gnmap (grepable — one host per line), .xml (machine-readable, importable to Metasploit, Nessus, etc.).",
    "tags": ["nmap", "output", "methodology"]
  },
  {
    "module_id": 2,
    "question": "What is an Idle/Zombie scan (-sI) and what does it require?",
    "answer": "An Idle scan uses an idle third-party host's predictable IP ID counter to determine port states on the target — your real IP never appears in the target's logs. Requires a 'zombie' host that is truly idle and has a predictable/incremental IP ID sequence (common in older systems).",
    "tags": ["nmap", "evasion", "advanced"]
  },
  {
    "module_id": 2,
    "question": "What NSE script categories exist and which are run by default (-sC)?",
    "answer": "Categories: auth, brute, default, discovery, dos, exploit, external, fuzzer, intrusive, malware, safe, version, vuln. The -sC flag (equivalent to --script=default) runs scripts in the 'default' category only — these are deemed safe and useful for most scans.",
    "tags": ["nmap", "nse", "scripts"]
  },
  {
    "module_id": 2,
    "question": "Why can -T5 (Insane) timing miss open ports and when should you use it?",
    "answer": "-T5 sends packets with minimal delays, overwhelming hosts/networks with latency or packet queuing — responses arrive too late and ports appear closed/filtered. Only use -T5 on localhost loopback testing. For CTF labs use -T4; for production targets use -T2 or -T3.",
    "tags": ["nmap", "timing", "accuracy"]
  },
  {
    "module_id": 2,
    "question": "What does Nmap's -sN (Null scan) exploit and against which OS does it work?",
    "answer": "Null scan sends TCP packets with NO flags set. RFC 793 compliant systems (Linux, most Unix) respond to closed ports with RST and silently drop open port probes. Windows does NOT follow this behavior — it sends RST to all null packets, making all ports appear closed. Null scans only work reliably against Linux/Unix.",
    "tags": ["nmap", "scan-types", "firewall-evasion"]
  },
  {
    "module_id": 2,
    "question": "How do you extract a clean comma-separated port list from Nmap grepable output?",
    "answer": "grep '/open/' scan.gnmap | grep -oP '\\d+/open' | cut -d/ -f1 | sort -n | tr '\\n' ',' — removes the trailing newline and produces a format ready to paste directly into -p of the next nmap command.",
    "tags": ["nmap", "output", "productivity"]
  },
  {
    "module_id": 2,
    "question": "What are the 5 most important UDP ports to scan in CPTS and why?",
    "answer": "161 (SNMP — often exposes credentials and config), 53 (DNS — zone transfers), 2049 (NFS — potential no_root_squash), 500 (IKE/VPN — network segmentation bypass), 69 (TFTP — often unauthenticated file access). UDP services are invisible to TCP-only scans.",
    "tags": ["nmap", "udp", "methodology"]
  },

  # ── MODULE 3: Footprinting ─────────────────────────────────────────────────
  {
    "module_id": 3,
    "question": "What LDAP attribute contains a user's Windows login name in Active Directory?",
    "answer": "sAMAccountName — the pre-Windows 2000 login name used for NTLM authentication. Also used as the username for Kerberos (without domain suffix). Extract with: ldapsearch ... '(objectClass=user)' sAMAccountName",
    "tags": ["ldap", "active-directory", "enumeration"]
  },
  {
    "module_id": 3,
    "question": "What is a DNS zone transfer and what tool performs it?",
    "answer": "A zone transfer (AXFR) is a DNS protocol mechanism for replicating all zone records between primary and secondary nameservers. Misconfigured servers allow any client to request it. Tool: dig axfr @nameserver domain.com — returns ALL A, MX, CNAME, SRV, TXT records.",
    "tags": ["dns", "enumeration", "footprinting"]
  },
  {
    "module_id": 3,
    "question": "What SNMP OID reveals running process names including their command-line arguments?",
    "answer": "OID 1.3.6.1.2.1.25.4.2.1.2 (hrSWRunName) lists running process names. Process parameters/arguments are at OID 1.3.6.1.2.1.25.4.2.1.5 (hrSWRunParameters). Command-line arguments often contain credentials passed with --password or -p flags.",
    "tags": ["snmp", "enumeration", "credentials"]
  },
  {
    "module_id": 3,
    "question": "What does enum4linux-ng's -A flag enumerate?",
    "answer": "All: domain/workgroup info, OS version, password policy, users (via RID brute-force), shares and permissions, groups, printer info, and LSA policy. It is the most comprehensive one-shot SMB enumeration command.",
    "tags": ["smb", "enum4linux", "enumeration"]
  },
  {
    "module_id": 3,
    "question": "What is NFS no_root_squash and how is it exploited?",
    "answer": "no_root_squash means the NFS server trusts UID 0 from any client. Exploitation: (1) Mount the share as root on attacker machine, (2) copy /bin/bash to share, (3) chmod +s to set SUID bit, (4) execute on target with -p flag to preserve root privileges → instant root shell.",
    "tags": ["nfs", "privilege-escalation", "footprinting"]
  },
  {
    "module_id": 3,
    "question": "What are the three SMTP user enumeration methods and their commands?",
    "answer": "VRFY user (verify if mailbox exists), EXPN list (expand mailing list to members), RCPT TO:<user@domain> during fake mail session (250=valid, 550=invalid). Tool: smtp-user-enum -M VRFY/EXPN/RCPT -U wordlist -t target",
    "tags": ["smtp", "enumeration", "user-enum"]
  },
  {
    "module_id": 3,
    "question": "What command lists NFS exports on a remote server and what port does NFS use?",
    "answer": "showmount -e [IP] lists exported shares and allowed clients. NFS uses TCP/UDP 2049 (NFS protocol), plus TCP/UDP 111 (portmapper/rpcbind) for service registration.",
    "tags": ["nfs", "enumeration", "ports"]
  },
  {
    "module_id": 3,
    "question": "What is RID cycling (RID brute-force) and which tool performs it?",
    "answer": "RID cycling enumerates Windows Security Identifiers (SIDs) by incrementing the Relative Identifier (RID) portion. SID format: S-1-5-21-[domain]-[RID]. Well-known RIDs: 500=Administrator, 501=Guest, 1000+=regular users. Tool: enum4linux-ng -A (--rid-brute) or impacket-lookupsid domain/user:pass@target",
    "tags": ["smb", "sid", "user-enumeration"]
  },
  {
    "module_id": 3,
    "question": "What tool brute-forces SNMP community strings and what is a good wordlist for it?",
    "answer": "onesixtyone — fast SNMP community string brute-forcer. Command: onesixtyone -c [wordlist] [target]. Good wordlist: /usr/share/seclists/Discovery/SNMP/snmp.txt or /usr/share/doc/onesixtyone/dict.txt. Common strings: public, private, community, manager, [company-name]",
    "tags": ["snmp", "brute-force", "community-strings"]
  },
  {
    "module_id": 3,
    "question": "What does smbclient's 'recurse; ls' sequence do and when do you use it?",
    "answer": "In an smbclient session: 'recurse ON' enables recursive directory listing, then 'ls' or 'dir' lists all files in all subdirectories. Use it to find configuration files, credentials, and backups nested in SMB shares — essential because manual cd + ls is too slow for deep share structures.",
    "tags": ["smb", "smbclient", "enumeration"]
  },

  # ── MODULE 4: Web Information Gathering ────────────────────────────────────
  {
    "module_id": 4,
    "question": "What is the ffuf -fs flag used for and when is it essential?",
    "answer": "-fs [size] filters out responses of exactly that byte count. Essential for VHost fuzzing — without it, every request returns the default page (same size) making real VHosts indistinguishable from false positives. Calibrate by requesting a non-existent VHost first.",
    "tags": ["ffuf", "vhost", "web-fuzzing"]
  },
  {
    "module_id": 4,
    "question": "How do you dump an exposed .git directory from a web server?",
    "answer": "First confirm exposure: curl http://target/.git/HEAD (should return 'ref: refs/heads/main'). Then dump: git-dumper http://target/.git ./output-dir. Then analyze: git log, git show [commit], trufflehog filesystem ./output-dir for secrets in history.",
    "tags": ["git", "web", "information-disclosure"]
  },
  {
    "module_id": 4,
    "question": "What HTTP response headers reveal the technology stack and what do they mean?",
    "answer": "Server: (web server + version, e.g., Apache/2.4.49), X-Powered-By: (language/framework, e.g., PHP/7.4.3, ASP.NET), X-Generator: (CMS, e.g., WordPress 6.2), Set-Cookie names (PHPSESSID=PHP, JSESSIONID=Java/JEE, ASP.NET_SessionId=ASP.NET), Via: (reverse proxy info).",
    "tags": ["web", "fingerprinting", "headers"]
  },
  {
    "module_id": 4,
    "question": "What is Certificate Transparency (crt.sh) and how do you query it for subdomains?",
    "answer": "CT logs record every TLS certificate issued (required since 2018). crt.sh aggregates them. Passive, rate-limit-free query: curl 'https://crt.sh/?q=%.domain.com&output=json' | jq -r '.[].name_value' | sort -u — reveals all subdomains that have ever had a certificate issued.",
    "tags": ["web", "subdomain", "passive-recon"]
  },
  {
    "module_id": 4,
    "question": "What is feroxbuster's key advantage over gobuster and ffuf for directory enumeration?",
    "answer": "Feroxbuster automatically recurses into discovered directories. When it finds /admin/, it immediately starts fuzzing /admin/FUZZ without manual intervention. gobuster and ffuf require you to manually re-run against each discovered directory. Essential for deep web applications.",
    "tags": ["feroxbuster", "web-fuzzing", "directory-enumeration"]
  },
  {
    "module_id": 4,
    "question": "What files should you check within the first 5 minutes of discovering a web service?",
    "answer": "/robots.txt (lists sensitive paths), /sitemap.xml (full URL structure), /.git/HEAD (exposed source control), /.env (credentials), /phpinfo.php (PHP config leak), /web.config (IIS config), /backup/ (database dumps), /admin (admin panel). These take seconds and frequently reveal critical information.",
    "tags": ["web", "methodology", "quick-wins"]
  },
  {
    "module_id": 4,
    "question": "What WordPress-specific scanner should you use after identifying a WordPress site and what does it enumerate?",
    "answer": "wpscan --url http://target --enumerate u,p,t,vp (u=users, p=plugins, t=themes, vp=vulnerable plugins). Detects WordPress version, installed plugins with CVEs, themes, user enumeration via author archives, and XML-RPC endpoint. Much faster than manual ffuf for WordPress-specific issues.",
    "tags": ["web", "wordpress", "cms"]
  },
  {
    "module_id": 4,
    "question": "What does WAF detection tool wafw00f do and why does it matter before active testing?",
    "answer": "wafw00f fingerprints Web Application Firewalls by analyzing HTTP responses to specific probe requests. Identifies the WAF vendor (Cloudflare, ModSecurity, F5 ASM, etc.). Matters because WAFs may block your fuzzing wordlists, requiring evasion techniques (case variation, encoding, chunked transfer) or indicating false negatives in scan results.",
    "tags": ["web", "waf", "fingerprinting"]
  },
  {
    "module_id": 4,
    "question": "How do you fuzz for parameter names on a web endpoint that might accept hidden parameters?",
    "answer": "ffuf -u 'http://target/page?FUZZ=test' -w /usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt -mr 'valid|success|data' — FUZZ keyword in parameter name position. Use -mr to match responses containing words indicating successful parameter acceptance. Common hidden params: debug, admin, id, user, redirect.",
    "tags": ["web", "ffuf", "parameter-fuzzing"]
  },
  {
    "module_id": 4,
    "question": "What does theHarvester collect and what sources does -b all use?",
    "answer": "theHarvester collects: email addresses, employee names, subdomains, IPs, and URLs. With -b all it queries: Google, Bing, Yahoo, LinkedIn, Shodan, Hunter.io, DNSdumpster, and others. Produces a target organization map without any direct interaction with the target's systems.",
    "tags": ["web", "osint", "passive-recon"]
  }
]

# Filter out duplicates
unique_new = [fc for fc in new_flashcards if fc['question'] not in existing_questions]
skipped = len(new_flashcards) - len(unique_new)

flashcards_expanded.extend(unique_new)
with open(os.path.join(seed, 'flashcards-expanded.json'), 'w') as f:
    json.dump(flashcards_expanded, f, indent=2)

print(f"flashcards-expanded.json: {len(flashcards_expanded)} total entries (added {len(unique_new)}, skipped {skipped} duplicates)")

# Summary
print("\nNew flashcard counts per module:")
counts = {}
for fc in unique_new:
    counts[fc['module_id']] = counts.get(fc['module_id'], 0) + 1
for m in sorted(counts):
    print(f"  Module {m}: +{counts[m]}")
