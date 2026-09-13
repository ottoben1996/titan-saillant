/**
 * Garde-fou de stockage local.
 *
 * IndexedDB peut être indisponible (navigation privée, quota dépassé, base
 * bloquée par un autre onglet). Sans garde-fou, ces échecs sont silencieux :
 * la série semble validée alors qu'elle n'est pas enregistrée. Toute opération
 * passe donc par ici, avec un repli explicite et une notification à l'appelant.
 */

export type StorageFailureHandler = (error: unknown) => void;

export async function withStorageGuard<T>(
  operation: Promise<T>,
  onFailure: StorageFailureHandler,
  fallback: T,
): Promise<T> {
  try {
    return await operation;
  } catch (error) {
    onFailure(error);
    return fallback;
  }
}

export const STORAGE_UNAVAILABLE_MESSAGE =
  'Stockage local indisponible : tes séries ne sont pas enregistrées. Autorise le stockage du site ou quitte la navigation privée.';
