# Réunion des dix experts — Coach Ottman & Laura

Compte rendu de propositions d'amélioration.

Date : 12 septembre 2026. Périmètre : application Ottman / Laura uniquement, l'espace
MUSTAPHA n'est pas concerné par ces propositions.

Chaque proposition est adossée à un constat mesuré dans le dépôt (ligne de code,
poids de fichier, test manquant), jamais à une intuition. Les propositions déjà
réalisées ont été écartées : le verrouillage d'écran (Wake Lock) est en place, les
courbes du bilan portent une alternative vocale, le contraste des couleurs est
vérifié par test.

---

## État des lieux mesuré

| Mesure | Valeur | Lecture |
|---|---|---|
| Lignes de source | 16 615 (composants 6 003, styles 3 481, moteur 3 316, domaine 1 647, dépôt 694) | Dense mais lisible |
| Fichiers de test | 47 fichiers, 366 tests | Très bien couvert pour la logique |
| Dépendances de production | 6 | Sobre |
| Paquet livré | 533 Ko de JavaScript, 99 Ko de CSS | Lourd pour une application sans serveur |
| Images d'exercices | 696 Ko pour 29 illustrations détourées | Bon ratio |
| Images MUSTAPHA | 112 Mo dans le dépôt, 12 fichiers de plus de 1 Mo | Disproportionné |
| Traces de debug et TODO | 0 | Propre |
| Fichiers suivis | 482 | — |

Deux anomalies de forme relevées au passage : `fake-indexeddb`, outil de test, est
déclaré dans les dépendances de production ; et le dossier `src/i18n` est vide.

---

## 1. Entraîneur force — programmation

**P1. Faire vivre la consigne de charge.**
La consigne du quiz (« charger plus », « même charge », « alléger ») est enregistrée
dans chaque séance et affichée dans le bilan, mais elle n'agit sur rien. Proposition :
suggérer une charge chiffrée sur la prescription de la séance suivante, selon une règle
explicite — deux séances de suite à effort inférieur ou égal à 7 sans gêne donnent
+2,5 kg sur les mouvements de bas du corps et +1,25 kg sur le haut ; toute gêne
signalée deux fois gèle la progression. Le chiffre reste une suggestion affichée, la
charge prescrite d'origine reste visible : l'athlète décide.
*Constat* : `loadConsigne` n'est lu qu'à l'affichage du bilan.
*Coût* : moyen. *Gain* : élevé — c'est la boucle de progression qui manque au produit.

**P2. Détecter la stagnation.**
Si la charge la plus lourde d'un exercice n'a pas bougé en trois semaines alors que
l'effort ressenti est bas, le bilan doit le dire au lieu de laisser les deux tableaux
côte à côte. Le moteur de lecture (`buildWeeklyReading`) sait déjà croiser poids,
mensurations et effort ; il manque l'axe charge.
*Constat* : les charges sont lues séance contre séance, jamais sur trois semaines.
*Coût* : faible. *Gain* : moyen.

**P3. Proposer une semaine allégée.**
Sur un cycle de huit semaines, une décharge se place naturellement en semaine 5 ou
après trois semaines d'effort moyen supérieur ou égal à 9. L'application connaît le
numéro de semaine et l'effort moyen : elle peut le proposer au bon moment.
*Coût* : faible. *Gain* : moyen — évite la casse et la lassitude.

**P4. Double progression.**
La prescription porte une charge et une fourchette de répétitions. Le moteur connaît
les répétitions réellement faites. Proposer d'abord d'ajouter des répétitions dans la
fourchette, et de n'augmenter la charge qu'une fois le haut de fourchette atteint sur
toutes les séries : c'est la méthode la plus solide pour une débutante comme Laura.
*Coût* : moyen. *Gain* : élevé.

---

## 2. Physiologie et santé

