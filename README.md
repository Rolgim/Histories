# Autour de l’an mil

Carte historique interactive du monde, de 700 à 1400.

## Architecture

- `index.html` : structure de la page
- `src/` : moteur de la carte, panneau, timeline et thèmes
- `data/` : contenu historique en JSON
- `schemas/` : règles de validation
- `examples/` : modèles à copier pour contribuer
- `docs/` : guide destiné aux contributeurs et enseignants

## Contribuer

Les contributeurs ne doivent normalement modifier que `data/` et éventuellement les fichiers de documentation.

1. Copiez `examples/event.example.json` ou `examples/region.example.json`.
2. Donnez un identifiant unique en minuscules avec des tirets.
3. Renseignez les informations et les sources.
4. Ouvrez une Merge Request / Pull Request.
5. La CI vérifie automatiquement la validité des JSON.

## Tester localement

Le navigateur bloque généralement `fetch()` depuis `file://`. Lancez donc un serveur local, par exemple :

```bash
python -m http.server 8000
```

Puis ouvrez `http://localhost:8000/`.

## Philosophie

Le code de visualisation reste séparé du contenu historique. Cela permet aux historiens, enseignants et étudiants de contribuer sans avoir à modifier le JavaScript.
