/**
 * Fluidité mesurée — ce que l'appareil peut réellement peindre.
 *
 * Le mode économie d'énergie d'iOS n'est exposé par aucune API du web : rien
 * dans la page ne dit « je suis bridé ». On le mesure donc au lieu de le
 * deviner. Bridée, la machine plafonne les animations à ~30 images par seconde :
 * une cadence basse mesurée au démarrage est le symptôme direct, et c'est la
 * seule mesure honnête disponible côté page.
 *
 * Le verdict ne change pas le fonctionnement de l'application : il coupe la
 * couche « matière » (flou des barres, respiration du squelette), qui coûte une
 * repainte par image. Sur un appareil sain, rien ne bouge.
 */

/** En dessous, l'appareil est considéré comme bridé. 30 fps = plafond d'iOS en économie d'énergie. */
export const SEUIL_FLUIDITE = 45;

/** Les premières images d'un démarrage à froid ne sont pas représentatives. */
export const IMAGES_IGNOREES = 6;

/** Fenêtre de mesure, en millisecondes. */
export const DUREE_MESURE = 900;

/** On laisse l'application se poser avant de mesurer : une transition d'écran n'est pas un bridage. */
export const DELAI_AVANT_MESURE = 600;

export type VerdictFluidite = 'bas' | 'haut';

/**
 * Pur. Une mesure inexploitable (`NaN`, zéro image) rend `haut` : dans le doute,
 * on ne retire jamais la matière à un appareil qui la supporte.
 */
export function verdictFluidite(imagesParSeconde: number): VerdictFluidite {
  if (!Number.isFinite(imagesParSeconde) || imagesParSeconde <= 0) return 'haut';
  return imagesParSeconde < SEUIL_FLUIDITE ? 'bas' : 'haut';
}

/**
 * Compte les images réellement peintes pendant `duree` millisecondes, après
 * avoir ignoré les premières. La boucle d'images est injectable : la mesure se
 * vérifie donc sans navigateur.
 */
export function mesurerFluidite(
  image: (retour: (instant: number) => void) => void = (retour) => requestAnimationFrame(retour),
  duree: number = DUREE_MESURE,
): Promise<number> {
  return new Promise((resoudre) => {
    let images = 0;
    let debut = 0;

    const frapper = (instant: number) => {
      images += 1;
      if (images < IMAGES_IGNOREES) {
        image(frapper);
        return;
      }
      if (images === IMAGES_IGNOREES) {
        debut = instant;
        image(frapper);
        return;
      }
      const ecoule = instant - debut;
      if (ecoule >= duree) {
        resoudre(((images - IMAGES_IGNOREES) * 1000) / ecoule);
        return;
      }
      image(frapper);
    };

    image(frapper);
  });
}

/** Pose le verdict sur la racine : le CSS fait le reste. */
export function poserVerdictFluidite(verdict: VerdictFluidite, racine: HTMLElement = document.documentElement): void {
  racine.dataset.perf = verdict;
}

/** Mesure puis pose. Ne rejette jamais : une sonde en échec laisse l'application en l'état. */
export async function mesurerEtPoserFluidite(
  racine: HTMLElement = document.documentElement,
  image?: (retour: (instant: number) => void) => void,
): Promise<VerdictFluidite> {
  const imagesParSeconde = await mesurerFluidite(image);
  const verdict = verdictFluidite(imagesParSeconde);
  poserVerdictFluidite(verdict, racine);
  return verdict;
}

/**
 * Mesure différée, et seulement si la page est visible : un onglet masqué ne
 * reçoit aucune image, la sonde attendrait indéfiniment. Au retour au premier
 * plan, la mesure est refaite — l'utilisateur peut activer l'économie d'énergie
 * en cours de séance.
 */
export function surveillerLaFluidite(
  racine: HTMLElement = document.documentElement,
  image?: (retour: (instant: number) => void) => void,
): () => void {
  let attente = 0;

  const lancer = () => {
    if (document.visibilityState !== 'visible') return;
    window.clearTimeout(attente);
    attente = window.setTimeout(() => {
      void mesurerEtPoserFluidite(racine, image);
    }, DELAI_AVANT_MESURE);
  };

  lancer();
  document.addEventListener('visibilitychange', lancer);
  return () => {
    window.clearTimeout(attente);
    document.removeEventListener('visibilitychange', lancer);
  };
}
