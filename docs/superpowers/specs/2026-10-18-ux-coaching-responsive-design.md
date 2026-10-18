# UX, coaching adaptatif et responsive — spécification

## Intent

Améliorer Coach Ottman & Laura sur deux axes visibles :

1. rendre chaque écran immédiatement compréhensible et confortable sur téléphone, tablette et grand écran ;
2. transformer les données déjà recueillies en recommandations de séance explicables, prudentes et actionnables.

L’application reste une PWA locale et offline-first. Aucune donnée d’entraînement ne quitte l’appareil. Aucune recommandation ne remplace silencieusement le programme prescrit.

## Succès attendu

- Une seule action dominante apparaît sur l’accueil.
- Aucun texte important ne déborde, ne se chevauche ou devient illisible entre 320 px et grand écran.
- Les cartes et colonnes utilisent une largeur de lecture stable, avec espaces et retours de ligne intentionnels.
- La validation d’une série reste accessible au pouce pendant une séance longue.
- Chaque recommandation de charge/durée indique action, raison et niveau de confiance.
- Douleur, effort élevé, énergie basse ou données insuffisantes bloquent toute progression automatique.
- Programme original et historique restent inchangés tant que l’utilisateur n’accepte pas une suggestion.
- Anciennes sauvegardes restent importables.

## Périmètre UX et responsive

### Accueil

`NextBestAction` devient source unique de l’action principale. La carte de recommandation et carte de séance ne doivent plus présenter deux CTA concurrents.

États :

- séance interrompue : reprise prioritaire, séries déjà validées et progression affichées ;
- séance à faire : démarrage unique avec nom, durée et nombre de mouvements ;
- point hebdomadaire dû : CTA point hebdomadaire, séance reléguée en action secondaire ;
- récupération : conseil de récupération, démarrage volontaire toujours possible mais non dominant ;
- retour après absence : formulation neutre, sans score culpabilisant.

Rail hebdomadaire :

- `done` devient consultation ou redémarrage explicitement nommé ;
- `today` reste démarrage principal ;
- `upcoming` devient aperçu non destructif ou démarrage secondaire avec libellé explicite.

Chargement profil et accueil : états `chargement`, `prêt`, `erreur récupérable`, avec statut annoncé aux lecteurs d’écran et bouton réessayer si nécessaire. Aucun espace vide utilisé comme faux état.

Métriques : chaque valeur doit avoir même période que son libellé. Suppression du mélange volume glissant / compteur historique.

### Séance

La validation de série reste sticky, avec espace réservé et respect des safe areas. Vérifier empilement avec barre haute, navigation et transition d’écran.

Saisie en effort : afficher par défaut le chemin rapide recommandé. Placer réglages fins (pas de charge, correction, durée détaillée) derrière une divulgation progressive accessible. Conserver labels explicites, clavier adapté et cibles tactiles d’au moins 44 px.

### Navigation et texte

- Mapper `followup` et `bilan` à leur destination parente ou masquer navigation globale dans ces contextes.
- Réserver navigation primaire aux parcours fréquents ; placer charges comme accès secondaire si cela améliore la hiérarchie.
- Limiter largeur de lecture et longueur de ligne.
- Utiliser une échelle typographique et un système d’espacement cohérents déjà présents dans les tokens.
- Vérifier textes longs français, retours de ligne, boutons, badges et messages d’erreur sur 320, 375, 390, 430, 768 et grand écran.
- Fournir fond opaque de repli pour barres translucides ; vérifier contraste sur gradient de page et statut offline textuel, pas couleur seule.

## Coaching adaptatif

### Données utilisées

Données existantes : prescription, charge réelle, répétitions, durée, séries complétées, RPE/perceived exertion, énergie, douleur/localisation, consigne de charge, notes, alternatives, semaine de programme et historique.

Données manquantes restent neutres. Pas d’ajout obligatoire de sommeil, courbatures ou métriques personnelles dans cette phase.

### Moteur déterministe

Créer ou étendre un module pur sous `src/workout/coaching.ts`, séparé du JSX. Une recommandation contient au minimum :

