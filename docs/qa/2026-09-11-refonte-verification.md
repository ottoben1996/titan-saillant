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

## 7. Accessibilité

- Annonces de chrono limitées aux paliers utiles (120 s, 60 s, 30 s, 10 s, 5, 4, 3, 2, 1, fin) : 8 annonces au maximum sur 60 secondes, jamais une par seconde. 5 tests couvrent les paliers, le silence, la fin et les valeurs invalides.
- `aria-live` retiré du conteneur de chrono qui annonçait chaque seconde.
- Toutes les actions de chrono, de repos, de réglages et de navigation atteignent au moins 44 px.
- Aucun emoji utilisé comme icône dans l'application Ottman/Laura (relevé par recherche sur `src/`) ; les glyphes restants sont cantonnés à l'espace MUSTAPHA.

## 8. Ce qui n'a PAS été vérifié

1. Les encoches réelles : `env(safe-area-inset-*)` vaut 0 dans un navigateur de bureau, la structure est en place mais l'effet réel demande un appareil ou une émulation avec encoche.
2. Safari iOS et le rendu Android natif : les essais sont faits dans un navigateur de bureau à largeur mobile.
3. Démarrage hors ligne à froid après installation (nécessite un déploiement).
4. Mise en cache à la première visite des images MUSTAPHA (configuration en place, non exerçable sans déploiement).
5. Espace MUSTAPHA : non retouché, donc non re-vérifié au-delà de ses tests unitaires.
6. Droits des images de recettes extraites des PDF : point ouvert, non traité.

## 9. Dossier de tests

| | Avant | Après |
|---|---|---|
| Fichiers de tests | 21 | 24 |
| Tests | 68 | 81 |

Nouveaux tests : alertes de chrono et vibration (5), annonces accessibles des chronos (5), libellés d'exercices (3).
