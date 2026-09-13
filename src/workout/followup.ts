import type { LoadConsigne } from '../domain/types';
import type { WeeklyMeasurement, MeasurementZone, ProfileBody } from '../domain/measurements';
import { cycleLengthWeeks as cycleLengthWeeksCurrent, measurementZones, profileBody } from '../domain/measurements';

/**
 * Écarts invraisemblables d'une semaine à l'autre.
 *
 * Au-delà de ces seuils, c'est presque toujours une erreur de saisie ou une
 * mesure prise autrement (ruban mal placé, vêtement, autre personne). Mieux
 * vaut signaler et écarter la valeur que dessiner une fausse chute.
 */
const seuilsInvraisemblables: Readonly<Record<MeasurementZone, number>> = Object.freeze({
  weightKg: 2,
  waistCm: 5,
  chestCm: 5,
  neckCm: 5,
  armRightCm: 5,
  armLeftCm: 5,
  thighRightCm: 5,
  thighLeftCm: 5,
});

/** Vitesse de perte jugée trop rapide : au-delà, une part de muscle part avec. */
const vitesseAlertePourcent = 1;

/** Nombres à la française : virgule décimale, une décimale. */
export function formatNombre(value: number, decimals = 1) {
  if (!Number.isFinite(value)) return '—';
  return value.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: decimals });
}

const arrondi = (value: number, decimals = 1) => {
  const facteur = 10 ** decimals;
  return Math.round(value * facteur) / facteur;
};

/** Mesures triées du plus ancien au plus récent. */
export function sortedMeasurements(measurements: readonly WeeklyMeasurement[]) {
  return [...measurements].sort((a, b) => (a.cycle === b.cycle ? a.week - b.week : a.cycle - b.cycle));
}

/** Semaine à renseigner : la suivante, ou celle en cours si le cycle repart. */
export function nextTargetWeek(measurements: readonly WeeklyMeasurement[]) {
  if (measurements.length === 0) return { cycle: 1, week: 1 };
  const ordered = sortedMeasurements(measurements);
  const last = ordered[ordered.length - 1];
  return last.week >= cycleLengthWeeksCurrent
    ? { cycle: last.cycle + 1, week: 1 }
    : { cycle: last.cycle, week: last.week + 1 };
}

export function previousMeasurement(measurements: readonly WeeklyMeasurement[], current: WeeklyMeasurement) {
  const ordered = sortedMeasurements(measurements);
  const index = ordered.findIndex((item) => item.id === current.id);
  return index > 0 ? ordered[index - 1] : undefined;
}

export function firstOfCycle(measurements: readonly WeeklyMeasurement[], cycle: number) {
  return sortedMeasurements(measurements).find((item) => item.cycle === cycle);
}

export function isExcluded(measurement: WeeklyMeasurement | undefined, zone: MeasurementZone) {
  return Boolean(measurement?.excluded?.includes(zone));
}

/** Écart d'une zone entre deux points, en ignorant les valeurs écartées. */
export function zoneDelta(
  from: WeeklyMeasurement | undefined,
  to: WeeklyMeasurement | undefined,
  zone: MeasurementZone,
): number | undefined {
  if (!from || !to || isExcluded(from, zone) || isExcluded(to, zone)) return undefined;
  const a = from[zone];
  const b = to[zone];
  if (typeof a !== 'number' || typeof b !== 'number') return undefined;
  return arrondi(b - a);
}

export function implausibleZones(current: WeeklyMeasurement, previous: WeeklyMeasurement | undefined): MeasurementZone[] {
  if (!previous) return [];
  return measurementZones
    .map((zone) => zone.key)
    .filter((zone) => {
      const a = previous[zone];
      const b = current[zone];
      if (typeof a !== 'number' || typeof b !== 'number') return false;
      return Math.abs(b - a) > seuilsInvraisemblables[zone];
    });
}

export interface WeightVelocity {
  kgPerWeek: number;
  percentPerWeek: number;
}

