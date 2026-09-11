# MUSTAPHA COACH — Refonte personnalisation et UI

## Objectif
Transformer l’espace MUSTAPHA en coach local personnalisé : choix de 2 ou 3 séances, planning lundi–mercredi–samedi, repas adaptés au profil et ton de coach configurable, sans toucher à Laura/Ottman.

## Décisions
- Données locales IndexedDB, aucune API distante.
- 2 séances : lundi + samedi par défaut ; 3 séances : lundi + mercredi + samedi.
- Les prescriptions restent immuables ; les performances réelles sont journalisées séparément.
- Ton `standard`, `directive` ou `dictator-rp`, activé volontairement et réversible.
- UI sombre éditoriale : une dominante lime, surfaces sobres, hiérarchie typographique, navigation desktop/mobile, animations CSS discrètes.
- Les repères nutritionnels sont indicatifs et non médicaux.

## Architecture
Ajouter des fonctions pures dans `domain/programGenerator.ts`, `domain/mealGenerator.ts` et `domain/coachTone.ts`. Étendre le profil avec `weeklySessions` et `coachTone`. Adapter l’onboarding et le dashboard, puis renforcer les styles dans `styles.css`.

## Critères d’acceptation
- Le générateur retourne exactement 2 ou 3 journées selon le profil.
- Les jours sont limités à lundi, mercredi et samedi.
- Les repas excluent les allergènes et aliments exclus.
- Le ton directif produit une consigne courte ; le mode RP reste fictif et désactivable.
- Tests, build, clics clés et URL publique MUSTAPHA vérifiés.
