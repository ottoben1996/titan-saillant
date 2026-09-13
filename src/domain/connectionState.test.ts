import { describe, expect, it } from 'vitest';
import { describeConnectionState } from './connectionState';

describe('describeConnectionState', () => {
  it('signale la connexion normale avec la pastille « en ligne »', () => {
    expect(describeConnectionState({ isOnline: true, offlineReady: true, serviceWorkerReady: true })).toMatchObject({
      tone: 'online',
      label: 'En ligne',
      ariaLabel: 'Connexion disponible',
      offlineReadiness: 'ready',
      usableOffline: true,
    });
  });

  it('bascule en mode hors ligne dès que le réseau tombe', () => {
    expect(describeConnectionState({ isOnline: false, offlineReady: true, serviceWorkerReady: true })).toMatchObject({
      tone: 'offline',
      label: 'Hors ligne',
      ariaLabel: 'Mode hors ligne',
    });
  });

  it('reste utilisable hors ligne sans réseau quand le précache est prêt', () => {
    expect(
      describeConnectionState({ isOnline: false, offlineReady: true, serviceWorkerReady: true }).usableOffline,
    ).toBe(true);
  });

  it('marque la préparation hors ligne comme « en attente » si un seul signal est reçu', () => {
    expect(
      describeConnectionState({ isOnline: true, offlineReady: true, serviceWorkerReady: false }).offlineReadiness,
    ).toBe('pending');
    expect(
      describeConnectionState({ isOnline: true, offlineReady: false, serviceWorkerReady: true }).offlineReadiness,
    ).toBe('pending');
  });

  it('marque la préparation hors ligne comme « inconnue » sans aucun signal', () => {
    const state = describeConnectionState({ isOnline: true, offlineReady: false, serviceWorkerReady: false });
    expect(state.offlineReadiness).toBe('unknown');
    expect(state.usableOffline).toBe(false);
  });

  it('n’est pas utilisable hors ligne tant que les deux signaux ne sont pas réunis', () => {
    expect(
      describeConnectionState({ isOnline: false, offlineReady: true, serviceWorkerReady: false }).usableOffline,
    ).toBe(false);
    expect(
      describeConnectionState({ isOnline: false, offlineReady: false, serviceWorkerReady: true }).usableOffline,
    ).toBe(false);
  });
});
