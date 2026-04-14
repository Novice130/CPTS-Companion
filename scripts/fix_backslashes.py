#!/usr/bin/env python3
# fix_backslashes_safe.py
# Reads seed-modules-25-37.py and doubles any backslash NOT followed by a
# valid Python escape character, inside triple-quoted string regions.
import sys

with open('scripts/seed-modules-25-37.py', encoding='utf-8') as f:
    raw = f.read()

# Valid Python single-char escape sequences — leave these alone
VALID_ESCAPES = set('ntrfvab\'"\\01234567xuUN')
BS = chr(92)   # backslash
TQ = '"""'
parts = raw.split(TQ)

def fix(text):
    out = []
    i = 0
    while i < len(text):
        c = text[i]
        if c == BS:
            if i+1 < len(text):
                nxt = text[i+1]
                if nxt == BS:
                    # Already a doubled backslash — emit both, skip both
                    out.append(BS + BS)
                    i += 2
                    continue
                elif nxt not in VALID_ESCAPES:
                    # Invalid escape — double the backslash
                    out.append(BS + BS)
                    i += 1
                    continue
        out.append(c)
        i += 1
    return ''.join(out)

fixed = []
for idx, part in enumerate(parts):
    if idx % 2 == 1:
        fixed.append(fix(part))
    else:
        fixed.append(part)

result = TQ.join(fixed)

with open('scripts/seed-modules-25-37.py', 'w', encoding='utf-8') as f:
    f.write(result)

print('Done. Lines:', result.count(chr(10)))
