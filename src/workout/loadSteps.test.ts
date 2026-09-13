import { describe, expect, it } from 'vitest';
import { estMouvementBasDuCorps, paliersDeCharge } from './loadSteps';

describe('paliers de charge', () => {
  it('propose des paliers larges sur le bas du corps', () => {
    // La presse à cuisse se règle par plaques de 2,5 kg : inutile de proposer moins.
    expect(estMouvementBasDuCorps('presse-cuisses-inclinee')).toBe(true);
    expect(paliersDeCharge('presse-cuisses-inclinee')).toEqual({ grand: 5, fin: 2.5 });
    expect(paliersDeCharge('leg-curl-allonge')).toEqual({ grand: 5, fin: 2.5 });
    expect(paliersDeCharge('squat-smith')).toEqual({ grand: 5, fin: 2.5 });
  });

  it('propose des paliers fins sur le haut du corps', () => {
    expect(estMouvementBasDuCorps('chest-press')).toBe(false);
    expect(paliersDeCharge('chest-press')).toEqual({ grand: 2.5, fin: 1.25 });
    expect(paliersDeCharge('tirage-horizontal')).toEqual({ grand: 2.5, fin: 1.25 });
    expect(paliersDeCharge('developpe-couche-machine')).toEqual({ grand: 2.5, fin: 1.25 });
  });

  it('ne se laisse pas surprendre par un exercice inconnu', () => {
    // Sans fiche, on suppose des paliers fins : c'est le choix le plus prudent.
    expect(estMouvementBasDuCorps('exercice-inexistant')).toBe(false);
    expect(paliersDeCharge('exercice-inexistant')).toEqual({ grand: 2.5, fin: 1.25 });
  });
});
