import json, os

BASE = os.path.dirname(os.path.abspath(__file__))
SEED = os.path.join(BASE, '..', 'seed')

mods = json.load(open(os.path.join(SEED,'modules-expanded.json'), encoding='utf-8'))
exs  = json.load(open(os.path.join(SEED,'exercises-expanded.json'), encoding='utf-8'))
fcs  = json.load(open(os.path.join(SEED,'flashcards-expanded.json'), encoding='utf-8'))

slugs = sorted([m['slug'] for m in mods])
print(f"Modules   : {len(mods)}")
print(f"Exercises : {len(exs)}")
print(f"Flashcards: {len(fcs)}")
print()

new_slugs = ['windows-privesc','ad-persistence','av-evasion','advanced-web-attacks',
             'api-pentesting','ad-trust-attacks','post-exploitation','lateral-movement',
             'pivoting-advanced','data-exfiltration','cloud-pentesting','thick-client','vuln-research-cve']
print("New modules (25-37) present:")
for s in new_slugs:
    found = any(m['slug'] == s for m in mods)
    print(f"  {'OK' if found else 'MISSING'} {s}")

print()
# Verify exercise and flashcard links
mod_ids = {m['order_index'] for m in mods}
ex_ids  = {e['module_id'] for e in exs}
fc_ids  = {fc['module_id'] for fc in fcs}
print(f"Exercise coverage  : {sorted(ex_ids)}")
print(f"Flashcard coverage : {sorted(fc_ids)}")