**P1. Ajouter le tour de hanches chez Laura.**
La formule marine exige le tour de hanches pour une femme : sans lui, son estimation
de masse grasse repose sur le seul RFM. Une mesure supplémentaire par semaine débloque
le second avis et le ratio taille/hanches, qui est le meilleur indicateur de
répartition des graisses dont on dispose sans matériel.
*Coût* : faible. *Gain* : moyen pour Laura seulement.

**P2. Formuler les alertes santé sans ambiguïté.**
Le tour de taille d'Ottman rapporte 0,66 au ratio taille/hauteur, très au-dessus du
seuil d'action de 0,6. L'application écrit « attention dès 0,5 ». Proposition : sortir
du registre de l'entretien sportif pour ces valeurs-là et écrire clairement qu'un
ratio au-dessus de 0,6 est un facteur de risque cardio-métabolique reconnu, et que
cela mérite un avis médical. Le suivi sportif continue, mais l'application ne laisse
pas croire qu'elle en fait un enjeu esthétique.
*Constat* : le libellé actuel est un repère de tableau, pas un message de santé.
*Coût* : faible. *Gain* : élevé en responsabilité.

**P3. Afficher la moyenne mobile déjà calculée.**
`movingAverage` existe dans le moteur et n'est appelé nulle part. Le bilan promet une
moyenne mobile sur quatre semaines qui n'apparaît jamais. La sortir sur la courbe de
poids rendrait le bruit d'hydratation lisible — une variation hebdomadaire inférieure
à 0,3 % n'est pas une tendance.
*Constat* : fonction morte dans `src/workout/followup.ts`.
*Coût* : faible. *Gain* : élevé — c'est la moitié de la valeur du paragraphe « analyse ».

**P4. Protocole de pesée affiché au moment de la saisie.**
Une phrase dans l'écran du samedi : même jour, même heure, à jeun, après les
toilettes, avant de boire. Deux lignes de texte qui valent mieux que trois semaines
de courbe bruitée.
*Coût* : trivial. *Gain* : moyen.

---

## 3. Expérience mobile, en salle

**P1. Reprendre la dernière valeur d'un geste.**
Aujourd'hui « Reporter la semaine dernière » remplit tout, et chaque champ exige son
propre chiffre. Proposition : afficher la dernière valeur en gris dans le champ, et
un appui dessus l'accepte ; seuls les champs réellement modifiés demandent un chiffre.
Trois mensurations sur huit bougent par semaine : la saisie passe de huit champs à
trois.
*Coût* : moyen. *Gain* : élevé — c'est la corvée hebdomadaire.

**P2. Régler la charge par paliers réels.**
Dans la séance, la charge se saisit au clavier numérique. Des boutons +1,25 kg et
+2,5 kg (haut et bas du corps) éviteraient d'ouvrir le clavier entre deux séries, avec
les mains moites.
*Coût* : faible. *Gain* : élevé.

**P3. Montrer l'avancement de la séance, pas seulement la série.**
Le compteur indique la série et l'exercice en cours. Ajouter « restant » en fin de
séance (« 6 séries, environ 14 min ») répond à la seule question qu'on se pose debout
entre deux machines.
*Coût* : faible. *Gain* : moyen.

**P4. Vérifier les cibles tactiles des écrans anciens.**
Le quiz et la saisie du samedi ont des cibles de 44 px, vérifiées. Les écrans écrits
lors des premières vagues n'ont pas été audités sous cet angle.
*Coût* : faible. *Gain* : moyen.

---

## 4. Données et visualisation

**P1. Courbe de force par exercice.**
Le bilan ne montre que « séance précédente / dernière séance ». Une courbe de la charge
la plus lourde sur huit semaines, par exercice, montrerait la progression réelle — la
seule preuve tangible d'un travail de force, plus parlante qu'une variation de poids.
Les données existent déjà dans les séances enregistrées.
*Coût* : moyen. *Gain* : élevé pour le coach.

**P2. Export CSV des séances.**
Un fichier que le coach ouvre dans un tableur, à côté du PDF. Aucun serveur, aucune
librairie supplémentaire.
*Coût* : faible. *Gain* : moyen.

