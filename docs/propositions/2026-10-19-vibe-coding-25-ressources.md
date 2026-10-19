# Améliorations pour Coach Ottman & Laura — les 25 ressources passées au filtre

Date : 19 octobre 2026. **Recalé sur la version publiée sur GitHub Pages**
(commit `73da6345` ; le bundle en ligne date de `81d5a3fa`).
Périmètre : application Ottman/Laura uniquement. MUSTAPHA (`src/mustapha/`,
non chargé par l'application) reste en l'état.
Méthode : chaque proposition s'appuie sur un constat du dépôt (fichier,
dépendance, écran mesuré). Aucune proposition n'est retenue pour la seule
beauté de l'effet.

> **Pourquoi ce document a été recalé.** La première version avait été écrite
> sur une autre lignée du dépôt (ancien `master`), pas sur la version publiée.
> Depuis, le poste de travail est sur `main` (le commit publié), et les
> constats ont été refaits un par un. Plusieurs propositions d'origine sont
> tombées d'elles-mêmes (la navigation 4 onglets existe déjà) ; le reste a été
> repris sur la bonne base — lots 0, 1 et 2 réalisés le 19 octobre, puis
> publiés sur GitHub Pages.

---

## 1. Le filtre, résumé

Ces 25 ressources servent à produire vite des sites vitrines. Le produit, lui,
est un outil local-first, hors ligne, utilisé debout dans une salle, dont le
paquet est plafonné à 165 Ko de JavaScript et 22 Ko de CSS, et dont le bilan
doit continuer à s'imprimer en A4. On ne les branche donc pas comme
dépendances : on s'en sert comme source de direction artistique, de motifs de
composants et de mouvement — tout est réécrit aux jetons existants.

- **Refusées telles quelles** (poids ou esthétique de vitrine) : Tailwind,
  shadcn/ui, Aceternity UI, Magic UI, bibliothèques d'animation (anime.js,
  Framer Motion), textes et boutons en dégradé, verre partout, assets 3D,
  composants cartographiques, galeries de composants à recopier.
- **Retenues comme motifs** (réécrits, jamais installés) : Kinetics
  (vocabulaire de mouvement), Motion Primitives (enfoncement, bascule, retour
  du stepper), MicroKit (coche dessinée, pulsation unique), Circle Loaders
  (l'anneau du repos), 21st.dev (banque de motifs à relire en cas de besoin
  précis).

## 2. Constats mesurés sur la version publiée (19 octobre)

| Constat | Preuve |
|---|---|
| Trois dépendances payées et jamais importées | `vaul`, `driver.js`, `@fontsource-variable/inter` n'existaient que dans `package.json` → **retirées le 19/10** |
| `NombreAnime` a un contrat écrit mais un seul usage | le commentaire du composant annonce « la charge prescrite et les chiffres du bilan » ; seul `BilanScreen` l'utilisait → **accueil + charge prévue branchés le 19/10** |
| `useListeAnimee` n'animait qu'une liste | `HistoryScreen` seulement → **records et suivi hebdomadaire branchés le 19/10** |
| 29 visuels de mouvement embarqués, jamais affichés | `public/exercise-media/*.webp` (précachés par le Service Worker) + `src/domain/media.ts` — aucun composant ne les lit |
| `MuscleMap` (13 zones, `normalizeMuscle`) sous-exploitée | utilisée uniquement par le tutoriel ; aucun agrégat par zone n'existe |
| Records et comparaisons calculés, pas montrés en fin de séance | `personalRecords()` et les formateurs de delta existent ; `CompletionFeedback` affiche quatre chiffres en texte brut |
| Deux emojis dans le tutoriel, contre le contrat de design | 🧬 et 📡 → **remplacés (icône `Anatomie`) ou retirés le 19/10** |
| La refonte de navigation, l'anneau de repos, l'enfoncement global : déjà en place | `BottomNav` (4 onglets + pastilles), `RestTimer` (anneau, alerte), `matiere.css` (`.app-shell button`) |

## 3. Lot 0 — réalisé le 19 octobre (sur la version publiée)

1. Trois dépendances mortes retirées (`vaul`, `driver.js`,
   `@fontsource-variable/inter`) — lockfile nettoyé.
2. `NombreAnime` : usage tenu là où il est écrit (métriques de l'accueil,
   charge prévue de la série suivante), avec **repli texte en clair** quand
   l'élément personnalisé n'existe pas — et deux tests qui le verrouillent.
3. `useListeAnimee` : la liste des records et l'historique du suivi
   hebdomadaire se replacent sous le doigt, comme l'historique.
4. Icône `Anatomie` dessinée sur la grille maison ; emojis du tutoriel
   supprimés sans perte (le bandeau hors-ligne dit déjà « Mode hors ligne »).
5. `docs/design/DESIGN.md` recalé (v1.1, jetons vérifiés) ; planche de
   références mise à jour.

