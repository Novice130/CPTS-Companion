import json, os
from collections import Counter

BASE = r"c:\Users\Syed Amer\Documents\Phet\cpts companion\seed"
mods = json.load(open(os.path.join(BASE, "modules-expanded.json"), encoding="utf-8"))
exs  = json.load(open(os.path.join(BASE, "exercises-expanded.json"), encoding="utf-8"))
fcs  = json.load(open(os.path.join(BASE, "flashcards-expanded.json"), encoding="utf-8"))

print("TOTALS:")
print("  Modules   :", len(mods))
print("  Exercises :", len(exs))
print("  Flashcards:", len(fcs))
print()

print("ALL MODULE SLUGS (by order_index):")
for m in sorted(mods, key=lambda x: x.get("order_index", 999)):
    has_cs = bool(m.get("cheatsheet_md", ""))
    idx = str(m.get("order_index", "?")).rjust(2)
    slug = m["slug"]
    print(f"  [{idx}] {slug:<35} cheatsheet={has_cs}")

print()
ec = Counter(e["module_id"] for e in exs)
fc = Counter(f["module_id"] for f in fcs)
print("Modules with 5+ exercises :", sorted(k for k, v in ec.items() if v >= 5))
print("Modules with 10+ flashcards:", sorted(k for k, v in fc.items() if v >= 10))
