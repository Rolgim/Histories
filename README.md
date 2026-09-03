# Autour de l’An Mil

Carte historique interactive couvrant la période 700–1400.

## Architecture

```text
index.html
src/                    # code de l'application
data/
  regions.json          # régions historiques
  events/               # 1 événement = 1 fichier JSON
schemas/                # règles de validation
examples/               # modèles pour les contributeurs
scripts/                # outils de contrôle
docs/                   # documentation pédagogique et technique
.github/
  ISSUE_TEMPLATE/       # formulaire GitHub de contribution
  workflows/            # validation automatique
```

### Pourquoi un fichier par événement ?

Pour éviter qu'une contribution touche un gros fichier partagé :

```text
data/events/1066-bataille-de-hastings.json
```

Une personne peut travailler sur Hastings pendant qu'une autre ajoute Kiev, sans modifier le même fichier.

Le navigateur charge la liste depuis `data/events/manifest.json`.

## Tester localement

Depuis la racine :

```bash
python -m http.server 8000
```

Puis ouvrir :

```text
http://localhost:8000/
```

Ne pas ouvrir `index.html` directement en `file://`, car l'application charge les JSON avec `fetch()`.

## Valider les données

Installer la dépendance :

```bash
python -m pip install jsonschema
```

Puis :

```bash
python scripts/validate_data.py
```

La même validation est exécutée automatiquement lors des Pull Requests GitHub.

## Ajouter un événement

Le moyen recommandé pour les enseignants est le formulaire GitHub :

**Issues → Ajouter un événement historique**

Le code de l'application n'a pas besoin d'être modifié.

Pour une contribution Git directe, copier `examples/event.example.json`, le renommer avec un identifiant unique et placer le fichier dans `data/events/`, puis lancer la validation.

## Licence / sources

À compléter selon les choix éditoriaux du projet.

## Flux de contribution automatique

Un professeur peut proposer un événement via **Issues → Ajouter un événement historique**.
Une GitHub Action transforme automatiquement le formulaire en fichier JSON, lance la validation et ouvre une Pull Request.

Voir `docs/WORKFLOW_GITHUB.md`.
