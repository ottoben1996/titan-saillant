import type { WorkoutPlan, WorkoutSession } from '../domain/types';

/**
 * Série d'assiduité.
 *
 * Une chaîne de semaines complètes, à ne pas rompre, calculée localement et
 * affichée sur l'accueil. Rien de compétitif, rien de notifié : c'est un repère
 * de régularité, pas un tableau de scores. La semaine en cours ne casse jamais
 * la série tant qu'elle n'est pas finie — il est normal d'être mardi.
 */
export interface SemaineAssiduite {
  /** 0 = semaine en cours, 1 = la précédente, etc. */
  decalage: number;
  faite: boolean;
  seances: number;
  prevues: number;
}

export interface SerieAssiduite {
  /** Nombre de semaines complètes consécutives. */
  semainesConsecutives: number;
  seancesFaites: number;
  semaines: SemaineAssiduite[];
}

const JOUR = 86_400_000;

export function serieAssiduite(
  history: readonly WorkoutSession[],
  program: WorkoutPlan,
  maintenant: Date = new Date(),
  nombreDeSemaines = 8,
): SerieAssiduite {
  const prevues = program.days.length;
  const fin = maintenant.getTime();
  const terminees = history.filter((item) => item.completedAt);

  const semaines: SemaineAssiduite[] = [];
  for (let decalage = nombreDeSemaines - 1; decalage >= 0; decalage -= 1) {
    const debut = fin - (decalage + 1) * 7 * JOUR;
    const finSemaine = fin - decalage * 7 * JOUR;
    const seances = terminees.filter((item) => {
      const quand = new Date(item.completedAt as string).getTime();
      return quand > debut && quand <= finSemaine;
    }).length;
    semaines.push({ decalage, faite: seances >= prevues, seances, prevues });
  }

  // Le tableau va du plus ancien au plus récent : la série se compte donc à
  // l'envers, en partant de la fin.
  let semainesConsecutives = 0;
  for (let index = semaines.length - 1; index >= 0; index -= 1) {
    if (semaines[index].faite) {
      semainesConsecutives += 1;
      continue;
    }
    // La semaine en cours n'est pas terminée : elle ne rompt pas la série.
    if (index === semaines.length - 1) continue;
    break;
  }

  return {
    semainesConsecutives,
    seancesFaites: semaines.reduce((total, semaine) => total + semaine.seances, 0),
    semaines,
  };
}
