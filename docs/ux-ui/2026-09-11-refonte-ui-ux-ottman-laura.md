# Coach Ottman & Laura — Proposition de refonte UI / UX

Date : 11 septembre 2026
Périmètre : application Ottman / Laura (le parcours MUSTAPHA n'est pas concerné par ce document).
Base d'audit : build de production servi sur `http://localhost:4173`, viewport 1264 x 625 px, session de séance reelle plus 9 seances injectees en base locale pour observer les etats remplis. Toutes les mesures citees sont relevees dans le DOM ou dans le code du depot.

---

## 1. Diagnostic

### 1.1 Ce qui fonctionne et qui doit etre preserve

| Acquis | Detail verifie |
|---|---|
| Runner de seance complet dans la hauteur du telephone | presets serre, prescription, saisie et validation visibles sans scroll |
| Chronos tempo et repos | compte a rebours, pause, passer, ajouter/retirer des secondes, reprise apres rechargement |
| Reprise anti-crash | une seance active est restauree automatiquement au demarrage |
| Check-in d'energie | trois niveaux, majoration reelle des repos de 20 % |
| Coach duo | bascule Ottman / Laura en conservant la seance active de chacun |
| Local-first | IndexedDB, export et import JSON, fonctionne hors ligne, wake lock, vibration, notification de fin de repos |
| Qualite logicielle | 21 fichiers de tests, 68 tests verts, build vert en 991 ms |

### 1.2 Constats mesures

| # | Constat | Preuve |
|---|---|---|
| D1 | La police declaree n'est jamais chargee | `document.fonts` renvoie une liste vide ; aucune `@font-face` ni balise de police dans `index.html`. Mesure de largeur de rendu : "Plus Jakarta Sans" = 327 px, identique a une police inexistante. L'application s'affiche donc dans la police par defaut du navigateur. |
| D2 | Trois dependances installees jamais importees | `lucide-react`, `@phosphor-icons/react`, `recharts` sont dans `package.json` ; aucun fichier de `src/` ne les importe. Retirees le 11 septembre : le bundle reste identique (465 kB brut, 144 kB gzip), car elles n'etaient pas embarquees — seul le poids d'installation diminuait. Seul Radix Dialog est reellement utilise (`src/components/ui/Sheet.tsx`). |
| D3 | Trois systemes d'icones concurrents | SVG maison (`src/components/ui/Icons.tsx`), emoji (`⚡` `🌸` `🔥` `⏱` `⚠`), glyphes unicode (`↗` `↘` `→`) : 15 emplacements releves dans l'interface. |
| D4 | Couleurs systeme incoherentes | `index.html` : `theme-color #111827` ; manifeste : `theme_color #111827`, `background_color #0b1020` ; interface : `#090d0d`. La barre du navigateur et l'ecran de lancement a l'installation sont donc d'une autre couleur que l'application. |
| D5 | Manifeste PWA incomplet | pas d'`id`, pas d'icone PNG 192 et 512, pas de maskable PNG (`purpose: any maskable` sur un SVG), pas de `screenshots`, `short_name` = "Coach". |
| D6 | Poids hors ligne disproportionne | precache genere : 190 entrees, 73 Mo (dont 51 Mo d'images de recettes et 39 Mo d'images d'exercices), pour une application de seance. |
| D7 | Accueil plat et peu informatif | titre a 86,4 px, trois cartes de seance de poids identique (meme hauteur, meme structure, seules les teintes de fond changent), quatre cartes KPI identiques sur l'ecran Progression, barre de progression vide purement decorative. |
| D8 | Navigation en doublon, desktop inexploite | la barre basse flottante coexiste avec les liens texte "Progression" et "Historique" de l'en-tete ; meme barre centree sur un ecran de 1264 px, colonne de contenu limitee a 62 rem, aucun usage de la largeur disponible. |
| D9 | Ecran de seance : bandeau duo prioritaire | la premiere ligne utile est le selecteur `⚡ Ottman / 🌸 Laura` avec badge "en cours" ; le controle de chrono, essentiel, passe au second plan. |
| D10 | Zone visuelle d'exercice vide | un bandeau d'environ 10 rem reste vide au-dessus de la prescription quand celle-ci est compacte : un halo degrade occupe l'emplacement d'une illustration qui n'est pas chargee a cet endroit. |
| D11 | Cibles tactiles trop petites | bouton de lecture d'une seance mesure a 39,2 x 39,2 px en desktop ; cibles en dessous des 44 px recommandes. |
| D12 | Identifiants techniques affiches a l'utilisateur | ecran Progression, section "Meilleures performances" : "velo", "tractions-assistees", "cardio" au lieu de libelles francais, a cote de "Rameur" correctement libelle. |
| D13 | Libelles ambigus dans les dialogues | la boite de sortie de seance propose "Mettre en pause" et "Reprendre la seance" : le second bouton ferme la boite, il devrait s'intituler "Continuer la seance". |
| D14 | Navigation basse sans libelle sur mobile | sous 700 px, `.bottom-nav button span { display: none }` : les quatre destinations perdent leur texte. |

---

## 2. Principes de la refonte

1. **Une action dominante par ecran.** Un seul bouton accentue, tout le reste en surfaces neutres.
2. **Le contexte reel avant les chiffres.** Aujourd'hui, la derniere fois, la prochaine serie : ces trois informations passent avant tout indicateur cumule.
3. **Local et hors ligne par defaut.** Aucun appel reseau, aucun compte, aucun suivi analytique.
4. **Hierarchie typographique avant decoration.** Les degrades, halos et ombres ne servent plus a structurer : ils disparaissent ou deviennent fonctionnels (chrono, progression).
5. **Chaque etat est specifie.** Vide, premiere utilisation, chargement, hors ligne, reprise, erreur d'import, donnees effacees.

---

## 3. Design system cible

### 3.1 Couleurs

| Token | Valeur | Usage |
|---|---|---|
| `--surface-0` | `#0B0F0E` | fond d'application, `theme_color`, `background_color` |
| `--surface-1` | `#121715` | cartes, barres laterales |
| `--surface-2` | `#18201D` | surfaces elevees, listes |
| `--line` | `rgba(255,255,255,.09)` | bordures et separateurs |
| `--line-strong` | `rgba(255,255,255,.16)` | bordures au survol et au focus |
| `--text-1` | `#F1F5F2` | titres et valeurs |
| `--text-2` | `#A9B7AE` | libelles, descriptions |
| `--text-3` | `#78877E` | mentions, horodatages (contraste a verifier sur chaque usage) |
| `--accent` | `#B8F36B` | identite Coach, action principale, remplissage de progression actif uniquement |
| `--accent-ink` | `#0E1710` | texte sur accent |
| `--rest` | `#F3BD6B` | repos et alertes non bloquantes |
| `--danger` | `#E79292` | suppression, douleur signalee |
| `--profile-laura` | `#E0A9EE` | identite du profil Laura uniquement (avatar, badge), jamais comme accent d'action |

Regles : un seul element accentue par ecran ; aucune teinte de fond differente d'une carte a l'autre selon son index ; le rose Laura n'est jamais une couleur d'action.

### 3.2 Typographie

- Police unique auto-hebergee : **Inter** (sous-ensemble latin, woff2, poids 400, 510, 590) copiee dans `public/fonts/`. Aucun appel a un service externe.
- Fallback explicite : `Inter, "Segoe UI", system-ui, sans-serif`.
- Chiffres de chronometre et de charge : `font-variant-numeric: tabular-nums`, pour eviter les sauts de largeur pendant le decompte.
- Echelle : 12, 13, 15, 17, 22, 28, 40 px. Interdiction d'un titre superieur a 40 px dans l'application ; le titre d'accueil passe de 86 px a 28 px.
- Interlignes : 1.5 pour le corps, 1.15 pour les titres. Interlettrage : `-0.01em` sur les titres, `0` ailleurs.

### 3.3 Espacements, rayons, elevation

- Espacements : 4, 8, 12, 16, 24, 32, 48.
- Rayons : 6 px (badges), 10 px (champs, boutons), 14 px (cartes), 999 px (pastilles). Les rayons de 24 px disparaissent.
- Elevation : une seule ombre `0 1px 0 rgba(255,255,255,.04) inset, 0 8px 24px rgba(0,0,0,.35)` reservee aux surfaces flottantes (modales, barre de navigation). Les cartes de contenu se distinguent par bordure, pas par ombre.

### 3.4 Iconographie

- **Une seule source.** Conserver le jeu SVG maison (`Icons.tsx`) comme source unique, en normalisant le trace : `stroke-width: 1.5`, `viewBox 24`, taille par defaut 20 px. Ajouter les pictogrammes manquants (foudre, fleur de profil, minuteur, avertissement, tendance montante, tendance descendante) dans ce meme fichier.
- Suppression complete des emoji et glyphes utilises comme icones (D3). Aucun emoji dans l'interface.

### 3.5 Mouvement

- Durees : 120 ms (micro etat), 180 ms (apparition), 240 ms (panneaux). Courbe unique : `cubic-bezier(.2,.8,.2,1)`.
- Aucune animation decorative en boucle. `prefers-reduced-motion` neutralise deja les transitions : conserver ce comportement et l'etendre aux nouveaux composants.

---

## 4. Architecture d'information et navigation

### Mobile (jusqu'a 700 px)

Quatre onglets, libelles visibles en permanence :

1. **Aujourd'hui** — seance du jour, reprise de seance, semaine en cours, derniere seance, conseil.
2. **Programme** — les trois seances, detail des mouvements, tutoriels, alternatives materiel.
3. **Progression** — sous-onglets *Tendance* (courbes, records, adherence) et *Historique* (liste des seances).
4. **Profil** — reglages, donnees, notifications, installation, credits.

Les liens texte "Progression" et "Historique" de l'en-tete de l'accueil disparaissent (D8).

### Desktop (a partir de 1024 px)

- Barre laterale fixe de 232 px : marque, quatre destinations, selecteur de profil en bas.
- Zone de contenu limitee a 1120 px, en deux colonnes sur l'accueil : colonne principale 720 px (seance du jour, semaine), colonne secondaire 320 px (derniere seance, conseil du coach, raccourcis).
- Les feuilles inferieures (`Sheet`) deviennent des panneaux lateraux a droite pour les tutoriels et les alternatives.
- La barre basse flottante disparait sur desktop (D8).

### Transversal

- Bandeau hors ligne discret sous l'en-tete, jamais une pastille d'etat permanente.
- Un seul systeme de notification transitoire (toast), place en haut au centre, avec `role="status"`.

---

## 5. Specification ecran par ecran

### 5.1 Selection de profil

- Plein ecran, deux tuiles horizontales de 96 px de haut : avatar, prenom, une ligne de programme, chevron.
- Sous les tuiles : une ligne "Donnees locales sur cet appareil, aucun compte" et un lien "Comment ca marche" ouvrant un panneau court.
- Avatars : losange accent pour Ottman, rose pour Laura. Aucun emoji.
- Profil actif : bordure accent sur 1 px et mention "Derniere utilisation" si l'horodatage existe.

### 5.2 Aujourd'hui

Structure, de haut en bas :

1. **Barre d'application** : libelle de profil, date du jour en francais ("jeudi 11 septembre"), bouton reglages.
2. **Carte principale "Seance du jour"** : nom de la seance, focus (force et cardio), nombre de mouvements, duree estimee, trois pastilles de muscles, bouton accentue "Commencer Full Body A · 64 min". C'est la seule carte accentuee de l'ecran.
3. **Reprise** : si une seance est active, un bloc distinct au-dessus de la carte, avec progression "12 / 26 series" et bouton "Reprendre".
4. **Rail de semaine** : trois creneaux (lundi, mercredi, samedi), chacun avec un etat explicite — *terminée*, *aujourd'hui*, *a venir* — et une duree. Remplace la barre vide actuelle (D7).
5. **Deux indicateurs secondaires en ligne** : seances de la semaine, volume des sept derniers jours. Affichage compact, sans carte individuelle de 120 px.
6. **Derniere seance** : une ligne, date, nom, series validees, RPE, lien "Detail".
7. **Conseil du coach** : paragraphe court, fond `--surface-1`, sans degrade ni icone decoree.

Etats : premiere utilisation (aucune seance : le rail affiche "Aucune seance enregistree" et la carte principale invite a commencer), hors ligne (bandeau), seance en cours (bloc de reprise), erreur de stockage (callout).

### 5.3 Controle avant seance

- Conserver les trois niveaux d'energie, remplacer les emoji par les pictogrammes du jeu maison.
- Passage en boutons radio accessibles, etat selectionne visible (bordure accent, coche reelle).
- Le bouton principal reprend le libelle exact de la seance et sa duree : "Demarrer Full Body A · 64 min".
- Second bouton en style discret : "Demarrer sans ajustement".
- Mention explicite de l'effet du choix : "Repos majores de 20 %".

### 5.4 Seance en cours

Ordre de priorite impose :

1. **En-tete compact** : nom de la seance, bloc (echauffement / travail), progression "12 / 26", duree ecoulee en chiffres tabulaires.
2. **Selecteur duo compact** (32 px de haut, discret, en fin d'en-tete ou dans le menu de seance) : plus de bandeau pleine largeur avec badge permanent (D9). Retirer les emoji `⚡` et `🌸`.
3. **Illustration d'exercice reelle** : image RepDB du mouvement en cours, avec `alt` descriptif et repli sur pictogramme si l'image manque. La zone vide de 10 rem disparait (D10).
4. **Bloc prescription** : numero de serie sur le total, repetitions ou duree, charge prescrite, tempo, repos, note technique sur une ligne maximum.
5. **Chrono** : valeur en 40 px tabulaires, barre de progression lineaire, boutons "Passer", "Demarrer", "Recommencer", ajout et retrait de secondes en cible de 44 px.
6. **Saisie de performance** : champ numerique, palette plus et moins de 44 px, et surtout un repere de comparaison en ligne — "Derniere fois : 42,5 kg x 10". Cette information existe en base et n'est pas exploitee aujourd'hui.
7. **Validation** : bouton accentue pleine largeur, puis annonce de la suite — "Ensuite : Equilibre sur bosu, dans 90 s".
8. **Acces secondaires** : tutoriel, "Machine indisponible ?" en style discret.

Etats : chrono en pause, series terminees (ecran de bilan), sortie de seance (dialogue explicite : "Continuer la seance", "Mettre en pause"), hors ligne (le chrono continue, la sauvegarde reste locale).

### 5.5 Repos

- Carte unique : chrono en 40 px, nom du prochain mouvement et charge cible, repos prescrit.
- Actions de 44 px : "-15 s", "+15 s", "Passer le repos", "Marquer la serie".
- Annonce vocale et notification conservees ; le titre d'onglet reste utilise mais sans emoji.

### 5.6 Bilan de fin de seance

- Resumé : duree, series validees, volume, meilleure charge.
- RPE de 1 a 10 en segments, energie de 1 a 5, douleur signalee en champ court, note libre.
- Un bouton accentue "Enregistrer le bilan", un lien discret "Passer".

### 5.7 Progression

- Quatre indicateurs en ligne compacte : seances de la semaine, volume total, meilleure charge, temps actif. Plus de cartes identiques de grande hauteur (D7).
- Trois courbes : volume par seance, charge maximale par mouvement, adherence hebdomadaire. Une seule couleur de donnee, pas de degrade de remplissage decoratif.
- **Records par mouvement** : libelles francais issus d'une table de correspondance (D12) — "Velo stationnaire", "Tractions assistees", "Rameur", "Cardio". Rang en pastille neutre, pas cinq badges accentues identiques.
- Comparaison avec la semaine precedente, en pourcentage et en absolu.
- Sous-onglet Historique : seances groupees par semaine, une ligne par seance (date, nom, series, duree, RPE), etat vide specifie avec bouton "Commencer une seance".

### 5.8 Reglages

Quatre sections titrees, une bordure entre chaque :

1. **Profil** : profil actif, bascule, mention de separation des donnees.
2. **Donnees** : export JSON, import JSON, effacement du profil. L'effacement demande une saisie de confirmation et affiche le nombre de seances concernees.
3. **Entrainement** : alertes de fin de repos, vibration, son, maintien de l'ecran actif pendant la seance.
4. **Application** : etat hors ligne, version, installation, credits des illustrations.

---

## 6. Catalogue de composants

| Composant | Etats a implementer |
|---|---|
| `AppShell` | mobile, desktop |
| `SidebarNav` / `BottomNav` | repos, actif, focus visible, libelles visibles |
| `SessionCard` (dominante) | disponible, seance en cours, terminee aujourd'hui |
| `WeekRailItem` | termine, aujourd'hui, a venir, vide |
| `MetricInline` | valeur, unite, tendance, sans donnee |
| `ExerciseVisual` | image chargee, image manquante, repli pictogramme |
| `PrescriptionBlock` | musculation (reps et charge), duree, tempo, circuit |
| `TimerDisplay` | en cours, pause, termine, alerte trois dernieres secondes |
| `NumberStepper` | normal, appui long, desactive |
| `PrimaryButton` | normal, survol, focus, desactive, chargement |
| `RecordRow` | rang, libelle, valeur, progression |
| `EmptyState` | premiere utilisation, filtre sans resultat |
| `OfflineBanner` | hors ligne, retour en ligne |
| `Callout` | information, avertissement de securite, erreur |

---

## 7. Accessibilite et performance

| Objectif | Verification |
|---|---|
| Contraste texte >= 4,5 : 1, elements non textuels >= 3 : 1 | releve des styles calcules sur chaque paire de tokens utilisee |
| Cibles tactiles >= 44 x 44 px | mesure des rectangles de tous les boutons sur les ecrans seance, repos, nav |
| Focus visible sur toute action | `:focus-visible` present et contraste, parcours clavier complet |
| Chronos annonces sans saturation | `aria-live="polite"` limite aux paliers 30 s, 10 s, 5, 4, 3, 2, 1 et a la fin |
| Libelles accessibles sur la navigation basse | aucun texte retire sous 700 px (D14 corrige) |
| Zoom 200 % sans perte de fonction | verification avant livraison |
| Poids du precache < 8 Mo | mesure sur `dist/sw.js` et le total des fichiers precaches (D6) |
| Zéro emoji d'interface | recherche automatisee dans `src/` |

---

## 8. Manifeste et installation

```
id                /                       (identifiant stable)
name              Coach Ottman & Laura
short_name        Coach
start_url         /
scope             /
display           standalone
orientation       portrait
theme_color       #0B0F0E
background_color  #0B0F0E
lang              fr
categories        ["health","fitness","sports"]
icons             192 et 512 en PNG, dont une variante maskable
screenshots       3 captures (accueil, seance, progression) en 1080 x 1920
shortcuts         Demarrer Full Body A, Demarrer Full Body B, Cardio
```

Le manifeste est servi avec le bon type MIME et `_headers` conserve les en-tetes actuels.

---

## 9. Plan d'execution

| Lot | Contenu | Verification de sortie |
|---|---|---|
| L0 — Fondations | tokens et feuille de styles reecrite, Inter auto-hebergee, jeu d'icones unifie, manifeste, suppression des dependances inutilisees | tests verts, build vert, `document.fonts` non vide, `npm ls` sans dependance morte, theme coherent entre page et manifeste |
| L1 — Navigation et accueil | barre laterale desktop, onglets mobiles avec libelles, nouvel ecran Aujourd'hui, rail de semaine | captures 390 px et 1440 px, clics verifies sur chaque destination |
| L2 — Seance, repos, bilan | en-tete priorise, illustration reelle, repere "derniere fois", chrono, saisie, dialogue de sortie corrige | parcours complet d'une seance a 390 px, chaque bouton clique et chaque etat constate |
| L3 — Progression, historique, reglages | indicateurs compacts, courbes, records libelles, confirmation d'effacement | donnees injectees pour chaque etat, y compris vide |
| L4 — Accessibilite, performance, publication | contrastes, cibles, annonces, precache allege, manifeste installe | audits mesures, installation reelle, URL de production verifiee avant annonce |

Regles de travail : test d'abord pour chaque fonction pure, verification des clics ecran par ecran, et aucun lot annonce termine sans le couple build plus parcours verifie.

---

## 10. Critères d'acceptation

1. Titre d'accueil a 28 px maximum, aucun element typographique au-dela de 40 px.
2. `document.fonts` contient Inter en 400, 510 et 590.
3. Aucun emoji ni glyphe utilise comme icone dans `src/`.
4. `package.json` ne contient plus de dependance non importee.
5. `theme-color`, `background_color` et couleur de fond effective identiques.
6. Une seule carte accentuee par ecran.
7. Cibles tactiles toutes superieures ou egales a 44 px sur seance, repos et navigation.
8. Libelles francais sur tous les mouvements dans Progression.
9. Precache inferieur a 8 Mo.
10. Parcours verifie en 390 px et 1440 px : profil, controle d'energie, seance complete, repos, bilan, historique, progression, export, effacement.
11. Tests existants verts et nouveaux tests pour les fonctions pures touchees.

---

## 11. Risques

| Risque | Traitement |
|---|---|
| Le plan du 9 septembre et le code divergent | resynchroniser les cases du plan avant de commencer (audit fait, plan a mettre a jour) |
| Aucun depot Git dans le projet | initialiser un depot et committer l'etat actuel avant les lots L0 a L4 |
| Images de recettes extraites des PDF et absentes du fichier de credits | arbitrer avant toute publication : retrait ou remplacement |
| Reecriture de `styles.css` (277 regles) | migration par ecran, en conservant les selecteurs existants jusqu'a remplacement complet |
