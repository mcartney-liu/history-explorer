import json, glob, os
base = r"c:\Users\haizhi\WorkBuddy\2026-07-13-10-54-28\data\examples"
files = sorted(glob.glob(os.path.join(base, "*.json")))
total = 0
zh = 0
missing_zh = []
for f in files:
    data = json.load(open(f, encoding="utf-8"))
    ents = data.get("entities", [])
    for e in ents:
        total += 1
        name = e.get("name", "")
        labels = e.get("labels") or {}
        if labels.get("zh"):
            zh += 1
        else:
            missing_zh.append((os.path.basename(f), name, e.get("type"), labels))
print("total entities:", total)
print("with labels.zh:", zh)
print("missing labels.zh:", len(missing_zh))
for f, n, t, lb in missing_zh:
    print(f"  {f} | {n} | {t} | labels={lb}")
