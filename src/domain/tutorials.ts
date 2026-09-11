import type { Tutorial } from './types';

const commonSafety = ['Arrêter en cas de douleur vive et garder une respiration régulière.'];

const tutorial = (
  exerciseId: string,
  title: string,
  muscles: string[],
  equipment: string[],
  position: string,
  steps: string[],
  commonMistakes: string[],
  extra?: {
    youtubeShortId?: string;
    primaryMuscles?: string[];
    secondaryMuscles?: string[];
    tempoRecommended?: string;
    keyCue?: string;
  }
): Tutorial => ({
  exerciseId,
  title,
  muscles,
  equipment,
  position,
  steps,
  commonMistakes,
  safety: commonSafety,
  ...extra,
});

export const tutorials: Readonly<Record<string, Tutorial>> = {
  'coiffe-rotateurs': tutorial(
    'coiffe-rotateurs',
    'Coiffe des rotateurs',
    ['Épaules', 'coiffe des rotateurs'],
    ['Élastique ou poulie'],
    'Coude près du corps, buste droit.',
    ['Tirer doucement vers l’extérieur.', 'Revenir lentement sans à-coup.'],
    ['Décoller le coude', 'Utiliser une charge excessive'],
    {
      youtubeShortId: 'fuWq7fg74dc',
      primaryMuscles: ['Épaules'],
      tempoRecommended: '2-1-2-0',
      keyCue: 'Coude fixé au flanc comme une charnière',
    }
  ),
  bosu: tutorial(
    'bosu',
    'Équilibre sur bosu',
    ['Jambes', 'gainage'],
    ['Bosu'],
    'Pied au centre du bosu, regard fixe.',
    ['Monter avec contrôle.', 'Stabiliser puis redescendre.'],
    ['Regarder ses pieds', 'Descendre trop vite'],
    {
      youtubeShortId: 'MGNzdT5eiRo',
      primaryMuscles: ['Jambes', 'Gainage'],
    }
  ),
  rameur: tutorial(
    'rameur',
    'Rameur',
    ['Dos', 'jambes', 'bras'],
    ['Rameur'],
    'Dos neutre, genoux fléchis.',
    ['Pousser avec les jambes.', 'Ramener la poignée vers le bas des côtes.'],
    ['Arrondir le dos', 'Tirer uniquement avec les bras'],
    {
      youtubeShortId: 'soveq2xBNpo',
      primaryMuscles: ['Dos', 'Jambes'],
      secondaryMuscles: ['Bras'],
    }
  ),
  velo: tutorial(
    'velo',
    'Vélo',
    ['Jambes', 'cardio'],
    ['Vélo cardio'],
    'Régler la selle à hauteur de hanche.',
    ['Pédaler à intensité moyenne.', 'Maintenir une cadence régulière.'],
    ['Résister avec les épaules', 'Se crisper'],
    {
      youtubeShortId: 'eHlLVxr6N_U',
      primaryMuscles: ['Jambes'],
    }
  ),
  'presse-cuisses-inclinee': tutorial(
    'presse-cuisses-inclinee',
    'Presse à cuisse inclinée',
    ['Quadriceps', 'fessiers'],
    ['Presse inclinée'],
    'Dos et bassin plaqués au dossier.',
    ['Descendre en contrôlant.', 'Pousser sans verrouiller les genoux.'],
    ['Décoller le bassin', 'Verrouiller les genoux'],
    {
      youtubeShortId: 'EotSw18oR9w',
      primaryMuscles: ['Quadriceps', 'Fessiers'],
      secondaryMuscles: ['Ischio-jambiers', 'Mollets'],
      tempoRecommended: '3-0-1-0',
      keyCue: 'Talons bien vissés au plateau, ne jamais décoller le bas du dos',
    }
  ),
  'leg-curl-allonge': tutorial(
    'leg-curl-allonge',
    'Leg curl allongé',
    ['Ischio-jambiers'],
    ['Machine leg curl'],
    'Bassin posé, chevilles sous les rouleaux.',
    ['Fléchir les genoux.', 'Revenir lentement.'],
    ['Cambrer le dos', 'Donner de l’élan'],
    {
      youtubeShortId: 'lGNeJsdqJwg',
      primaryMuscles: ['Ischio-jambiers'],
      tempoRecommended: '3-0-1-1',
      keyCue: 'Bassin collé au banc, contraction 1s en haut',
    }
  ),
  'chest-press': tutorial(
    'chest-press',
    'Chest press machine',
    ['Pectoraux', 'triceps'],
    ['Machine chest press'],
    'Omoplates rapprochées, poignées au milieu du torse.',
    ['Pousser devant soi.', 'Revenir sans relâcher les épaules.'],
    ['Hausser les épaules', 'Tendre brutalement les coudes'],
    {
      youtubeShortId: 'Qu7-ceCvq7w',
      primaryMuscles: ['Pectoraux'],
      secondaryMuscles: ['Épaules', 'Triceps'],
      tempoRecommended: '2-0-1-0',
      keyCue: 'Resserrer et abaisser les omoplates avant la poussée',
    }
  ),
  'tirage-horizontal': tutorial(
    'tirage-horizontal',
    'Tirage horizontal prise serrée',
    ['Dos', 'biceps'],
    ['Poulie basse'],
    'Buste droit, genoux légèrement fléchis.',
    ['Tirer les coudes en arrière.', 'Rapprocher les omoplates.'],
    ['Se pencher en arrière', 'Tirer seulement avec les mains'],
    {
      youtubeShortId: 'CprcFM98rlY',
      primaryMuscles: ['Dorsaux'],
      secondaryMuscles: ['Biceps', 'Trapèzes'],
      tempoRecommended: '2-1-1-0',
      keyCue: 'Tirer avec les coudes vers l’arrière, pincer le milieu du dos',
    }
  ),
  'jumping-jack': tutorial(
    'jumping-jack',
    'Jumping Jack',
    ['Cardio', 'jambes'],
    ['Aucun'],
    'Debout, pieds joints.',
    ['Écarter pieds et bras.', 'Revenir souplement.'],
    ['Atterrir raide', 'Bloquer la respiration'],
    {
      youtubeShortId: 'FVltHbdTZQ0',
      primaryMuscles: ['Cardio', 'Jambes'],
    }
  ),
  'gainage-planche': tutorial(
    'gainage-planche',
    'Gainage planche',
    ['Abdominaux', 'épaules'],
    ['Tapis'],
    'Corps aligné sur les avant-bras ou mains.',
    ['Contracter abdos et fessiers.', 'Respirer sans creuser le dos.'],
    ['Laisser tomber les hanches', 'Retenir son souffle'],
    {
      youtubeShortId: 'v25dawSzRTM',
      primaryMuscles: ['Abdominaux'],
      secondaryMuscles: ['Épaules'],
    }
  ),
  'squat-smith': tutorial(
    'squat-smith',
    'Squat smith machine',
    ['Cuisses', 'fessiers'],
    ['Smith machine'],
    'Pieds légèrement en avant, dos contre la barre.',
    ['Descendre jusqu’à amplitude confortable.', 'Pousser dans les pieds.'],
    ['Genoux vers l’intérieur', 'Décoller les talons'],
    {
      youtubeShortId: 'SDN28-YuxAU',
      primaryMuscles: ['Quadriceps', 'Fessiers'],
      secondaryMuscles: ['Ischio-jambiers'],
      tempoRecommended: '3-1-1-0',
      keyCue: 'Genoux dans l’axe des orteils, buste solide',
    }
  ),
  'leg-extension': tutorial(
    'leg-extension',
    'Leg extension',
    ['Quadriceps'],
    ['Machine leg extension'],
    'Dos contre le dossier, rouleau sur les tibias.',
    ['Tendre les jambes.', 'Redescendre en contrôlant.'],
    ['Balancer la charge', 'Verrouiller violemment les genoux'],
    {
      youtubeShortId: 'uM86QE59Tgc',
      primaryMuscles: ['Quadriceps'],
      tempoRecommended: '2-0-1-1',
      keyCue: 'Pause d’une seconde au sommet en contrôle',
    }
  ),
  'developpe-couche-machine': tutorial(
    'developpe-couche-machine',
    'Développé couché machine convergente',
    ['Pectoraux', 'triceps'],
    ['Machine convergente'],
    'Poitrine ouverte, pieds au sol.',
    ['Pousser les poignées.', 'Revenir en gardant les omoplates stables.'],
    ['Décoller le dos', 'Descendre trop bas'],
    {
      youtubeShortId: 'E7fl51PkEn4',
      primaryMuscles: ['Pectoraux'],
      secondaryMuscles: ['Triceps', 'Épaules'],
      tempoRecommended: '3-1-1-0',
      keyCue: 'Cage thoracique bombée, omoplates serrées',
    }
  ),
  'tirage-vertical': tutorial(
    'tirage-vertical',
    'Tirage vertical prise neutre',
    ['Dos', 'biceps'],
    ['Poulie haute'],
    'Buste droit, prise neutre.',
    ['Tirer vers le haut du torse.', 'Remonter avec contrôle.'],
    ['Tirer derrière la nuque', 'Se balancer'],
    {
      youtubeShortId: 'n9-LFZWeqZ4',
      primaryMuscles: ['Dorsaux'],
      secondaryMuscles: ['Biceps', 'Épaules'],
      tempoRecommended: '3-0-1-0',
      keyCue: 'Abaisser les épaules avant de fléchir les coudes',
    }
  ),
  skierg: tutorial(
    'skierg',
    'SKIERG',
    ['Dos', 'bras', 'cardio'],
    ['SKIERG'],
    'Debout, poignées à hauteur de tête.',
    ['Tirer les poignées vers les hanches.', 'Remonter les bras sans arrondir excessivement.'],
    ['Tirer seulement avec les bras', 'Courber le dos'],
    {
      youtubeShortId: 'TvY76Ii3ITs',
      primaryMuscles: ['Dos', 'Bras'],
      secondaryMuscles: ['Cardio'],
    }
  ),
  'hollow-hold': tutorial(
    'hollow-hold',
    'Hollow hold',
    ['Abdominaux'],
    ['Tapis'],
    'Dos plaqué au sol.',
    ['Décoller épaules et jambes selon le niveau.', 'Maintenir le ventre rentré.'],
    ['Creuser le bas du dos', 'Forcer l’amplitude'],
    {
      youtubeShortId: 'SMpasIMw7LE',
      primaryMuscles: ['Abdominaux'],
    }
  ),
  'mountain-climber': tutorial(
    'mountain-climber',
    'Mountain climber',
    ['Abdominaux', 'cardio'],
    ['Tapis'],
    'Position de planche haute.',
    ['Ramener un genou vers la poitrine.', 'Alterner en gardant les épaules au-dessus des mains.'],
    ['Monter les fesses', 'Sauter de façon désordonnée'],
    {
      youtubeShortId: 'x7Kr-V67T7k',
      primaryMuscles: ['Abdominaux', 'Cardio'],
    }
  ),
  'sit-to-stand': tutorial(
    'sit-to-stand',
    'Sit to stand',
    ['Cuisses', 'fessiers'],
    ['Banc ou chaise'],
    'Assis, pieds sous les genoux.',
    ['Se relever en poussant dans les pieds.', 'Se rasseoir doucement.'],
    ['Tomber sur la chaise', 'Pousser sur les genoux'],
    {
      youtubeShortId: '8gkfe4aTE-0',
      primaryMuscles: ['Quadriceps', 'Fessiers'],
    }
  ),
  crunches: tutorial(
    'crunches',
    'Crunches',
    ['Abdominaux'],
    ['Tapis'],
    'Allongé, genoux fléchis.',
    ['Enrouler légèrement le haut du dos.', 'Redescendre sans tirer la nuque.'],
    ['Tirer sur la tête', 'Faire un mouvement complet de sit-up'],
    {
      youtubeShortId: 'xGbcIHSvSlo',
      primaryMuscles: ['Abdominaux'],
    }
  ),
  'developpe-clavicule': tutorial(
    'developpe-clavicule',
    'Développé clavicule prise neutre',
    ['Épaules', 'haut des pectoraux'],
    ['Haltères'],
    'Haltères près des épaules, prise neutre.',
    ['Pousser au-dessus de la tête.', 'Redescendre sous contrôle.'],
    ['Cambrer le dos', 'Frapper les haltères'],
    {
      youtubeShortId: 'aO_1PB0X_lU',
      primaryMuscles: ['Épaules'],
      secondaryMuscles: ['Triceps', 'Pectoraux'],
      tempoRecommended: '3-0-1-0',
      keyCue: 'Coudes à 45° du buste, pas trop ouverts',
    }
  ),
};
