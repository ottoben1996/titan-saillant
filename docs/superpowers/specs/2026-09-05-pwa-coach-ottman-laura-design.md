# PWA de coaching sportif Ottman / Laura

Date : 5 septembre 2026

## Objectif

Créer une application web installable sur téléphone (PWA), utilisable hors
connexion, qui guide séparément Ottman et Laura pendant leurs séances à partir
de leurs programmes PDF respectifs.

## Utilisateurs et confidentialité

- Deux profils locaux : Ottman et Laura.
- Chaque téléphone conserve ses propres données.
- Aucun compte, serveur ou synchronisation automatique.
- Export et import manuels d'une sauvegarde JSON.

## Parcours utilisateur

L'accueil permet de choisir le profil local, de lancer les séances Full Body A,
Full Body B ou Cardio, de voir la dernière séance et de reprendre une séance
interrompue.

Une séance suit les étapes suivantes :

1. échauffement ;
2. exercice et tutoriel ;
3. série avec charge, répétitions ou durée prescrite ;
4. validation de la série et saisie de la performance réelle ;
5. repos automatique ;
6. exercice suivant ou circuit suivant ;
7. retour au calme ;
8. résumé et sauvegarde locale.

## Données métier

Le programme prescrit est immuable dans l'application. Les performances réelles
et les notes sont enregistrées dans des séances séparées. Chaque série peut
contenir : charge prescrite, répétitions/temps prescrits, charge réelle,
répétitions/temps réels, statut, note et horodatage.

Les séances initiales sont saisies à partir des PDF Ottman et Laura, en
conservant les différences de charges, répétitions et repos.

## Minuteurs

Le moteur de séance gère les repos par exercice, les repos de circuit, les
durées d'exercice, les comptes à rebours, pause/reprise, ajout de temps,
signal sonore, vibration et annonce vocale optionnelle. Le minuteur doit
survivre à la fermeture puis permettre la reprise de l'état sauvegardé.

## Tutoriels

Chaque exercice possède une fiche en français : muscles, matériel, position,
étapes, erreurs fréquentes et consignes de sécurité. Une animation ou vidéo
externe peut compléter la fiche, mais les instructions essentielles restent
disponibles hors connexion.

## Interface

Interface mobile-first, mode sombre, contraste élevé, gros boutons, écran
maintenu actif pendant la séance, commandes pause/reprise et navigation réduite.
Le prochain exercice, le temps restant et l'action principale doivent rester
visibles sans défilement.

## Robustesse et validation

- sauvegarde automatique après chaque série ;
- reprise après fermeture ou interruption ;
- confirmation avant suppression ;
- export/import JSON ;
- fonctionnement hors connexion ;
- messages explicites si une vidéo externe est indisponible ;
- comparaison des données intégrées avec les deux PDF ;
- tests du minuteur, des circuits, de la reprise et de l'import/export ;
- vérification sur écran mobile et pendant une séance réelle.

## Hors périmètre initial

Pas de compte en ligne, de synchronisation entre téléphones, de modification
automatique du programme du coach, de recommandations médicales ni de
connexion obligatoire à une plateforme vidéo.
