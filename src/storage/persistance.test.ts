/**
 * Persistance du stockage.
 *
 * Ce qui se vérifie ici n'est pas la politique d'éviction des navigateurs — elle
 * n'est pas la nôtre — mais le fait que l'application ne **promette jamais** plus
 * que ce qui est accordé : un appareil qui ne sait pas répondre doit être
 * annoncé comme tel, jamais comme protégé.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { demanderPersistance, etatPersistance, libellePersistance } from './persistance';

type GestionFactice = { persisted: () => Promise<boolean>; persist: () => Promise<boolean> };

function poserStockage(factice: GestionFactice | undefined) {
  Object.defineProperty(navigator, 'storage', { value: factice, configurable: true });
}

afterEach(() => {
  // jsdom n'expose pas `navigator.storage` : on remet l'état d'origine.
  Reflect.deleteProperty(navigator, 'storage');
  vi.restoreAllMocks();
});

describe('état de persistance', () => {
  it('annonce « inconnu » quand l’appareil ne sait pas répondre', async () => {
    poserStockage(undefined);
    expect(await etatPersistance()).toBe('indisponible');
    expect(libellePersistance('indisponible').protege).toBe(false);
  });

  it('distingue une origine protégée d’une origine évictable', async () => {
    poserStockage({ persisted: async () => true, persist: async () => true });
    expect(await etatPersistance()).toBe('persistante');
    expect(libellePersistance('persistante')).toEqual({ texte: 'Protégées', protege: true });

    poserStockage({ persisted: async () => false, persist: async () => false });
    expect(await etatPersistance()).toBe('best-effort');
    expect(libellePersistance('best-effort').protege).toBe(false);
  });

  it('ne demande rien quand la persistance est déjà accordée', async () => {
    const persist = vi.fn(async () => true);
    poserStockage({ persisted: async () => true, persist });

    expect(await demanderPersistance()).toBe('persistante');
    expect(persist).not.toHaveBeenCalled();
  });

  it('demande la persistance et relit ce qui a été accordé', async () => {
    let accordee = false;
    const persist = vi.fn(async () => {
      accordee = true;
      return true;
    });
    poserStockage({ persisted: async () => accordee, persist });

    expect(await demanderPersistance()).toBe('persistante');
    expect(persist).toHaveBeenCalledOnce();
  });

  it('un refus ne bloque rien : l’état reste annoncé honnêtement', async () => {
    poserStockage({
      persisted: async () => false,
      persist: async () => {
        throw new Error('refusé');
      },
    });

    expect(await demanderPersistance()).toBe('best-effort');
  });
});
