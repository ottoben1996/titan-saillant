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
 * Quelques situations seulement, celles où la variation se lit : la charge
 * prescrite qu'on découvre en arrivant sur une série, les deux métriques de
 * l'accueil, les chiffres du bilan. Entre 110 et 112,5 kg, un chiffre qui
 * glisse dit qu'on a progressé ; le même chiffre remplacé d'un coup ne dit rien.
 *
 * Les chiffres restent tabulaires et formatés en français (virgule décimale),
 * exactement comme le reste de l'application.
 *
 * Repli : l'élément personnalisé de number-flow n'est enregistré que dans un
 * navigateur. Là où il ne l'est pas — environnement de test sans navigateur,
 * moteur sans éléments personnalisés — le nombre s'écrit en clair, sans
 * mouvement. C'est la règle du composant : un chiffre ne fait jamais tomber
 * l'écran qui l'affiche.
 */
const defilementDisponible = typeof customElements !== 'undefined' && Boolean(customElements.get('number-flow-react'));

export function NombreAnime({ valeur, decimals = 1, suffixe }: NombreAnimeProps) {
  const nombre = Number.isFinite(valeur) ? valeur : 0;
  const texte = `${formatNombre(nombre, decimals)}${suffixe ? ` ${suffixe}` : ''}`;

  if (!defilementDisponible) return <span>{texte}</span>;

  return (
    <NumberFlow
      value={nombre}
      locales="fr-FR"
      // Le navigateur doit écrire le nombre comme `formatNombre` : virgule si
      // elle sert, jamais de zéro final (« 78 kg », pas « 78,0 kg »).
      format={{ minimumFractionDigits: 0, maximumFractionDigits: decimals }}
      suffix={suffixe ? ` ${suffixe}` : undefined}
      // Le rendu doit rester identique si l'animation est indisponible : la
      // valeur est aussi écrite en clair pour les technologies d'assistance.
      aria-label={texte}
      willChange
    />
  );
}