**P3. État vide honnête plutôt que tableau de tirets.**
Quand une mesure manque ou a été écartée, le bilan aligne des tirets. Un état vide
explicite (« première semaine du suivi », « valeur écartée : écart invraisemblable »)
éviterait au coach de chercher pourquoi la colonne est vide.
*Coût* : faible. *Gain* : moyen.

**P4. Étendre la détection d'incohérence au tour de cou et au buste.**
Le garde-fou couvre déjà toutes les zones par seuil global ; il reste à écrire, dans
le bilan, la raison de l'exclusion par zone au lieu d'un simple tiret.
*Coût* : trivial. *Gain* : faible.

---

## 5. Plateforme mobile et installation

**P1. Un rappel qui ne dépend d'aucun serveur : le calendrier.**
Proposer un fichier calendrier (.ics) contenant le point du samedi, récurrent sur huit
semaines. L'athlète l'ajoute à son calendrier et reçoit un rappel natif, fiable, sans
serveur, sans notification web, sans compte. C'est la seule façon honnête d'obtenir un
rappel fiable sur iPhone pour une application locale.
*Coût* : faible. *Gain* : élevé — le point hebdomadaire est le cœur du suivi.

**P2. Prévenir quand la version installée prend du retard.**
Le bandeau de mise à jour n'apparaît que si le service worker a détecté une nouveauté.
Un rappel dans les réglages au-delà de sept jours de retard éviterait les « j'ai pas
les nouveautés » déjà vécus deux fois.
*Coût* : faible. *Gain* : moyen.

**P3. Écran de premier lancement hors ligne.**
Le premier chargement exige le réseau. Aujourd'hui l'athlète verrait une page blanche
sans explication. Trois lignes : « première ouverture : connecte-toi une fois ».
*Coût* : trivial. *Gain* : moyen.

