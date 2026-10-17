import type { ProfileId } from './types';

/**
 * Fichier calendrier du point du samedi.
 *
 * L'application vit dans le téléphone, sans serveur : elle ne peut pas
 * programmer de rappel toute seule, et une notification web n'arrive pas sur
 * iPhone sans service tiers. Le calendrier du téléphone, lui, sonne toujours.
 * On lui donne donc le rendez-vous, avec son rappel, sous forme de fichier
 * standard — huit semaines, une seule ligne de récurrence.
 */

export interface OptionsCalendrier {
  profileId: ProfileId;
  /** Point de départ : le premier samedi proposé. */
  depuis: Date;
  /** Nombre de semaines couvertes, huit par défaut — la longueur du cycle. */
  semaines?: number;
  heure?: number;
  dureeMinutes?: number;
}

/** Le prochain samedi, jamais aujourd'hui : le point en cours est déjà fait. */
export function prochainSamedi(depuis: Date): Date {
  const samedi = new Date(depuis.getTime());
  const ecart = (6 - samedi.getDay() + 7) % 7 || 7;
  samedi.setDate(samedi.getDate() + ecart);
  return samedi;
}

const deuxChiffres = (valeur: number) => String(valeur).padStart(2, '0');

/** Date locale au format iCalendar, sans fuseau : le rendez-vous reste à 9 h partout. */
function horodatage(date: Date, heure: number, minute: number): string {
  return `${date.getFullYear()}${deuxChiffres(date.getMonth() + 1)}${deuxChiffres(date.getDate())}T${deuxChiffres(heure)}${deuxChiffres(minute)}00`;
}

export const nomFichierCalendrier = (profileId: ProfileId) => `point-du-samedi-${profileId}.ics`;

/**
 * Pliage d'une ligne trop longue.
 *
 * La norme iCalendar interdit de dépasser 75 octets par ligne : au-delà, la
 * suite s'écrit sur la ligne suivante, précédée d'un espace. Sans ce pliage, les
 * agendas coupent la description en plein milieu — quand ils ne rejettent pas le
 * fichier.
 */
function plier(ligne: string): string[] {
  if (ligne.length <= 75) return [ligne];
  const morceaux = [ligne.slice(0, 75)];
  let reste = ligne.slice(75);
  while (reste.length > 0) {
    morceaux.push(` ${reste.slice(0, 74)}`);
    reste = reste.slice(74);
  }
  return morceaux;
}

export function fichierCalendrierSuivi(options: OptionsCalendrier): string {
  const { profileId, depuis, semaines = 8, heure = 9, dureeMinutes = 30 } = options;
  const premier = prochainSamedi(depuis);
  const debut = horodatage(premier, heure, 0);
  const fin = horodatage(premier, heure, dureeMinutes);
  const nom = profileId === 'laura' ? 'Laura' : 'Ottman';

  // Les lignes d'un fichier iCalendar se terminent par un retour chariot, et
  // aucune ne doit dépasser 75 octets : le pliage manuel ci-dessous les tient courts.
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Coach Ottman et Laura//Suivi hebdomadaire//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VTIMEZONE',
    'TZID:Europe/Paris',
    'BEGIN:STANDARD',
    'DTSTART:19701025T030000',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0100',
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
    'TZNAME:CET',
    'END:STANDARD',
    'BEGIN:DAYLIGHT',
    'DTSTART:19700329T020000',
    'TZOFFSETFROM:+0100',
    'TZOFFSETTO:+0200',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
    'TZNAME:CEST',
    'END:DAYLIGHT',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:point-du-samedi-${profileId}@coach-local`,
    `DTSTAMP:${horodatage(depuis, heure, 0)}`,
    `DTSTART;TZID=Europe/Paris:${debut}`,
    `DTEND;TZID=Europe/Paris:${fin}`,
    `SUMMARY:Point du samedi — ${nom}`,
    'DESCRIPTION:Poids\\, tour de taille\\, buste\\, bras\\, cuisses. Saisie dans l’appli puis bilan en PDF pour le coach.',
    'LOCATION:À la maison',
    `RRULE:FREQ=WEEKLY;COUNT=${semaines}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Point du samedi dans 30 minutes',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .flatMap(plier)
    .map((ligne) => `${ligne}\r\n`)
    .join('');
}
