# Contrat de design — Coach Ottman & Laura

Version 1.1 — 19 octobre 2026. Recalé sur la version **publiée sur GitHub
Pages** (commit `73da6345`) après la bascule depuis l'ancienne lignée `master`.

Périmètre : l'application Coach Ottman & Laura telle qu'elle est publiée. Le
dossier `src/mustapha/` et les sélecteurs `.mustapha-*` ne sont pas chargés par
l'application ; ils restent en l'état et hors de ce contrat.

Rôle : toute personne — ou tout agent — qui touche à un écran lit d'abord ce
contrat. Il ne remplace pas `src/styles/tokens.css`, il l'explique. En cas de
doute : les jetons d'abord, ce document ensuite, le reste après. Aucune valeur
écrite à la main ne passe `src/styles/systeme.test.ts` ; c'est volontaire.

---

## 1. Les cinq contraintes qui ne se négocient pas

1. **Hors ligne d'abord.** Aucune requête réseau à l'usage : police
   auto-hébergée (`/fonts/*.woff2`, préchargée), assets locaux, aucune analyse
   d'audience, aucun CDN. La seule sortie réseau est la démo YouTube du
   tutoriel : jamais requise, remplacée par l'anatomie hors ligne.
2. **Budget mesuré.** `size-limit` refuse la livraison au-delà de **165 Ko de
   JavaScript initial et 22 Ko de CSS** (mesuré le 19 octobre : 153,4 et
   16,2 Ko). Toute dépendance nouvelle paie sa place ; on préfère supprimer à
   ajouter — trois dépendances jamais importées (`vaul`, `driver.js`,
   `@fontsource-variable/inter`) ont été retirées le 19 octobre.
3. **Données locales.** Pas de compte, pas de synchronisation. Le stockage
   local est la source de vérité ; un échec d'écriture est toujours visible
   (`.storage-alert`), jamais silencieux.
4. **Téléphone d'abord, en salle.** Base de référence : 390 px de large, une
   main, debout, à un mètre de l'écran parfois. Cibles tactiles ≥ 44 px,
   contraste vérifié, texte jamais sous 11 px (`--fs-1`).
5. **Imprimable.** Le bilan d'une semaine sort en A4, lisible en noir sur
   blanc, sans dépendre d'un écran.

## 2. Couleurs

| Jeton | Valeur | Usage |
|---|---|---|
| `--surface-0` / `--surface-1` / `--surface-2` | `#08090b` / `#15171a` / `#1e2125` | fond, cartes, surfaces posées |
| `--line` / `--line-strong` | blanc à 8 % / 15 % | séparation discrète, état survolé |
| `--text-1` / `--text-2` / `--text-3` | `#f5f5f7` / `#aeaeb5` / `#98989f` | lecture, secondaire, indicatif |
| `--accent` (+ `--accent-rgb`, `--accent-ink`) | `#a8f04a` Ottman, `#d7b8ff` Laura | actions et état actif uniquement |
| `--rest` | `#ffb547` | alerte de repos et de tempo |
| `--danger` | `#ff8a80` | échec, suppression, stockage |

Règles :

- **Une seule couleur d'action par écran.** L'accent est réservé aux boutons
  principaux, à l'état actif et à la valeur mise en avant. Les étiquettes,
  pastilles et libellés restent neutres.
- L'accent suit la personne, pas le composant : lime pour Ottman, lilas pour
  Laura, et cinq teintes au total choisies dans les réglages (`data-accent`).
  Les paires accent/fond des contrôles sont mesurées au-delà de 10:1 (seuil
  AAA : 7:1). On ne code jamais une teinte en dur — les canaux séparés
  (`--accent-rgb`) existent pour les voiles translucides.
- Pas de dégradé décoratif, pas de texte en dégradé. La hiérarchie se fait par
  la taille et l'espace, pas par la couleur.
- Une seule carte accentuée par écran (la métrique mise en avant).

## 3. Typographie

- Pile système d'abord (`-apple-system`, `BlinkMacSystemFont`) ; **Inter
  Variable** auto-hébergée en secours (`/fonts`, deux sous-ensembles latin et
  latin-ext, préchargés). Les chiffres ont leur propre pile
  (`--font-chiffres`, `ui-rounded` en tête là où il existe).
- Échelle bornée : `--fs-1` 0.6875 rem (11 px) à `--fs-12` 2.5 rem (40 px),
  plus `--fs-repos` (2.5 rem, le chiffre du repos) et `--fs-tempo`
  (`clamp(4.5rem, 24vw, 7rem)`, le compteur de tempo, seul nombre qui a le
  droit de dépasser, avec son unité `--fs-tempo-unite`).
