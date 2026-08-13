#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""分析 10 个 example 包：实体清单 / 叶子(度=1) / 枢纽(度Top) / 关系类型分布。
输出到 stdout，供设计 B 层补结构洞使用。
"""
import json, os, glob
from collections import defaultdict, Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EX = os.path.join(ROOT, "data", "examples")

# 文件 -> 包 global_id 前缀
PREFIX = {
    "china_civilization_v1_example.json": "china_v1",
    "textbook_cn_history_v1_example.json": "tb_cn_v1",
    "ancient_india_example.json": "ancient_india",
    "greek_philosophy_example.json": "greek_philosophy",
    "hellenistic_world_example.json": "hellenistic_world",
    "roman_empire_example.json": "roman_empire",
    "persian_empire_example.json": "persian_empire",
    "egypt_technology_religion_example.json": "egypt_technology_religion",
    "early_christianity_example.json": "early_christianity",
    "silk_road_example.json": "silk_road",
}

def gid(prefix, local):
    return f"{prefix}:{local}"

data = {}        # prefix -> {entities, rels}
for fn, prefix in PREFIX.items():
    p = os.path.join(EX, fn)
    if not os.path.exists(p):
        continue
    d = json.load(open(p, encoding="utf-8"))
    ents = {e["id"]: e for e in d.get("entities", [])}
    rels = d.get("relationships", [])
    data[prefix] = {"file": fn, "ents": ents, "rels": rels}

# 计算度（每条关系两端各 +1；跨包 target 用 包:短id）
def local_of(ref, default_prefix):
    if ":" in ref:
        return ref.split(":", 1)[1], ref.split(":", 1)[0]
    return ref, default_prefix

degree = defaultdict(int)
edges_of = defaultdict(list)   # local(global) -> list of (other_local, type)
for prefix, blk in data.items():
    for r in blk["rels"]:
        s, sp = local_of(r["source"], prefix)
        t, tp = local_of(r["target"], prefix)
        sg, tg = gid(sp, s), gid(tp, t)
        degree[sg] += 1
        degree[tg] += 1
        edges_of[sg].append((tg, r["type"]))
        edges_of[tg].append((sg, r["type"]))

# 跨包关系计数
cross = 0
for prefix, blk in data.items():
    for r in blk["rels"]:
        if ":" in r["source"] or ":" in r["target"]:
            cross += 1

print(f"# 总关系数(去重按文件内): {sum(len(b['rels']) for b in data.values())}")
print(f"# 跨包关系数: {cross}")
print()

for prefix, blk in data.items():
    ents = blk["ents"]
    print("="*70)
    print(f"# 包 {prefix}  ({blk['file']})  实体数={len(ents)} 关系数={len(blk['rels'])}")
    # 叶子
    leaves = []
    for eid, e in ents.items():
        g = gid(prefix, eid)
        if degree[g] == 1:
            leaves.append((eid, e))
    print(f"# 叶子(度=1)数: {len(leaves)}")
    # 按类型汇总实体
    bytype = defaultdict(list)
    for eid, e in ents.items():
        bytype[e.get("type", "?")].append(eid)
    print("# 实体按类型:")
    for t, ids in sorted(bytype.items(), key=lambda x: -len(x[1])):
        names = []
        for i in ids[:40]:
            zh = ents[i].get("labels", {}).get("zh") or ents[i].get("name", i)
            names.append(f"{i}({zh})")
        print(f"  {t} [{len(ids)}]: " + ", ".join(names))
    # 叶子明细 + 现有边
    print("# 叶子明细(现有唯一边):")
    for eid, e in leaves:
        g = gid(prefix, eid)
        zh = e.get("labels", {}).get("zh") or e.get("name", eid)
        edge = edges_of[g][0] if edges_of[g] else ("?", "?")
        other = edge[0].split(":")[-1]
        print(f"  - {eid} [{e.get('type')}] {zh}  <-现有边-> {edge[1]} -> {other}")
    # 枢纽 Top8
    hubs = sorted(ents.keys(), key=lambda i: -degree[gid(prefix, i)])[:10]
    print("# 枢纽 Top(度):")
    for i in hubs:
        print(f"  {i} [{ents[i].get('type')}] 度={degree[gid(prefix,i)]}")
