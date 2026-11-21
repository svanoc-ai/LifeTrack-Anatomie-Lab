# LifeTrack — Qualification anatomique, lot 1
Base visuelle : LAB V6 inchangée. LifeTrack Training non modifié.

## Objectif
Exporter la liste **réelle** des maillages de BodyExplorer/OrganUI chargés depuis les GLB,
sans supposer que « 467 structures » signifie 467 maillages uniques.

## Procédure iPhone
1. Déployer le ZIP différentiel dans le dépôt LAB existant.
2. Ouvrir Safari, choisir BodyExplorer et attendre le chargement.
3. Utiliser « Exporter l’inventaire CSV » ou « Exporter le référentiel JSON ».
4. Conserver les fichiers dans Fichiers et transmettre le CSV pour la qualification détaillée.

## Champs
- `id` : identifiant local stable pour un export donné, pas identifiant anatomique universel.
- `nom_source` et `parent` : noms du GLB, sans traduction arbitraire.
- `occurrence_nom` : distinction des homonymes.
- `groupes_proposes` : tableau de zéro, un ou plusieurs groupes suggérés, **non validés**.
- `groupes_valides` : tableau vide tant que la correspondance n'est pas vérifiée.
- `statut` : À qualifier.
- `visible_v6` : indique les maillages cachés par le prototype V6.
- `commentaire` : réserve pour revue.

## Règles
Les 20 groupes sont des catégories sportives, pas des taxons anatomiques exhaustifs.
Les tendons, os, fascias et structures non pertinentes doivent rester non affectés.
Une structure peut recevoir plusieurs groupes proposés dès ce lot, sans validation automatique.
La proposition regex est indicative ; pas de modification du modèle 3D.

## Nomenclature de référence (20 groupes)
1. Pectoraux
2. Grand dorsal
3. Trapèzes
4. Rhomboïdes
5. Lombaires
6. Deltoïdes antérieurs
7. Deltoïdes latéraux
8. Deltoïdes postérieurs
9. Biceps
10. Triceps
11. Avant-bras
12. Abdominaux
13. Obliques
14. Fessiers
15. Abducteurs
16. Adducteurs
17. Quadriceps
18. Ischio-jambiers
19. Mollets
20. Tibial antérieur
