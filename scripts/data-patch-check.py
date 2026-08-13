"""数据补全自检脚本 — 打通中国与世界（A 层）验收工具

用途：
  1. 补数同事：改完 data/examples/*.json 后跑一遍，确认没有引错实体/类型
  2. 小梦验收：核对跨包关系是否真实可达、关联度指标是否达标

运行方式：
  <managed-python> scripts/data-patch-check.py

输出：
  - 每个文件 schema 校验（复用 backend/app/validation.py）
  - 跨包关系解析（source/target 是否都能找到实体）
  - 全图关联度指标（孤岛/叶子/跨包占比）
  - 已知重复实体提示（长安/造纸术）

验收标准（A 层目标）：
  - 0 个 ERROR 级 issue
  - 跨包关系占比 >= 25%（当前 17%）
  - 中国两包与其他包均有连接
  - 重复实体已处理（0 提示）
"""
import json
import os
import sys
from collections import Counter

# 复用后端校验逻辑
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))
from app.validation import (  # noqa: E402
    build_validation_report,
    RELATIONSHIP_TYPES,
)

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'examples')

# 已知重复实体对（同物异 id）：(包A, 实体A, 包B, 实体B, 中文名)
# 包前缀以 global_id 为准（china_civilization_v1 文件的前缀是 china_v1）
KNOWN_DUPES = [
    ("china_v1", "loc-changan", "silk_road", "loc-chang-an", "长安"),
    ("china_v1", "tech-zaopi", "silk_road", "tech-paper", "造纸术"),
]


def load_all() -> dict:
    """加载全部 example 包，返回 {文件名: 数据}"""
    datasets = {}
    for f in sorted(os.listdir(DATA_DIR)):
        if not f.endswith(".json") or f.endswith(".bak"):
            continue
        with open(os.path.join(DATA_DIR, f), encoding="utf-8") as fh:
            datasets[f] = json.load(fh)
    return datasets


def collect_entities(datasets: dict) -> dict:
    """{global_id: {pkg, id, name}} 供跨包解析

    注意：包前缀以实体 global_id 为准（如 china_civilization_v1 的前缀是
    china_v1），不能从文件名推断。
    """
    entities = {}
    for fname, data in datasets.items():
        for e in data.get("entities", []):
            gid = e.get("global_id")
            if not gid:
                continue
            pkg = gid.split(":", 1)[0]
            entities[gid] = {
                "pkg": pkg,
                "id": e.get("id"),
                "name": e.get("name"),
                "zh": (e.get("labels") or {}).get("zh", ""),
            }
    return entities


def resolve(entities: dict, pkg: str, ref: str):
    """把关系里的引用解析成 global_id。本包用 id，跨包用 包:实体id

    pkg 参数仅用于本包引用（不带冒号）时反查；跨包引用（带冒号）直接查表。
    若当前文件里 id 匹配不到，再退化为 pkg:id 尝试（兼容文件名推导偏差）。
    """
    if ":" in ref:
        return ref if ref in entities else None
    # 本包引用：找 global_id 以 pkg: 开头且 id 等于 ref 的实体
    for gid in entities:
        if entities[gid]["pkg"] == pkg and entities[gid]["id"] == ref:
            return gid
    # 兜底：pkg:id 组合（pkg 可能来自文件名推导，前缀可能不一致）
    gid = f"{pkg}:{ref}"
    return gid if gid in entities else None


