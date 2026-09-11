import { calculatePlates } from '../../workout/plateCalculator';

interface PlateBadgeProps {
  totalLoadKg: number;
  exerciseId?: string;
  barWeightKg?: number;
}

const IWF_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  25: { bg: '#e53935', text: '#ffffff', border: '#ff6f60' },
  20: { bg: '#1e88e5', text: '#ffffff', border: '#6ab7ff' },
  15: { bg: '#fbc02d', text: '#1a1a1a', border: '#fff263' },
  10: { bg: '#2e7d32', text: '#ffffff', border: '#60ad5e' },
  5: { bg: '#e0e0e0', text: '#1a1a1a', border: '#ffffff' },
  2.5: { bg: '#263238', text: '#eceff1', border: '#455a64' },
  1.25: { bg: '#78909c', text: '#ffffff', border: '#b0bec5' },
};

export function PlateBadge({ totalLoadKg, exerciseId, barWeightKg }: PlateBadgeProps) {
  if (totalLoadKg < 20) return null;

  // Smith machine a une barre guidée de 10 kg
  const effectiveBarWeight =
    barWeightKg !== undefined ? barWeightKg : exerciseId === 'squat-smith' ? 10 : 0;

  const breakdown = calculatePlates(totalLoadKg, effectiveBarWeight);
  if (breakdown.platesPerSide.length === 0) return null;

  const labelPrefix =
    effectiveBarWeight > 0 ? `Barre ${effectiveBarWeight}kg comprise · ` : 'Manchons · ';

  return (
    <div
      className="plate-badge-container"
      aria-label={`Chargement de disques : ${breakdown.weightPerSideKg} kg par côté`}
    >
      <span className="plate-badge-label">
        {labelPrefix}<strong>{breakdown.weightPerSideKg} kg</strong> / côté :
      </span>
      <div className="plate-sleeve-visual" aria-hidden="true">
        <div className="barbell-collar" title="Butée de manchon" />
        <div className="plate-badge-list">
          {breakdown.platesPerSide.map((item) => {
            const style = IWF_COLORS[item.plateKg] ?? {
              bg: '#37474f',
              text: '#fff',
              border: '#546e7a',
            };
            return (
              <span
                key={item.plateKg}
                className={`plate-disc plate-disc-${String(item.plateKg).replace('.', '-')}`}
                style={{
                  backgroundColor: style.bg,
                  color: style.text,
                  borderColor: style.border,
                }}
                title={`${item.count > 1 ? `${item.count}× ` : ''}${item.plateKg} kg (IWF)`}
              >
                <span className="plate-hub" />
                <span className="plate-text">
                  {item.count > 1 ? <strong className="plate-multiplier">{item.count}×</strong> : null}
                  {item.plateKg}k
                </span>
              </span>
            );
          })}
        </div>
        {breakdown.remainderKg > 0 && (
          <span className="plate-remainder">+{breakdown.remainderKg}kg</span>
        )}
      </div>
    </div>
  );
}
