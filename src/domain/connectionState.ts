/**
 * État de connexion / disponibilité hors ligne — logique d'affichage pure.
 *
 * Extrait la règle de présentation de la pastille de connexion pour la rendre
 * testable sans DOM : le libellé et la tonalité dépendent uniquement de
 * `navigator.onLine` et de l'avancement du service worker. La logique couvre
 * aussi la préparation hors ligne (précacheage terminé) affichée dans les
 * réglages, afin qu'un seul module décide de la formulation « utilisable hors
 * ligne » plutôt que de la dupliquer dans chaque écran.
 */

export type ConnectionTone = 'online' | 'offline';
export type OfflineReadiness = 'ready' | 'pending' | 'unknown';

export interface ConnectionSnapshot {
  isOnline: boolean;
  /** Précacheage PWA terminé (événement `coach-offline-ready`). */
  offlineReady: boolean;
  /** Service worker prêt à servir l'app. */
  serviceWorkerReady: boolean;
}

export interface ConnectionState {
  tone: ConnectionTone;
  label: string;
  ariaLabel: string;
  offlineReadiness: OfflineReadiness;
  /** Vrai si l'app reste pleinement utilisable sans réseau dès maintenant. */
  usableOffline: boolean;
}

export function describeConnectionState(snapshot: ConnectionSnapshot): ConnectionState {
  const { isOnline, offlineReady, serviceWorkerReady } = snapshot;

  const offlineReadiness: OfflineReadiness =
    offlineReady && serviceWorkerReady ? 'ready' : offlineReady || serviceWorkerReady ? 'pending' : 'unknown';

  return {
    tone: isOnline ? 'online' : 'offline',
    label: isOnline ? 'En ligne' : 'Hors ligne',
    ariaLabel: isOnline ? 'Connexion disponible' : 'Mode hors ligne',
    offlineReadiness,
    usableOffline: offlineReady && serviceWorkerReady,
  };
}
