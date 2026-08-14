#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
A 层数据补丁：打通中国与世界（15 组跨包关系）。
最小化文本插入，保留既有 JSON 格式与 UTF-8 编码；已存在的 (source,target,type) 跳过。
配套验收：scripts/data-patch-check.py
"""
import json
import io
import os

EX = "data/examples"

# (源文件, [(source, target, type), ...])  source 为本包短 id，target 为 包前缀:短id
PATCHES = {
    "silk_road_example.json": [
        ("silk_road", "china_v1:tp-tang", "traded_with"),
        ("han_dynasty", "china_v1:tp-tang", "before"),
        ("event-silk-road-opened", "china_v1:tp-tang", "influenced"),
        ("loc-chang-an", "china_v1:loc-changan", "related_to"),
        ("tech-paper", "china_v1:tech-zaopi", "related_to"),
        ("tech-paper", "china_v1:tp-tang", "spread"),
        ("person-zhang-qian", "china_v1:tp-tang", "before"),
    ],
    "china_civilization_v1_example.json": [
        ("rel-fojiao", "ancient_india:religion-buddhism", "spread"),
        ("tech-zaopi", "silk_road:silk_road", "spread"),
        ("tech-yinshua", "silk_road:silk_road", "spread"),
        ("tech-huoyao", "silk_road:silk_road", "spread"),
        ("tp-yuan", "persian_empire:civ-persian", "related_to"),
        ("person-zheng-he", "silk_road:silk_road", "participated_in"),
        ("loc-quanzhou", "silk_road:silk_road", "traded_with"),
        ("civ-zhonghua", "tb_cn_v1:civ-huaxia", "inherited"),
        ("tp-tang", "tb_cn_v1:tp-spring-autumn", "after"),
    ],
    "textbook_cn_history_v1_example.json": [
        ("person-kongzi", "greek_philosophy:person-socrates", "contemporary_with"),
        ("event-baijia-zhengming", "greek_philosophy:person-socrates", "contemporary_with"),
        ("tp-warring-states", "persian_empire:civ-persian", "contemporary_with"),
    ],
}


def find_rels_close(raw: str) -> int:
    """返回 relationships 数组的闭合 ] 的位置（字节索引）"""
    i = raw.index('"relationships"')
    j = raw.index("[", i)
    depth = 0
    k = j
    while k < len(raw):
        c = raw[k]
        if c == "[":
            depth += 1
        elif c == "]":
            depth -= 1
            if depth == 0:
                return k
        k += 1
    raise ValueError("未找到 relationships 闭合括号")


def entry_text(src: str, tgt: str, typ: str) -> str:
    return (
        '    {\n'
        '      "source": "%s",\n'
        '      "target": "%s",\n'
        '      "type": "%s",\n'
        '      "confidence": null,\n'
        '      "citation": "",\n'
        '      "evidence": [],\n'
        '      "valid_time": null,\n'
        '      "weight": null\n'
        '    }' % (src, tgt, typ)
    )


def main():
    total_added = 0
    for fn, rels in PATCHES.items():
        path = os.path.join(EX, fn)
        raw = io.open(path, encoding="utf-8").read()
        obj = json.loads(raw)  # 校验合法
        existing = {(r["source"], r["target"], r["type"]) for r in obj["relationships"]}
        to_add = [r for r in rels if r not in existing]
        if not to_add:
            print(f"  {fn}: 已是目标状态，跳过")
            continue
        close = find_rels_close(raw)
        block = ",\n" + ",\n".join(entry_text(*r) for r in to_add)
        new_raw = raw[:close] + block + raw[close:]
        json.loads(new_raw)  # 写入前再校验一次
        io.open(path, "w", encoding="utf-8").write(new_raw)
        n = len(obj["relationships"]) + len(to_add)
        print(f"  {fn}: +{len(to_add)} 条 (关系总数 {n})")
        total_added += len(to_add)
    print(f"\n本次新增跨包关系：{total_added} 条")


if __name__ == "__main__":
    main()
