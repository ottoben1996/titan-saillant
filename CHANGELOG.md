# Journal des versions

Ce que chaque version change, du point de vue de l'utilisateur. Les détails
techniques restent dans l'historique des envois ; ce fichier dit ce qui a bougé
et pourquoi.

## En préparation

### Hygiène industrielle
- Linter, formateur et règles d'accessibilité appliqués à tout le code, avec un
  contrôle automatique avant chaque envoi : plus aucune modification ne peut
  introduire un bouton sans type, une étiquette sans champ, un schéma sans titre
  ni un message de débogage oublié.
- Plafond de poids du paquet : la construction échoue si l'application dépasse
  165 Ko compressés de JavaScript, 22 Ko de styles, ou 16 Ko pour l'espace
  MUSTAPHA.
- Fins de ligne et encodage figés par configuration, pour que le dépôt reste
  identique sur n'importe quel poste.

### Accessibilité
- Des étiquettes de lecture d'écran inopérantes ont été rendues effectives : un
  libellé posé sur un élément sans rôle était ignoré, donc jamais lu.
- Les schémas musculaires annoncent désormais ce qu'ils montrent, et les groupes
  de choix sont annoncés avec leur titre.

## 0.3.0 — les dix-huit propositions

Trois lots issus de la revue des dix experts, livrés et vérifiés en ligne.

### Ajouté
- **Moyenne mobile** sur la courbe de poids, avec le seuil sous lequel une
  variation n'est que du bruit d'hydratation.
- **Rappel de sauvegarde** : après huit séances et sans export depuis un mois,
  l'accueil propose d'exporter les données, avec report possible.
- **Paliers de charge par mouvement** : ±2,5 kg sur le bas du corps, ±1,25 kg sur
  le haut, au lieu d'une seule valeur pour tout.
- **Fichier calendrier** du point du samedi : huit samedis, rappel trente minutes
  avant, à ouvrir une fois.
- **Mention santé** du rapport tour de taille sur hauteur, avec la phrase qui
  rappelle que ce suivi ne remplace pas un avis médical.
- **Force par exercice** dans le bilan : courbe miniature par mouvement, écart du
  cycle, et détection des charges qui stagnent depuis trois passages.
- **Retour du coach** : champ facultatif dans le point du samedi, repris en tête
  du bilan suivant.
- **Reprise d'une valeur d'un appui** dans le point du samedi, au lieu de la
  ressaisir.
- **Série d'assiduité** sur l'accueil : huit semaines, la semaine en cours ne
  casse jamais la série.
- **Mode pause du cycle** : les courbes sont gelées, pas faussées, et la
  numérotation reprend où elle s'est arrêtée.
- **Consigne de charge** : « charger plus » tient lieu d'aisance dans la
  progression proposée ; « alléger » interdit toute progression, sans jamais
  toucher à la charge prescrite par le coach.

### Modifié
- **L'espace MUSTAPHA** ne se charge qu'à son ouverture : 20 Ko sortent du paquet
  initial.
- **Images MUSTAPHA** : 251 fichiers non référencés par le moindre écran
  supprimés, les 23 réellement servies passées en WebP. 106,7 Mo deviennent 1,2 Mo,
  et la publication en ligne passe de 211 Mo à 2,7 Mo.
- **Cibles tactiles** du point du samedi portées à 44 px, mesurées par audit à
  390 px.
- **Ressenti de la semaine** borné à la fenêtre du point : il listait toutes les
  séances du cycle.

### Corrigé
- **La sauvegarde ne contenait pas les points du samedi.** Le fichier exporté
  transportait les séances et les préférences, pas les mesures ni les notes du
  coach : une restauration effaçait donc tout le suivi dans la durée, et le
  rappel de sauvegarde protégeait ce qui se refait en une séance plutôt que ce
  qui ne se refait pas. L'export et la restauration couvrent désormais les
  mesures, et un fichier abîmé est refusé en nommant le champ fautif au lieu
  d'entrer à moitié dans la base. Les sauvegardes précédentes restent lisibles.
- Chemins d'assets de l'espace MUSTAPHA : absolus, ils renvoyaient une erreur 404
  sur le site publié en sous-dossier.
- Plage de dates iCalendar repliée selon la norme, sans quoi le texte aurait été
  tronqué par les agendas.
- Tolérance de la fenêtre hebdomadaire ramenée de douze à deux heures : une séance
  du samedi après-midi comptait dans deux bilans.
- Règle d'impression déplacée hors du bloc d'impression : le PDF sortait au format
  américain et la dernière colonne était coupée.

## 0.2.0 — suivi, bilan et couleurs

### Ajouté
- **Point du samedi** : huit zones mesurées, écart calculé en direct, garde-fou sur
  les écarts invraisemblables (la valeur est conservée mais écartée des tendances).
- **Bilan imprimable** : synthèse, charges de travail, ressenti, courbes, lecture
  de la semaine, en trois pages A4.
- **Quiz de fin de séance** : effort, forme, gêne et localisation, consigne de
  charge ; « terminer sans renseigner le ressenti » toujours offert.
- **Couleur par profil** : cinq palettes, contrastes vérifiés par test au-delà du
  seuil AAA.

## 0.1.0 — l'application

- Suivi de séance guidé, chronomètre de repos qui survit à l'arrière-plan,
  historique, progression par exercice.
- Fonctionnement hors ligne complet, mise à jour depuis les réglages.
- Deux profils isolés sur le même appareil, sans compte ni serveur.