/**
 * Vitesse de variation du poids entre les deux derniers points exploitables.
 *
 * La vitesse compte plus que la variation d'une semaine : un poids varie d'un
 * jour à l'autre avec l'hydratation, un rythme se lit sur plusieurs semaines.
 */
export function weightVelocity(measurements: readonly WeeklyMeasurement[]): WeightVelocity | undefined {
  const ordered = sortedMeasurements(measurements).filter(
    (item) => typeof item.weightKg === 'number' && !isExcluded(item, 'weightKg'),
  );
  if (ordered.length < 2) return undefined;
  const last = ordered[ordered.length - 1];
  const before = ordered[ordered.length - 2];
  const weeks = last.cycle === before.cycle ? last.week - before.week : 0;
  if (weeks <= 0 || last.weightKg === undefined || before.weightKg === undefined) return undefined;
  const kgPerWeek = (last.weightKg - before.weightKg) / weeks;
  return {
    kgPerWeek: arrondi(kgPerWeek, 2),
    percentPerWeek: arrondi((kgPerWeek / before.weightKg) * 100, 2),
  };
}

export function movingAverage(values: readonly (number | undefined)[], window = 4) {
  return values.map((_, index) => {
    const slice = values
      .slice(Math.max(0, index - window + 1), index + 1)
      .filter((value): value is number => typeof value === 'number');
    if (slice.length === 0) return undefined;
    return arrondi(slice.reduce((total, value) => total + value, 0) / slice.length, 2);
  });
}

export function bodyMassIndex(weightKg: number, heightCm: number) {
  return arrondi(weightKg / (heightCm / 100) ** 2, 1);
}

/** Tour de taille rapporté à la hauteur : le repère le plus simple à suivre. */
export function waistToHeight(waistCm: number, heightCm: number) {
  return arrondi(waistCm / heightCm, 2);
}

/**
 * Masse grasse estimée par le RFM (indice de masse grasse relative).
 *
 * Choisi plutôt que la formule de la marine américaine parce qu'il ne demande
 * que la hauteur et le tour de taille — deux mesures déjà relevées chaque
 * semaine. La formule de la marine exige en plus le tour de cou, et le tour de
 * hanches pour les femmes : elle reste proposée en second avis quand ces
 * mesures existent, jamais à la place.
 */
export function relativeFatMass(sex: ProfileBody['sex'], heightCm: number, waistCm: number) {
  const facteur = sex === 'homme' ? 64 : 76;
  return arrondi(facteur - 20 * (heightCm / waistCm), 1);
}

/** Second avis, seulement si les mesures nécessaires sont présentes. */
export function navyBodyFat(options: {
  sex: ProfileBody['sex'];
  heightCm: number;
  waistCm: number;
  neckCm?: number;
  hipCm?: number;
}) {
  const { sex, heightCm, waistCm, neckCm, hipCm } = options;
  if (typeof neckCm !== 'number') return undefined;
  if (sex === 'homme') {
    const base = waistCm - neckCm;
    if (base <= 0) return undefined;
    return arrondi(495 / (1.0324 - 0.19077 * Math.log10(base) + 0.15456 * Math.log10(heightCm)) - 450, 1);
  }
  if (typeof hipCm !== 'number') return undefined;
  const base = waistCm + hipCm - neckCm;
  if (base <= 0) return undefined;
  return arrondi(495 / (1.29579 - 0.35004 * Math.log10(base) + 0.221 * Math.log10(heightCm)) - 450, 1);
}

/**
 * Séances réellement comprises dans la semaine d'un point de mesure.
 *
 * La fenêtre va du point précédent (exclu) au point courant, avec deux heures de
 * tolérance : une séance faite juste après la pesée du samedi compte pour la
 * semaine qui se termine, tandis qu'une séance de l'après-midi appartient déjà à
 * la semaine suivante. Sans cette borne, une séance compterait deux fois.
 * Sans date de mesure, on ne devine pas : mieux vaut une page vide qu'une page
 * qui compte trois semaines de séances dans une seule.
 */
