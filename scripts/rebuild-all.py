"""
rebuild-all.py
Reconstructs modules-expanded.json, exercises-expanded.json, flashcards-expanded.json
from clean JSON source files — no Python string escaping issues.
"""
import json, os

BASE  = r"c:\Users\Syed Amer\Documents\Phet\cpts companion"
SEED  = os.path.join(BASE, "seed")
P1224 = os.path.join(SEED, "patch-12-24")
P2537 = os.path.join(SEED, "patch-25-37")
PBASE_2537 = os.path.join(SEED, "patch-base-25-37")

def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)

def save(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"  Saved: {os.path.basename(path)}  ({len(data)} items)")

# ── 1. BUILD modules-expanded.json ────────────────────────────────────
print("Building modules-expanded.json ...")

base_mods   = load(os.path.join(SEED,  "modules.json"))          # 37 base entries
rich_12_24  = load(os.path.join(P1224, "modules-rich.json"))     # 13 rich patches (12-24)
rich_base_2537 = load(os.path.join(PBASE_2537, "modules-rich.json")) # 13 rich patches (25-37)
rich_25_37  = load(os.path.join(P2537, "modules.json"))          # 13 new modules (added as 38-50)

# Build slug-indexed rich content maps
r1224_map = {m["slug"]: m for m in rich_12_24}
rbase2537_map = {m["slug"]: m for m in rich_base_2537}
r2537_map = {m["slug"]: m for m in rich_25_37}

modules_expanded = []
for m in base_mods:
    slug = m["slug"]
    entry = dict(m)  # start with base fields
    if slug in r1224_map:
        # Merge rich content for 12-24
        entry.update({
            "cheatsheet_md": r1224_map[slug].get("cheatsheet_md", ""),
            "pitfalls_md":   r1224_map[slug].get("pitfalls_md", ""),
            "exam_tips_md":  r1224_map[slug].get("exam_tips_md", ""),
        })
    elif slug in rbase2537_map:
        # Merge rich content for base 25-37
        entry.update({
            "cheatsheet_md": rbase2537_map[slug].get("cheatsheet_md", ""),
            "pitfalls_md":   rbase2537_map[slug].get("pitfalls_md", ""),
            "exam_tips_md":  rbase2537_map[slug].get("exam_tips_md", ""),
        })
    modules_expanded.append(entry)

# Add modules 25-37 (they are entirely new, not in base modules.json)
existing_slugs = {m["slug"] for m in modules_expanded}
for m in rich_25_37:
    if m["slug"] not in existing_slugs:
        modules_expanded.append(m)
        existing_slugs.add(m["slug"])

# Sort by order_index
modules_expanded.sort(key=lambda m: m.get("order_index", 999))
save(os.path.join(SEED, "modules-expanded.json"), modules_expanded)

# ── 2. BUILD exercises-expanded.json ───────────────────────────────────
print("Building exercises-expanded.json ...")

base_exs  = load(os.path.join(SEED,  "exercises.json"))     # original exercises
try:
    patch_1224_exs = load(os.path.join(P1224, "exercises.json"))
except FileNotFoundError:
    patch_1224_exs = []

try:
    patch_base2537_exs = load(os.path.join(PBASE_2537, "exercises.json"))
except FileNotFoundError:
    patch_base2537_exs = []

patch_exs = load(os.path.join(P2537, "exercises.json"))     # 65 new exercises (added as 38-50)

seen_prompts = {e["prompt"] for e in base_exs}
combined_exs = list(base_exs)
added = 0
for e in patch_1224_exs + patch_base2537_exs + patch_exs:
    if e["prompt"] not in seen_prompts:
        combined_exs.append(e)
        seen_prompts.add(e["prompt"])
        added += 1

save(os.path.join(SEED, "exercises-expanded.json"), combined_exs)
print(f"  Added {added} new exercises from patches")

# ── 3. VERIFY flashcards-expanded.json ─────────────────────────────────
print("Building flashcards-expanded.json ...")
fcs = load(os.path.join(SEED, "flashcards-expanded.json"))

try:
    patch_base2537_fcs = load(os.path.join(PBASE_2537, "flashcards.json"))
except FileNotFoundError:
    patch_base2537_fcs = []

seen_fc_qs = {f.get("question", "") for f in fcs}
added_fcs = 0
for f in patch_base2537_fcs:
    if f["question"] not in seen_fc_qs:
        fcs.append(f)
        seen_fc_qs.add(f["question"])
        added_fcs += 1

save(os.path.join(SEED, "flashcards-expanded.json"), fcs)
print(f"  Added {added_fcs} new flashcards from patches")
# ── 4. SUMMARY ──────────────────────────────────────────────────────────
print()
print("=" * 50)
print(f"  modules-expanded.json  : {len(modules_expanded):>4} entries")
print(f"  exercises-expanded.json: {len(combined_exs):>4} entries")
print(f"  flashcards-expanded.json: {len(fcs):>3} entries")
print("=" * 50)

# Slug list
slugs_25_37 = [m["slug"] for m in modules_expanded if m.get("order_index", 0) >= 25]
print(f"\nModules 25+: {slugs_25_37}")
print("\nDone! All seed files rebuilt successfully.")
