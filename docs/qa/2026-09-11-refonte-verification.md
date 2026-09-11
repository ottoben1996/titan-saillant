# Refonte Coach Ottman & Laura — vérification

Date : 11 septembre 2026
Périmètre : application Ottman / Laura. L'espace MUSTAPHA n'a pas été modifié.
Méthode : build de production servi localement, pilotage réel du navigateur dans deux cadres mobiles (390 x 844 pour l'iPhone 13, 430 x 932 pour le Xiaomi 17 Pro Max). Chaque valeur ci-dessous est relevée dans le DOM ou dans la sortie d'une commande.

## 1. Fondations

| Point | Avant | Après | Mesure |
|---|---|---|---|
| Police réellement chargée | aucune police déclarée chargée, rendu en police générique | Inter variable auto-hébergée | `document.fonts` contient « Inter Variable: loaded » ; largeur de rendu de référence 326 px contre 281 px pour une police inexistante |
| Fond d'écran | dégradé radial décoratif (5 dégradés au total) | `#0B0F0E` plat | `background-image: none`, `background-color: rgb(11, 15, 14)` |
| Titre principal d'accueil | 86,4 px | 28 px | `font-size` calculée sur `h1` |
| Rayons des cartes | jusqu'à 24 px | 14 px | `border-radius` calculée sur `.workout-card` |
| Plancher typographique | 87 déclarations entre 9 et 11 px | 12 px minimum | 87 remplacements appliqués dans `src/styles.css` |
| Dépendances inutilisées | `lucide-react`, `@phosphor-icons/react`, `recharts` installés sans import | retirées | bundle JS identique avant/après (465 kB) : elles n'étaient pas embarquées, seul le poids d'installation diminuait |

## 2. Poids hors ligne

| | Entrées précachées | Poids |
|---|---|---|
| Avant | 190 | 73 188 KiB (71,5 Mo) |
| Après | 39 | 1 156 KiB (1,13 Mo) |

Les images lourdes de MUSTAPHA restent disponibles hors ligne via une mise en cache à la première visite (`CacheFirst`, 400 entrées maximum, 60 jours).

## 3. Comportement mobile

| Contrôle | Résultat mesuré |
|---|---|
| Libellés de navigation sous 700 px | visibles : « Séances », « Progression », « Historique », « Profil » |
| Hauteur des cibles de navigation | 56 px (exigence 44 px) |
| Marge basse réservée | 104 px sur `.app-shell`, barre à 8 px + `env(safe-area-inset-bottom)` |
| Onglet actif annoncé | `aria-current="page"` sur l'onglet courant |
| Zoom automatique iOS sur les champs | `font-size: 16px` sur tous les champs de l'application |
| Pastille de connexion | masquée en ligne, affichée « Hors ligne » en perte de réseau (vérifié par déclenchement d'événements `offline` / `online`) |

## 4. Parcours vérifiés au clic

| Parcours | Observation |
|---|---|
| Choix de profil | mène à l'accueil du bon profil |
| Lancement d'une séance | ouvre le contrôle d'énergie, la sélection d'un niveau applique la classe `selected` |
| Démarrage | écran de séance affiché, barre de navigation masquée, `workout-shell` actif |
| Validation des séries | progression 2/26 → 6/26, passage d'exercice (Équilibre sur bosu → Rameur → Presse à cuisse inclinée), entrée en repos après une série de travail |
| Chrono de repos | 00:25 + 30 s = 00:55, mise en pause puis reprise à 00:55, « Passer » ferme le chrono |
| Dialogue de sortie | « Mettre en pause » / « Continuer la séance » ; continuer conserve la séance, mettre en pause revient à l'accueil avec bannière de reprise |
| Reprise | la bannière ramène exactement à l'étape en cours |
| Rechargement en plein repos | chrono 01:15 → 01:13 après rechargement, exercice et compteur 7/26 conservés |
| Export | un Blob est créé et le message « Sauvegarde exportée. » apparaît |
| Signal sonore | l'interrupteur bascule `true` → `false`, écrit la préférence locale, puis la restaure |
| Notifications | refus du navigateur traité proprement : « Alertes non activées. », aucune exception |
| Navigation | Progression, Historique et Profil s'affichent ; les cartes d'historique sont informatives (`article`), aucun clic mort |
| Console | aucune erreur JavaScript ni avertissement relevé pendant tous les parcours |

## 5. Données

- 61 séances injectées : Progression rendue en 64 ms, Historique en 63 ms, 61 lignes affichées, aucun avertissement.
- Libellés des mouvements corrigés : « Vélo stationnaire », « Presse à cuisse inclinée », « Coiffe des rotateurs », « Équilibre sur bosu », « Rameur » au lieu des identifiants techniques.
- Séparation des profils conservée : les mesures sont faites profil par profil, sans fuite constatée.

## 6. Écran de séance

| Point | Avant | Après |
|---|---|---|
| Zone visuelle | bandeau vide d'environ 320 px au milieu de l'écran | illustration réelle du mouvement issue du jeu RepDB : deux images 512 x 512 affichées en 153 x 200 (départ → arrivée), repli pictogramme si l'image manque |
| Hauteur de la carte de prescription | 387 px pour 67 px de contenu | 337 px, contenu dense |
| Badge « RÉPÉTITIONS » | troisième couleur d'accent de l'écran | supprimé, l'information figure déjà dans la prescription |
| Bandeau duo | pleine largeur, badges permanents | limité à 20 rem, pilules compactes de 32 px |

## 6 bis. Échec du stockage local

Constat d'audit : `src/App.tsx` enchaînait 11 écritures IndexedDB sans aucune gestion d'erreur (`0` occurrence de `.catch`). En navigation privée iOS, en quota dépassé ou base bloquée, la série semblait validée sans être enregistrée.

Correctif : toutes les opérations passent par `src/storage/guard.ts` (`withStorageGuard`), qui renvoie un repli explicite et déclenche une bannière visible `role="alert"` :

> « Stockage local indisponible : tes séries ne sont pas enregistrées. Autorise le stockage du site ou quitte la navigation privée. »

Vérification en navigateur : en forçant `IDBObjectStore.prototype.put` à lever une exception, la bannière apparaît après validation d'une série (26 px de haut, bouton de validation toujours visible dans la fenêtre, aucun défilement parasite). Sans le correctif, aucun signal n'apparaissait. 11 sites d'écriture sécurisés, `tsc` sans erreur.

## 6 ter. Robustesse applicative et confort tactile (11 septembre, soirée)

| Ajout | Ce que ça change | Vérification |
|---|---|---|
| Filet de sécurité d'affichage (`src/components/layout/ErrorBoundary.tsx`) | une erreur de rendu n'entraîne plus une page blanche : panneau d'erreur français, mention explicite que les données restent sur l'appareil, bouton de rechargement | test unitaire (2 cas) **et** vérification dans le navigateur en forçant une erreur de rendu : le panneau s'affiche, capture à l'appui |
| Mise à jour différée pendant une séance (`src/main.tsx`, `src/App.tsx`) | une nouvelle version du service worker ne recharge plus l'application au milieu d'une série : l'accueil affiche « Une version plus récente est prête » avec un bouton « Mettre à jour » | lecture du code plus comportement du service worker ; le rechargement différé n'est pas exerçable sans déploiement (voir section 8) |
| Confort tactile (`src/styles/mobile.css`) | plus de sélection de texte accidentelle ni de menu contextuel en appuyant sur un bouton, alors que le texte informatif reste sélectionnable | règles CSS appliquées après celle de la feuille principale, à confirmer sur appareil |
| Écran de lancement iOS (`public/splash/`, `scripts/generate-splash.py`) | plus de flash blanc à l'ouverture depuis l'écran d'accueil de l'iPhone 13 | deux images générées en local, 1170x2532 et 1290x2796, déclarées avec les requêtes média correspondantes |

## 7. Accessibilité

- Annonces de chrono limitées aux paliers utiles (120 s, 60 s, 30 s, 10 s, 5, 4, 3, 2, 1, fin) : 8 annonces au maximum sur 60 secondes, jamais une par seconde. 5 tests couvrent les paliers, le silence, la fin et les valeurs invalides.
- `aria-live` retiré du conteneur de chrono qui annonçait chaque seconde.
- Toutes les actions de chrono, de repos, de réglages et de navigation atteignent au moins 44 px.
- Aucun emoji utilisé comme icône dans l'application Ottman/Laura (relevé par recherche sur `src/`) ; les glyphes restants sont cantonnés à l'espace MUSTAPHA.

## 7 bis. Deuxième vague (nuit du 11 au 12 septembre)

Trois agents ont travaillé en parallèle sur des périmètres disjoints, puis une vague de tests d'intégration. Deux agents ont été interrompus par l'épuisement du crédit DeepSeek (HTTP 402) ; leur travail a été repris et terminé à la main.

| Livraison | Détail vérifié |
|---|---|
| Illustrations | 29 fichiers : ajout du squat Smith (même jeu RepDB, style identique), et **détourage du fond bleu clair** des 29 illustrations (licence RepDB autorisant le recadrage et la modification pour l'usage in-app). Script reproductible : `scripts/prepare-exercise-media.py`. Total 628 Ko. Chaque entrée conserve crédit, source et licence ; un test échoue si un chemin pointe vers un fichier absent. |
| Mouvements sans illustration honnête | `skierg`, `sit-to-stand`, `bosu` restent volontairement sans image (aucun équivalent crédible, un candidat vérifié visuellement montrait un autre mouvement) : repli pictogramme assumé et testé. |
| Écran de séance | « Dernière fois : 22,5 kg × 30 s » affiché juste au-dessus du champ, avec écart ; préréglages de repos +15/+30/+60 s (module pur testé) ; carte de repos enrichie (série suivante, séries restantes, charge) ; séance tenant dans 100dvh. |
| Accueil | Rail de semaine (terminée / aujourd'hui / à venir), action dominante, métriques compactes, dernière séance, conseil du coach. |
| Progression | Indicateurs compacts, comparaison chiffrée avec la semaine précédente, records en libellés français, tendance. |
| Historique | Regroupement par semaine, durée, séries, RPE, volume par séance, état vide avec appel à l'action. |
| Réglages | Sections (préférences, mes données, application), confirmation d'effacement annonçant le nombre de séances. |
| Confirmation | `window.confirm` natif retiré : la bascule de profil passe par un dialogue de l'application (`ConfirmDialog`), accessible au clavier, testé. |
| Charges | Un seul formateur `formatLoadKg` : « 22,5 kg » et non « 22.5 kg », dans les six emplacements concernés. |
| Mise en forme | Badge de comparaison corrigé : « Première semaine » au lieu de deux libellés collés. Sans semaine de référence, la comparaison affiche la valeur de la semaine sans signe trompeur. |

### Trois défauts réels trouvés et corrigés

1. **Violation des règles des hooks React (antérieure à la refonte)** : `WorkoutScreen` retournait tôt quand la séance était terminée, avant quatre hooks déclarés plus bas — React levait « Rendered fewer hooks than expected », ce qui cassait l'écran de bilan. Le retour anticipé est déplacé après tous les hooks. Vérifié par le test d'intégration [1] et [5], qui échouaient avant le correctif.
2. **Séance orpheline** : démarrer un second créneau laissait deux séances « en cours », la première devenant impossible à terminer depuis l'interface. La séance précédente est désormais clôturée avec ses séries réelles, et le test [6] vérifie qu'une seule séance reste ouverte.
3. **Champs sans nom accessible** : les champs répétitions, charge et durée n'avaient ni `label` ni `aria-label` (un lecteur d'écran annonçait « champ de saisie » sans dire ce qu'il mesure). Corrigé pour les trois, test [6b].

### Dossier de tests

| | Début de soirée | Maintenant |
|---|---|---|
| Fichiers de tests | 27 | 40 |
| Tests | 91 | 320 |

Parcours d'intégration pilotés par l'interface : 7 (profil → accueil → énergie → échauffement → travail → repos → fin de séance, reprise après remontage, pause/reprise, isolation des profils, bilan, séance orpheline, noms accessibles).

## 7 ter. Défaut d'interface signalé par capture (chrono de tempo)

Signalement : sur le chrono de tempo, l'intitulé, le chiffre et l'état « Prêt à démarrer » se chevauchaient.

Mesures relevées à 390 px, carte de 340 px, avant correction :

| Élément | Mesure | Lecture |
|---|---|---|
| Colonne d'actions | 3 boutons empilés, 143 px de haut | écrasait la lecture dans 158 px de large |
| Intitulé « COMPTEUR TEMPO » | 46 px | coupé sur deux lignes |
| État « Prêt à démarrer » | 36 px | coupé sur deux lignes |
| Chiffre / état | **chevauchement de 20 px** | le défaut visible sur la capture |

Après correction : intitulé sur une ligne (15 px), chiffre et état sur la même ligne de base (32 px / 15 px), boutons en deux rangées — « Démarrer » pleine largeur au-dessus de « Passer » et « Recommencer » — toutes les cibles à 44 px, chrono de 168 px.

Second défaut visible sur la même capture, corrigé dans la foulée : pour un mouvement **sans illustration** (`bosu`, `skierg`, `sit-to-stand`), la carte de prescription s'étirait et laissait une zone morte de ~90 px, et laissait ~180 px de vide sur un écran de 932 px de haut. La carte se contente désormais de son contenu et l'espace libéré accueille le **repère clé du tutoriel** (« REPÈRE CLÉ — Regard fixe devant, appui au centre du bosu »), du contenu réel plutôt qu'un vide. Carte mesurée après correction : 193 px (390 × 844) et 196 px (430 × 932), sans débordement de page dans les deux cas.

## 7 quater. Mise en ligne

Application publiée : **https://ottoben1996.github.io/titan-saillant/** (dépôt public `ottoben1996/titan-saillant`, GitHub Pages, HTTPS forcé).

Publié : le dossier construit uniquement (aucune source, aucun document interne, aucun harnais de contrôle). Le chemin de base est injecté au déploiement (`VITE_BASE=/titan-saillant/`), les manifestes sont passés en chemins relatifs et un point d'entrée `mustapha/index.html` rend l'espace Mustapha accessible sous son chemin. Repli `404.html` pour les chemins gérés côté client.

Écarté de la publication : `mustapha/assets/recipes_extracted` (4,1 Mo, 5 images extraites des PDF de recettes) — provenance non documentée dans les crédits, publier vaudrait redistribution. À réintégrer sur décision explicite.

Contrôles effectués sur l'adresse en ligne : racine, manifeste, `sw.js`, icône 192, police, illustration d'exercice et écran de lancement en 200 avec contenu réel ; manifeste lu par le navigateur (`start_url` et `scope` relatifs, 4 icônes) ; service worker actif sous `/titan-saillant/sw.js` et page contrôlée ; 43 entrées en précache ; **zéro message console, zéro exception JS**.

## 8. Ce qui n'a PAS été vérifié

1. Les encoches réelles : `env(safe-area-inset-*)` vaut 0 dans un navigateur de bureau, la structure est en place mais l'effet réel demande un appareil ou une émulation avec encoche.
2. Safari iOS et le rendu Android natif : les essais sont faits dans un navigateur de bureau à largeur mobile.
3. Démarrage hors ligne à froid après installation (nécessite un déploiement).
4. Mise en cache à la première visite des images MUSTAPHA (configuration en place, non exerçable sans déploiement).
5. Espace MUSTAPHA : non retouché, donc non re-vérifié au-delà de ses tests unitaires.
6. Droits des images de recettes extraites des PDF : point ouvert, non traité.
7. Écran de bilan : vérifié par le test d'intégration (durée, séries, volume, meilleure charge lus dans le rendu réel) mais **pas par capture d'écran** — le harnais de contrôle à deux cadres n'était plus servi par le serveur de prévisualisation en fin de session.
8. Comparaison hebdomadaire affichée avec une vraie semaine de référence : le cas « première semaine » a été vu à l'écran, le cas « avec référence » seulement en test.

## 9. Dossier de tests

| | Avant | Après |
|---|---|---|
| Fichiers de tests | 21 | 26 |
| Tests | 68 | 89 |

Nouveaux tests : alertes de chrono et vibration (5), annonces accessibles des chronos (5), libellés d'exercices (3), garde-fou de stockage (4), dépôt des séances (4).
