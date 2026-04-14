#!/usr/bin/env python3
"""
seed-modules-25-37-runner.py
Loads pre-built JSON data files and merges them into the seed files.
This avoids ALL Python string escaping issues.
"""
import json, os

SEED = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'seed')
DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'seed', 'patch-25-37')

def load_seed(fn):
    with open(os.path.join(SEED, fn), encoding='utf-8') as f:
        return json.load(f)

def save_seed(fn, data):
    with open(os.path.join(SEED, fn), 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def load_patch(fn):
    with open(os.path.join(DATA, fn), encoding='utf-8') as f:
        return json.load(f)

mods = load_seed('modules-expanded.json')
exs  = load_seed('exercises-expanded.json')
fcs  = load_seed('flashcards-expanded.json')

existing_slugs     = {m['slug']      for m in mods}
existing_prompts   = {e['prompt']    for e in exs}
existing_questions = {fc['question'] for fc in fcs}

new_mods = load_patch('modules.json')
new_exs  = load_patch('exercises.json')
new_fcs  = load_patch('flashcards.json')

added_mods = 0
for nm in new_mods:
    if nm['slug'] not in existing_slugs:
        mods.append(nm)
        existing_slugs.add(nm['slug'])
        added_mods += 1
    else:
        for i, m in enumerate(mods):
            if m['slug'] == nm['slug']:
                mods[i] = nm; break

added_exs = 0
for ex in new_exs:
    if ex['prompt'] not in existing_prompts:
        exs.append(ex)
        existing_prompts.add(ex['prompt'])
        added_exs += 1

added_fcs = 0
for fc in new_fcs:
    if fc['question'] not in existing_questions:
        fcs.append(fc)
        existing_questions.add(fc['question'])
        added_fcs += 1

save_seed('modules-expanded.json', mods)
save_seed('exercises-expanded.json', exs)
save_seed('flashcards-expanded.json', fcs)

print(f"Added modules   : {added_mods}  -> Total: {len(mods)}")
print(f"Added exercises : {added_exs}  -> Total: {len(exs)}")
print(f"Added flashcards: {added_fcs} -> Total: {len(fcs)}")
print("Done!")
