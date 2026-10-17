import { describe, expect, it, vi } from 'vitest';
import { STORAGE_UNAVAILABLE_MESSAGE, withStorageGuard } from './guard';

describe('garde-fou de stockage', () => {
  it('renvoie le résultat quand l’opération réussit', async () => {
    const onFailure = vi.fn();
    await expect(withStorageGuard(Promise.resolve(42), onFailure, 0)).resolves.toBe(42);
    expect(onFailure).not.toHaveBeenCalled();
  });

  it('renvoie le repli et signale l’échec quand IndexedDB refuse', async () => {
    const onFailure = vi.fn();
    const result = await withStorageGuard(Promise.reject(new Error('QuotaExceededError')), onFailure, []);
    expect(result).toEqual([]);
    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(onFailure.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  it('gère un rejet qui n’est pas une erreur', async () => {
    const onFailure = vi.fn();
    await withStorageGuard(Promise.reject('refus'), onFailure, null);
    expect(onFailure).toHaveBeenCalledWith('refus');
  });

  it('expose un message d’indisponibilité compréhensible', () => {
    expect(STORAGE_UNAVAILABLE_MESSAGE).toContain('pas enregistrées');
    expect(STORAGE_UNAVAILABLE_MESSAGE).toContain('navigation privée');
  });
});
