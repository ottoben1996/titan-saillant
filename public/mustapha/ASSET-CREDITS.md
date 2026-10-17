# MUSTAPHA — crédits des assets

Les assets sont copiés localement sous `public/mustapha/assets/` afin d’éviter les hotlinks et de conserver un fonctionnement hors connexion.

## Free Exercise DB

- Source : https://github.com/yuhonas/free-exercise-db
- Usage dans MUSTAPHA : illustrations d’exercices.
- Licence déclarée par le projet : Unlicense / domaine public.

## Ingredient Atlas

- Source : https://github.com/ionmesca/ingredient-atlas
- Usage dans MUSTAPHA : vignettes d’ingrédients.
- Licence déclarée par le projet : CC0-1.0.

## Visuel de plat

- Source : Openverse, résultat sélectionné sous licence CC0.
- API/source : https://api.openverse.org/
- Usage dans MUSTAPHA : illustration non prescriptive du repas.

## Assets retirés du dépôt

- 251 fichiers extraits de PDF (137 pages d’exercices, 76 pages de recettes,
  38 pages de nutrition, environ 106 Mo) n’étaient référencés par aucun écran :
  vérifié par recherche dans tout le code source. Ils sont supprimés.
- Les cinq images de recettes extraites d’un PDF CROSSCOOKING avaient déjà été
  écartées de la publication pour raison de droits ; elles quittent aussi le
  dépôt, qui ne doit pas porter ce qu’il ne publie pas.

## Règles d’intégration

- Les images sont servies localement et chargées avec `loading="lazy"` lorsque pertinent.
- Format WebP pour les illustrations d’exercices et le visuel de plat : même qualité
  perçue, environ trois fois moins lourd que le JPEG d’origine.
- Les chemins d’assets suivent la base du site (`import.meta.env.BASE_URL`) et jamais
  un chemin absolu : l’application est publiée dans un sous-dossier.
- Un fallback emoji/pictogramme est conservé si une image manque ou si le cache offline ne la contient pas.
- Les assets ne constituent ni un avis médical ni une prescription nutritionnelle.
- Toute nouvelle image doit être ajoutée avec sa source, sa licence et son identifiant dans ce fichier.