export function seancesDeLaSemaine<T extends { completedAt?: string }>(
  sessions: readonly T[],
  bornes: { depuis?: string; jusqua?: string },
): T[] {
  if (!bornes.jusqua) return [];
  const fin = new Date(bornes.jusqua).getTime() + 2 * 60 * 60 * 1000;
  const debut = bornes.depuis ? new Date(bornes.depuis).getTime() : undefined;
  return sessions.filter((session) => {
    if (!session.completedAt) return false;
    const quand = new Date(session.completedAt).getTime();
    if (Number.isNaN(quand) || quand > fin) return false;
    return debut === undefined || quand > debut;
  });
}

export interface CheckinSummary {
  sessions: number;
  averageRpe?: number;
  painCount: number;
  painDetails: { dayId: string; pain: string; location?: string }[];
  /** Tendance de forme de la semaine, ou « mixed » si elle part dans les deux sens. */
  formTrend?: 'better' | 'same' | 'worse' | 'mixed';
  consignes: { dayId: string; consigne: LoadConsigne }[];
  notes: { dayId: string; notes: string }[];
}

/** Traduit l'énergie (1 à 5) en langage parlé, celui du quiz. */
export function formFromEnergy(energy: number | undefined): 'better' | 'same' | 'worse' | undefined {
  if (energy === undefined || !Number.isFinite(energy)) return undefined;
  if (energy >= 4) return 'better';
  if (energy === 3) return 'same';
  return 'worse';
}

/**
 * Ressenti agrégé des séances d'une semaine, pour la page « Ressenti » du bilan.
 *
 * Ne retient que les séances réellement terminées : une séance abandonnée n'a
 * pas de ressenti à raconter, et une séance sans réponse ne compte pas dans la
 * moyenne (sinon un oubli ferait chuter la moyenne d'effort).
 */
export function weeklyCheckinSummary(
  sessions: readonly {
    dayId: string;
    completedAt?: string;
    perceivedExertion?: number;
    energy?: number;
    pain?: string;
    painLocation?: string;
    loadConsigne?: LoadConsigne;
    notes?: string;
  }[],
): CheckinSummary {
  const terminees = sessions.filter((session) => session.completedAt);
  const rpes = terminees
    .map((session) => session.perceivedExertion)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

  const douleurs = terminees.filter((session) => session.pain && session.pain.toLowerCase() !== 'aucune');
  const formes = terminees
    .map((session) => formFromEnergy(session.energy))
    .filter((value): value is 'better' | 'same' | 'worse' => value !== undefined);
  const uniques = [...new Set(formes)];

  return {
    sessions: terminees.length,
    averageRpe: rpes.length > 0 ? arrondi(rpes.reduce((total, value) => total + value, 0) / rpes.length) : undefined,
    painCount: douleurs.length,
    painDetails: douleurs.map((session) => ({
      dayId: session.dayId,
      pain: session.pain as string,
      location: session.painLocation,
    })),
    formTrend: uniques.length === 0 ? undefined : uniques.length === 1 ? uniques[0] : 'mixed',
    consignes: terminees
      .filter((session) => session.loadConsigne !== undefined)
      .map((session) => ({ dayId: session.dayId, consigne: session.loadConsigne as LoadConsigne })),
    notes: terminees
      .filter((session) => (session.notes ?? '').trim().length > 0)
      .map((session) => ({ dayId: session.dayId, notes: (session.notes ?? '').trim() })),
  };
}

export interface ExerciseLoad {
  exerciseId: string;
  /** Charge de travail la plus lourde de la dernière séance de ce type. */
  last?: number;
  /** Même exercice, séance précédente du même type. */
  previous?: number;
  delta?: number;
}

/**
 * Charges par exercice pour un type de séance, d'après les séances réellement
 * enregistrées. C'est le tableau que la feuille de suivi remplissait à la main
 * (« Paramètres / Séance 1 ») : l'application l'a déjà, série par série.
 */