- exercice et type (`strength`, `timed`, `cardio`) ;
- action (`increase`, `maintain`, `reduce`, `recovery`) ;
- valeur proposée si applicable ;
- raison lisible ;
- confiance (`low`, `medium`, `high`) ;
- signaux utilisés ;
- garde-fou déclenché éventuel.

Fenêtre d’analyse : 2 à 4 expositions terminées du même exercice, sans mélanger exercices ni profils.

Force :

- augmenter seulement si toutes séries de travail atteignent cible, charge prescrite ou actuelle cohérente, RPE maîtrisé, aucune douleur et aucune baisse récente ;
- maintenir si tendance stable ou historique insuffisant ;
- réduire charge ou volume si douleur, RPE élevé répété, énergie basse répétée ou séries incomplètes ;
- respecter incréments disponibles et plafonds du programme.

Tempo/cardio :

- analyser durée réellement tenue, répétitions/intervalles et repos ;
- proposer augmentation de durée ou maintien avec plafond ;
- ne jamais produire une suggestion de charge quand exercice n’en possède pas.

Sécurité :

- douleur déclarée bloque toute augmentation ;
- effort très élevé répété déclenche maintien/réduction ;
- énergie basse déclenche réduction de volume ou récupération ;
- données insuffisantes donnent maintien et confiance faible ;
- aucun diagnostic ni conseil médical automatique.

### Interaction

La recommandation apparaît dans écran séance au niveau exercice concerné, avant saisie. Elle explique « pourquoi » et offre `Appliquer à cette séance`, `Garder la prescription` ou réglage manuel. Application ne modifie ni programme source ni historique passé.

Enregistrer localement recommandation, décision utilisateur et résultat futur seulement si cela peut rester compatible avec schéma de sauvegarde. Sinon, première version conserve calcul déterministe sans nouvelle table ; décision reste état de séance.

### Programme et bilan

Avant activation des recommandations, vérifier prescriptions semaines 6–8. Ajouter test garantissant valeur active ou fallback explicite pour chaque exercice qui exige charge/durée.

Connecter `volumeDeltaPercent` au bilan hebdomadaire si le champ existe déjà dans son contrat. Ne pas déclencher automatiquement d’adaptation depuis estimation corporelle.

## Architecture et fichiers ciblés

- `src/workout/coaching.ts`, tests associés : moteur pur et règles ;
- `src/workout/progressionEngine.ts` : réutiliser/étendre logique force et timed ;
- `src/domain/types.ts` et schéma backup : types optionnels compatibles ;
- `src/domain/programs.ts` : vérification S6–S8 ;
- `src/components/screens/HomeScreen.tsx` : action dominante, rail, métriques, états ;
- `src/components/screens/ProfileChooser.tsx` : chargement/erreur ;
- `src/components/screens/WorkoutScreen.tsx` : recommandation et saisie rapide ;
- `src/components/layout/BottomNav.tsx` : contexte actif ;
- `src/styles/*.css` : responsive, sticky action, typographie, surfaces, contrastes ;
- tests composants, domaine, coaching et responsive statique selon conventions existantes.

Éviter refonte de stockage ou migration destructive. Ne pas toucher MUSTAPHA sauf régression de styles globaux.

## Tests et validation

Tests unitaires table-driven : seuils exacts, douleur, RPE haut, énergie basse, données absentes, séries incomplètes, 2–4 expositions, doublons, profils isolés, force, timed et cardio, semaines 6–8.

Tests composants : action unique accueil, rail par état, reprise, chargement/erreur profil, CTA sticky rendu, recommendation opt-in, navigation contextuelle.

Validation manuelle : viewport 320×640, 375×812, 390×844, 430×932, 768×1024 et desktop ; clavier/focus, lecteur d’écran via rôles/annonces, reduced motion, contraste, offline, import/export ancienne sauvegarde.

Commandes finales : `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run size`.

## Découpage de livraison

1. Baseline responsive et corrections accueil/navigation/états.
2. Validation sticky et saisie rapide séance.
3. Vérification prescriptions S6–S8 et moteur coaching pur, tests.
4. Intégration recommandations force/timed/cardio dans séance.
5. Audit visuel et accessibilité multi-viewport, puis vérification complète.
