from pathlib import Path
import json
from jsonschema import Draft202012Validator

ROOT=Path(__file__).resolve().parents[1]

def load(path):
    with path.open(encoding="utf-8") as f: return json.load(f)

event_schema=load(ROOT/"schemas/event.schema.json")
region_schema=load(ROOT/"schemas/region.schema.json")
errors=[]

regions=load(ROOT/"data/regions.json")
events=load(ROOT/"data/events.json")

Draft202012Validator(region_schema).validate(regions[0]) if regions else None
for r in regions:
    for e in Draft202012Validator(region_schema).iter_errors(r): errors.append(f"regions/{r.get('id')}: {e.message}")
for e in events:
    for err in Draft202012Validator(event_schema).iter_errors(e): errors.append(f"events/{e.get('id')}: {err.message}")
region_ids={r["id"] for r in regions}
for e in events:
    if e["regionId"] not in region_ids: errors.append(f"events/{e['id']}: regionId inconnu: {e['regionId']}")
ids=[e["id"] for e in events]
if len(ids)!=len(set(ids)): errors.append("events: identifiants dupliqués")
if errors:
    print("Validation échouée:")
    print("\n".join("- "+x for x in errors))
    raise SystemExit(1)
print(f"OK — {len(regions)} régions, {len(events)} événements validés.")
