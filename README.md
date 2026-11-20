# LifeTrack LAB — Comparateur anatomique 3D indépendant

**Objectif :** comparer les véritables modèles BodyExplorer et OrganUI sur le même iPhone, sans modifier LifeTrack Training.

## Déploiement
1. Créer un **nouveau dépôt GitHub public**, par exemple `LifeTrack-Anatomie-Lab`.
2. Décompresser ce ZIP et envoyer **son contenu** à la racine du nouveau dépôt (pas le ZIP lui-même).
3. Dans GitHub, Settings → Pages → Source : **GitHub Actions**.
4. Onglet Actions : attendre le workflow vert `Déployer comparateur 3D`.
5. Ouvrir l'URL Pages annoncée dans le workflow sur iPhone Safari.

Le workflow télécharge les **vrais fichiers GLB** à la compilation et refuse un téléchargement manquant/invalide. Aucun fichier de l'application LifeTrack Training n'est touché.

## Fonctionnalités
- Choix BodyExplorer (467 structures) / OrganUI (177 structures)
- Face / dos / profil, rotation tactile, pincement pour zoomer
- Sélection d'une structure et affichage de son nom
- Indication approximative des images/seconde
- Évaluation manuelle 1 à 5, copier le compte-rendu
- Éclairage identique pour les deux modèles

## Limites
- Aucun test sur iPhone physique effectué à la livraison.
- Le score d'IPS est indicatif (rafraîchissement du navigateur), pas une mesure GPU.
- La sélection peut présenter des noms techniques selon le maillage source.
- La vue est comparative, pas une intégration dans LifeTrack.
- Le téléchargement des modèles dépend de leurs dépôts publics : une révision figée sera nécessaire pour la version définitive.
- Le modèle OrganUI peut comporter des muscles visuellement « flottants », faute de squelette.

## Licences et crédits
- BodyExplorer : https://github.com/JohanBellander/BodyExplorer — code MIT ; géométries BodyParts3D CC BY-SA 2.1 Japan et Z-Anatomy CC BY-SA 4.0.
- OrganUI Muscles : https://github.com/organui/muscles-3d — code MIT ; géométries BodyParts3D CC BY-SA 2.1 Japan.
- Three.js : MIT.
Les conditions de redistribution et d'attribution des modèles s'appliquent ; vérifier toute réutilisation dans une version distribuée.
