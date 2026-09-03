# Workflow GitHub automatique

Le projet peut transformer automatiquement une proposition d'événement en Pull Request.

## Parcours enseignant

1. Dans GitHub, ouvrir **Issues**.
2. Cliquer sur **Ajouter un événement historique**.
3. Remplir le formulaire.
4. Cliquer sur **Submit new issue**.
5. GitHub Actions lit les champs du formulaire.
6. Un fichier est créé dans `data/events/`.
7. La validation JSON est exécutée.
8. Une Pull Request est créée automatiquement.
9. Un mainteneur vérifie les sources et le contenu historique.
10. Après validation, la Pull Request peut être fusionnée.

Le professeur n'a donc pas besoin de Git, de JSON, de HTML ou de JavaScript.

## Sécurité et contrôle éditorial

L'action ne fusionne jamais automatiquement la contribution.

Elle crée seulement une Pull Request. Un humain conserve la décision éditoriale.

Le script :
- limite les années à 700–1400 ;
- vérifie les coordonnées ;
- construit un nom de fichier à partir de l'année et du titre ;
- refuse d'écraser un événement existant ;
- passe ensuite par `scripts/validate_data.py`.

## Activation

Le workflow utilise `GITHUB_TOKEN`. Dans les réglages du dépôt, vérifier que les Actions ont le droit de créer et modifier du contenu et des Pull Requests.

Le dépôt doit aussi conserver les labels `contribution` et `événement` utilisés par le formulaire et le workflow.

## Si le dépôt est public

Le formulaire peut être rempli par des utilisateurs externes. La proposition reste une **Issue**, puis l'automatisation crée une branche et une Pull Request dans le dépôt.

La fusion reste réservée aux mainteneurs.
