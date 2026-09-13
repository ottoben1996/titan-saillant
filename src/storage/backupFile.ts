import { fichierCalendrierSuivi, nomFichierCalendrier } from '../domain/calendarFile';
import type { ProfileId } from '../domain/types';
import { exportProfileData } from './backup';
import { enregistrerExport } from './backupReminder';

/**
 * Téléchargements du navigateur.
 *
 * Isolés ici parce que ce sont les seuls endroits du dépôt qui touchent au DOM
 * pour produire un fichier : tout le reste manipule des données pures, donc
 * testables sans navigateur.
 */
function telecharger(contenu: BlobPart, type: string, nom: string): void {
  const url = URL.createObjectURL(new Blob([contenu], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = nom;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Exporte les données du profil et note la date : le rappel se taira un mois. */
export async function telechargerSauvegarde(profile: ProfileId): Promise<void> {
  telecharger(await exportProfileData(profile), 'application/json', `coach-${profile}.json`);
  enregistrerExport(profile);
}

/** Le point du samedi, prêt à être inscrit dans le calendrier du téléphone. */
export function telechargerCalendrierSuivi(profile: ProfileId, maintenant: Date = new Date()): void {
  telecharger(
    fichierCalendrierSuivi({ profileId: profile, depuis: maintenant }),
    'text/calendar;charset=utf-8',
    nomFichierCalendrier(profile),
  );
}
