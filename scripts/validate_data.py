#!/usr/bin/env python3
import json
from pathlib import Path
import sys

try:
    from jsonschema import Draft202012Validator
except ImportError:
    print("ERREUR: jsonschema n'est pas installé. Lancez: python -m pip install jsonschema")
    sys.exit(1)

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
SCHEMAS = ROOT / "schemas"

def load_json(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise ValueError(f"{path.relative_to(ROOT)}: JSON invalide: {exc}")

regions = load_json(DATA / "regions.json")
region_schema = load_json(SCHEMAS / "region.schema.json")
event_schema = load_json(SCHEMAS / "event.schema.json")

errors = []
region_ids = set()

for i, region in enumerate(regions):
    for error in Draft202012Validator(region_schema).iter_errors(region):
        errors.append(f"regions.json[{i}]: {error.message}")
    rid = region.get("id")
    if rid in region_ids:
        errors.append(f"regions.json: identifiant de région en double: {rid}")
    region_ids.add(rid)

events_dir = DATA / "events"
manifest_path = events_dir / "manifest.json"
manifest = load_json(manifest_path)

listed = manifest.get("files", [])
actual = sorted(p.name for p in events_dir.glob("*.json") if p.name != "manifest.json")

if sorted(listed) != actual:
    errors.append("events/manifest.json ne correspond pas aux fichiers présents dans data/events/")

event_ids = set()
count = 0
for filename in actual:
    path = events_dir / filename
    event = load_json(path)
    for error in Draft202012Validator(event_schema).iter_errors(event):
        errors.append(f"{path.relative_to(ROOT)}: {error.message}")
    eid = event.get("id")
    if eid in event_ids:
        errors.append(f"{path.relative_to(ROOT)}: identifiant d'événement en double: {eid}")
    event_ids.add(eid)
    rid = event.get("regionId")
    if rid not in region_ids:
        errors.append(f"{path.relative_to(ROOT)}: regionId inconnu: {rid}")
    count += 1

if errors:
    print("VALIDATION ÉCHOUÉE")
    for error in errors:
        print(f"- {error}")
    sys.exit(1)

print(f"OK — {len(regions)} régions, {count} événements validés.")
