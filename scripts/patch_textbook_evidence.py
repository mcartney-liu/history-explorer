#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""外科手术式回填 textbook 包 C1-C3 三条关系的 evidence/citation，不整体 dump，保留原紧凑格式。"""
import io
import re

FN = "data/examples/textbook_cn_history_v1_example.json"

PATCHES = [
    ("person-kongzi", "greek_philosophy:person-socrates", "contemporary_with",
     "ec-041", "Qian Mu, Guoshi Dagang; The Cambridge Ancient History (for Socrates)."),
    ("event-baijia-zhengming", "greek_philosophy:person-socrates", "contemporary_with",
     "ec-042", "The Cambridge History of Ancient China; The Cambridge Ancient History."),
    ("tp-warring-states", "persian_empire:civ-persian", "contemporary_with",
     "ec-043", "The Cambridge History of Ancient China; The Cambridge History of Iran, Vol. 2."),
]


def main():
    raw = io.open(FN, encoding="utf-8").read()
    for src, tgt, typ, eid, cit in PATCHES:
        pat = re.compile(
            r'"source":\s*"%s",.*?"target":\s*"%s",.*?"type":\s*"%s",'
            % (re.escape(src), re.escape(tgt), re.escape(typ)),
            re.S,
        )
        m = pat.search(raw)
        if not m:
            raise SystemExit(f"❌ 找不到关系 {src}->{tgt} ({typ})")
        start = m.end()
        mev = re.search(r'"evidence":\s*\[\s*\]', raw[start:])
        if not mev:
            raise SystemExit(f"❌ 找不到 evidence 空数组: {src}")
        raw = raw[:start + mev.start()] + '"evidence": ["%s"]' % eid + raw[start + mev.end():]
        mcit = re.search(r'"citation":\s*""', raw[start:])
        if not mcit:
            raise SystemExit(f"❌ 找不到 citation 空串: {src}")
        raw = raw[:start + mcit.start()] + '"citation": "%s"' % cit + raw[start + mcit.end():]
        print(f"  ✅ {src}->{tgt}: evidence={eid}, citation 已填")
    io.open(FN, "w", encoding="utf-8").write(raw)
    print("textbook 证据回填完成（格式保留）")


if __name__ == "__main__":
    main()
