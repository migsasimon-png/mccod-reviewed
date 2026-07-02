import json, re

def clean_label(title):
    t = title
    t = re.sub(r'^HMIS_100_?\s*', '', t)
    t = re.sub(r'^\d{3}[.\-][A-Za-z0-9]+\.?\s*', '', t)   # 020-DD01. / 017-PP21.
    t = re.sub(r'^\d{3}-\d{3}-[A-Za-z0-9]+\.?\s*', '', t) # 020-100-MD01ba.
    t = re.sub(r'^\d{3}\.[A-Za-z0-9]+\.?\s*', '', t)      # 020.AC04.
    t = t.strip()
    return t or title.strip()

def is_section(title):
    return bool(re.match(r'^\s*SECTION', title, re.I))

def build(spec_path, meta):
    data = json.load(open(spec_path, encoding='utf-8'))
    sections = []
    cur = None
    group = None
    for item in data:
        t = item.get('title','').strip()
        typ = item['type']
        if typ in ('section','note') and is_section(t):
            cur = {"title": re.sub(r'\s+',' ',t), "groups":[{"label":None,"fields":[]}]}
            sections.append(cur)
            group = cur["groups"][0]
            continue
        if cur is None:
            # implicit first section (case number, before any SECTION header)
            cur = {"title": meta.get("preTitle","General"), "groups":[{"label":None,"fields":[]}]}
            sections.append(cur)
            group = cur["groups"][0]
        if typ in ('subhead','note'):
            lbl = re.sub(r'\s+',' ',t)
            # skip pure separator noise
            group = {"label": lbl, "fields":[]}
            cur["groups"].append(group)
            continue
        if typ == 'field':
            group["fields"].append({"de": item['de'], "label": clean_label(item['title']), "raw": item['title'].strip()})
    # prune empty groups
    for s in sections:
        s["groups"] = [g for g in s["groups"] if g["fields"]]
    sections = [s for s in sections if s["groups"]]
    return sections

configs = {
 "pdr": build("scratch/spec_017.json", {"preTitle":"Case"}),
 "mdr": build("scratch/spec_020.json", {"preTitle":"Case"}),
}
json.dump(configs, open("scratch/form_layouts.json","w",encoding='utf-8'), indent=1, ensure_ascii=False)
for k,v in configs.items():
    fc = sum(len(g["fields"]) for s in v for g in s["groups"])
    print(k, "sections:", len(v), "fields:", fc)
    for s in v:
        print("   -", s["title"][:60], "| groups:", len(s["groups"]))
