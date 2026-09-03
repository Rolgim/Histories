#!/usr/bin/env python3
import json
import os
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVENTS_DIR = ROOT / "data" / "events"

body = os.environ.get("ISSUE_BODY", "")
if not body.strip():
    print("ERREUR: corps de l'issue vide.")
    sys.exit(1)

def field(label):
    # GitHub issue forms render headings as "### Label" followed by the answer.
    pattern = rf"###\s+{re.escape(label)}\s*\n+([\s\S]*?)(?=\n###\s+|\Z)"
    match = re.search(pattern, body, re.IGNORECASE)
    if not match:
        raise ValueError(f"Champ introuvable : {label}")
    value = match.group(1).strip()
    if not value or value in {"_No response_", "_no response_"}:
        return ""
    return value

def number(label):
    value = field(label).replace(",", ".")
    return float(value)

def integer(label):
    value = field(label)
    return int(value)

def slugify(text):
    text = unicodedata.normalize("NFKD", text)
    text = "".join(c for c in text if not unicodedata.combining(c))
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text

try:
    year = integer("Année")
    title = field("Titre")
    location = field("Lieu")
    latitude = number("Latitude")
    longitude = number("Longitude")
    region_id = field("Identifiant de région")
    description = field("Description")
    details = field("Détails")
    sources = field("Sources")
    contributor = field("Contributeur")
except (ValueError, TypeError) as exc:
    print(f"ERREUR: {exc}")
    sys.exit(1)

if not 700 <= year <= 1400:
    print("ERREUR: l'année doit être comprise entre 700 et 1400.")
    sys.exit(1)
if not title:
    print("ERREUR: le titre est obligatoire.")
    sys.exit(1)
if not -90 <= latitude <= 90:
    print("ERREUR: latitude hors limites.")
    sys.exit(1)
if not -180 <= longitude <= 180:
    print("ERREUR: longitude hors limites.")
    sys.exit(1)
if not region_id:
    print("ERREUR: regionId obligatoire.")
    sys.exit(1)

slug = slugify(title)
if not slug:
    print("ERREUR: impossible de créer un identifiant à partir du titre.")
    sys.exit(1)

event_id = f"{year:04d}-{slug}"
output = EVENTS_DIR / f"{event_id}.json"

# Refuse an automatic overwrite: a human must resolve duplicate IDs.
if output.exists():
    print(f"ERREUR: le fichier {output.name} existe déjà.")
    sys.exit(1)

event = {
    "id": event_id,
    "year": year,
    "title": title,
    "location": location,
    "lat": latitude,
    "lon": longitude,
    "regionId": region_id,
    "description": description,
    "details": details,
    "sources": sources,
}

if contributor:
    event["contributor"] = contributor

EVENTS_DIR.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(event, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Événement créé : {output.relative_to(ROOT)}")
