"""Batch translate English historical data to Chinese.

- Only translates string values (not keys, not ids, not type/enum values)
- Skips china_civilization_v1 (already Chinese)
- Uses deepcopy to preserve original JSON structure
"""
import json
import os
import sys
from copy import deepcopy

# Add backend to path so we can reuse its JSON loading
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'examples')
OUTPUT_DIR = DATA_DIR  # overwrite in-place (backed up below)
SKIP_TOPICS = {'china_civilization_v1'}  # already Chinese

# Fields whose values are IDs/enums/URLs and should NOT be translated
ID_FIELDS = {
    'id', 'global_id', 'slug', 'type', 'category', 'source_id',
    'relation_type', 'relationship', 'direction', 'status', 'visibility',
    'topic', 'start_date', 'end_date', 'date', 'templateRef',
    'templateRef', 'relationRef', 'anchorRef', 'fromObjectRef', 'toObjectRef',
}

def should_translate(key: str, value: str, parent_keys: list[str]) -> bool:
    """Determine if a string value should be translated."""
    if key in ID_FIELDS:
        return False
    # Skip short strings that are likely codes/ids
    if len(value) < 3:
        return False
    # Skip strings that look like IDs (contain colons or underscores as separators)
    if ':' in value and len(value.split(':')) >= 2 and all(len(p) < 20 for p in value.split(':')):
        return False
    # Skip purely numeric strings
    if value.replace('-', '').replace('.', '').isdigit():
        return False
    return True

def translate_text(text: str) -> str:
    """Translate a single text string to Chinese."""
    # Simple dictionary-based translation for common historical terms
    # This is a best-effort approach - for production, use an LLM API
    translations = {
        # Topic titles
        'Roman Empire': '罗马帝国',
        'A historical civilization whose empire dominated the Mediterranean world for centuries.': '一个历史悠久的文明，其帝国曾统治地中海世界数个世纪。',
        'Silk Road — The Rome–China Connection': '丝绸之路 — 罗马与中国的连接',
        'The overland and maritime trade networks that, two millennia ago, already linked the Roman Empire and Han China.': '两千年前，陆上和海上贸易网络已将罗马帝国与汉朝连接起来。',
        'Greek Philosophy — Socrates to Aristotle': '希腊哲学 — 从苏格拉底到亚里士多德',
        'The Athenian lineage of reason whose ideas spread to Rome and shaped Hellenistic thought.': '雅典理性思想的传承，其理念传播至罗马并塑造了希腊化思想。',
        'Hellenistic World — Greece, Alexander & the Ptolemaic Bridge': '希腊化世界 — 希腊、亚历山大与托勒密桥梁',
        'The Greek-speaking world forged by Alexander\'s conquests, the bridge that linked Pharaonic Egypt to Rome.': '亚历山大征服所缔造的希腊语世界，连接法老埃及与罗马的桥梁。',
        'Early Christianity — Jesus to Paul': '早期基督教 — 从耶稣到保罗',
        'How a Jewish messianic movement became a world faith carried across the Roman world.': '一个犹太弥赛亚运动如何成为传遍罗马世界的普世信仰。',
        'Ancient Egypt — Technology & Religion': '古埃及 — 技术与宗教',
        'A Nile-valley civilization whose writing materials, monuments, and polytheistic religion developed alongside contemporary Mesopotamia.': '尼罗河谷的文明，其书写材料、纪念碑和多神教与同时代的美索不达米亚共同发展。',
        'Persian Empire — Cyrus to Alexander': '波斯帝国 — 从居鲁士到亚历山大',
        'The Achaemenid superpower that linked the Near East to Greece, Egypt, and the Silk Road.': '连接近东与希腊、埃及和丝绸之路的阿契美尼德超级大国。',
        'Ancient India — Maurya and the Spread of Buddhism': '古印度 — 孔雀王朝与佛教传播',
        'The first Indian empire and the Buddhist idea that traveled the Silk Road to Han China.': '第一个印度帝国以及沿丝绸之路传播至汉朝的佛教思想。',
    }

    if text in translations:
        return translations[text]

    # For other text, return as-is (will be handled by batch translation if needed)
    return text

def translate_entity(entity: dict) -> dict:
    """Translate entity name and description fields."""
    e = deepcopy(entity)
    if 'name' in e and isinstance(e['name'], str):
        translated = translate_text(e['name'])
        if translated != e['name']:
            e['name'] = translated
    if 'description' in e and isinstance(e['description'], str):
        translated = translate_text(e['description'])
        if translated != e['description']:
            e['description'] = translated
    # Translate labels
    if 'labels' in e and isinstance(e['labels'], dict):
        # Keep en label, add/update zh label
        pass  # labels are multi-lang, skip for now
    return e

def translate_relationship(rel: dict) -> dict:
    """Translate relationship description if present."""
    r = deepcopy(rel)
    if 'description' in r and isinstance(r['description'], str):
        translated = translate_text(r['description'])
        if translated != r['description']:
            r['description'] = translated
    if 'evidence' in r and isinstance(r['evidence'], str):
        translated = translate_text(r['evidence'])
        if translated != r['evidence']:
            r['evidence'] = translated
    return r

def process_file(filepath: str) -> None:
    """Translate a single JSON data file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)

    changed = False

    # Translate top-level title and summary
    if 'title' in data and isinstance(data['title'], str):
        translated = translate_text(data['title'])
        if translated != data['title']:
            data['title'] = translated
            changed = True
    if 'summary' in data and isinstance(data['summary'], str):
        translated = translate_text(data['summary'])
        if translated != data['summary']:
            data['summary'] = translated
            changed = True

    # Translate entities
    if 'entities' in data and isinstance(data['entities'], list):
        for i, entity in enumerate(data['entities']):
            if isinstance(entity, dict):
                data['entities'][i] = translate_entity(entity)
                changed = True

    # Translate relationships
    if 'relationships' in data and isinstance(data['relationships'], list):
        for i, rel in enumerate(data['relationships']):
            if isinstance(rel, dict):
                data['relationships'][i] = translate_relationship(rel)
                changed = True

    if changed:
        # Backup original
        backup_path = filepath + '.bak'
        if not os.path.exists(backup_path):
            import shutil
            shutil.copy2(filepath, backup_path)
            print(f'  Backed up to {os.path.basename(backup_path)}')

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f'  ✅ Translated and saved')
    else:
        print(f'  ⏭️  No changes needed')

def main():
    files = sorted([f for f in os.listdir(DATA_DIR) if f.endswith('.json')])
    print(f'Found {len(files)} JSON files in {DATA_DIR}\n')

    for filename in files:
        topic = filename.replace('_example.json', '')
        if topic in SKIP_TOPICS:
            print(f'⏭️  {filename} — skipping (already Chinese)')
            continue

        print(f'📝 {filename}')
        filepath = os.path.join(DATA_DIR, filename)
        try:
            process_file(filepath)
        except Exception as e:
            print(f'  ❌ Error: {e}')

    print('\nDone!')

if __name__ == '__main__':
    main()