export function lastExerciseLoads(
  sessions: readonly { dayId: string; completedAt?: string; loggedSets: readonly { exerciseId: string; actualLoadKg?: number }[] }[],
  dayId: string,
): ExerciseLoad[] {
  const done = sessions
    .filter((session) => session.dayId === dayId && session.completedAt)
    .sort((a, b) => (a.completedAt ?? '').localeCompare(b.completedAt ?? ''));
  const maxOf = (session?: (typeof done)[number]) => {
    const map = new Map<string, number>();
    for (const set of session?.loggedSets ?? []) {
      if (typeof set.actualLoadKg !== 'number') continue;
      map.set(set.exerciseId, Math.max(map.get(set.exerciseId) ?? 0, set.actualLoadKg));
    }
    return map;
  };
  const recent = maxOf(done.at(-1));
  const before = maxOf(done.at(-2));
  return [...new Set([...recent.keys(), ...before.keys()])].map((exerciseId) => {
    const last = recent.get(exerciseId);
    const previous = before.get(exerciseId);
    return {
      exerciseId,
      last,
      previous,
      delta: last !== undefined && previous !== undefined ? arrondi(last - previous) : undefined,
    };
  });
}

export interface WeeklyReading {
  title: string;
  text: string;
  alert: boolean;
}

const libelle = (zone: MeasurementZone) => measurementZones.find((item) => item.key === zone)?.label ?? zone;

/**
 * Lecture de la semaine : ce que le coach doit retenir en une phrase.
 *
 * Croise la morphologie et l'entraînement — c'est ce qu'aucun tableur ne fait :
 * le poids et le tour de taille disent la composition, les charges disent si la
 * force suit. Les deux ensemble permettent de dire s'il s'agit d'une
 * recomposition ou d'une simple perte de poids.
 */
