import { describe, expect, it } from 'vitest';
import { fichierCalendrierSuivi, nomFichierCalendrier, prochainSamedi } from './calendarFile';

describe('fichier calendrier du point du samedi', () => {
  it('propose le samedi suivant, jamais aujourd’hui', () => {
    // Samedi 12 septembre 2026 : le point du jour est déjà fait ou en cours.
    expect(prochainSamedi(new Date(2026, 8, 12)).getDate()).toBe(19);
    // Mardi 15 septembre : le samedi suivant est le 19.
    expect(prochainSamedi(new Date(2026, 8, 15)).getDate()).toBe(19);
    // Dimanche 13 septembre : le samedi suivant est le 19.
    expect(prochainSamedi(new Date(2026, 8, 13)).getDate()).toBe(19);
    expect(prochainSamedi(new Date(2026, 8, 15)).getDay()).toBe(6);
  });

  it('tient le contrat iCalendar', () => {
    const fichier = fichierCalendrierSuivi({ profileId: 'ottman', depuis: new Date(2026, 8, 12) });

    expect(fichier.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(fichier.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(fichier).toContain('VERSION:2.0');
    expect(fichier).toContain('BEGIN:VEVENT');
    expect(fichier).toContain('END:VEVENT');
  });

  it('inscrit huit semaines de rendez-vous, avec un rappel avant', () => {
    const fichier = fichierCalendrierSuivi({ profileId: 'laura', depuis: new Date(2026, 8, 12) });

    expect(fichier).toContain('RRULE:FREQ=WEEKLY;COUNT=8');
    expect(fichier).toContain('DTSTART;TZID=Europe/Paris:20260919T090000');
    expect(fichier).toContain('DTEND;TZID=Europe/Paris:20260919T093000');
    expect(fichier).toContain('TRIGGER:-PT30M');
    expect(fichier).toContain('SUMMARY:Point du samedi — Laura');
  });

  it('reste lisible par un calendrier : retour chariot et lignes courtes', () => {
    const fichier = fichierCalendrierSuivi({ profileId: 'ottman', depuis: new Date(2026, 8, 12) });
    const lignes = fichier.split('\r\n').filter((ligne) => ligne.length > 0);

    // Aucune ligne ne dépasse 75 octets : au-delà, la norme exige un pliage.
    for (const ligne of lignes) {
      expect(ligne.length, ligne).toBeLessThanOrEqual(75);
    }
    // Les virgules d'un texte iCalendar s'échappent, sinon la description est tronquée.
    const description = lignes.find((ligne) => ligne.startsWith('DESCRIPTION:Poids'));
    expect(description).toContain('\\,');
  });

  it('donne un nom de fichier propre au profil', () => {
    expect(nomFichierCalendrier('laura')).toBe('point-du-samedi-laura.ics');
    expect(nomFichierCalendrier('ottman')).toBe('point-du-samedi-ottman.ics');
  });
});
