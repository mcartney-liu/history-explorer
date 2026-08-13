#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
A 层证据回填：为 19 条跨包关系各补一条 evidence_claims.json 条目（真实史学来源），
并回填对应关系的 evidence / citation 字段。
所有 source_id 均复用 data/sources.json 中已登记的真实来源，不悬空。
"""
import json
import io
import os
import re

EX = "data/examples"
EV = "data/evidence_claims.json"

# 每条：(文件, source, target, type, claim, citation, [source_ids], confidence, scholar_consensus, controversy_level, interpretation_note?)
ENTRIES = [
    # ---- A 组：丝路 <-> 中国（silk_road_example.json）----
    ("silk_road_example.json", "silk_road", "china_v1:tp-tang", "traded_with",
     "The Tang dynasty (618-907) made Chang'an the eastern terminus of the Silk Road; Silk Road trade peaked under Tang rule.",
     "Hansen, The Silk Road: A New History; Old Book of Tang (Jiu Tangshu).",
     ["src-hansen-silk-road", "src-cn-jiu-tangshu"], "high", "strong", "low", None),
    ("silk_road_example.json", "han_dynasty", "china_v1:tp-tang", "before",
     "The Han dynasty (202 BCE-220 CE) preceded the Tang dynasty (618-907 CE) by several centuries.",
     "Qian Mu, Guoshi Dagang (Outline of National History); The Cambridge History of China.",
     ["src-cn-qianmu", "src-cn-cambridge"], "high", "strong", "low", None),
    ("silk_road_example.json", "event-silk-road-opened", "china_v1:tp-tang", "influenced",
     "The Silk Road opened by Zhang Qian's missions (2nd c. BCE) reached its cultural and commercial zenith under the Tang.",
     "Book of Han (Hanshu), Biography of Zhang Qian; Hansen, The Silk Road: A New History.",
     ["src-cn-hanshu", "src-hansen-silk-road"], "high", "strong", "low", None),
    ("silk_road_example.json", "loc-chang-an", "china_v1:loc-changan", "related_to",
     "The 'Chang'an' in the Silk Road package (loc-chang-an) and Tang Chang'an (china_v1:loc-changan) denote the same city; this is a cross-package dedup link.",
     "Old Book of Tang (Jiu Tangshu); Hansen, The Silk Road: A New History.",
     ["src-cn-jiu-tangshu", "src-hansen-silk-road"], "high", "strong", "low",
     "Modeling link between two packages referring to the same historical city; not a historical dispute."),
    ("silk_road_example.json", "tech-paper", "china_v1:tech-zaopi", "related_to",
     "The 'paper' in the Silk Road package (tech-paper) and Tang paper (china_v1:tech-zaopi) refer to the same Chinese invention; cross-package dedup link.",
     "The Cambridge History of China; Hansen, The Silk Road: A New History.",
     ["src-cn-cambridge", "src-hansen-silk-road"], "high", "strong", "low",
     "Cross-package dedup link for the same technology."),
    ("silk_road_example.json", "tech-paper", "china_v1:tp-tang", "spread",
     "Paper-making, perfected in the Tang period, spread westward along the Silk Road after the Battle of Talas (751).",
     "The Cambridge History of China; Hansen, The Silk Road: A New History.",
     ["src-cn-cambridge", "src-hansen-silk-road"], "high", "strong", "low", None),
    ("silk_road_example.json", "person-zhang-qian", "china_v1:tp-tang", "before",
     "Zhang Qian (c. 164-114 BCE), who opened relations with the Western Regions, lived centuries before the Tang dynasty.",
     "Book of Han (Hanshu), Biography of Zhang Qian and Li Guangli.",
     ["src-cn-hanshu"], "high", "strong", "low", None),

    # ---- B 组 + D 组：中国文明包 <-> 世界（china_civilization_v1_example.json）----
    ("china_civilization_v1_example.json", "rel-fojiao", "ancient_india:religion-buddhism", "spread",
     "Buddhism spread from India to China around the 1st-2nd c. CE; the White Horse Temple at Luoyang marks an early center.",
     "Thapar, The Penguin History of Early India; Book of the Later Han (Hou Hanshu), Account of the Western Regions.",
     ["src-thapar-early-india", "src-cn-houhanshu"], "high", "strong", "low", None),
    ("china_civilization_v1_example.json", "tech-zaopi", "silk_road:silk_road", "spread",
     "Chinese paper-making travelled west along the Silk Road, reaching the Islamic world by the 8th c. and Europe by the 12th c.",
     "Hansen, The Silk Road: A New History; The Cambridge History of China.",
     ["src-hansen-silk-road", "src-cn-cambridge"], "high", "strong", "low", None),
    ("china_civilization_v1_example.json", "tech-yinshua", "silk_road:silk_road", "spread",
     "Woodblock and movable-type printing spread westward via the Silk Road and maritime trade, informing later European printing.",
     "The Cambridge History of China; Hansen, The Silk Road: A New History.",
     ["src-cn-cambridge", "src-hansen-silk-road"], "high", "strong", "medium",
     "The direct influence of Chinese printing on Gutenberg is debated; the westward transmission of the technology is well attested."),
    ("china_civilization_v1_example.json", "tech-huoyao", "silk_road:silk_road", "spread",
     "Gunpowder technology passed to the Islamic world and Europe in the 13th c. via the Mongol conquests and Silk Road exchange.",
     "The Cambridge History of China; Hansen, The Silk Road: A New History.",
     ["src-cn-cambridge", "src-hansen-silk-road"], "high", "strong", "low", None),
    ("china_civilization_v1_example.json", "tp-yuan", "persian_empire:civ-persian", "related_to",
     "The Yuan dynasty (1271-1368) maintained close political and cultural ties with the Persian Ilkhanate (1256-1335) following the Mongol westward campaigns.",
     "The Cambridge History of Iran, Vol. 2; The Cambridge History of China.",
     ["src-cambridge-iran", "src-cn-cambridge"], "high", "strong", "low", None),
    ("china_civilization_v1_example.json", "person-zheng-he", "silk_road:silk_road", "participated_in",
     "Zheng He's seven maritime expeditions (1405-1433) extended the maritime Silk Road and the tributary trade network.",
     "The Cambridge History of China (Ming volume).",
     ["src-cn-cambridge"], "high", "strong", "low", None),
    ("china_civilization_v1_example.json", "loc-quanzhou", "silk_road:silk_road", "traded_with",
     "Quanzhou was a major terminus and port of the Maritime Silk Road during the Song and Yuan periods.",
     "The Cambridge History of China; Hansen, The Silk Road: A New History.",
     ["src-cn-cambridge", "src-hansen-silk-road"], "high", "strong", "low", None),
    ("china_civilization_v1_example.json", "civ-zhonghua", "tb_cn_v1:civ-huaxia", "inherited",
     "The Chinese civilization (post-Qin unification) inherited the ethnicity, script, and ritual institutions of the pre-Qin Huaxia civilization.",
     "Qian Mu, Guoshi Dagang; The Cambridge History of Ancient China.",
     ["src-cn-qianmu", "src-cn-cambridge-ancient"], "high", "strong", "low", None),
    ("china_civilization_v1_example.json", "tp-tang", "tb_cn_v1:tp-spring-autumn", "after",
     "The Tang dynasty (618-907 CE) came many centuries after the Spring and Autumn period (770-476 BCE).",
     "The Cambridge History of Ancient China; Qian Mu, Guoshi Dagang.",
     ["src-cn-cambridge-ancient", "src-cn-qianmu"], "high", "strong", "low", None),

    # ---- C 组：教科书包 <-> 世界（textbook_cn_history_v1_example.json）----
    ("textbook_cn_history_v1_example.json", "person-kongzi", "greek_philosophy:person-socrates", "contemporary_with",
     "Confucius (551-479 BCE) and Socrates (470-399 BCE) were near-contemporaries, active in East Asia and the Mediterranean respectively.",
     "Qian Mu, Guoshi Dagang; The Cambridge Ancient History (for Socrates).",
     ["src-cn-qianmu", "src-cah"], "high", "strong", "low", None),
    ("textbook_cn_history_v1_example.json", "event-baijia-zhengming", "greek_philosophy:person-socrates", "contemporary_with",
     "The Hundred Schools of Thought (c. 5th-3rd c. BCE) coincided broadly with the golden age of Greek philosophy (Socrates, Plato, Aristotle).",
     "The Cambridge History of Ancient China; The Cambridge Ancient History.",
     ["src-cn-cambridge-ancient", "src-cah"], "high", "strong", "low", None),
    ("textbook_cn_history_v1_example.json", "tp-warring-states", "persian_empire:civ-persian", "contemporary_with",
     "China's Warring States period (475-221 BCE) overlapped broadly with the Achaemenid Persian Empire (550-330 BCE) and successor Hellenistic kingdoms.",
     "The Cambridge History of Ancient China; The Cambridge History of Iran, Vol. 2.",
     ["src-cn-cambridge-ancient", "src-cambridge-iran"], "high", "strong", "low", None),
]


def next_id(ev_list):
    max_n = 0
    for e in ev_list:
        m = re.match(r"ec-(\d+)", str(e.get("id", "")))
        if m:
            max_n = max(max_n, int(m.group(1)))
    return f"ec-{max_n + 1:03d}"


def main():
    ev_raw = io.open(EV, encoding="utf-8").read()
    ev = json.loads(ev_raw)
    start_id = next_id(ev)

    # 文件缓存
    cache = {}
    for fn in {e[0] for e in ENTRIES}:
        p = os.path.join(EX, fn)
        cache[fn] = json.loads(io.open(p, encoding="utf-8").read())

    n = 0
    for (fn, source, target, typ, claim, citation, src_ids, conf, cons, contro, note) in ENTRIES:
        obj = cache[fn]
        rel = next((r for r in obj["relationships"]
                    if r["source"] == source and r["target"] == target and r["type"] == typ), None)
        if rel is None:
            raise SystemExit(f"❌ 找不到关系 {source}->{target} ({typ}) in {fn}")
        cid = next_id(ev)
        rel["evidence"] = [cid]
        rel["citation"] = citation
        entry = {
            "id": cid,
            "subject_type": "relationship",
            "subject_id": f"{source}->{target}",
            "source_id": src_ids[0],
            "source_ids": src_ids,
            "claim": claim,
            "confidence": conf,
            "scholar_consensus": cons,
            "controversy_level": contro,
        }
        if note:
            entry["interpretation_note"] = note
        ev.append(entry)
        n += 1
        print(f"  +{cid}: {source}->{target} ({typ})  sources={src_ids}")

    # 写回 evidence_claims.json
    io.open(EV, "w", encoding="utf-8").write(json.dumps(ev, ensure_ascii=False, indent=2))
    # 写回各数据文件
    for fn, obj in cache.items():
        io.open(os.path.join(EX, fn), "w", encoding="utf-8").write(
            json.dumps(obj, ensure_ascii=False, indent=2))
    print(f"\n完成：新增 {n} 条证据（{start_id} 起），回填 19 条关系的 evidence/citation。")


if __name__ == "__main__":
    main()
