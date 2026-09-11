# MUSTAPHA COACH — proposition produit

Date de la réunion : 9 septembre 2026

## Décision

Créer une application PWA séparée nommée **MUSTAPHA COACH**.

Mustapha ne doit pas devenir un troisième profil dans l’application Ottman/Laura :

- base IndexedDB séparée ;
- manifeste, titre, icône et service worker séparés ;
- espace de stockage local préfixé `mustapha-*` ;
- historique, exports et sauvegardes indépendants ;
- aucune modification des séances Ottman/Laura.

## Promesse produit

> Un coach personnel de 8 semaines qui réunit entraînement, nutrition, recettes, courses et récupération, avec une progression visible et des actions simples à réaliser chaque jour.

L’application combine les trois sources :

| Source | Apport dans l’application |
|---|---|
| `Weight loss book.pdf` | perte de gras, cardio/HIIT progressif, hydratation, sommeil, repas simples et repères de déficit |
| `Body-Build-Book-(7).pdf` | hypertrophie, protéines/macros, surcharge progressive, split 8 semaines et méthodes d’intensification |
| `CROSSCOOKING.pdf` | recettes structurées, substitutions, sauces, collations, smoothies et liste de courses |

## Réunion d’experts

### Coach musculation

Le cœur doit être un runner fiable : séance du jour, séries, répétitions, repos, tempo, charge réellement utilisée et progression de volume. Les méthodes avancées doivent être des données structurées, pas du texte libre : `superset`, `biset`, `drop-set`, `rest-pause`, `tempo`, `AMRAP`, `10x10`.

### Expert nutrition

Deux modes sont nécessaires :

- **mode simple** : portions visuelles, repas types et repère de protéines ;
- **mode suivi** : calories et macros facultatives.

L’application ne doit pas produire de prescription médicale, de promesse de perte de poids ou d’adaptation agressive. Les compléments et défis restrictifs doivent rester accompagnés d’un avertissement.

### Chef / meal-prep

Le catalogue CrossCooking doit devenir une bibliothèque exploitable :

- filtres par objectif, temps, type de repas et teneur en protéines ;
- ingrédients, étapes, portions et substitutions ;
- génération automatique d’une liste de courses par rayon.

### Expert UX mobile

L’interface doit rester utilisable pendant une séance ou en cuisine :

- une action principale par écran ;
- saisie d’une performance en moins de 30 secondes ;
- navigation basse : **Aujourd’hui / S’entraîner / Manger / Recettes / Progression** ;
- fonctionnement hors ligne ;
- aucun écran d’accueil surchargé.

### Ingénieur données

Les prescriptions restent immuables et versionnées ; les résultats de Mustapha sont enregistrés séparément. Chaque élément importé des PDF reçoit une provenance :

```text
sourceId: "weight-loss" | "body-build" | "crosscooking"
sourceVersion: "2026-09"
planVersion: "mustapha-v1"
```

Cela permet de corriger le programme sans réécrire l’historique.

## Parcours principal

1. Onboarding de 5 minutes.
2. Choix de l’objectif : perte de gras, prise de muscle, recomposition ou maintien.
3. Saisie du niveau, du matériel, des jours disponibles et des préférences alimentaires.
4. Génération de la semaine 1.
5. Chaque jour : séance, repas recommandé, hydratation et sommeil.
6. Validation de la séance avec charge et répétitions réelles.
7. Choix d’une recette et ajustement des portions.
8. Liste de courses générée et cochable.
9. Bilan hebdomadaire : poids, énergie, adhérence, volume d’entraînement et récupération.

## Écrans

### 1. Onboarding

- objectif ;
- âge, taille, poids et niveau ;
- jours disponibles ;
- matériel ;
- restrictions et aliments exclus ;
- mode simple ou macros ;
- consentement et avertissement santé.

### 2. Aujourd’hui

- séance du jour ;
- repas recommandé ;
- objectif de protéines ou portions ;
- hydratation ;
- sommeil ;
- progression de la semaine ;
- bouton principal **Commencer la séance**.

### 3. S’entraîner

- calendrier des 8 semaines ;
- jours musculation, cardio, repos actif et repos ;
- détail des exercices ;
- séries, répétitions, repos et tempo ;
- validation des performances ;
- historique de charge et de volume.

### 4. Manger

- journée type ;
- repas et collations ;
- équivalences alimentaires ;
- substitutions ;
- mode portions ou macros ;
- accès direct aux courses.

### 5. Recettes

- recherche ;
- filtres : protéiné, rapide, faible glucide, bowl, wrap, petit-déjeuner, collation, sauce ;
- portions ajustables ;
- ingrédients et étapes ;
- ajout à la semaine et à la liste de courses.

### 6. Progression

- séances terminées ;
- charge, répétitions et volume ;
- poids et mensurations ;
- sommeil, hydratation et énergie ;
- photos facultatives ;
- tendance semaine par semaine.

### 7. Réglages

- export/import JSON ;
- suppression locale ;
- préférences sonores ;
- confidentialité ;
- rappel que l’application ne remplace pas un professionnel de santé.

## MVP recommandé

### Phase 1 — fondation

- onboarding Mustapha ;
- dashboard ;
- programme d’entraînement 8 semaines ;
- semaines 1 et 2 entièrement détaillées pour valider le modèle ;
- runner avec séries, repos et tempo ;
- historique local ;
- progression des charges et du volume ;
- PWA hors ligne.

### Phase 2 — valeur nutritionnelle

- journée type ;
- repère de protéines ;
- mode portions ;
- macros facultatives ;
- 10 à 20 recettes CrossCooking structurées ;
- liste de courses générée.

### Phase 3 — différenciation

- sommeil, hydratation et énergie ;
- mensurations et photos ;
- substitutions intelligentes ;
- feedback d’effort ;
- recommandations légères pour la semaine suivante, toujours validées par Mustapha.

## Modèle de données minimal

```text
MustaphaProfile
Goal
TrainingWeek
TrainingDay
ExercisePrescription
SetPrescription
WorkoutSession
LoggedSet
MealPlan
MealSlot
Recipe
RecipeIngredient
ShoppingList
BodyMetric
RecoveryLog
AppPreferences
```

Les prescriptions et recettes doivent être stockées sous forme structurée et résumée. Les trois PDF ne doivent pas être redistribués dans l’application ni copiés intégralement sans vérification des droits.

## Critères de réussite

Après une première version, Mustapha doit pouvoir :

1. terminer son onboarding sans aide ;
2. retrouver sa séance du jour ;
3. enregistrer une séance complète ;
4. choisir une recette et retrouver ses ingrédients ;
5. générer puis cocher une liste de courses ;
6. voir une progression réelle après 7 jours ;
7. exporter et restaurer ses données sans perte.

## Recommandation finale

Le meilleur premier livrable est **MUSTAPHA COACH v1** : une application séparée, centrée sur l’entraînement et le suivi, avec la nutrition et les recettes prévues dès le modèle de données puis activées immédiatement en deuxième phase. Cette approche permet de rester fidèle aux trois PDF sans fabriquer une interface trop lourde ni mélanger l’historique des autres utilisateurs.