def main() -> int:
    datasets = load_all()
    entities = collect_entities(datasets)
    print(f"加载 {len(datasets)} 个包 / {len(entities)} 个实体\n")

    # 1. schema 校验（复用后端）
    topic_datasets = []
    for fname, data in datasets.items():
        topic = fname.replace("_example.json", "")
        topic_datasets.append((topic, data))
    report = build_validation_report(topic_datasets)
    errors = 0
    warnings = 0
    for t in report.topics:
        for iss in t.issues:
            tag = iss.severity.upper()
            if iss.severity == "error":
                errors += 1
            else:
                warnings += 1
            print(f"  [{tag}] {t.topic}: {iss.code} — {iss.message}")
    print(f"Schema 校验: {errors} error / {warnings} warning\n")

    # 2. 跨包关系解析
    # 为每个文件构建「本地 id -> global_id」映射，避免猜前缀
    local_maps = {}
    for fname, data in datasets.items():
        lm = {}
        for e in data.get("entities", []):
            gid = e.get("global_id")
            if gid and e.get("id"):
                lm[e["id"]] = gid
        local_maps[fname] = lm

    def resolve_local(fname: str, ref: str):
        """本文件 id -> global_id；带冒号则直接查全表"""
        if ":" in ref:
            return ref if ref in entities else None
        return local_maps.get(fname, {}).get(ref)

    total_rels = 0
    cross_rels = 0
    unresolved = []
    cross_list = []
    for fname, data in datasets.items():
        for r in data.get("relationships", []):
            total_rels += 1
            s = resolve_local(fname, r["source"])
            t = resolve_local(fname, r["target"])
            if s is None or t is None:
                unresolved.append(f"{fname}: {r['source']} -> {r['target']}")
                continue
            if s.split(":")[0] != t.split(":")[0]:
                cross_rels += 1
                cross_list.append((s, t, r.get("type", "")))
    print(f"关系总数: {total_rels}")
    print(f"跨包关系: {cross_rels} ({cross_rels / total_rels * 100:.0f}%)" if total_rels else "无关系")
    if unresolved:
        print(f"\n⚠️ 未解析引用（实体不存在，需修复）: {len(unresolved)}")
        for u in unresolved[:20]:
            print(f"    {u}")
    else:
        print("✅ 所有关系引用均已解析")

    # 3. 关联度指标
    deg = Counter()
    for fname, data in datasets.items():
        for r in data.get("relationships", []):
            s = resolve_local(fname, r["source"])
            t = resolve_local(fname, r["target"])
            if s:
                deg[s] += 1
            if t:
                deg[t] += 1
    iso = [g for g in entities if deg[g] == 0]
    leaf = [g for g in entities if deg[g] == 1]
    print(f"\n关联度: 孤岛 {len(iso)} | 叶子 {len(leaf)} | 实体总数 {len(entities)}")

    # 4. 中国两包连接状态（前缀以 global_id 为准：china_v1 / tb_cn_v1）
    print("\n中国两包跨包连接:")
    for gid_prefix in ["china_v1", "tb_cn_v1"]:
        partners = set()
        for s, t, _ in cross_list:
            if s.startswith(gid_prefix + ":"):
                partners.add(t.split(":")[0])
            elif t.startswith(gid_prefix + ":"):
                partners.add(s.split(":")[0])
        if partners:
            print(f"  ✅ {gid_prefix}: 连接 {len(partners)} 个包 -> {sorted(partners)}")
        else:
            print(f"  ❌ {gid_prefix}: 仍无跨包连接！")

    # 5. 重复实体检查
    print("\n重复实体检查:")
    dup_found = False
    for pa, ea, pb, eb, zh in KNOWN_DUPES:
        if f"{pa}:{ea}" in entities and f"{pb}:{eb}" in entities:
            print(f"  ⚠️ 仍存在重复: {zh} ({pa}:{ea} vs {pb}:{eb})")
            dup_found = True
    if not dup_found:
        print("  ✅ 无已知重复实体")

    # 汇总
    print("\n=== 汇总 ===")
    data_ok = errors == 0 and not unresolved and not dup_found
    cross_pct = cross_rels / total_rels * 100 if total_rels else 0
    china_connected = False
    for gid_prefix in ["china_v1", "tb_cn_v1"]:
        connected = any(
            s.startswith(gid_prefix + ":") or t.startswith(gid_prefix + ":")
            for s, t, _ in cross_list
        )
        if connected:
            china_connected = True
    goal_ok = cross_pct >= 25 and china_connected
    print(f"跨包占比: {cross_rels}/{total_rels} = {cross_pct:.0f}% (A 层目标 >=25%)")
    print(f"数据合法性: {'✅ 通过' if data_ok else '❌ 有问题，见上方'}")
    if goal_ok:
        print("A 层目标: ✅ 达成（跨包 >=25% 且中国两包已连接）")
    else:
        print("A 层目标: ⏳ 未达成（跨包 <25% 或中国包未连接）— 待补数")
    return 0 if data_ok else 1


if __name__ == "__main__":
    sys.exit(main())
