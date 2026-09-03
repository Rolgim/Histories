# Guide de contribution pour les professeurs

## Ajouter un événement

1. Copiez `examples/event.example.json`.
2. Renommez le fichier, par exemple `1066-hastings.json`.
3. Remplissez l’année, le titre, les coordonnées et la description.
4. Utilisez un `regionId` déjà présent dans `data/regions.json`.
5. Ajoutez au moins une source lorsque cela est possible.
6. Créez une Merge Request.

### Exemple minimal

```json
{
  "id": "1066-hastings",
  "year": 1066,
  "title": "Bataille de Hastings",
  "lon": 0.49,
  "lat": 50.91,
  "regionId": "iles-britanniques",
  "religion": "Christianisme catholique",
  "territory": "Angleterre normande",
  "language": "Ancien français",
  "ethnicity": "Normands",
  "desc": "Description historique courte et sourcée."
}
```

## Bonnes pratiques historiques

- Distinguer les faits établis des interprétations.
- Donner une date précise lorsque celle-ci est connue.
- Éviter les formulations anachroniques.
- Privilégier des sources identifiables et vérifiables.
- Une contribution peut être discutée ou corrigée dans la Merge Request : c’est normal et souhaitable.

## Ajouter une région

Utilisez `examples/region.example.json`. Une région possède un ou plusieurs `snapshots`, chacun décrivant son état pendant une période donnée.
