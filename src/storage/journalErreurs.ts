import type { ProfileId } from '../domain/types';

/**
 * Journal des erreurs, conservé sur l'appareil.
 *
 * Sans serveur, une erreur attrapée par la barrière de sécurité était montrée
 * puis oubliée : impossible de savoir après coup ce qui s'était passé, ni de le
 * transmettre. Ce journal garde les dernières erreurs, en clair, et l'export
 * des données l'emporte avec elles.
 *
 * Rien ne quitte l'appareil : c'est un fichier local, effaçable depuis les
 * réglages.
 */
const CLE = 'coach-journal-erreurs';
/** Assez pour diagnostiquer, pas assez pour remplir le stockage. */
const MAXIMUM = 20;

export interface ErreurEnregistree {
  date: string;
  message: string;
  origine: string;
  profil?: ProfileId;
}

function lireBrut(): ErreurEnregistree[] {
  try {
    const brut = localStorage.getItem(CLE);
    if (!brut) return [];
    const donnees = JSON.parse(brut);
    return Array.isArray(donnees) ? (donnees as ErreurEnregistree[]) : [];
  } catch {
    return [];
  }
}

export function lireErreurs(): ErreurEnregistree[] {
  return lireBrut();
}

export function enregistrerErreur(message: string, origine: string, profil?: ProfileId): void {
  const entree: ErreurEnregistree = {
    date: new Date().toISOString(),
    message: message.slice(0, 300),
    origine: origine.slice(0, 120),
    profil,
  };
  try {
    const journal = [entree, ...lireBrut()].slice(0, MAXIMUM);
    localStorage.setItem(CLE, JSON.stringify(journal));
  } catch {
    // Stockage plein ou refusé : on n'ajoute rien plutôt que de casser l'écran.
  }
}

export function viderErreurs(): void {
  try {
    localStorage.removeItem(CLE);
  } catch {
    // Sans conséquence.
  }
}

/** Texte lisible, prêt à être copié dans un message. */
export function journalEnTexte(erreurs: ErreurEnregistree[]): string {
  if (erreurs.length === 0) return 'Aucune erreur enregistrée.';
  return erreurs
    .map((erreur) => {
      const quand = new Date(erreur.date).toLocaleString('fr-FR');
      const qui = erreur.profil ? ` · ${erreur.profil}` : '';
      return `${quand}${qui} · ${erreur.origine}\n${erreur.message}`;
    })
    .join('\n\n');
}
