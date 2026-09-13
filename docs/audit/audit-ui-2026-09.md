# Audit UI et conseils pour une application finie

Périmètre : l'application Coach Ottman & Laura (PWA locale, mobile d'abord, 390 px et
430 px). Méthode : mesures faites sur le dépôt et dans un navigateur réel, puis
vérification de chaque bibliothèque candidate à sa source (licence, fraîcheur,
activité) plutôt qu'en recopiant la liste des composants React.

---

## 1. Ce que j'ai mesuré

| Mesure | Valeur constatée | Lecture |
|---|---|---|
| Paquet JavaScript | 503 Ko brut, **155 Ko compressé** | lourd pour une application locale |
| Paquet CSS | 102 Ko brut, **20 Ko compressé** | beaucoup de valeurs isolées, voir plus bas |
| Dépendances de production | **5** | remarquablement sobre |
| Valeurs de `padding` distinctes | **93** | pas d'échelle d'espacement appliquée |
| Valeurs de `gap` distinctes | **40** | idem |
| Tailles de police distinctes | **45** | pas d'échelle typographique |
| Rayons distincts | **19** | dont 21 usages de `var(--r-md)`, le reste en dur |
| Écrans avec état vide explicite | 10 sur 12 | plutôt bon |
| Squelettes de chargement | **1 fichier** | manque pour le premier affichage |
| Annonces vocales (`aria-live`) | **2 fichiers** (les chronos) | les changements d'écran ne sont pas annoncés |
| Styles de focus visibles | 9 règles, 3 feuilles | correct |
| Espaces insécables avant `:` `;` `!` `?` | **0 sur 686 occurrences** | règle typographique française non appliquée |
| Couverture des écrans (tests) | bilan 1,5 %, point du samedi 2,2 % | la logique est testée, les écrans ne le sont pas |
| Linter, formateur, budget de paquet | **absents** | aucun garde-fou automatique sur le style ou le poids |

Limite honnête : je n'ai pas mesuré les temps de chargement sur un vrai téléphone
en réseau bridé. En local, la mesure ne veut rien dire ; le signal fiable reste le
poids transféré, ci-dessus.

---

## 2. Les huit manques qui empêchent de dire « fini »

Classés par rapport valeur attendue sur effort.

**1. Aucun garde-fou automatique sur le code.** Pas de linter, pas de formateur,
pas de budget de paquet, pas de règle d'accessibilité vérifiée. Rien n'empêche un
`console.log` oublié, un `any` implicite, une cible tactile de 30 px ou une
dépendance de 200 Ko d'entrer. C'est la première chose qu'une équipe industrie
installe, avant même d'écrire l'interface.

**2. Le système de style n'a pas d'échelle.** 93 `padding`, 45 tailles de police,
40 `gap` : chaque écran réinvente ses valeurs. Les jetons existent pour les
couleurs (60 jetons, contrastes verrouillés par test) mais pas pour l'espacement,
la typographie ni les rayons. Conséquence directe : les écarts se voient, et
chaque nouvel écran ajoute de la dérive.

**3. La typographie française n'est pas tenue.** 686 espaces normales avant deux-points,
aucune insécable. Sur une application française soignée, c'est le détail qui se voit
immédiatement — et le plus facile à corriger définitivement, avec un test qui
refuse la prochaine régression.

**4. Les écrans ne sont pas tenus par les tests.** Le moteur est bien couvert, les
écrans non. Le bilan et le point du samedi n'ont aucune garantie automatique : si
une modification casse un calcul d'affichage, seule une vérification à la main le
verra. Trois parcours en navigateur réel suffiraient à couvrir le chemin critique.

**5. Le premier affichage ne montre rien.** Une seule amorce de chargement dans tout
le code. À l'ouverture, le temps de lire IndexedDB et de charger le bloc paresseux,
l'écran est vide. Un squelette de la carte de séance coûterait peu et supprimerait
l'impression de lenteur.

**6. Le ressenti ne se transmet pas à la main sur 44 px.** Les gains sont là (chrono
sur l'horloge réelle, vibration, alternance des démonstrations), mais aucune
animation de transition entre les écrans, aucune animation de liste, et les grands
nombres (charges, moyennes) apparaissent d'un coup au lieu de défiler. C'est
exactement ce qui sépare une interface juste d'une interface qu'on a envie d'ouvrir.

**7. Rien ne raconte l'application à l'usage.** L'application affiche bien sa version
et signale les mises à jour — mais rien ne consigne ce qui a changé entre deux
versions (aucun journal des versions dans le dépôt). Les erreurs attrapées par la
barrière d'erreur sont montrées puis oubliées : aucune trace conservée, donc aucun
diagnostic possible à distance. Et l'invite d'installation automatique n'existe que
sur Android : les consignes écrites pour iPhone, qui en a besoin, sont absentes.
Ce sont les éléments qui font qu'une application paraît entretenue plutôt
qu'abandonnée.

**8. Le paquet porte des données qui pourraient ne pas être là.** 679 lignes de
tutoriels dans le bloc initial, alors que seule la séance du jour est utilisée.
Le premier écran ne devrait porter que ce qu'il affiche.

---

## 3. Bibliothèques vérifiées, une par une

Chaque ligne a été vérifiée par l'API GitHub (licence, étoiles, date du dernier
envoi) à la date de l'audit. Aucune n'est proposée sans son coût.

### À adopter

