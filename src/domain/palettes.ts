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
 * Les couleurs proposées dans les réglages.
 *
 * Chaque paire couleur / encre est mesurée : le contraste dépasse 10:1, très
 * au-dessus du seuil AAA de 7:1, et la couleur ressort à plus de 10:1 sur le
 * fond sombre de l'application. Choisir une couleur ne peut donc jamais rendre
 * un texte illisible.
 */
export const accents: readonly Accent[] = Object.freeze([
  { id: 'vert', label: 'Vert', accent: '#B8F36B', ink: '#0E1710', accent2: '#97C758', accent3: '#2B3923' },
  { id: 'rose', label: 'Rose', accent: '#E3C0F7', ink: '#1A1024', accent2: '#BA9DCB', accent3: '#323139' },
  { id: 'bleu', label: 'Bleu', accent: '#8FC7FF', ink: '#0A1622', accent2: '#75A3D1', accent3: '#24323A' },
  { id: 'ambre', label: 'Ambre', accent: '#F6C177', ink: '#1F1305', accent2: '#CA9E62', accent3: '#353125' },
  { id: 'turquoise', label: 'Turquoise', accent: '#7FE3D2', ink: '#04211D', accent2: '#68BAAC', accent3: '#223733' },
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
