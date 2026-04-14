"""
fix-new-module-ids.py
Updates patch-25-37 modules, exercises, and flashcards to use order_index/module_id 38-50
to avoid collision with existing modules.json entries at 25-37.
"""
import json, os

BASE  = r"c:\Users\Syed Amer\Documents\Phet\cpts companion\seed"
P2537 = os.path.join(BASE, "patch-25-37")

# Old -> New order_index mapping for our custom advanced modules
ID_MAP = {
    25: 38,  # windows-privesc
    26: 39,  # ad-persistence
    27: 40,  # av-evasion
    28: 41,  # advanced-web-attacks
    29: 42,  # api-pentesting
    30: 43,  # ad-trust-attacks
    31: 44,  # post-exploitation
    32: 45,  # lateral-movement
    33: 46,  # pivoting-advanced
    34: 47,  # data-exfiltration
    35: 48,  # cloud-pentesting
    36: 49,  # thick-client
    37: 50,  # vuln-research-cve
}

# Fix modules.json
mods = json.load(open(os.path.join(P2537, "modules.json"), encoding="utf-8"))
for m in mods:
    old = m.get("order_index")
    if old in ID_MAP:
        m["order_index"] = ID_MAP[old]
with open(os.path.join(P2537, "modules.json"), "w", encoding="utf-8") as f:
    json.dump(mods, f, indent=2, ensure_ascii=False)
print(f"Modules fixed: {len(mods)} entries, new order_index range: {min(m['order_index'] for m in mods)}-{max(m['order_index'] for m in mods)}")

# Fix exercises.json
exs = json.load(open(os.path.join(P2537, "exercises.json"), encoding="utf-8"))
for e in exs:
    old = e.get("module_id")
    if old in ID_MAP:
        e["module_id"] = ID_MAP[old]
with open(os.path.join(P2537, "exercises.json"), "w", encoding="utf-8") as f:
    json.dump(exs, f, indent=2, ensure_ascii=False)
print(f"Exercises fixed: {len(exs)} entries")

# Fix flashcards.json
fcs = json.load(open(os.path.join(P2537, "flashcards.json"), encoding="utf-8"))
for fc in fcs:
    old = fc.get("module_id")
    if old in ID_MAP:
        fc["module_id"] = ID_MAP[old]
with open(os.path.join(P2537, "flashcards.json"), "w", encoding="utf-8") as f:
    json.dump(fcs, f, indent=2, ensure_ascii=False)
print(f"Flashcards fixed: {len(fcs)} entries")

print("ID remapping complete. Now run rebuild-all.py")
