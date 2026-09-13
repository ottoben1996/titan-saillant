import NumberFlow from '@number-flow/react';
import { formatNombre } from '../../workout/followup';

interface NombreAnimeProps {
  /** Valeur à afficher. */
  valeur: number;
  /** Décimales conservées, comme partout ailleurs dans l'application. */
  decimals?: number;
  /** Unité accolée, alignée sur la valeur. */
  suffixe?: string;
}

/**
 * Un grand nombre qui défile au lieu de sauter.
 *
 * Deux situations seulement : la charge prescrite qu'on découvre en arrivant sur
 * une série, et les chiffres du bilan. Entre 110 et 112,5 kg, un chiffre qui
 * glisse dit qu'on a progressé ; le même chiffre remplacé d'un coup ne dit rien.
 *
 * Les chiffres restent tabulaires et formatés en français (virgule décimale),
 * exactement comme le reste de l'application.
 */
export function NombreAnime({ valeur, decimals = 1, suffixe }: NombreAnimeProps) {
  return (
    <NumberFlow
      value={Number.isFinite(valeur) ? valeur : 0}
      locales="fr-FR"
      format={{ minimumFractionDigits: decimals, maximumFractionDigits: decimals }}
      suffix={suffixe ? ` ${suffixe}` : undefined}
      // Le rendu doit rester identique si l'animation est indisponible : la
      // valeur est aussi écrite en clair pour les technologies d'assistance.
      aria-label={`${formatNombre(valeur, decimals)}${suffixe ? ` ${suffixe}` : ''}`}
      willChange
    />
  );
}