**P4. Documenter le geste d'impression dans l'application.**
Le geste iOS (écarter l'aperçu pour obtenir le PDF) n'est pas devinable. Une aide d'une
ligne sous le bouton, au premier usage, éviterait le découragement.
*Coût* : trivial. *Gain* : moyen.

---

## 6. Performance et poids

**P1. Sortir l'espace MUSTAPHA du paquet principal.**
`MustaphaApp` est importé statiquement dans `App.tsx` : son code est chargé par toutes
les ouvertures de l'application Ottman. Un import paresseux ne le chargerait que
lorsqu'on ouvre réellement cet espace.
*Constat* : import en ligne 21 de `src/App.tsx`, 737 lignes de composants Mustapha.
*Coût* : faible. *Gain* : moyen sur le temps de démarrage.

**P2. Convertir les images MUSTAPHA en WebP.**
112 Mo dans le dépôt, 12 fichiers de plus de 1 Mo. Les 29 illustrations d'exercices ont
été ramenées à 696 Ko au total par ce même traitement. Le même passage sur MUSTAPHA
ramènerait probablement au dixième, et allègerait d'autant le dépôt, le clone et la
publication.
*Constat* : `public/mustapha` pèse 112 Mo, suivi par git.
*Coût* : moyen (traitement par lot). *Gain* : élevé — dépôt et publication.

**P3. Mesurer la couverture de test.**
366 tests sans chiffre de couverture : on ne sait pas ce qui n'est pas testé. Activer
la couverture et fixer un plancher empêcherait la couverture de se dégrader en
silence, comme l'erreur de compilation de `RestTimer.tsx` a pu survivre des semaines.
*Coût* : faible. *Gain* : élevé en confiance.

**P4. Ramener Inter à ses seuls caractères utilisés.**
132 Ko de polices pour un usage franco-français : un sous-ensemble dédié suffirait.
*Coût* : faible. *Gain* : faible.

---

## 7. Qualité et tests

**P1. Un test de navigateur réel, sur trois parcours.**
La suite actuelle tourne en environnement simulé. Deux défauts réels de cette semaine
n'auraient jamais été vus par elle : le chrono arrêté en arrière-plan et le format
d'impression non appliqué. Proposition : trois parcours Playwright — installation et
démarrage hors ligne, enchaînement complet d'une séance, génération du bilan imprimé.
*Coût* : moyen. *Gain* : élevé.

**P2. Automatiser le contrôle d'impression.**
L'outil `tools/print-bilan.mjs` produit un PDF et sait mesurer ses marges. Le brancher
en test — format A4, bord droit du texte dans la zone imprimable, absence de chrome —
figerait la correction d'aujourd'hui.
*Constat* : la règle `@page` ignorée dans un bloc `@media print` a vécu des semaines
sans être détectée.
*Coût* : faible. *Gain* : élevé.

**P3. Verrouiller les règles réglementaires par test.**
Contraste des cinq couleurs, cibles tactiles, format d'impression, ratio d'alerte
santé : tout ce qui relève d'une norme doit être vérifié par un test, jamais à l'œil.
*Coût* : faible. *Gain* : moyen.

---

## 8. Vie privée, sauvegarde et sécurité

**P1. Rappeler la sauvegarde.**
Toutes les données vivent dans le téléphone. Une chute, une réinstallation, un
nettoyage de navigateur, et le suivi complet disparaît. L'export existe déjà et n'est
jamais proposé. Proposition : proposer une sauvegarde après huit semaines de suivi ou
lorsque le dernier export date de plus d'un mois.
*Constat* : `exportProfileData` n'est déclenché que par un geste manuel.
*Coût* : faible. *Gain* : élevé — c'est le seul moyen de ne rien perdre.

**P2. Retirer les images de recettes du dépôt.**
Elles sont déjà exclues de la publication pour raison de droits, mais restent versionnées.
Un dépôt ne devrait pas porter ce qu'il ne publie pas.
*Coût* : trivial. *Gain* : moyen.

**P3. Ranger `fake-indexeddb` avec les outils de développement.**
Un outil de test déclaré en dépendance de production se retrouve dans l'analyse de
dépendances et fausse la lecture du poids réel du produit.
*Coût* : trivial. *Gain* : faible, mais c'est une question d'exactitude.

**P4. Ne jamais promettre ce qui n'est pas fait.**
Le bilan se termine par « aucune donnée envoyée automatiquement ». C'est exact et il
faut le garder à chaque ajout de fonctionnalité : la confiance tient à cette rigueur.
*Coût* : nul. *Gain* : élevé.

Précision : la biométrie, le chiffrement de l'export et la suppression à distance ont
été examinés puis écartés. Pour un suivi de deux personnes sur un téléphone personnel
non partagé, ils ajoutent de la complexité et une fausse impression de sécurité.

---

## 9. Accessibilité

**P1. Étendre le respect des animations réduites.**
`prefers-reduced-motion` n'est honoré que dans `workout.css`. Les animations de
transition des autres feuilles de style ne le respectent pas.
*Constat* : deux occurrences, toutes deux dans la même feuille.
*Coût* : faible. *Gain* : moyen.

**P2. Vérifier le zoom à 200 %.**
Un utilisateur malvoyant agrandit la page. Personne n'a vérifié que les huit champs du
samedi, les cinq pastilles de couleur et les tableaux du bilan restent utilisables à
200 %. Rien n'interdit de le mesurer maintenant.
*Coût* : faible. *Gain* : moyen.

**P3. Annoncer la fin du repos autrement que par un son.**
Les paliers du chrono sont sonores et vibrent. Une annonce vocale (région vive) serait
perceptible par un lecteur d'écran et utile dans une salle bruyante, écouteurs en place.
*Constat* : les paliers existent, l'annonce accessible non.
*Coût* : faible. *Gain* : moyen.

---

## 10. Produit et cap

**P1. Assumer le périmètre de deux personnes.**
Toute proposition qui suppose un compte, une synchronisation ou un tableau de bord
d'administration est refusée. Le produit tient sur trois promesses : la séance sans
friction, le point du samedi, le bilan au coach. Les propositions ci-dessus les
renforcent toutes ; aucune ne les dilue.

**P2. Boucler la boucle du coach.**
Le coach reçoit un bilan mais ne renvoie rien. Un champ de retour, saisi à la main par
l'athlète après la réponse du coach, stocké localement et repris dans le bilan suivant,
fermerait le cycle : « ce que le coach a dit » se retrouverait en tête du mois suivant.
*Coût* : faible. *Gain* : élevé — c'est le seul chaînon vraiment manquant du produit.

**P3. Mesurer l'assiduité pour la motivation.**
Une série de semaines consécutives avec séances complètes, affichée sur l'accueil. Rien
de compétitif, rien de notifié : une simple chaîne à ne pas rompre, calculée localement.
*Coût* : faible. *Gain* : moyen.

**P4. Prévoir l'interruption.**
Un cycle de huit semaines avec deux semaines d'absence produit des courbes en dents de
scie et un « écart de −0,3 kg » qui ne veut rien dire. Proposer un mode « pause »
(blessure, vacances) qui gèle le cycle au lieu de fausser les tendances.
*Coût* : moyen. *Gain* : élevé en honnêteté des courbes.

---

## Synthèse et ordre proposé

Les propositions sont classées par gain attendu rapporté au coût. Le classement est
sans appel sur trois d'entre elles, qui sont aussi les moins chères.

### À faire d'abord (premier lot)

| Proposition | Expert | Coût | Pourquoi maintenant |
|---|---|---|---|
| Afficher la moyenne mobile (fonction déjà écrite) | Physiologie | faible | La moitié de la valeur du bilan, pour quelques lignes |
| Rappel de sauvegarde | Vie privée | faible | Le seul risque de perte totale des données |
| Paliers de charge de 1,25 et 2,5 kg dans la séance | Expérience mobile | faible | La corvée quotidienne, réglée en une fois |
| Fichier calendrier du point du samedi | Plateforme | faible | Seul rappel fiable sans serveur sur iPhone |
| Mention santé explicite du ratio taille/hauteur | Physiologie | faible | Responsabilité, à corriger avant que le coach le relève |
| Ranger `fake-indexeddb` et retirer les recettes du dépôt | Vie privée | trivial | Hygiène, à faire au passage |

### Deuxième lot (la valeur produit)

| Proposition | Expert | Coût |
|---|---|---|
| Consigne de charge reprise sur la prescription suivante | Entraîneur force | moyen |
| Courbe de force par exercice dans le bilan | Données | moyen |
| Saisie du samedi par reprise des valeurs d'un appui | Expérience mobile | moyen |
| Champ de retour du coach | Produit | faible |
| Test d'impression automatisé | Qualité | faible |
| Série d'assiduité sur l'accueil | Produit | faible |

### Troisième lot (fonds)

| Proposition | Expert | Coût |
|---|---|---|
| Doubles progressions et détection de stagnation | Entraîneur force | moyen |
| Import paresseux de MUSTAPHA et conversion WebP des images | Performance | moyen |
| Couverture de test mesurée et plancher | Performance | faible |
| Trois parcours de test en navigateur réel | Qualité | moyen |
| Mode pause du cycle | Produit | moyen |
| Accessibilité : animations, zoom 200 %, annonces vocales | Accessibilité | faible |

### Ce que la réunion refuse

Un serveur, un compte, une synchronisation entre appareils, l'envoi automatique du PDF,
les photographies de progression, un tableau de bord d'administration, la biométrie,
et la notification web poussée. Ces refus sont cohérents avec les décisions déjà
actées, ils protègent la promesse du produit : tout est dans le téléphone, rien ne
part sans un geste de l'athlète, et le bilan est un document que son coach lit en une
minute.
