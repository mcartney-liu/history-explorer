# -*- coding: utf-8 -*-
"""
P-U18 数据策展：为 18 段「有边无中文 claim」(B 段) 补写中文过渡句。

策略（图 grounded、零编造）：
- 每条 B 段的关系边已真实存在于知识图（validatePackage 已校验）。
- 仅补充「为什么」的中文 claim 叙述 + 有效来源引用，不新增/修改任何关系边。
- 两条处理路径：
  (a) 边已有英文 evidence（语义匹配）→ 就地把该 claim 翻译成中文（evidence 数组不变，测试零影响）。
  (b) 边 evidence 为空，或现有英文 claim 语义不匹配（如 ec-009 讲学院位置而非师承）→
      新增中文 claim（前缀 ec-zh- 避免 id 冲突），并追加到该边 evidence。
- C1 段（补边引用）、D/C2 段（留白/路径桥）本轮不动。

DRY_RUN=True 时只打印计划，不写文件。
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
for did, d in datasets.items():
    for e in d.get("entities", []):
        if e.get("global_id"):
            GLOBAL_INDEX[e["global_id"]] = {"dataset": did, "localId": e["id"]}

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
    return bool(c and CJK.search(c.get("claim", "") or ""))

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

# (a) 已有英文 evidence 且语义匹配 → 就地翻译为中文（evidence 数组不变）
INPLACE_TRANSLATE = {
    "ec-023": "佛教自公元前2世纪起沿丝绸之路从印度传入中亚与汉地，由僧人与商旅携行。",
    "ec-rom-032": "罗马共和国（前509–前27年）早于始于公元前27年的帝国时代，共和制随之落幕。",
    "ec-rom-024": "罗马共和国终结、帝国建立定于公元前27年——屋大维获“奥古斯都”尊号，罗马由共和转入帝制。",
    "ec-rom-036": "君士坦丁与李锡尼于公元313年颁布《米兰敕令》，承认基督教在帝国境内的合法地位。",
}

# (b) evidence 为空，或现有英文 claim 语义不匹配 → 新增中文 claim 并追加
# key = (slug, 上一站显示名, 本站显示名, 边type)
CLAIM_MAP = {
    ("china-civilization-v1", "宋朝", "元朝", "before"): {
        "claim": "宋朝（960–1279）之后，蒙古建立的元朝（1271–1368）结束了南北对峙，成为首个由游牧民族建立的大一统王朝。",
        "source_ids": ["src-cn-yuanshi", "src-cn-qianmu"], "confidence": "high"},
    ("china-civilization-v1", "元朝", "明朝", "before"): {
        "claim": "元朝末年的民变中，朱元璋建立明朝（1368–1644），重建汉族主导的中央集权王朝。",
        "source_ids": ["src-cn-mingshi"], "confidence": "high"},
    ("china-civilization-v1", "明朝", "清朝", "before"): {
        "claim": "明朝（1368–1644）亡于内外交困，满洲入关建立清朝（1636–1912），再度由北方民族完成对中原的统一。",
        "source_ids": ["src-cn-qingshigao"], "confidence": "high"},

    ("silk-road-exploration", "张骞", "丝绸之路开辟", "participated_in"): {
        "claim": "西汉张骞于公元前2世纪两度出使西域，打通中原通往中亚、西亚的道路，为丝绸之路的开辟奠定基石。",
        "source_ids": ["src-cn-shiji", "src-hansen-silk-road"], "confidence": "high"},
    ("silk-road-exploration", "罗马文明", "丝织", "spread"): {
        "claim": "中国的丝织品沿丝绸之路西传，成为罗马贵族追逐的奢侈品，罗马人因而称中国为“赛里斯”（丝国）。",
        "source_ids": ["src-hansen-silk-road", "src-richthofen-1877"], "confidence": "medium"},

    ("roman-empire-exploration", "罗马帝国建立", "西罗马帝国灭亡", "before"): {
        "claim": "西罗马帝国于公元476年终结，标志着古代世界与西欧中世纪的转折。",
        "source_ids": ["src-cambridge-roman-empire", "src-gibbon-decline"], "confidence": "high"},

    ("india-classical-civilization", "旃陀罗笈多·孔雀", "孔雀王朝", "ruled"): {
        "claim": "旃陀罗笈多·孔雀约公元前322年创立孔雀王朝，统一恒河流域，奠定印度首个大一统帝国。",
        "source_ids": ["src-thapar-early-india", "src-arthashastra"], "confidence": "medium"},
    ("india-classical-civilization", "孔雀王朝", "阿育王", "ruled"): {
        "claim": "阿育王（约前268–前232年在位）继承旃陀罗笈多缔造的孔雀王朝，将帝国版图推向全印。",
        "source_ids": ["src-ashoka-edicts", "src-thapar-early-india"], "confidence": "high"},
    ("india-classical-civilization", "佛教", "释迦牟尼", "influenced"): {
        "claim": "佛教由释迦牟尼（乔达摩·悉达多）于公元前6至前5世纪创立，其觉悟与教法构成佛教的根本源头。",
        "source_ids": ["src-tipitaka"], "confidence": "high"},
    ("india-classical-civilization", "释迦牟尼", "正法（达摩）", "influenced"): {
        "claim": "释迦牟尼宣说“正法”（达摩），即关于苦、集、灭、道的根本教义，是佛弟子修行的依归。",
        "source_ids": ["src-tipitaka"], "confidence": "high"},

    ("textbook-cn-history-v1", "夏朝", "商朝", "before"): {
        "claim": "商朝（约前1600–前1046）取代夏朝而立，以甲骨文与青铜礼器著称，是迄今信史可考的早期王朝。",
        "source_ids": ["src-cn-shangshu", "src-cn-yinxu"], "confidence": "medium"},
    ("textbook-cn-history-v1", "商朝", "西周", "before"): {
        "claim": "周人于公元前1046年伐纣灭商，建立西周，推行分封制与礼乐制度。",
        "source_ids": ["src-cn-zhushu", "src-cn-zuozhuan"], "confidence": "high"},
    ("textbook-cn-history-v1", "孔子", "儒家", "influenced"): {
        "claim": "孔子（前551–前479）以仁与礼为核心开创学说，其思想经后世阐发成为儒家。",
        "source_ids": ["src-cn-lunyu"], "confidence": "high"},

    # ec-009 讲的是柏拉图学院地理位置，与「亚里士多德受柏拉图影响」关系不符 → 新增中文 claim 追加
    ("greek-philosophy-exploration", "亚里士多德", "柏拉图", "influenced"): {
        "claim": "亚里士多德十七岁入柏拉图学园，受业近二十年，早期思想深受其师影响，而后自成体系。",
        "source_ids": ["src-aristotle-corpus", "src-diogenes-laertius"], "confidence": "high"},
}

DRY_RUN = False

registry = load("exploration_packages.json")
packages = registry.get("packages", [])

# 收集计划
plan_inplace = []   # (claim_id, zh_text)
plan_append = []    # (slug, prev, cur, type, spec)
missed = []
for pkg in packages:
    slug = pkg.get("slug")
    stations = build_stations(pkg)
    for i in range(1, len(stations)):
        prev, cur = stations[i-1], stations[i]
        edge = None
        for p in pkg.get("relationship_paths", []):
            if (p.get("from") == prev and p.get("to") == cur) or (p.get("from") == cur and p.get("to") == prev):
                edge = p; break
        if not edge:
            continue
        evs = edge.get("evidence") or []
        if any(claim_has_zh(e) for e in evs):
            continue
        key = (slug, name_of(prev), name_of(cur), edge.get("type"))
        if key in CLAIM_MAP:
            plan_append.append((slug, prev, cur, edge.get("type"), CLAIM_MAP[key]))
        else:
            # 可能落在 INPLACE（边已有英文 claim 且语义匹配）
            hit = False
            for e in evs:
                if e in INPLACE_TRANSLATE:
                    plan_inplace.append((e, INPLACE_TRANSLATE[e]))
                    hit = True
                    break
            if not hit:
                missed.append(key)

print(f"就地翻译(英文→中文): {len(plan_inplace)} 条")
print(f"新增并追加中文 claim: {len(plan_append)} 条")
print(f"未命中: {len(missed)} -> {missed}")
for cid, t in plan_inplace:
    print(f"  [inplace] {cid}: {t}")
if DRY_RUN or missed:
    print("\n[DRY_RUN] 未写文件。")
    raise SystemExit(0)

# --- 写回 ---
ec_list = list(load("evidence_claims.json"))
ec_by_id = {c["id"]: c for c in ec_list}
existing_ids = {c["id"] for c in ec_list}
n = 1
def new_id():
    global n
    while f"ec-zh-{n:03d}" in existing_ids:
        n += 1
    existing_ids.add(f"ec-zh-{n:03d}")
    return f"ec-zh-{n:03d}"

# (a) 就地翻译
for cid, zh in plan_inplace:
    ec_by_id[cid]["claim"] = zh
    if not ec_by_id[cid].get("confidence"):
        ec_by_id[cid]["confidence"] = "high"

# (b) 新增并追加
for slug, prev, cur, typ, spec in plan_append:
    cid = new_id()
    ec_list.append({
        "id": cid,
        "subject_type": "relationship",
        "subject_id": f"{prev}->{cur}",
        "claim": spec["claim"],
        "confidence": spec["confidence"],
        "source_ids": spec["source_ids"],
    })
    for pkg in packages:
        if pkg.get("slug") != slug:
            continue
        for p in pkg.get("relationship_paths", []):
            if (p.get("from") == prev and p.get("to") == cur) or (p.get("from") == cur and p.get("to") == prev):
                if typ and p.get("type") != typ:
                    continue
                ev = p.get("evidence") or []
                if cid not in ev:
                    ev.append(cid)
                    p["evidence"] = ev
                break

with open(os.path.join(ROOT, "evidence_claims.json"), "w", encoding="utf-8") as f:
    json.dump(ec_list, f, ensure_ascii=False, indent=4)
    f.write("\n")
with open(os.path.join(ROOT, "exploration_packages.json"), "w", encoding="utf-8") as f:
    json.dump(registry, f, ensure_ascii=False, indent=4)
    f.write("\n")
print(f"\n[OK] 就地翻译 {len(plan_inplace)} 条 + 新增追加 {len(plan_append)} 条中文 claim。")
