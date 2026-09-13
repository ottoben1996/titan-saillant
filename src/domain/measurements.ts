import type { ProfileId } from './types';

/**
 * Zones mesurées lors du point hebdomadaire.
 *
 * Les bras et les cuisses sont relevés côté par côté : la feuille de suivi
 * d'Ottman et Laura les distingue, et un écart entre droite et gauche est une
 * information utile (dominance, gêne, asymétrie à surveiller).
 */
export type MeasurementZone =
  | 'weightKg'
  | 'waistCm'
  | 'chestCm'
  | 'neckCm'
  | 'armRightCm'
  | 'armLeftCm'
  | 'thighRightCm'
  | 'thighLeftCm';

export interface ZoneDefinition {
  key: MeasurementZone;
  label: string;
  unit: 'kg' | 'cm';
  /** Pas des boutons − / + (les valeurs sont saisies au dixième près). */
  step: number;
  /** Deux valeurs par zone, côté droit et côté gauche. */
  paired?: boolean;
}

export const measurementZones: readonly ZoneDefinition[] = Object.freeze([
  { key: 'weightKg', label: 'Poids', unit: 'kg', step: 0.1 },
  { key: 'waistCm', label: 'Tour de taille', unit: 'cm', step: 0.5 },
  { key: 'chestCm', label: 'Buste', unit: 'cm', step: 0.5 },
  { key: 'armRightCm', label: 'Bras droit', unit: 'cm', step: 0.5 },
  { key: 'armLeftCm', label: 'Bras gauche', unit: 'cm', step: 0.5 },
  { key: 'thighRightCm', label: 'Cuisse droite', unit: 'cm', step: 0.5 },
  { key: 'thighLeftCm', label: 'Cuisse gauche', unit: 'cm', step: 0.5 },
  { key: 'neckCm', label: 'Tour de cou', unit: 'cm', step: 0.5 },
]);

export interface WeeklyMeasurement {
  id: string;
  profileId: ProfileId;
  /** Numéro de cycle (1, 2, 3…) et de semaine dans le cycle (1 à 8). */
  cycle: number;
  week: number;
  /** Date du point. Absente pour l'historique repris de la feuille de suivi. */
  measuredOn?: string;
  weightKg?: number;
  waistCm?: number;
  chestCm?: number;
  neckCm?: number;
  armRightCm?: number;
  armLeftCm?: number;
  thighRightCm?: number;
  thighLeftCm?: number;
  /**
   * Zones conservées mais écartées des tendances : un écart invraisemblable
   * d'une semaine à l'autre est presque toujours une erreur de saisie ou une
   * mesure prise autrement. On garde la valeur, on ne la laisse pas fausser
   * les courbes.
   */
  excluded?: MeasurementZone[];
  /** Ce que le coach a répondu à ce bilan, recopié à la main par l'athlète. */
  coachNote?: string;
}

export const cycleLengthWeeks = 8;

export interface ProfileBody {
  heightCm: number;
  /** Poids de départ du suivi, affiché comme repère fixe. */
  initialWeightKg: number;
  sex: 'homme' | 'femme';
}

export const profileBody: Readonly<Record<ProfileId, ProfileBody>> = Object.freeze({
  ottman: { heightCm: 175, initialWeightKg: 104.8, sex: 'homme' },
  laura: { heightCm: 160, initialWeightKg: 84.05, sex: 'femme' },
});

export const measurementId = (profileId: ProfileId, cycle: number, week: number) => `${profileId}-c${cycle}-s${week}`;

/**
 * Historique de départ, repris de la feuille de suivi réelle (deux semaines).
 *
 * Aucune date n'est inventée : les semaines reprises de la feuille n'ont pas de
 * jour de relevé connu, le bilan les affiche par leur numéro de semaine.
 * Le tour de taille de la semaine 1 d'Ottman (147 puis 117,5 cm) était une
 * erreur de saisie : la valeur est conservée mais écartée des tendances.
 */
export const starterMeasurements: readonly WeeklyMeasurement[] = Object.freeze([
  {
    id: measurementId('ottman', 1, 1),
    profileId: 'ottman',
    cycle: 1,
    week: 1,
    weightKg: 104.7,
    chestCm: 112,
    armRightCm: 35,
    armLeftCm: 32.5,
    thighRightCm: 61,
    thighLeftCm: 60,
    excluded: ['waistCm'],
  },
  {
    id: measurementId('ottman', 1, 2),
    profileId: 'ottman',
    cycle: 1,
    week: 2,
    weightKg: 104.1,
    waistCm: 117.5,
    chestCm: 109,
    armRightCm: 35.5,
    armLeftCm: 34,
    thighRightCm: 62.5,
    thighLeftCm: 62,
  },
  {
    id: measurementId('laura', 1, 1),
    profileId: 'laura',
    cycle: 1,
    week: 1,
    weightKg: 82.4,
    waistCm: 95,
    chestCm: 90,
    armRightCm: 28,
    armLeftCm: 29,
    thighRightCm: 61,
    thighLeftCm: 62,
  },
  {
    id: measurementId('laura', 1, 2),
    profileId: 'laura',
    cycle: 1,
    week: 2,
    weightKg: 82.75,
    waistCm: 95,
    chestCm: 91.5,
    armRightCm: 29.5,
    armLeftCm: 30,
    thighRightCm: 61,
    thighLeftCm: 62,
  },
]);