export function buildWeeklyReading(options: {
  current: WeeklyMeasurement;
  previous?: WeeklyMeasurement;
  first?: WeeklyMeasurement;
  profileId: WeeklyMeasurement['profileId'];
  sessionsThisWeek?: number;
  volumeDeltaPercent?: number;
}): WeeklyReading {
  const { current, previous, first, profileId, sessionsThisWeek, volumeDeltaPercent } = options;
  const body = profileBody[profileId];
  const observations: string[] = [];
  let alert = false;

  const poidsSemaine = zoneDelta(previous, current, 'weightKg');
  const poidsCycle = zoneDelta(first, current, 'weightKg');
  const tailleSemaine = zoneDelta(previous, current, 'waistCm');
  const brasDroit = zoneDelta(previous, current, 'armRightCm');
  const brasGauche = zoneDelta(previous, current, 'armLeftCm');
  const cuisseDroite = zoneDelta(previous, current, 'thighRightCm');
  const cuisseGauche = zoneDelta(previous, current, 'thighLeftCm');
  const velocity = weightVelocity(previous ? [previous, current] : [current]);
  const rfm = typeof current.waistCm === 'number' ? relativeFatMass(body.sex, body.heightCm, current.waistCm) : undefined;
  const rfmPremier = first && typeof first.waistCm === 'number' ? relativeFatMass(body.sex, body.heightCm, first.waistCm) : undefined;

  const busteSemaine = zoneDelta(previous, current, 'chestCm');
  const zonesMuscle = [brasDroit, brasGauche, cuisseDroite, cuisseGauche].filter(
    (value): value is number => typeof value === 'number',
  );
  const muscleMonte = zonesMuscle.filter((value) => value > 0).length >= 2;
  const tailleBaisse = typeof tailleSemaine === 'number' && tailleSemaine < 0;
  // Le tour de buste remplace le tour de taille quand celui-ci manque : la
  // semaine 1 du suivi d'Ottman avait un tour de taille erroné, écarté.
  const busteBaisse = !tailleBaisse && typeof busteSemaine === 'number' && busteSemaine < 0;
  const ceintureBaisse = tailleBaisse || busteBaisse;
  const poidsNeMontePas = poidsSemaine === undefined || poidsSemaine <= 0;

  if (velocity && velocity.percentPerWeek < -vitesseAlertePourcent) {
    alert = true;
    return {
      title: 'Perte de poids trop rapide',
      text: `Le poids baisse de ${formatNombre(Math.abs(velocity.kgPerWeek))} kg par semaine, soit ${Math.abs(
        velocity.percentPerWeek,
      )} % du poids corporel. Au-delà de 1 % par semaine, une partie de ce qui part est du muscle : mieux vaut ralentir et sécuriser les apports en protéines.`,
      alert: true,
    };
  }

  if (muscleMonte && ceintureBaisse && poidsNeMontePas) {
    const zone = tailleBaisse ? 'tour de taille' : 'tour de buste';
    const ecart = Math.abs((tailleBaisse ? tailleSemaine : busteSemaine) ?? 0);
    observations.push(
      `Le poids ${typeof poidsSemaine === 'number' && poidsSemaine < 0 ? 'baisse' : 'reste stable'} et le ${zone} diminue de ${formatNombre(
        ecart,
      )} cm cette semaine, pendant que les bras et les cuisses prennent du volume des deux côtés. C'est une recomposition : tu perds du gras en gardant, voire en gagnant du muscle.`,
    );
  } else if (ceintureBaisse && typeof poidsSemaine === 'number' && poidsSemaine > 0) {
    observations.push(
      'Le tour de taille diminue tandis que le poids augmente légèrement : la silhouette change avant la balance, ce qui est un bon signe.',
    );
  } else if (typeof poidsSemaine === 'number' && poidsSemaine < 0) {
    observations.push(`Le poids baisse de ${formatNombre(Math.abs(poidsSemaine))} kg cette semaine.`);
  } else if (typeof poidsSemaine === 'number' && poidsSemaine > 0) {
    observations.push(`Le poids remonte de ${formatNombre(poidsSemaine)} kg cette semaine — à confirmer la semaine prochaine avant d'en tirer une conclusion.`);
  }

  if (typeof poidsCycle === 'number' && poidsCycle !== 0) {
    observations.push(
      `Depuis le début du suivi : ${poidsCycle < 0 ? '−' : '+'}${formatNombre(Math.abs(poidsCycle))} kg sur le poids.`,
    );
  }

  if (rfm !== undefined) {
    observations.push(
      rfmPremier !== undefined && rfm !== rfmPremier
        ? `Masse grasse estimée à ${String(rfm).replace('.', ',')} % (${rfm < rfmPremier ? 'en baisse' : 'en hausse'} depuis le début du cycle).`
        : `Masse grasse estimée à ${String(rfm).replace('.', ',')} %.`,
    );
  }

  if (typeof volumeDeltaPercent === 'number' && Number.isFinite(volumeDeltaPercent)) {
    observations.push(
      `Volume soulevé ${volumeDeltaPercent >= 0 ? 'en hausse' : 'en baisse'} de ${Math.abs(Math.round(volumeDeltaPercent))} % : la charge de travail suit.`,
    );
  }

  if (typeof sessionsThisWeek === 'number' && sessionsThisWeek > 0) {
    observations.push(`${sessionsThisWeek} séance${sessionsThisWeek > 1 ? 's' : ''} enregistrée${sessionsThisWeek > 1 ? 's' : ''} cette semaine.`);
  }

  return {
    title: muscleMonte && ceintureBaisse && poidsNeMontePas ? 'Recomposition en cours' : 'Point de la semaine',
    text: observations.join(' ') || 'Pas encore assez de relevés pour dégager une tendance.',
    alert,
  };
}

/** Zones dont l'écart avec la semaine précédente n'est pas crédible. */
export function implausibleLabels(zones: readonly MeasurementZone[]) {
  return zones.map(libelle);
}
