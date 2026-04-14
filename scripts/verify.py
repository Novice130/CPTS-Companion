import json

with open('seed/modules-expanded.json', encoding='utf-8') as f: mods = json.load(f)
with open('seed/exercises-expanded.json', encoding='utf-8') as f: exs  = json.load(f)
with open('seed/flashcards-expanded.json', encoding='utf-8') as f: fcs  = json.load(f)

print('=== MODULE INVENTORY ===')
for m in sorted(mods, key=lambda x: x['order_index']):
    has_cheat  = bool(m.get('cheatsheet_md'))
    has_pit    = bool(m.get('pitfalls_md'))
    has_tips   = bool(m.get('exam_tips_md'))
    print(f"  [{m['order_index']:>2}] {m['slug']:<30} cheat={has_cheat} pit={has_pit} tips={has_tips}")

print(f'\nTotal modules   : {len(mods)}')
print(f'Total exercises : {len(exs)}')
print(f'Total flashcards: {len(fcs)}')

by_mod_ex = {}
for e in exs:
    by_mod_ex[e['module_id']] = by_mod_ex.get(e['module_id'], 0) + 1

by_mod_fc = {}
for fc in fcs:
    by_mod_fc[fc['module_id']] = by_mod_fc.get(fc['module_id'], 0) + 1

print('\n--- Exercises per module (12-24) ---')
for mid in range(12, 25):
    print(f'  mod {mid}: {by_mod_ex.get(mid, 0)} exercises')

print('\n--- Flashcards per module (12-24) ---')
for mid in range(12, 25):
    print(f'  mod {mid}: {by_mod_fc.get(mid, 0)} flashcards')

# Validate JSON is well-formed for new modules
slugs_12_24 = [
    'ad-enum-attacks','web-proxies','ffuf-fuzzing','login-brute-forcing',
    'sql-injection','sqlmap','xss','file-inclusion','file-upload-attacks',
    'command-injection','web-attacks','attacking-common-apps','linux-privesc'
]
existing_slugs = {m['slug'] for m in mods}
print('\n--- Slug presence check ---')
all_ok = True
for s in slugs_12_24:
    present = s in existing_slugs
    print(f'  {"OK" if present else "MISSING"}: {s}')
    if not present:
        all_ok = False

print('\n' + ('ALL CHECKS PASSED' if all_ok else 'SOME SLUGS MISSING'))
