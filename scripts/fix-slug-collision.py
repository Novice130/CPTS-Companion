"""
fix-slug-collision.py
The 'windows-privesc' slug in patch-25-37 conflicts with base modules.json.
Rename it to 'windows-privesc-advanced' at order_index 38.
"""
import json, os

P2537 = r"c:\Users\Syed Amer\Documents\Phet\cpts companion\seed\patch-25-37"

mods = json.load(open(os.path.join(P2537, "modules.json"), encoding="utf-8"))
for m in mods:
    if m.get("slug") == "windows-privesc" and m.get("order_index") == 38:
        m["slug"] = "windows-privesc-advanced"
        m["title"] = "Advanced Windows Privilege Escalation"
        print("Renamed slug to windows-privesc-advanced at order_index 38")
        break

with open(os.path.join(P2537, "modules.json"), "w", encoding="utf-8") as f:
    json.dump(mods, f, indent=2, ensure_ascii=False)

# Fix exercises: module_id 38 is already correct, just log confirmation
exs = json.load(open(os.path.join(P2537, "exercises.json"), encoding="utf-8"))
count_38 = sum(1 for e in exs if e.get("module_id") == 38)
print(f"Exercises with module_id 38: {count_38}")

fcs = json.load(open(os.path.join(P2537, "flashcards.json"), encoding="utf-8"))
count_38fc = sum(1 for f in fcs if f.get("module_id") == 38)
print(f"Flashcards with module_id 38: {count_38fc}")

print("Done. Now run rebuild-all.py")