**Preuves** : 687 tests verts (dont 2 nouveaux), typecheck, build,
budget 153,4/165 Ko JS · 16,2/22 Ko CSS ; parcours vérifié au navigateur
(éléments d'animation montés, zéro erreur console).

## 4. Lot 1 — le moment fort de fin de séance — réalisé le 19 octobre

Constats : `CompletionFeedback` affichait durée, séries, volume et meilleure
charge en texte brut ; `history` était déjà disponible pendant la séance ;
`personalRecords(history)` calcule les meilleures charges par mouvement.

Ce qui est en place :

1. **Compteurs animés** (`NombreAnime`) sur trois des quatre chiffres — la
   durée reste un texte stable, la variation se lit là où elle veut dire
   quelque chose.
2. **Delta contre la même séance précédente** (même jour du programme, séance
   terminée, la plus récente avant celle-ci) : volume et meilleure charge,
   signés, en gris neutre — jamais de vert/rouge qui jugerait la séance.
3. **« Record battu »** quand la charge dépasse strictement le record
   antérieur du mouvement, avec l'ancien chiffre entre parenthèses ; trois
   lignes au maximum, l'écran n'est pas un tableau d'honneur.
4. **Coche qui se dessine** une fois à l'ouverture (tracé par
   `stroke-dasharray`), coupée en mouvement réduit et en `data-perf="bas"` —
   sans confettis.

Écartés sur décision : **image de partage** (§6.1) et **visuel du mouvement
pendant le repos** (§6.3).

**Preuves** : `previousSessionFor()` et `beatenRecords()` dans
`src/workout/summary.ts`, testés (5 cas) ; trois tests d'écran sur les écarts
et les records ; suite complète 703 tests / 79 fichiers, typecheck et build
verts ; budget 155/165 Ko JS · 16,41/22 Ko CSS.

## 5. Lot 2 — volume par groupe musculaire — réalisé le 19 octobre

Constats : `MuscleMap` (13 zones) et `primaryMuscles`/`secondaryMuscles` sont
peuplés dans les fiches d'exercice (`src/domain/tutorials.ts`) et normalisés
par `normalizeMuscle()` ; `volumeTrendPoints()` ne fournit qu'un volume global.
Treize variantes héritées des PDF n'avaient aucune zone : leur volume n'aurait
été compté nulle part.

Ce qui est en place :

1. **`muscleVolume()`** (`src/workout/muscleVolume.ts`) : fonction pure,
   primaire × 1 / secondaire × ½, fenêtre de sept jours, séries sans charge
   exclues (gainage, cardio). Tests de pondération, de fenêtre et de tri, plus
   un test de couverture : tout mouvement programmé avec charges doit avoir ses
   zones — les treize variantes PDF ont reçu les leurs à cette occasion.
2. **Mode intensité sur `MuscleMap`** : niveau 0–1 par zone (opacité
   proportionnelle, accent unique), légende Peu / Moyen / Beaucoup, description
   vocale des niveaux ; aucune autre lecture de la carte n'est modifiée.
3. **Carte « Volume par zone · sept derniers jours »** dans Progression, à la
   suite des records : la carte et les cinq premières zones en
   kilos·répétitions.
4. **Bilan imprimé** : section « Volume par zone musculaire » avec la même
   silhouette en encre monochrome et le tableau des zones ; `break-inside:
   avoid` ajouté pour l'A4.

**Preuves** : vérifié au navigateur sur le serveur de dev — légende
Peu/Moyen/Beaucoup, sept opacités distinctes sur la carte, top 5 calculé
(Grands dorsaux 5 790 kg·rép., etc.), zéro erreur console ; test d'intégration
du bilan ; suite complète 703 tests, build, budget 155/165 Ko JS ·
16,41/22 Ko CSS.

## 6. Décisions tranchées

1. **Image de partage de fin de séance** — non : hors du périmètre validé du
   lot 1.
2. **Carte musculaire dans le bilan imprimé** — oui : réalisée en monochrome
   (lot 2), lisible en noir et blanc.
3. **Visuel du mouvement pendant le repos** — non : hors du périmètre validé
   du lot 1.

## 7. Ce qui a disparu du plan initial, et pourquoi

- **Navigation 4 onglets** : déjà dans la version publiée (avec pastilles et
  `navigationParent`) — plus rien à proposer.
- **Visite guidée (`driver.js`)** : dépendance retirée ; le parcours se tient
  sans, et une visite guidée reste possible sans bibliothèque si le besoin
  apparaît un jour.
- **Écran de repos « voile de verre »** : le cockpit publié (anneau, aperçu de
  la série suivante, ajustements) est déjà plus complet que la proposition ;
  le verre reste réservé à la nav et est coupé en mode bridé.
- **Icônes de remplacement pour la nav** : sans objet ici — la nav publiée
  utilise anneau, calendrier, courbe, personne, et cette grammaire tient.
- **Réglages d'accessibilité supplémentaires** : non demandés ; la base
  (`data-perf`, mouvement réduit, contrastes) est déjà en place.

## 8. Méthode et garde-fous

- Chaque affirmation a sa preuve dans le dépôt (fichier, ligne, mesure).
- Aucune dépendance sans mesure de paquet — on préfère retirer.
- Aucune animation hors des quatre signatures du contrat de design ; replis
  `prefers-reduced-motion` et `data-perf="bas"` vérifiés à chaque fois.
- Le bilan imprimé reste factuel et noir et blanc.
- 390 px d'abord ; tout changement visuel se relit à cette largeur.

## 9. Publication

Les lots 0, 1 et 2 sont publiés sur GitHub Pages le 19 octobre 2026 depuis
`main` (le site est servi à la racine du dépôt) : le bundle en ligne est
reconstruit à partir de ces sources, et `index.html` à la racine redevient la
version de production à cette occasion.
