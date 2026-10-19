# Planche de références — d'où viennent les choix

Dix références, commentées. Pour chacune : ce qu'on y prend, et ce qu'on n'y
prend jamais. Cette planche accompagne `DESIGN.md` ; elle sert à calibrer un
écran en trente minutes, pas à copier un composant.

| # | Référence | On y prend | On n'y prend pas |
|---|---|---|---|
| 1 | [minimal.gallery](https://minimal.gallery) | Le calibrage : peu de surfaces, beaucoup d'espace, une seule couleur qui travaille. Trente minutes avant de figer un écran. | Les mises en page éditoriales et les grands aplats — notre fond est un outil, pas une vitrine. |
| 2 | [refero.design/styles](https://refero.design/styles) | La lecture de la catégorie santé/fitness : échelles typographiques réelles, densité des applications qui vivent dans une poche. | Les palettes saturées et les dégradés de marque : notre accent suit le profil et reste mesuré. |
| 3 | [component.gallery](https://component.gallery) | La grille de revue : chaque composant passé au crible des états (vide, chargé, erreur, désactivé, focus). Elle est reprise dans `DESIGN.md` § 8. | Le catalogue lui-même : nous avons déjà nos composants, on emprunte la méthode de relecture. |
| 4 | [appshot.gallery](https://appshot.gallery) | Le contrôle de densité mobile : ce qui tient réellement à 390 et 430 px, captures d'appareils en main. | Les compositions marketing, hors contexte d'utilisation. |
| 5 | [designmd.ai](https://designmd.ai) | La structure d'un contrat de design lisible par un agent : jetons, états, interdits, checklist. Elle a donné la forme de `DESIGN.md`. | Le gabarit générique : notre contrat parle de nos jetons et de nos contraintes, pas de marque fictive. |
| 6 | [21st.dev](https://21st.dev) | Une banque de motifs à chercher côté agent quand un besoin précis apparaît (dialogue, onglets, révélation). | Le code : rien n'entre dans l'application sans réécriture complète aux jetons, et sans mesure de paquet. |
| 7 | [kinetics.colorion.co](https://kinetics.colorion.co) | Le vocabulaire de mouvement : ce qu'un déplacement doit dire (venir de la droite, se poser, confirmer). Quatre signatures maximum. | Les animations continues et décoratives, incompatibles avec le repos et la batterie d'une salle. |
| 8 | [motion-primitives.com](https://motion-primitives.com) | Les patterns d'interaction : enfoncement, bascule, onglets, retour du stepper. Réécrits en ressorts CSS, sans dépendance. | La bibliothèque elle-même et son esthétique par défaut. |
| 9 | [microkit.co](https://microkit.co) | Trois micro-détails, pas plus : la coche qui se dessine, la pulsation de succès, le retour visuel d'un pas. | Les effets accumulés au même endroit — un écran, une intention. |
| 10 | [circleloaders](https://circleloaders.com) | La forme de l'anneau de repos : progression circulaire, chiffre au centre, mise à jour une fois par seconde et animée en transformation seulement. | Les cercles multiples, les pulsations en boucle et les chargements décoratifs. |

## Comment s'en servir

- Une référence ne justifie jamais une dépendance : elle justifie un dessin.
  Le coût se paie en CSS et en relecture, jamais en kilo-octets.
- Toute idée retenue doit survivre aux jetons (`src/styles/tokens.css`), aux
  quatre signatures de mouvement, et au mode mouvement réduit.
- Une idée qui a besoin d'un réseau, d'un compte ou d'un écran large est
  refusée par défaut.
- Les parcours vérifiés à 390 px (voir `DESIGN.md` § 11) restent la référence
  interne : ce que l'application fait réellement, écran en main.
