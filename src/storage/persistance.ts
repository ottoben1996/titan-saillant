/**
 * Persistance du stockage local.
 *
 * Sans serveur, des mois d'entraînement n'existent que dans l'IndexedDB de cet
 * appareil. Or une origine web est « best-effort » par défaut : le navigateur a
 * le droit d'évincer ses données sous pression de stockage, et Safari iOS le
 * fait pour un site resté longtemps sans visite. `navigator.storage.persist()`
 * demande de passer en « persistant », ce qui retire ce droit au navigateur.
 *
 * Rien n'est garanti : iOS peut refuser ou ignorer la demande. On ne bloque donc
 * jamais — on informe, et l'écran Réglages dit la vérité au lieu d'annoncer des
 * données « Disponibles » quoi qu'il arrive.
 */

export type EtatPersistance = 'persistante' | 'best-effort' | 'indisponible';

function stockage(): StorageManager | undefined {
  return typeof navigator === 'undefined' ? undefined : navigator.storage;
}

/** Ce que l'appareil accorde réellement, sans rien demander. */
export async function etatPersistance(): Promise<EtatPersistance> {
  const gestion = stockage();
  if (!gestion?.persisted) return 'indisponible';
  try {
    return (await gestion.persisted()) ? 'persistante' : 'best-effort';
  } catch {
    return 'indisponible';
  }
}

/**
 * Demande la persistance, puis relit ce qui a réellement été accordé. À appeler
 * depuis un geste de l'utilisateur : certains navigateurs l'exigent, et une
 * demande faite au chargement est refusée sans explication.
 */
export async function demanderPersistance(): Promise<EtatPersistance> {
  const gestion = stockage();
  if (!gestion?.persist) return 'indisponible';
  try {
    if (!(await gestion.persisted())) await gestion.persist();
  } catch {
    /* refus : on informe, on ne bloque pas */
  }
  return etatPersistance();
}

/** Libellé pour l'écran Réglages. Ne promet jamais plus que ce qui est accordé. */
export function libellePersistance(etat: EtatPersistance): { texte: string; protege: boolean } {
  switch (etat) {
    case 'persistante':
      return { texte: 'Protégées', protege: true };
    case 'best-effort':
      return { texte: 'Évinçables', protege: false };
    default:
      return { texte: 'Inconnues', protege: false };
  }
}
