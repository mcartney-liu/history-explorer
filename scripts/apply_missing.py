"""Apply missing description translations from missing_descriptions.json."""
import json, os

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'examples')

with open(os.path.join(os.path.dirname(__file__), 'missing_descriptions.json'), encoding='utf-8') as f:
    ALL_MISSING = json.load(f)

for topic, translations in ALL_MISSING.items():
    fn = f'{topic}_example.json'
    fp = os.path.join(DATA_DIR, fn)
    if not os.path.exists(fp):
        print(f'NOT FOUND: {fn}')
        continue
    with open(fp, 'r', encoding='utf-8') as f:
        data = json.load(f)
    changed = False
    if 'entities' in data:
        for e in data['entities']:
            desc = e.get('description', '')
            if not desc: continue
            for en, zh in translations.items():
                if desc == en or desc.startswith(en):
                    e['description'] = zh + desc[len(en):]
                    changed = True
                    break
    if changed:
        with open(fp, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f'updated {fn}')
    else:
        print(f'no changes: {fn}')
print('done')
