import re, html, json, sys

def parse(path):
    txt = open(path, encoding='utf-8', errors='ignore').read()
    # Strip all script and style blocks, keep the table markup
    body = re.sub(r'<script\b.*?</script>', '', txt, flags=re.S)
    body = re.sub(r'<style\b.*?</style>', '', body, flags=re.S)
    # Tokenize rows
    out = []
    # iterate over <tr ...>...</tr>
    for tr in re.findall(r'<tr\b[^>]*class="([^"]*)"[^>]*>(.*?)</tr>', body, re.S) + []:
        pass
    # Simpler: walk sequentially
    pos = 0
    rows = re.split(r'(<tr\b[^>]*>)', body)
    current = {"section": None}
    result = []
    # Build a linear scan of tr blocks
    tr_blocks = re.findall(r'<tr\b([^>]*)>(.*?)</tr>', body, re.S)
    for attrs, inner in tr_blocks:
        cls = ''
        m = re.search(r'class="([^"]*)"', attrs)
        if m: cls = m.group(1)
        # gather cell texts and inputs in order
        # find section head/subhead text
        text_only = html.unescape(re.sub(r'<[^>]+>', ' ', inner))
        text_only = re.sub(r'\s+', ' ', text_only).strip()
        inputs = re.findall(r'id="([A-Za-z0-9]+)-([A-Za-z0-9]+)-val"[^>]*?title="([^"]*)"', inner)
        if 'section-head' in cls:
            result.append({"type":"section","title":text_only})
        elif 'section-subhead' in cls:
            result.append({"type":"subhead","title":text_only})
        else:
            # capture label cells (td without input) as context
            for stage, de, title in inputs:
                result.append({"type":"field","stage":stage,"de":de,"title":html.unescape(title).strip()})
            if not inputs and text_only and 'N.B' not in text_only:
                # note/label row
                result.append({"type":"note","title":text_only})
    return result

for f in ['mpdsr/017.html','mpdsr/020.html']:
    r = parse(f)
    name = f.split('/')[-1].replace('.html','')
    open(f'scratch/spec_{name}.json','w',encoding='utf-8').write(json.dumps(r,indent=1,ensure_ascii=False))
    fields = [x for x in r if x['type']=='field']
    secs = [x for x in r if x['type']=='section']
    print(f, 'sections:', len(secs), 'fields:', len(fields))
