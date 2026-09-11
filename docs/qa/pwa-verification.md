# Vérification PWA Coach Ottman & Laura

Date : 5 septembre 2026

## Parcours vérifiés

- L’écran de choix sépare Ottman et Laura et indique explicitement le stockage local.
- Le tableau de bord Ottman affiche les trois séances prescrites : Full Body A, Full Body B et Cardio.
- Le lancement d’une séance ouvre le suivi par série avec objectif, charge, répétitions ou durée, tutoriel et validation.
- Les données de séance sont persistées localement ; l’export/import JSON filtre par profil.
- Un service worker est généré avec le build, ainsi qu’un manifeste installable.

## Commandes de vérification

```text
npm.cmd test -- --run
Test Files  5 passed
Tests       9 passed

npm.cmd run build
vite build ✓
PWA generateSW ✓
```