- **Aucun titre au-delà de 40 px.** Un grand titre qui ne tient pas rétrécit
  par `clamp()`, jamais par une taille fixe.
- **Chiffres tabulaires** (`font-variant-numeric: tabular-nums`) pour tous les
  chronos, charges et compteurs : un chrono ne doit pas bouger de largeur en
  décomptant.
- Majuscules réservées aux étiquettes courtes (`eyebrow`), avec
  `letter-spacing` positif. Jamais de majuscules décoratives sur une phrase.

## 4. Espacement et rayons

- Espacement : grille de 2 px, jetons `--sp-*`, de `--sp-1` (2 px) à `--sp-14`
  (48 px). Pas de marge inventée à l'œil.
- Rayons : `--r-xs` 4, `--r-sm` 8, `--r-md` 12 (boutons, champs), `--r-lg` 16
  (cartes), `--r-xl` 22, `--r-2xl` 28, `--r-full` 999 (pastilles). Une carte =
  `--r-lg`, un bouton = `--r-md`, rien d'autre.
- Surfaces à bordure plutôt qu'ombres empilées. Les rares ombres passent par
  les jetons (`--carte-lisere`, `--verre-ombre`) et sont coupées en mode bridé.

## 5. Mouvement

Trois ressorts, calculés pour se terminer exactement sur 1 (une courbe qui
n'atteint pas sa cible laisse un saut visible) :

| Jeton | Amortissement | Usage |
|---|---|---|
| `--ressort` | ζ = 1,00 | écrans, feuilles, barres — aucun dépassement |
| `--ressort-vif` | ζ = 0,72 | enfoncement puis relâchement d'un contrôle |
| `--ressort-rebond` | ζ = 0,50 | une apparition à fêter (fin de séance) |

Durées : `--duree-enfonce` 90 ms, `--duree-matiere` 220 ms, `--duree-ecran`
200 ms. `--ease` / `--t-fast|mid|slow` restent pour les transitions d'état
simples (couleur, bordure).

Règles :

- On n'anime que **l'opacité et la transformation**. Jamais la mise en page,
  jamais un `filter` ou `backdrop-filter` animé : cela coûte une repainte par
  image sur un téléphone qui passe une heure en salle. Le verre (`--verre-*`)
  est posé, jamais animé.
- **Quatre signatures, pas plus** : l'enfoncement des contrôles, les compteurs
  qui défilent (NumberFlow), les listes qui se replacent (auto-animate), la
  célébration unique de fin de séance. Toute animation nouvelle doit entrer
  dans l'une des quatre ou être refusée.
- Toute animation a son repli `prefers-reduced-motion: reduce` : les états
  finaux restent, le mouvement disparaît.
- Un appareil détecté bridé reçoit `data-perf="bas"` (voir
  `src/perf/fluidite.ts`) : flou coupé, fond opaque, transitions posées. Toute
  nouvelle matière doit gérer ce cas.
- Les deux bibliothèques de mouvement admises sont **@number-flow/react**
  (via `NombreAnime.tsx`, avec repli texte en clair) et **@formkit/auto-animate**
  (via `useListeAnimee.ts`). Aucune autre n'entre sans mesure de paquet et
  vérification du mode réduit.

## 6. Iconographie

- Un seul fichier : `src/components/ui/Icons.tsx`. Grille 24, trait 1,65
  (`ICON_STROKE_WIDTH`), taille par défaut 20, `aria-hidden` — l'étiquette vit
  sur le bouton, pas sur l'icône.
- **Un pictogramme = un sens.** Exemples acquis : l'anneau = Aujourd'hui ; le
  calendrier = Programme ; la courbe = Progrès ; la personne = Profil ; le
  buste à repères = Anatomie ; le triangle = avertissement.
- Pas d'emoji, pas d'illustration 3D, pas de jeu d'icônes tiers. Une icône
  nouvelle se dessine sur la même grille, ou ne se dessine pas.
- Les icônes n'accompagnent que les libellés qui en ont besoin : bouton
  d'action isolé, onglet, ligne de réglage. Jamais pour décorer un titre.

## 7. Anatomie des écrans clés

| Écran | Ce qui doit s'y trouver, au minimum |
|---|---|
| **Accueil** | L'action du jour (héro + anneau de semaine) ; les créneaux de la semaine ; deux métriques compactes (séances, volume) en compteurs animés ; la série d'assiduité ; le conseil du coach. Un seul accent : le démarrage. |
| **Séance** | Le mouvement en titre, la prescription en grand (répétitions, charge tabulaire), le compteur de tempo, la barre « Valider la série ». La charge prescrite arrive en glissant. |
| **Repos** | L'anneau et le temps restant en grand (c'est le seul chiffre qu'on lit à un mètre) ; la série suivante annoncée (mouvement, cible, charge prévue, disques) ; les ajustements au pouce. Rien qui exige les deux mains. |
| **Fin de séance** | Le récapitulatif factuel avant le formulaire : durée, séries, volume, meilleure charge. Objectif du lot 1 : compteurs animés, delta contre la même séance précédente, mention de record quand il tombe. |
| **Progression** | La tendance de la semaine, la courbe de volume, les records. Chaque chiffre porte une comparaison (delta, date). |
| **Suivi hebdomadaire** | Cinq zones de saisie maximum, la valeur précédente rappelée, un enregistrement qui ne perd rien. |
| **Bilan (impression)** | Strictement factuel : chiffres, deltas, dates. Lisible en A4 noir sur blanc, sans écran. |
| **Réglages** | Profil, accent, export/restauration. Les actions dangereuses sont en `--danger`, jamais à côté d'une action courante. |

## 8. États à couvrir pour chaque composant

Grille de revue (inspirée de Component Gallery) — un composant n'est pas fini
tant qu'un de ces états est absent :

- **vide** : dit ce qui manque et propose l'action suivante ;
- **chargement** : si la donnée vient du stockage local, un état posé, jamais
  un saut de mise en page ;
- **erreur de stockage** : visible, expliquée, jamais avalée ;
- **hors ligne** : rien à faire — l'application est locale ; ne pas ajouter
  d'indicateur inutile ;
- **focus visible** : contour d'accent 2 px, testé au clavier ;
- **enfoncé** : retour au doigt par `--ressort-vif` ;
- **désactivé** : lisible, sans accent ;
- **mouvement réduit** et **appareil bridé** : vérifiés.

## 9. Langue et voix

- Tout ce qui est écrit à l'écran est en français, apostrophes typographiques
  (’), espaces insécables fines avant les unités comme partout dans
  `src/workout/summary.ts` (`\u202F`).
- Vocabulaire fixe : **séance**, **série**, **mouvement**, **charge**,
  **répétitions**, **repos**, **point du samedi**, **bilan**. On ne dit pas
  « workout », « training » ni « exercice » dans l'interface.
- Le coach parle directement à la personne (« Respire, contrôle,
  progresse. »). Pas de jargon, pas de mention de l'application elle-même.
- Pas d'emoji, pas de point d'exclamation en série, pas de texte qui félicite
  pour un appui.

## 10. Interdits

- Emoji dans l'interface ou les commentaires de code.
- Texte ou bouton en dégradé, verre décoratif partout (un seul usage admis par
  écran, et coupé en mode bridé).
- Animation en boucle, défilement détourné, curseur personnalisé.
- Dépendance nouvelle non mesurée : la question n'est pas « est-ce que ça
  marche ? » mais « qu'est-ce que ça coûte et qu'est-ce qu'on retire ? ».
- Illustration ou icône 3D dans l'application.
- Valeur CSS écrite à la main : tout passe par un jeton, sinon
  `systeme.test.ts` refuse la livraison.
- Bilan imprimé qui dépend d'une couleur d'écran.

## 11. Avant de livrer

1. `npm run verify` : linter, typage, tests, construction, budget — tout vert.
2. Parcours complet vérifié à 390 px (et regardé à 430 px), au clavier aussi.
3. `prefers-reduced-motion` et `data-perf="bas"` vérifiés sur tout ce qui bouge.
4. Bilan : impression A4 relue à l'écran comme sur papier.
5. Aucune requête réseau nouvelle dans l'onglet Réseau.
6. Capture avant/après pour tout changement visuel — même mineur.

Fichiers de référence : `src/styles/tokens.css` (jetons), `matiere.css`
(matière et mouvement), `screens.css` (écrans), `src/components/ui/Icons.tsx`
(iconographie), `NombreAnime.tsx` et `useListeAnimee.ts` (mouvement autorisé),
`src/domain/media.ts` (visuels d'exercice embarqués),
`docs/superpowers/specs/2026-10-18-ux-coaching-responsive-design.md`
(spécification UX de cette version), `docs/design/REFERENCES.md` (planche
commentée).
