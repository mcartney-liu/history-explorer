import json, os, re

data_dir = 'data/examples'
files = [f for f in os.listdir(data_dir) if f.endswith('.json') and not f.startswith('china')]
for fn in sorted(files):
    with open(os.path.join(data_dir, fn), encoding='utf-8') as f:
        data = json.load(f)
    ents = data.get('entities', [])
    for e in ents:
        desc = e.get('description', '')
        if desc and not re.search(r'[\u4e00-\u9fff]', desc):
            name = e.get('name', '')[:30]
            print(f'{fn}: {name} => {desc[:80]}')
