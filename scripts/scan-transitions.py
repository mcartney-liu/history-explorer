# -*- coding: utf-8 -*-
"""
扫描 10 个探索包的「站间衔接」缺口（对齐 P-U18 口径）。

复刻前端逻辑：
- buildStations(pkg)：timeline_slices.entity 顺序 + relationship_paths.from/to 顺序，按 global_id 去重
- 每对相邻 station(prev, cur) 算一段衔接，用 describeTransition 的判定：
    A  有中文 claim（relationship_path.evidence 引用的 claim 含中文）→ 第一层，能讲"为什么"
    B  有边但 evidence 缺中文 claim → 第二层，仅关系短句
    C1 无直接边但知识图有真实边未引用 → 可补 relationship_path 引用
    C2 无直接边但有共同邻居 → 路径桥（间接关联，weak）
    D  完全断裂、无共同邻居 → 留白降级

输出：明细落盘 scripts/transitions-scan.txt，汇总打印到 stdout。
"""
import json, os, re

ROOT = "data"
EX = {
    "china_civilization_v1": "examples/china_civilization_v1_example.json",
    "silk_road": "examples/silk_road_example.json",
    "roman_empire": "examples/roman_empire_example.json",
    "ancient_india": "examples/ancient_india_example.json",
    "early_christianity": "examples/early_christianity_example.json",
    "egypt_technology_religion": "examples/egypt_technology_religion_example.json",
    "greek_philosophy": "examples/greek_philosophy_example.json",
    "hellenistic_world": "examples/hellenistic_world_example.json",
    "persian_empire": "examples/persian_empire_example.json",
    "textbook_cn_history_v1": "examples/textbook_cn_history_v1_example.json",
}

def load(p):
    with open(os.path.join(ROOT, p), encoding="utf-8") as f:
        return json.load(f)

datasets = {k: load(v) for k, v in EX.items()}

GLOBAL_INDEX = {}
ALL_RELS = []
for did, d in datasets.items():
    for e in d.get("entities", []):
        if e.get("global_id"):
            GLOBAL_INDEX[e["global_id"]] = {"dataset": did, "localId": e["id"]}
    for r in d.get("relationships", []):
        ALL_RELS.append((r.get("source"), r.get("target"), r.get("type"), did))

def global_to_local(gid):
    return GLOBAL_INDEX.get(gid, {}).get("localId")

def has_real_edge(from_gid, to_gid, rtype):
    from_local = global_to_local(from_gid)
    to_local = global_to_local(to_gid)
    if not from_local or not to_local:
        return False
    return any(
        typ == rtype and
        (src == from_local or src == from_gid) and
        (tgt == to_local or tgt == to_gid)
        for src, tgt, typ, _ in ALL_RELS
    )

def has_any_real_edge(from_gid, to_gid):
    from_local = global_to_local(from_gid)
    to_local = global_to_local(to_gid)
    if not from_local or not to_local:
        return False
    return any(
        (src == from_local or src == from_gid) and
        (tgt == to_local or tgt == to_gid)
        for src, tgt, _, _ in ALL_RELS
    )

def neighbors(gid):
    local = global_to_local(gid)
    out = set()
    if not local:
        return out
    for src, tgt, _, _ in ALL_RELS:
        if src == local or src == gid:
            out.add(tgt)
        elif tgt == local or tgt == gid:
            out.add(src)
    res = set()
    for x in out:
        if x in GLOBAL_INDEX:
            res.add(x)
        else:
            for g, meta in GLOBAL_INDEX.items():
                if meta["localId"] == x:
                    res.add(g); break
    return res

def name_of(gid):
    meta = GLOBAL_INDEX.get(gid)
    if not meta:
        return gid
    d = datasets[meta["dataset"]]
    e = next((x for x in d["entities"] if x["id"] == meta["localId"]), None)
    if not e:
        return gid
    labels = e.get("labels") or {}
    return labels.get("zh") or e.get("name") or gid

claims = {c["id"]: c for c in load("evidence_claims.json")}
CJK = re.compile(r'[一-鿿]')
def claim_has_zh(cid):
    c = claims.get(cid)
    if not c:
        return False
    return bool(CJK.search(c.get("claim", "") or ""))

def build_stations(pkg):
    seen = set(); out = []
    def push(g):
        if g and g not in seen:
            seen.add(g); out.append(g)
    for s in pkg.get("timeline_slices", []):
        push(s.get("entity"))
    for p in pkg.get("relationship_paths", []):
        push(p.get("from")); push(p.get("to"))
    return out

registry = load("exploration_packages.json")
packages = registry.get("packages", [])

total = {"A": 0, "B": 0, "C1": 0, "C2": 0, "D": 0}
lines = []
for pkg in packages:
    slug = pkg.get("slug")
    stations = build_stations(pkg)
    lines.append(f"\n### 包 {slug} | stations={len(stations)} 相邻段={len(stations)-1}")
    pc = {"A": 0, "B": 0, "C1": 0, "C2": 0, "D": 0}
    for i in range(1, len(stations)):
        prev, cur = stations[i-1], stations[i]
        edge = None
        for p in pkg.get("relationship_paths", []):
            if (p.get("from") == prev and p.get("to") == cur) or (p.get("from") == cur and p.get("to") == prev):
                edge = p; break
        if edge:
            evs = edge.get("evidence") or []
            zh = [e for e in evs if claim_has_zh(e)]
            if zh:
                cat = "A"
                detail = f"[{name_of(prev)}]→[{name_of(cur)}] type={edge.get('type')} 中文claim={zh}"
            else:
                cat = "B"
                detail = f"[{name_of(prev)}]→[{name_of(cur)}] type={edge.get('type')} evidence={evs} (缺中文claim)"
        else:
            if has_any_real_edge(prev, cur):
                cat = "C1"
                detail = f"[{name_of(prev)}]→[{name_of(cur)}] 知识图有边未引用"
            else:
                common = neighbors(prev) & neighbors(cur)
                if common:
                    cat = "C2"
                    detail = f"[{name_of(prev)}]→[{name_of(cur)}] 路径桥通过 {[name_of(g) for g in common]}"
                else:
                    cat = "D"
                    detail = f"[{name_of(prev)}]→[{name_of(cur)}] 完全断裂留白"
        lines.append(f"  {cat} {detail}")
        pc[cat] += 1
    lines.append(f"  小计 A={pc['A']} B={pc['B']} C1={pc['C1']} C2={pc['C2']} D={pc['D']}")
    for k in total:
        total[k] += pc[k]

with open(os.path.join(ROOT, "..", "scripts", "transitions-scan.txt"), "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print("==== 站间衔接缺口汇总（对齐 P-U18 口径）====")
print(f"A  有中文claim(能讲为什么)      : {total['A']}")
print(f"B  有边无中文claim(仅关系短句)  : {total['B']}")
print(f"C1 知识图有边未引用(可补关系边) : {total['C1']}")
print(f"C2 路径桥可用(间接关联 weak)    : {total['C2']}")
print(f"D  完全断裂留白                  : {total['D']}")
print(f"---")
print(f"断裂合计(C1+C2+D)               : {total['C1']+total['C2']+total['D']}")
print(f"总衔接段                        : {sum(total.values())}")
print(f"\n可优先处理(不编造、图grounded):")
print(f"  - B 段({total['B']}个): 边已存在，只需补中文claim")
print(f"  - C1 段({total['C1']}个): 知识图有边，补relationship_path引用即可成边")
print(f"明细已落盘 scripts/transitions-scan.txt")
