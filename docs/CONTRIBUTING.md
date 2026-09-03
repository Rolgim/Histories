# Contribuer à Autour de l’An Mil

Le projet sépare le **code** et les **données historiques**.

## Pour ajouter un événement

La méthode recommandée pour un professeur ou historien est :

1. Ouvrir l'onglet **Issues** du dépôt GitHub.
2. Choisir **Ajouter un événement historique**.
3. Remplir le formulaire.
4. Un mainteneur transforme la proposition en fichier `data/events/AAAA-slug.json`.
5. La Pull Request est automatiquement contrôlée par GitHub Actions.

Vous n'avez donc pas besoin de modifier `src/`.

## Pour les contributeurs qui travaillent directement sur Git

Chaque événement possède son propre fichier :

```text
data/events/
├── 0793-lindisfarne.json
├── 0860-constantinople.json
├── 0882-kiev.json
└── ...
```

Une contribution historique modifie idéalement un seul fichier. Cela réduit les conflits Git entre contributeurs.

Après ajout ou modification d'un événement :

```bash
python scripts/validate_data.py
```

Puis test local :

```bash
python -m http.server 8000
```

et ouvrir `http://localhost:8000/`.

## Ne pas modifier

Sauf si vous développez la carte, évitez de modifier :

```text
src/
index.html
```

## Avant une Pull Request

- vérifier l'année ;
- vérifier latitude/longitude ;
- vérifier `regionId` ;
- fournir des sources ;
- lancer la validation ;
- tester l'affichage.