| Bibliothèque | Licence | Étoiles | Dernier envoi | Coût | Ce que ça règle |
|---|---|---|---|---|---|
| `eslint` + `eslint-plugin-jsx-a11y` | MIT | 3,6 k | janv. 2026 | dev | Manque 1 : le garde-fou, plus les règles d'accessibilité |
| `size-limit` | MIT | 6,9 k | sept. 2026 | dev | Manque 1 : un plafond de poids qui échoue si on le dépasse |
| `@formkit/auto-animate` | MIT | 13,9 k | juil. 2026 | environ 3 Ko | Manque 6 : les listes s'animent d'elles-mêmes (historique, point du samedi, exercices) |
| `number-flow` | MIT | 7,7 k | juil. 2026 | à mesurer | Manque 6 : les charges et les moyennes défilent au lieu de sauter |
| `vaul` | MIT | 8,6 k | oct. 2025 | environ 15 Ko | Le panneau de séance gagne le glissement de fermeture et les paliers d'ancrage |
| `react-remove-scroll` | MIT | 0,9 k | sept. 2026 | environ 2 Ko | Blocage du défilement d'arrière-plan dans les dialogues, propre sur iOS |
| `zod` | MIT | 43,9 k | sept. 2026 | environ 13 Ko compressé | Validation du fichier de sauvegarde importé : un fichier abîmé se refuse au lieu de corrompre le suivi |
| `driver.js` | MIT | 26,8 k | juil. 2026 | environ 5 Ko | Le didacticiel devient une visite guidée dans le contexte réel |

### À considérer

| Bibliothèque | Licence | Étoiles | Dernier envoi | Verdict |
|---|---|---|---|---|
| `motion` (ex Framer Motion) | MIT | 33,6 k | sept. 2026 | Seulement si un geste précis l'exige ; les transitions CSS et `prefers-reduced-motion` couvrent déjà l'essentiel. Coût réel de 15 à 30 Ko compressés |
| `radix-ui/primitives` | MIT | 19,3 k | août 2026 | Le dialogue utilise déjà Radix : poursuivre pour les prochains composants complexes uniquement (infobulle, sélecteur) |
| `dnd-kit` | MIT | 17,6 k | sept. 2026 | Réordonner les exercices d'une séance : vraie fonctionnalité, à concevoir avant d'intégrer |
| `react-wrap-balancer` | MIT | 4,2 k | mars 2026 | Environ 2 Ko pour des titres équilibrés : bon marché, effet net |
| `react-number-format` | MIT | 4,1 k | mars 2026 | Saisie des charges avec virgule française ; nos champs sont simples, valeur moyenne |
| `web-vitals` | Apache-2.0 | 8,6 k | sept. 2026 | Mesure locale des indicateurs, sans serveur : utile en développement, pas en production |

### À refuser, et pourquoi

| Écarté | Raison |
|---|---|
| `recharts`, `nivo`, kits de tableaux de bord | Nos courbes sont écrites à la main : plus légères, hors ligne, et surtout **elles s'impriment**. Une bibliothèque de graphiques casserait le bilan PDF, qui est notre différence |
| `tailwindcss` | Le système de jetons existe déjà. Une migration coûterait une semaine pour zéro gain visible |
| `@tanstack/react-query`, `swr` | Aucun serveur. Sans réseau à interroger, ces outils n'ont rien à faire |
| `sonner`, `react-hot-toast` | Notre notification maison est déjà alignée sur la charte, avec le bon contraste |
| `pmndrs/use-gesture` | Dernier envoi juillet 2024 : deux ans sans maintenance. Les gestes de `vaul` et de `motion` suffisent |
| `storybook` | Lourd (une construction séparée à entretenir) pour deux utilisateurs. Les tests de composants et la galerie `docs/ux-ui` remplissent déjà le rôle. À reconsidérer si l'équipe grandit |
| Polices d'icônes, jeux d'icônes externes | Notre jeu maison donne une identité que les icônes standardisées effacent |

---

## 4. Plan en trois lots

**Lot A — hygiène industrielle (priorité absolue).** Linter et formateur avec un
hook de pré-commit, règles d'accessibilité activées, budget de paquet avec plafond,
fichier de journal des versions. Vérification : le linter passe à zéro avertissement,
le budget échoue volontairement si on dépasse.

**Lot B — le système dans les règles.** Échelle d'espacement (4 px), échelle
typographique, rayons. Conversion des valeurs en dur, avec un test qui refuse toute
nouvelle valeur non issue d'un jeton — même mécanique que le test de contraste des
couleurs, qui a déjà fait ses preuves. Correction des 686 espaces avant deux-points,
tenue par un test.

**Lot C — le fini qui se voit.** Squelette au premier affichage, défilement des
grands nombres, animation des listes, transitions d'écran, feuille glissante pour le
panneau de séance, visite guidée, validation du fichier importé, annonce vocale des
changements d'écran, consignes d'installation écrites pour iPhone, et conservation
des erreurs pour pouvoir diagnostiquer après coup.

**Reste du troisième lot précédent** : trois parcours Playwright sur le chemin
critique (séance complète, point du samedi jusqu'au bilan, mise à jour de
l'application), et les tests des trois écrans récents.

---

## 5. Comment chaque promesse sera prouvée

Rien dans ce document ne demande à être cru sur parole. Chaque point du plan a sa
preuve : mesure avant et après pour le poids et le nombre de valeurs en dur ; test
qui échoue volontairement pour les jetons, la typographie et le contraste ;
parcours en navigateur réel avec captures pour les écrans ; audit des cibles
tactiles à 390 px pour l'accessibilité, déjà outillé.

---

## 6. Décision attendue

Trois voies possibles :

- **tout le plan** dans l'ordre A, B, C ;
- **A et B seulement**, qui rendent le dépôt tenable par une équipe sans rien
  demander à l'utilisateur ;
- **les quatre premiers points du lot C seulement** (squelette, nombres, listes,
  transitions), qui sont ceux qui changent le plus l'impression d'ensemble.

Les éléments refusés ne sont pas proposés par défaut : les rouvrir demande une
raison, pas une envie.
