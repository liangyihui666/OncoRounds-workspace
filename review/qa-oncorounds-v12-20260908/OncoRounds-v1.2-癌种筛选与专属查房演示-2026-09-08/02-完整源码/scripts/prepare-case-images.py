"""Download the six supplied case content figures without changing source JSON."""
import json
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from urllib.request import urlopen, Request

root = Path(__file__).resolve().parents[1]
output = root / 'public/assets/case-content'
output.mkdir(parents=True, exist_ok=True)
pages = [json.loads(p.read_text(encoding='utf-8-sig')) for p in (root / 'src/data/demo/raw').glob('*.json') if not p.stem.endswith('-5题')]

def download(page):
    if not page['image']['src'].startswith('https://'):
        return page['case_id'] + ': local cover, no content figure'
    target = output / (page['case_id'] + '.png')
    if target.exists() and target.stat().st_size > 100:
        return target.name + ': existing'
    with urlopen(Request(page['image']['src'], headers={'User-Agent': 'Mozilla/5.0'}), timeout=40) as response:
        content = response.read()
    if not content.startswith(b'\x89PNG\r\n\x1a\n'):
        raise ValueError('Expected PNG for ' + page['case_id'])
    target.write_bytes(content)
    return target.name + ': ' + str(len(content)) + ' bytes'

with ThreadPoolExecutor(max_workers=3) as pool:
    for result in pool.map(download, pages):
        print(result, flush=True)
