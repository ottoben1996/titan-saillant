import { calculatePlates } from '../../workout/plateCalculator';
import { Warning } from './Icons';

interface PlateBadgeProps {
  totalLoadKg: number;
  exerciseId?: string;
  barWeightKg?: number;
}

/** Couleurs IWF des disques (information, pas un accent d'interface). */
const IWF_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  25: { bg: '#e53935', text: '#ffffff', border: '#ff6f60' },
  20: { bg: '#1e88e5', text: '#ffffff', border: '#6ab7ff' },
  15: { bg: '#fbc02d', text: '#1a1a1a', border: '#fff263' },
  10: { bg: '#2e7d32', text: '#ffffff', border: '#60ad5e' },
  5: { bg: '#e0e0e0', text: '#1a1a1a', border: '#ffffff' },
  2.5: { bg: '#263238', text: '#eceff1', border: '#455a64' },
  1.25: { bg: '#78909c', text: '#ffffff', border: '#b0bec5' },
};

const FALLBACK_COLOR = { bg: '#37474f', text: '#fff', border: '#546e7a' };

const FALLBACK_BAR_KG_BY_EXERCISE: Record<string, number> = {
  // Smith machine : barre guidée de 10 kg
  'squat-smith': 10,
};

/** Arrondi au quart de kilo le plus proche, sans bruit de virgule flottante. */
function roundKg(value: number): number {
  return Math.round(value * 100) / 100;
}

/** 40 -> "40" ; 2.5 -> "2,5" ; 1.25 -> "1,25" (format FR, séparateur virgule). */
function formatKg(value: number): string {
  const rounded = roundKg(value);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0$/, '').replace('.', ',');
}

/**
 * Badge de chargement : ce qu'il faut réellement enfiler sur la barre, par côté.
 * Pensé pour être lu d'un coup d'œil, téléphone à bout de bras en salle.
 */
export function PlateBadge({ totalLoadKg, exerciseId, barWeightKg }: PlateBadgeProps) {
  if (!Number.isFinite(totalLoadKg) || totalLoadKg < 20) return null;

  const effectiveBarWeight =
    barWeightKg !== undefined ? barWeightKg : exerciseId ? (FALLBACK_BAR_KG_BY_EXERCISE[exerciseId] ?? 0) : 0;

  const breakdown = calculatePlates(totalLoadKg, effectiveBarWeight);
  const { platesPerSide, remainderKg, weightPerSideKg } = breakdown;

  const isExact = remainderKg <= 0.001;
  // Rien à charger et rien qui manque : barre vide, on n'affiche pas le badge.
  if (platesPerSide.length === 0 && isExact) return null;

  // Ce qui est réellement atteignable avec les disques disponibles.
  const achievablePerSideKg = roundKg(weightPerSideKg - remainderKg);
  const achievedTotalKg = roundKg(totalLoadKg - 2 * remainderKg);
  const shortfallTotalKg = roundKg(2 * remainderKg);

  const discSummary = platesPerSide.map((item) => `${item.count} × ${formatKg(item.plateKg)} kg`).join(', ');

  const accessibleLabel = [
    `Chargement par côté : ${formatKg(achievablePerSideKg)} kg par côté`,
    effectiveBarWeight > 0 ? `barre ${formatKg(effectiveBarWeight)} kg comprise` : 'manchons seuls',
    `total ${formatKg(achievedTotalKg)} kg`,
    platesPerSide.length > 0 ? `disques : ${discSummary}` : 'aucun disque',
    isExact
      ? 'charge exacte'
      : `charge non exacte, il manque ${formatKg(shortfallTotalKg)} kg par rapport à la cible de ${formatKg(totalLoadKg)} kg`,
  ].join(' · ');

  return (
    <div
      className={`plate-badge-container${isExact ? '' : ' plate-badge-inexact'}`}
      role="img"
      aria-label={accessibleLabel}
    >
      <div className="plate-badge-head">
        <span className="plate-badge-label">Par côté</span>
        <span className="plate-badge-total">
          Barre <strong>{formatKg(achievedTotalKg)} kg</strong>
        </span>
      </div>

      <div className="plate-badge-hero">
        <span className="plate-side-value">{formatKg(achievablePerSideKg)}</span>
        <span className="plate-side-unit">kg / côté</span>
        {effectiveBarWeight > 0 && <span className="plate-bar-note">barre {formatKg(effectiveBarWeight)} kg</span>}
      </div>

      <div className="plate-sleeve-visual" aria-hidden="true">
        <div className="barbell-collar" />
        <div className="plate-badge-list">
          {platesPerSide.length === 0 ? (
            <span className="plate-empty">Aucun disque</span>
          ) : (
            platesPerSide.map((item) => {
              const style = IWF_COLORS[item.plateKg] ?? FALLBACK_COLOR;
              return (
                <span
                  key={item.plateKg}
                  className={`plate-disc plate-disc-${String(item.plateKg).replace('.', '-')}`}
                  style={{
                    backgroundColor: style.bg,
                    color: style.text,
                    borderColor: style.border,
                  }}
                >
                  <span className="plate-hub" />
                  <span className="plate-text">
                    {item.count > 1 && <strong className="plate-multiplier">{item.count}×</strong>}
                    {formatKg(item.plateKg)}
                    <span className="plate-kg-suffix">kg</span>
                  </span>
                </span>
              );
            })
          )}
        </div>
      </div>

      {!isExact && (
        <div className="plate-badge-warning" role="status">
          <Warning size={16} />
          <span>
            <strong>Charge non exacte</strong> — il manque <strong>{formatKg(shortfallTotalKg)} kg</strong> (cible{' '}
            {formatKg(totalLoadKg)} kg). Chargé : {formatKg(achievedTotalKg)} kg.
          </span>
        </div>
      )}
    </div>
  );
}
