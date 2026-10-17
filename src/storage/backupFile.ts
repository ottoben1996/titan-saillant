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
function telecharger(contenu: BlobPart, type: string, nom: string): boolean {
  const url = URL.createObjectURL(new Blob([contenu], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = nom;
  anchor.rel = 'noopener';
  try {
    // L'ancre doit être RATTACHÉE au document : un élément détaché est ignoré
    // par WebKit, et le fichier n'arrive jamais alors que rien ne le signale.
    document.body.append(anchor);
    anchor.click();
  } catch {
    return false;
  } finally {
    anchor.remove();
    // Révocation différée : libérer le blob dans la même tâche annule le
    // téléchargement sur les moteurs qui n'ont pas encore lu l'URL.
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
  return true;
}

/**
 * Exporte les données du profil. Renvoie faux quand le téléchargement n'a pas pu
 * être lancé — l'appelant doit alors le dire, plutôt que d'annoncer un succès.
 *
 * La date d'export n'est notée que dans ce cas : sinon le rappel de sauvegarde
 * se tairait un mois pour un fichier qui n'existe pas, et la personne se croirait
 * couverte.
 */
export async function telechargerSauvegarde(profile: ProfileId): Promise<boolean> {
  const lance = telecharger(await exportProfileData(profile), 'application/json', `coach-${profile}.json`);
  if (lance) enregistrerExport(profile);
  return lance;
}

/** Le point du samedi, prêt à être inscrit dans le calendrier du téléphone. */
export function telechargerCalendrierSuivi(profile: ProfileId, maintenant: Date = new Date()): boolean {
  return telecharger(
    fichierCalendrierSuivi({ profileId: profile, depuis: maintenant }),
    'text/calendar;charset=utf-8',
    nomFichierCalendrier(profile),
  );
}
