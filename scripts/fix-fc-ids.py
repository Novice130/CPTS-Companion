import json, os

BASE = r"c:\Users\Syed Amer\Documents\Phet\cpts companion\seed"
P2537 = os.path.join(BASE, "patch-25-37")

ID_MAP = {25:38, 26:39, 27:40, 28:41, 29:42, 30:43, 31:44, 32:45, 33:46, 34:47, 35:48, 36:49, 37:50}

# Fix flashcards-expanded.json (already merged with old IDs 25-37 for the new modules)
fcs = json.load(open(os.path.join(BASE, "flashcards-expanded.json"), encoding="utf-8"))
fixed = 0
for fc in fcs:
    old = fc.get("module_id")
    if old in ID_MAP:
        fc["module_id"] = ID_MAP[old]
        fixed += 1
with open(os.path.join(BASE, "flashcards-expanded.json"), "w", encoding="utf-8") as f:
    json.dump(fcs, f, indent=2, ensure_ascii=False)
print(f"flashcards-expanded.json: fixed {fixed} module_id mappings, total {len(fcs)} flashcards")
