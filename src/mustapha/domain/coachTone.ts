import type { CoachTone } from './types';

export type CoachEvent = 'welcome' | 'before-session' | 'after-session' | 'rest-day';

const messages: Record<CoachTone, Record<CoachEvent, string>> = {
  standard: {
    welcome: 'On avance avec un plan clair, une séance à la fois.',
    'before-session': 'Prépare ta séance. La régularité fera la différence.',
    'after-session': 'Séance enregistrée. Récupère, puis reviens au prochain rendez-vous.',
    'rest-day': 'Récupération active : marche légère, hydratation, sommeil régulier.',
  },
  directive: {
    welcome: 'Plan chargé. Tu exécutes la prochaine action, sans négocier avec toi-même.',
    'before-session': 'Va à la salle. Échauffement, première série, puis on parle.',
    'after-session': 'Travail validé. Tu récupères maintenant pour pouvoir recommencer.',
    'rest-day': 'Aujourd’hui tu récupères. La discipline inclut aussi le repos.',
  },
  'dictator-rp': {
    welcome: 'Ordre du jour : tu suis le plan. Le régime est fictif, la séance est réelle.',
    'before-session': 'Va à la salle, soldat. Échauffe-toi et exécute la première série.',
    'after-session': 'Séance validée par le commandement. Hydrate-toi et récupère.',
    'rest-day': 'Repos obligatoire. Même un dictateur compétent protège ses troupes.',
  },
};

export function getCoachMessage(tone: CoachTone | undefined, event: CoachEvent, name: string): string {
  const selected = tone && messages[tone] ? tone : 'standard';
  return `${name}, ${messages[selected][event]}`;
}
