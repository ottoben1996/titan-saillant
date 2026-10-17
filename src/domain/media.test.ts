import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { exerciseMedia } from './media';

describe('local exercise illustrations', () => {
  it('keeps embedded RepDB media local and attributed', () => {
    const legPress = exerciseMedia['presse-cuisses-inclinee'];
    expect(legPress.start).toBe('/exercise-media/leg-press-start.webp');
    expect(legPress.peak).toBe('/exercise-media/leg-press-peak.webp');
    expect(legPress.credit).toBe('Exercise data by RepDB (repdb.co)');
  });

  it('assume les mouvements sans illustration honnête plutôt que d’en inventer une', () => {
    // Aucun équivalent crédible trouvé chez RepDB, et le jeu libre qui s'en
    // approche montre un autre mouvement (vérifié visuellement) : le repli
    // pictogramme de l'interface reste préférable à un visuel trompeur.
    expect(exerciseMedia.skierg).toBeUndefined();
    expect(exerciseMedia['sit-to-stand']).toBeUndefined();
    expect(exerciseMedia.bosu).toBeUndefined();
  });

  it('ne déclare que des fichiers réellement présents dans public/exercise-media', () => {
    const missing: string[] = [];
    Object.entries(exerciseMedia).forEach(([id, media]) => {
      [media.start, media.peak, media.main]
        .filter((path): path is string => Boolean(path))
        .forEach((path) => {
          const local = resolve(process.cwd(), 'public', path.replace(/^\//, ''));
          if (!existsSync(local)) missing.push(`${id} → ${path}`);
        });
    });
    expect(missing).toEqual([]);
  });

  it('renseigne une provenance complète pour chaque illustration', () => {
    Object.entries(exerciseMedia).forEach(([id, media]) => {
      expect(media.credit, `credit manquant pour ${id}`).toBeTruthy();
      expect(media.license, `license manquante pour ${id}`).toBeTruthy();
      expect(media.source, `source manquante pour ${id}`).toBeTruthy();
    });
  });
});
