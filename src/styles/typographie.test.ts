/**
 * Typographie française.
 *
 * La règle est simple et non négociable : avant un deux-points, un point-virgule,
 * un point d'exclamation ou d'interrogation, l'espace est insécable. Sans elle,
 * « Poids : 104,8 kg » peut se retrouver coupé en fin de ligne avec le
 * deux-points orphelin au début de la suivante.
 *
 * Ce test lit les chaînes de caractères affichées et refuse l'espace normale.
 * Les commentaires, les ternaires et le code ne sont pas concernés : seules les
 * chaînes littérales et les gabarits sont examinés.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const FICHIERS: string[] = [];
for (const dossier of ['src/components', 'src/domain', 'src/workout', 'src/storage', 'src/mustapha']) {
  for (const nom of readdirSync(dossier, { recursive: true }) as string[]) {
    if (/\.(ts|tsx)$/.test(nom) && !/\.test\./.test(nom)) FICHIERS.push(`${dossier}/${nom}`);
  }
}

/** Intervalles des chaînes littérales et des gabarits, hors commentaires. */
function chaines(source: string): string[] {
  const trouvees: string[] = [];
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    if (c === '/' && source[i + 1] === '/') {
      const fin = source.indexOf('\n', i);
      i = fin < 0 ? source.length : fin;
      continue;
    }
    if (c === '/' && source[i + 1] === '*') {
      const fin = source.indexOf('*/', i + 2);
      i = fin < 0 ? source.length : fin + 2;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') {
      let j = i + 1;
      while (j < source.length) {
        if (source[j] === '\\') {
          j += 2;
          continue;
        }
        if (source[j] === c) break;
        j += 1;
      }
      const contenu = source.slice(i + 1, j);
      // Dans un gabarit, les expressions `${…}` sont du code, pas du texte :
      // on les retire pour que le « ? … : … » d'un ternaire ne soit pas pris
      // pour une ponctuation de phrase.
      trouvees.push(c === '`' ? contenu.replace(/\$\{[^}]*\}/g, '\u0000') : contenu);
      i = j + 1;
      continue;
    }
    i += 1;
  }
  return trouvees;
}

const ESPACE_NORMALE = /[0-9A-Za-zÀ-ÿ%»)] [;:!?](?:\s|$)/;
/** Du texte, pas du code : ni accolades, ni chevrons, ni parenthèses. */
const TEXTE_SEUL = /^[^<>{}=()[\]|&]*$/;

describe('typographie française', () => {
  it('n’admet aucune espace normale avant deux-points, point-virgule, exclamation ou interrogation', () => {
    const fautes: string[] = [];

    for (const fichier of FICHIERS) {
      const texte = readFileSync(fichier, 'utf8');
      for (const extrait of chaines(texte)) {
        if (!TEXTE_SEUL.test(extrait)) continue;
        const trouve = extrait.match(ESPACE_NORMALE);
        if (trouve) fautes.push(`${fichier} · « ${extrait.trim().slice(0, 60)} »`);
      }
    }

    expect(fautes, 'espaces à rendre insécables').toEqual([]);
  });

  it('n’admet aucune espace normale dans un texte mêlé à une expression', () => {
    const fautes: string[] = [];

    for (const fichier of FICHIERS.filter((nom) => nom.endsWith('.tsx'))) {
      for (const [index, ligne] of readFileSync(fichier, 'utf8').split('\n').entries()) {
        const brut = ligne.trim();
        // Ligne de texte JSX, avec une accolade mais sans code : ni ternaire,
        // ni affectation, ni comparaison.
        if (!/^[A-Za-zÀ-ÿ(]/.test(brut)) continue;
        if (!brut.includes('{')) continue;
        if (/[?=]|=>|\/\//.test(brut)) continue;
        if (/[0-9A-Za-zÀ-ÿ%»)] [;:!?](?:\s|$)/.test(brut)) {
          fautes.push(`${fichier}:${index + 1} · ${brut.slice(0, 60)}`);
        }
      }
    }

    expect(fautes, 'espaces à rendre insécables').toEqual([]);
  });

  it('contient bien des espaces insécables, sinon le test précédent ne prouve rien', () => {
    let total = 0;
    for (const fichier of FICHIERS) total += (readFileSync(fichier, 'utf8').match(/\u00a0/g) ?? []).length;

    expect(total).toBeGreaterThan(100);
  });
});
