import { type AccentId, accentParDefaut, estAccent } from '../domain/palettes';
import type { ProfileId } from '../domain/types';

/**
 * Couleur choisie dans les réglages, une par profil.
 *
 * Stockée à part des données d'entraînement : c'est un réglage d'affichage, il
 * n'a rien à faire dans la base IndexedDB, et le lire de façon synchrone évite
 * que l'application s'affiche une fraction de seconde dans la mauvaise couleur.
 */
const cle = (profile: ProfileId) => `coach-accent-${profile}`;

export function lireAccent(profile: ProfileId): AccentId {
  try {
    const valeur = localStorage.getItem(cle(profile));
    return estAccent(valeur) ? valeur : accentParDefaut[profile];
  } catch {
    // Navigation privée ou stockage refusé : on garde la couleur du profil.
    return accentParDefaut[profile];
  }
}

export function enregistrerAccent(profile: ProfileId, accent: AccentId): void {
  try {
    localStorage.setItem(cle(profile), accent);
  } catch {
    // Le choix ne survivra pas au rechargement, mais l'application reste utilisable.
  }
}
