/**
 * Les libellés de séance ne se tronquent pas.
 *
 * Trouvé en enchaînant trois séances complètes puis en mesurant l'historique :
 * « Full Body A » occupait 64 px pour 76 px de texte, coupé en « Full Bod… ».
 * Le commentaire au-dessus du code annonçait pourtant l'inverse depuis un
 * moment — « il passe à la ligne plutôt que d'être tronqué » — et les trois
 * lignes de troncature étaient restées juste en dessous. La correction
 * précédente avait ajouté la ligne voulue sans retirer les trois mauvaises.
 *
 * D'où ce test : il refuse la combinaison `nowrap` + `overflow: hidden` +
 * `text-overflow: ellipsis` sur tout sélecteur dont le nom désigne un libellé
 * de séance ou d'exercice. Un nom d'exercice de salle ne tient pas sur une
 * ligne dans une colonne de téléphone : il doit passer à la ligne, entier.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const feuilles = ['src/styles/screens.css', 'src/styles/followup.css', 'src/styles/matiere.css'].map((chemin) => ({
  chemin,
  contenu: readFileSync(chemin, 'utf8'),
}));

/** Sélecteurs qui portent un libellé lisible, jamais un nombre ni un badge. */
const LIBELLES =
  /\.(history-row-main strong|week-slot-name|record-main strong|rest-next-name|sheet-exercise-name|alternative-name)/;

/** Découpe en blocs `sélecteur { … }`, sans descendre dans les imbrications. */
function blocs(contenu: string): { selecteur: string; corps: string }[] {
  const trouves: { selecteur: string; corps: string }[] = [];
  const motif = /([^{}]+)\{([^{}]*)\}/g;
  let resultat = motif.exec(contenu);
  while (resultat !== null) {
    trouves.push({ selecteur: resultat[1].trim(), corps: resultat[2] });
    resultat = motif.exec(contenu);
  }
  return trouves;
}

describe('libellés de séance', () => {
  it('aucun n’est tronqué par une ellipse', () => {
    const fautifs: string[] = [];

    for (const { chemin, contenu } of feuilles) {
      for (const { selecteur, corps } of blocs(contenu)) {
        if (!LIBELLES.test(selecteur)) continue;
        const tronque = /white-space:\s*nowrap/.test(corps) && /text-overflow:\s*ellipsis/.test(corps);
        if (tronque) fautifs.push(`${chemin} → ${selecteur}`);
      }
    }

    expect(fautifs, fautifs.join(' | ')).toEqual([]);
  });

  it('le libellé de l’historique accepte de passer à la ligne', () => {
    const historique = feuilles.find((f) => f.chemin.endsWith('screens.css'));
    const bloc = blocs(historique?.contenu ?? '').find((b) => /history-row-main strong/.test(b.selecteur));

    expect(bloc, 'le sélecteur doit exister').toBeDefined();
    expect(bloc?.corps).toMatch(/overflow-wrap:\s*anywhere/);
  });
});
