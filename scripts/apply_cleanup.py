"""数据收尾脚本（去重 + 关系 valid_time 派生回填）

两步都在「不编造事实」前提下完成：
  1. 去重：长安(china_v1:loc-changan vs silk_road:loc-chang-an)、造纸术
     (china_v1:tech-zaopi vs silk_road:tech-paper) 两对同物异 id。
     以 china_v1 侧为规范实体，把 silk_road 中的引用全部重指到 china_v1
     规范 id，删除 silk_road 中两个重复实体；合并后产生的自环关系直接删除。
  2. valid_time 派生：对缺 valid_time 的关系，从两端实体的
     start_date/end_date 推导时间锚定（重叠区间 [max起点, min终点]；
     仅一端有日期用该端；两端皆无则保留 null）。格式按各文件惯例：
     ancient_india 用 dict，其余用 string（如 "618–907 CE"）。

默认 dry-run（只打印计划），--apply 才落盘。
"""
import json
import os
import re
import sys

DATA = "data/examples"
TEXTBOOK = "textbook_cn_history_v1_example.json"

# 重复实体：(被合并方所在文件, 被合并方本地id, 规范 global_id)
DEDUP_MAP = {
    "loc-chang-an": "china_v1:loc-changan",
    "tech-paper": "china_v1:tech-zaopi",
}
DEDUP_FILE = "silk_road_example.json"
DEDUP_ENTITY_IDS = {"loc-chang-an", "tech-paper"}


def load_all():
    datasets = {}
    files = sorted(f for f in os.listdir(DATA)
                   if f.endswith(".json") and not f.endswith(".bak"))
    for f in files:
        datasets[f] = json.load(open(os.path.join(DATA, f), encoding="utf-8"))
    return datasets, files


def build_entities(datasets):
    ents = {}
    for f, data in datasets.items():
        for e in data.get("entities", []):
            gid = e.get("global_id")
            if gid:
                ents[gid] = e
    return ents


def fmt_year(y):
    if y is None:
        return None
    return f"{-y} BCE" if y < 0 else f"{y} CE"


def fmt_range(lo, hi):
    if lo is None or hi is None:
        return None
    return fmt_year(lo) if lo == hi else f"{fmt_year(lo)}–{fmt_year(hi)}"


def span_of(ents, gid):
    e = ents.get(gid)
    if not e:
        return (None, None)
    s = e.get("start_date")
    d = e.get("end_date")
    sv = s["value"] if (s and isinstance(s.get("value"), int)) else None
    ev = d["value"] if (d and isinstance(d.get("value"), int)) else None
    return (sv, ev)


def resolve(fname, ref, ents, datasets):
    if ":" in ref:
        return ref if ref in ents else None
    for e in datasets[fname].get("entities", []):
        if e.get("id") == ref and e.get("global_id"):
            return e["global_id"]
    return None


def derive_valid_time(fname, r, ents, datasets):
    sgid = resolve(fname, r["source"], ents, datasets)
    tgid = resolve(fname, r["target"], ents, datasets)
    a = span_of(ents, sgid)
    b = span_of(ents, tgid)
    starts = [v for v in (a[0], b[0]) if v is not None]
    ends = [v for v in (a[1], b[1]) if v is not None]
    if not starts:
        return None
    a_full = a[0] is not None and a[1] is not None
    b_full = b[0] is not None and b[1] is not None
    if a_full and b_full:
        lo, hi = max(a[0], b[0]), min(a[1], b[1])
        if lo > hi:
            lo = hi
        return _pack(fname, lo, fmt_range(lo, hi))
    if a_full:
        return _pack(fname, a[0], fmt_range(a[0], a[1]))
    if b_full:
        return _pack(fname, b[0], fmt_range(b[0], b[1]))
    if a[0] is not None:
        return _pack(fname, a[0], f"{fmt_year(a[0])} onward")
    if b[0] is not None:
        return _pack(fname, b[0], f"{fmt_year(b[0])} onward")
    return None


def _pack(fname, val, label):
    if fname.startswith("ancient_india"):
        return {"value": val, "precision": "year",
                "certainty": "approximate", "label": label}
    return label


def main():
    apply = "--apply" in sys.argv
    datasets, files = load_all()
    ents = build_entities(datasets)

    # ---- 1. 去重（仅影响 silk_road 文件） ----
    dup_drop = 0
    if DEDUP_FILE in datasets:
        data = datasets[DEDUP_FILE]
        new_rels = []
        for r in data.get("relationships", []):
            src = DEDUP_MAP.get(r["source"], r["source"])
            tgt = DEDUP_MAP.get(r["target"], r["target"])
            if src == tgt:          # 合并后自环 → 删除
                dup_drop += 1
                continue
            r["source"], r["target"] = src, tgt
            new_rels.append(r)
        data["relationships"] = new_rels
        data["entities"] = [e for e in data.get("entities", [])
                            if e.get("id") not in DEDUP_ENTITY_IDS]
        datasets[DEDUP_FILE] = data

    # ---- 2. valid_time 派生 ----
    filled = 0
    textbook_computed = {}  # (source,target,type) -> value  (textbook 用文本注入)
    for f in files:
        for r in datasets[f].get("relationships", []):
            cur = r.get("valid_time")
            if cur not in (None, ""):
                continue
            val = derive_valid_time(f, r, ents, datasets)
            if val is None:
                continue
            if f == TEXTBOOK:
                textbook_computed[(r["source"], r["target"], r["type"])] = val
            else:
                r["valid_time"] = val
            filled += 1

    print(f"[dry-run] 去重删除自环关系: {dup_drop}")
    print(f"[dry-run] 计划回填 valid_time: {filled} 条")
    print(f"[dry-run]  其中 textbook 文本注入: {len(textbook_computed)} 条")

    if not apply:
        print("\n（dry-run 模式，未落盘。加 --apply 执行）")
        return

    # ---- 落盘 ----
    for f in files:
        if f == TEXTBOOK:
            _write_textbook(os.path.join(DATA, f), textbook_computed)
        else:
            with open(os.path.join(DATA, f), "w", encoding="utf-8") as fh:
                json.dump(datasets[f], fh, ensure_ascii=False, indent=2)
                fh.write("\n")
    print(f"\n✅ 已落盘：去重删 {dup_drop} 自环、回填 {filled} 条 valid_time")


def _write_textbook(path, computed):
    """textbook 混用单行/多行关系对象，故跨行累积当前关系的
    (source,target,type)，遇到 "valid_time": null 时回填。"""
    lines = open(path, encoding="utf-8").read().split("\n")
    cur = {}
    out = []
    for line in lines:
        sm = re.search(r'"source":\s*"([^"]*)"', line)
        if sm:
            cur = {"source": sm.group(1)}
        tm = re.search(r'"target":\s*"([^"]*)"', line)
        if tm:
            cur["target"] = tm.group(1)
        ym = re.search(r'"type":\s*"([^"]*)"', line)
        if ym:
            cur["type"] = ym.group(1)
        if '"valid_time": null' in line and {"source", "target", "type"} <= set(cur):
            key = (cur["source"], cur["target"], cur["type"])
            val = computed.get(key)
            if val is not None:
                line = line.replace(
                    '"valid_time": null',
                    '"valid_time": ' + json.dumps(val, ensure_ascii=False))
        out.append(line)
    open(path, "w", encoding="utf-8").write("\n".join(out))


if __name__ == "__main__":
    main()
