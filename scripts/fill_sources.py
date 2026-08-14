#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
为存量「无 evidence」的关系批量补来源。
- 复用 data/sources.json 里真实存在的 source_id（零悬空）
- 按关系两端实体归属的文明(由 global_id 真实前缀判定) -> 取该文明权威来源池，关系类型微调
- 每条写一条 evidence_claims.json 条目，回填关系的 evidence/citation
- 写回策略：textbook 包用文本级注入(只改空 evidence/citation 字段，零格式变动)；
           其余文件 json 结构修改 + indent=2 dump（保真）。
- 默认 dry-run（只打印候选）；加 --apply 才写盘。
"""
import json, glob, os, re, sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EX_DIR = os.path.join(ROOT, "data", "examples")
EV_PATH = os.path.join(ROOT, "data", "evidence_claims.json")
SRC_PATH = os.path.join(ROOT, "data", "sources.json")
TB = "textbook_cn_history_v1_example.json"

CIV_POOLS = {
    "china": ["src-cn-cambridge-ancient", "src-cn-qianmu", "src-cn-shiji", "src-cn-hanshu",
        "src-cn-houhanshu", "src-cn-zizhitongjian", "src-cn-jiu-tangshu", "src-cn-songshi",
        "src-cn-yuanshi", "src-cn-mingshi", "src-cn-qingshigao", "src-cn-yingya-shenglan",
        "src-cn-xuanzang", "src-cn-museum", "src-cn-textbook", "src-cn-cambridge",
        "src-cn-zuozhuan", "src-cn-lunyu", "src-cn-daodejing", "src-cn-tsinghua-slips",
        "src-cn-jiaguwen", "src-cn-bronze-inscriptions", "src-cn-erlitou", "src-cn-yinxu",
        "src-cn-zhoukoudian", "src-cn-hemudu", "src-cn-banpo", "src-cn-guodian",
        "src-cn-shuihudi", "src-cn-xsz-project", "src-cn-subingqi", "src-cn-shangshu",
        "src-cn-zhushu", "src-cn-zhanguoce"],
    "india": ["src-thapar-early-india", "src-ashoka-edicts", "src-arthashastra",
              "src-tipitaka", "src-aryabhatiya"],
    "greek": ["src-cambridge-hellenistic", "src-plato-dialogues", "src-aristotle-corpus",
              "src-diogenes-laertius", "src-archimedes-works", "src-lucretius",
              "src-arrian-anabasis", "src-plutarch-lives", "src-diodorus", "src-polybius"],
    "rome": ["src-cah", "src-rosenberg-1999", "src-oxford-roman", "src-jstor-roman",
             "src-britannica-rome", "src-livy", "src-tacitus-ann", "src-suetonius",
             "src-caesar-commentarii", "src-edict-milan", "src-cil", "src-theodosian-code",
             "src-eusebius-eccl", "src-res-gestae", "src-cambridge-roman-empire",
             "src-gibbon-decline", "src-tacitus", "src-wiki-rome", "src-wiki-augustus",
             "src-wiki-caesar", "src-wiki-constantine", "src-museum-british", "src-livius",
             "src-worldhistory-encyc", "src-iranica-rome"],
    "persia": ["src-cambridge-iran", "src-behistun", "src-cyrus-cylinder",
               "src-persepolis-tablets", "src-avesta", "src-xenophon-cyropaedia"],
    "egypt": ["src-oxford-egypt", "src-manetho", "src-pyramid-texts", "src-book-of-dead",
              "src-rosetta", "src-merer-papyri", "src-amarna-letters", "src-cuneiform-tablets"],
    "christianity": ["src-oxford-christianity", "src-early-church", "src-nt-gospels",
                     "src-nt-greek", "src-eusebius-he", "src-josephus-antiquities",
                     "src-wiki-constantine", "src-wiki-byzantine"],
    "byzantium": ["src-oxford-byzantium", "src-cambridge-byzantine", "src-wiki-byzantine",
                  "src-wiki-const"],
    "silk": ["src-hansen-silk-road", "src-richthofen-1877", "src-silk-road-archives"],
    "general": ["src-herodotus-histories", "src-thucydides-peloponnesian",
                "src-strabo-geography", "src-pliny-nh", "src-worldhistory-encyc",
                "src-livius", "src-wiki-rome"],
}

PREFIX_TO_CIV = {
    "china_v1": "china", "tb_cn_v1": "china", "ancient_india": "india",
    "greek_philosophy": "greek", "hellenistic_world": "greek",
    "roman_empire": "rome", "persian_empire": "persia",
    "egypt_technology_religion": "egypt", "early_christianity": "christianity",
    "silk_road": "silk",
}

REL_PREF = {
    "invented": {"china": ["src-cn-shiji", "src-cn-hanshu"], "rome": ["src-pliny-nh"],
                 "greek": ["src-archimedes-works"], "egypt": ["src-oxford-egypt"],
                 "india": ["src-aryabhatiya"], "general": ["src-strabo-geography"]},
    "located_at": {"china": ["src-cn-museum"], "rome": ["src-strabo-geography"],
                   "greek": ["src-strabo-geography"], "egypt": ["src-oxford-egypt"],
                   "persia": ["src-behistun"], "silk": ["src-richthofen-1877"],
                   "india": ["src-thapar-early-india"], "general": ["src-strabo-geography"]},
    "ruled": {"china": ["src-cn-zizhitongjian"], "rome": ["src-cah"], "greek": ["src-polybius"],
              "persia": ["src-cambridge-iran"], "egypt": ["src-manetho"],
              "india": ["src-ashoka-edicts"], "general": ["src-herodotus-histories"]},
    "before": {"china": ["src-cn-xsz-project"], "rome": ["src-res-gestae"],
               "greek": ["src-cambridge-hellenistic"], "general": ["src-cambridge-hellenistic"]},
    "contemporary_with": {"general": ["src-cambridge-hellenistic"]},
    "traded_with": {"silk": ["src-hansen-silk-road"], "china": ["src-hansen-silk-road"],
                    "rome": ["src-iranica-rome"], "general": ["src-silk-road-archives"]},
    "spread": {"china": ["src-hansen-silk-road"], "india": ["src-tipitaka"],
               "greek": ["src-cambridge-hellenistic"], "christianity": ["src-oxford-christianity"],
               "general": ["src-worldhistory-encyc"]},
    "influenced": {"greek": ["src-plato-dialogues"], "rome": ["src-cah"],
                   "christianity": ["src-oxford-christianity"], "india": ["src-arthashastra"],
                   "china": ["src-cn-qianmu"], "general": ["src-cambridge-hellenistic"]},
    "practiced": {"egypt": ["src-book-of-dead"], "greek": ["src-plato-dialogues"],
                  "christianity": ["src-nt-gospels"], "india": ["src-tipitaka"],
                  "china": ["src-cn-lunyu"], "general": ["src-worldhistory-encyc"]},
    "participated_in": {"rome": ["src-caesar-commentarii"], "greek": ["src-thucydides-peloponnesian"],
                        "china": ["src-cn-zizhitongjian"], "general": ["src-herodotus-histories"]},
    "caused": {"general": ["src-cambridge-hellenistic"], "rome": ["src-gibbon-decline"],
               "china": ["src-cn-qianmu"]},
    "part_of": {"general": ["src-cambridge-hellenistic"], "rome": ["src-cah"],
                "china": ["src-cn-cambridge-ancient"]},
    "spoke": {"greek": ["src-diogenes-laertius"], "rome": ["src-cil"],
              "christianity": ["src-nt-greek"], "general": ["src-worldhistory-encyc"]},
    "inherited": {"china": ["src-cn-qianmu"], "rome": ["src-cah"], "general": ["src-cambridge-hellenistic"]},
    "related_to": {"general": ["src-worldhistory-encyc"], "china": ["src-cn-qianmu"],
                   "rome": ["src-cah"]},
    "founded": {"rome": ["src-rosenberg-1999"], "greek": ["src-arrian-anabasis"],
                "persia": ["src-xenophon-cyropaedia"], "india": ["src-ashoka-edicts"],
                "general": ["src-herodotus-histories"]},
    "born_in": {"general": ["src-cambridge-hellenistic"], "china": ["src-cn-shiji"]},
    "died_in": {"general": ["src-cambridge-hellenistic"]},
    "wrote": {"greek": ["src-plato-dialogues"], "rome": ["src-suetonius"],
              "china": ["src-cn-lunyu"], "general": ["src-worldhistory-encyc"]},
    "taught": {"greek": ["src-plato-dialogues"], "general": ["src-worldhistory-encyc"]},
    "commanded": {"rome": ["src-caesar-commentarii"], "general": ["src-herodotus-histories"]},
    "defeated": {"rome": ["src-caesar-commentarii"], "greek": ["src-polybius"],
                 "persia": ["src-xenophon-cyropaedia"], "general": ["src-herodotus-histories"]},
    "allied_with": {"general": ["src-herodotus-histories"], "rome": ["src-cah"]},
    "succeeded": {"rome": ["src-cah"], "persia": ["src-cambridge-iran"],
                  "general": ["src-cambridge-hellenistic"]},
    "preceded": {"general": ["src-cambridge-hellenistic"]},
    "capital_of": {"rome": ["src-cah"], "persia": ["src-cambridge-iran"],
                   "egypt": ["src-manetho"], "general": ["src-worldhistory-encyc"]},
    "center_of": {"general": ["src-worldhistory-encyc"]},
    "produced": {"general": ["src-worldhistory-encyc"]},
    "exported": {"silk": ["src-hansen-silk-road"], "china": ["src-hansen-silk-road"],
                 "general": ["src-silk-road-archives"]},
    "imported": {"silk": ["src-hansen-silk-road"], "general": ["src-silk-road-archives"]},
    "conquered": {"rome": ["src-cah"], "persia": ["src-cambridge-iran"],
                  "greek": ["src-arrian-anabasis"], "general": ["src-herodotus-histories"]},
    "unified": {"china": ["src-cn-shiji"], "general": ["src-cambridge-hellenistic"]},
    "constructed": {"rome": ["src-res-gestae"], "egypt": ["src-oxford-egypt"],
                     "china": ["src-cn-hanshu"], "general": ["src-worldhistory-encyc"]},
    "discovered": {"general": ["src-worldhistory-encyc"]},
    "established": {"rome": ["src-rosenberg-1999"], "general": ["src-cambridge-hellenistic"]},
}

REL_VERB = {
    "influenced": "influenced", "located_at": "was located at", "spread": "spread to",
    "participated_in": "participated in", "before": "predates", "invented": "is credited with inventing",
    "practiced": "practiced", "ruled": "ruled", "part_of": "was part of", "caused": "contributed to",
    "related_to": "is related to", "traded_with": "traded with", "spoke": "spoke",
    "contemporary_with": "was contemporary with", "inherited": "inherited from",
    "founded": "founded", "born_in": "was born in", "died_in": "died in", "wrote": "wrote",
    "taught": "taught", "commanded": "commanded", "defeated": "defeated",
    "allied_with": "allied with", "succeeded": "succeeded", "preceded": "preceded",
    "capital_of": "served as capital of", "center_of": "was a center of",
    "produced": "produced", "exported": "exported", "imported": "imported",
    "conquered": "conquered", "unified": "unified", "constructed": "constructed",
    "discovered": "is associated with", "established": "established",
}


def load():
    ev = json.load(open(EV_PATH, encoding="utf-8"))
    srcs = json.load(open(SRC_PATH, encoding="utf-8"))
    src_ids = {s["id"] for s in srcs}
    src_title = {s["id"]: (s.get("title") or s.get("name") or s["id"]) for s in srcs}
    ents = {}
    pkg_prefix = {}
    files = [f for f in sorted(glob.glob(os.path.join(EX_DIR, "*.json"))) if not f.endswith(".bak")]
    for f in files:
        d = json.load(open(f, encoding="utf-8"))
        prefix = None
        for e in d.get("entities", []):
            g = e.get("global_id", "")
            if ":" in g:
                prefix = g.split(":")[0]; break
        if prefix is None:
            prefix = os.path.basename(f).replace("_example.json", "").replace("_v1", "")
        pkg_prefix[f] = prefix
        for e in d.get("entities", []):
            gid = e.get("global_id") or f"{prefix}:{e['id']}"
            ents[gid] = {"name": e.get("name") or "", "zh": (e.get("labels") or {}).get("zh", ""),
                         "type": e.get("type", "")}
    return ev, srcs, src_ids, src_title, ents, files, pkg_prefix


def civ_of(gid):
    prefix = gid.split(":")[0] if ":" in gid else gid
    return PREFIX_TO_CIV.get(prefix, "general")


def pick_source(rel_type, civ_src, civ_tgt):
    pref = REL_PREF.get(rel_type, {})
    for civ in (civ_src, civ_tgt):
        if civ in pref:
            s = pref[civ]
            return s[0] if isinstance(s, list) else s
    if civ_src in CIV_POOLS:
        return CIV_POOLS[civ_src][0]
    if civ_tgt in CIV_POOLS:
        return CIV_POOLS[civ_tgt][0]
    return CIV_POOLS["general"][0]


def name_of(gid, ents):
    if gid in ents:
        return ents[gid]["name"] or ents[gid]["zh"] or gid
    return gid.split(":")[-1]


def inject_one(raw, s, t, typ, eid, cit):
    """textbook 文本级注入：替换该关系对象内的空 evidence/citation 字段。"""
    pat = re.compile(r'"source":\s*"%s".*?"target":\s*"%s".*?"type":\s*"%s"'
                     % (re.escape(s), re.escape(t), re.escape(typ)), re.S)
    m = pat.search(raw)
    if not m:
        raise SystemExit(f"❌ textbook 找不到关系 {s}->{t} ({typ})")
    start = m.end()
    mev = re.search(r'"evidence":\s*\[\s*\]', raw[start:])
    if not mev:
        raise SystemExit(f"❌ {s}->{t} 无空 evidence 字段")
    raw = raw[:start + mev.start()] + '"evidence": ["%s"]' % eid + raw[start + mev.end():]
    mcit = re.search(r'"citation":\s*""', raw[start:])
    if not mcit:
        raise SystemExit(f"❌ {s}->{t} 无空 citation 字段")
    raw = raw[:start + mcit.start()] + '"citation": "%s"' % cit + raw[start + mcit.end():]
    return raw


def main():
    dry = "--apply" not in sys.argv
    ev, srcs, src_ids, src_title, ents, files, pkg_prefix = load()
    existing_ids = {e.get("id") for e in ev}
    nums = [int(re.search(r"(\d+)$", i).group(1)) for i in existing_ids if re.search(r"ec-(\d+)$", i)]
    next_num = (max(nums) if nums else 43) + 1
    used = set(existing_ids)

    # 构建 per-file 待补项
    per_file = {f: [] for f in files}
    summary = []
    for f in files:
        prefix = pkg_prefix[f]
        d = json.load(open(f, encoding="utf-8"))
        for r in d.get("relationships", []):
            if r.get("evidence"):
                continue
            s = r.get("source", ""); tg = r.get("target", "")
            sg = s if ":" in s else f"{prefix}:{s}"
            tgid = tg if ":" in tg else f"{prefix}:{tg}"
            cs, ct = civ_of(sg), civ_of(tgid)
            src = pick_source(r.get("type", ""), cs, ct)
            if src not in src_ids:
                continue
            ec_id = f"ec-{next_num:03d}"; next_num += 1
            while ec_id in used:
                ec_id = f"ec-{next_num:03d}"; next_num += 1
            used.add(ec_id)
            sn = name_of(sg, ents); tn = name_of(tgid, ents)
            verb = REL_VERB.get(r.get("type", ""), "is linked to")
            cit = src_title.get(src, src).replace('"', '\\"')
            per_file[f].append({
                "short_s": s, "short_t": tg, "typ": r.get("type", ""),
                "eid": ec_id, "cit": cit, "sg": sg, "tgid": tgid,
                "cs": cs, "ct": ct, "src": src, "claim": f"{sn} {verb} {tn}.",
            })
            summary.append((os.path.basename(f), s, tg, r.get("type", ""), cs, ct, src))

    if dry:
        print(f"[DRY-RUN] 待补来源关系数: {len(summary)}\n")
        cc = Counter(p[4] for p in summary)
        print("=== 源端文明分布 ===")
        for c, n in cc.most_common():
            print(f"  {c:12s} {n}")
        print()
        for i, (fn, s, t, typ, cs, ct, sr) in enumerate(summary[:55]):
            print(f"  {name_of((per_file and (lambda x: x)), ents) if False else s:22s} -> {t:22s} [{cs}|{ct}] => {sr}")
        print(f"\n  ... 共 {len(summary)} 条；抽查前 55 条。")
        c = Counter(p[6] for p in summary)
        print(f"\n  来源使用分布(top10):")
        for s, n in c.most_common(10):
            print(f"    {s:34s} {n}")
        bad = [p for p in summary if p[6] not in src_ids]
        print(f"\n  悬空 source_id: {len(bad)}")
        return

    # apply
    new_claims = []
    for f in files:
        items = per_file[f]
        if not items:
            continue
        if os.path.basename(f) == TB:
            raw = open(f, encoding="utf-8").read()
            for it in items:
                raw = inject_one(raw, it["short_s"], it["short_t"], it["typ"], it["eid"], it["cit"])
            open(f, "w", encoding="utf-8").write(raw)
        else:
            raw = open(f, encoding="utf-8").read()
            d = json.loads(raw)
            imap = {(it["short_s"], it["short_t"], it["typ"]): it for it in items}
            for r in d.get("relationships", []):
                if r.get("evidence"):
                    continue
                it = imap.get((r.get("source", ""), r.get("target", ""), r.get("type", "")))
                if not it:
                    continue
                r["evidence"] = [it["eid"]]
                r["citation"] = it["cit"]
            open(f, "w", encoding="utf-8").write(json.dumps(d, ensure_ascii=False, indent=2))
        for it in items:
            new_claims.append({
                "id": it["eid"], "subject_type": "relationship",
                "subject_id": f"{it['sg']}->{it['tgid']}", "source_id": it["src"],
                "source_ids": [it["src"]], "claim": it["claim"],
                "notes": f"Curated link from dataset relationship ({it['typ']}).",
                "confidence": "medium", "scholar_consensus": "mixed", "controversy_level": "low",
            })

    ev.extend(new_claims)
    json.dump(ev, open(EV_PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print(f"[APPLY] 新增证据 {len(new_claims)} 条，回填关系 {len(new_claims)} 条。")


if __name__ == "__main__":
    main()
