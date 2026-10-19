import type { ProfileId } from './types';

export type AccentId = 'vert' | 'rose' | 'bleu' | 'ambre' | 'turquoise';

export interface Accent {
  id: AccentId;
  label: string;
  /** Couleur principale : boutons, chiffres forts, et barre système du téléphone. */
  accent: string;
  /** Texte posé sur la couleur. Contraste vérifié, jamais sous le seuil AAA. */
  ink: string;
  /** Variante médiane, pour les dégradés et les barres de progression. */
  accent2: string;
  /** Teinte très sombre, pour les fonds de carte teintés. */
  accent3: string;
}

/**
 * Les couleurs proposées dans les réglages, inspirées des anneaux d'activité.
 *
 * Chaque paire couleur / encre est mesurée : le contraste dépasse 9:1, au-dessus
 * du seuil AAA de 7:1, et la couleur ressort à plus de 10:1 sur le fond sombre
 * de l'application. Choisir une couleur ne peut donc jamais rendre un texte
 * illisible.
 */
export const accents: readonly Accent[] = Object.freeze([
  { id: 'vert', label: 'Lime', accent: '#A8F04A', ink: '#0E1A05', accent2: '#86C23A', accent3: '#26361A' },
  { id: 'rose', label: 'Lilas', accent: '#D7B8FF', ink: '#1A1029', accent2: '#AC93CC', accent3: '#2E2640' },
  { id: 'bleu', label: 'Azur', accent: '#6CC4FF', ink: '#04192B', accent2: '#579DCC', accent3: '#1A2E40' },
  { id: 'ambre', label: 'Ambre', accent: '#FFB547', ink: '#261603', accent2: '#CC9139', accent3: '#3A2C16' },
  { id: 'turquoise', label: 'Menthe', accent: '#5CE6D2', ink: '#03221E', accent2: '#4AB8A8', accent3: '#163632' },
]);

/** Couleur de départ, tant que personne n'a choisi : le vert d'Ottman, le rose de Laura. */
export const accentParDefaut: Readonly<Record<ProfileId, AccentId>> = Object.freeze({
  ottman: 'vert',
  laura: 'rose',
});

export const accentIds: readonly AccentId[] = accents.map((accent) => accent.id);

export function estAccent(valeur: unknown): valeur is AccentId {
  return typeof valeur === 'string' && (accentIds as readonly string[]).includes(valeur);
}

/** Couleur à appliquer : celle choisie si elle est connue, sinon celle du profil. */
export function accentDe(id: AccentId | undefined, profile: ProfileId): Accent {
  const voulu = estAccent(id) ? id : accentParDefaut[profile];
  return accents.find((accent) => accent.id === voulu) ?? accents[0];
}

/**
 * Contraste WCAG entre deux couleurs, de 1 (identiques) à 21 (noir sur blanc).
 *
 * Gardé dans le code de production : c'est ce qui permet aux tests de refuser
 * une couleur ajoutée plus tard qui rendrait un texte difficile à lire.
 */
export function contraste(premiere: string, seconde: string): number {
  const luminance = (couleur: string) => {
    const canaux = [1, 3, 5].map((index) => parseInt(couleur.slice(index, index + 2), 16) / 255);
    return canaux
      .map((canal) => (canal <= 0.03928 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4))
      .reduce((total, canal, index) => total + canal * [0.2126, 0.7152, 0.0722][index], 0);
  };
  const a = luminance(premiere);
  const b = luminance(seconde);
  return Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 100) / 100;
}
