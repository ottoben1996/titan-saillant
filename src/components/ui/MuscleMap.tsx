import { useId } from 'react';

export type MuscleId =
  | 'chest'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'abs'
  | 'quads'
  | 'calves'
  | 'lats'
  | 'traps'
  | 'glutes'
  | 'hamstrings'
  | 'lower-back';

interface MuscleMapProps {
  primaryMuscles?: readonly string[];
  secondaryMuscles?: readonly string[];
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const MUSCLE_LABELS: Record<MuscleId, string> = {
  chest: 'Pectoraux',
  shoulders: 'Épaules',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Avant-bras',
  abs: 'Abdominaux',
  quads: 'Quadriceps',
  calves: 'Mollets',
  lats: 'Grands dorsaux',
  traps: 'Trapèzes',
  glutes: 'Fessiers',
  hamstrings: 'Ischio-jambiers',
  'lower-back': 'Lombaires',
};

// Normalise les chaînes de muscles françaises ou anglaises vers MuscleId
export function normalizeMuscle(name: string): MuscleId | null {
  const n = name.toLowerCase().trim();
  if (n.includes('pect') || n.includes('chest') || n.includes('pec')) return 'chest';
  if (n.includes('épaul') || n.includes('delto') || n.includes('shoulder')) return 'shoulders';
  if (n.includes('bicep')) return 'biceps';
  if (n.includes('tricep')) return 'triceps';
  if (n.includes('avant-bras') || n.includes('forearm')) return 'forearms';
  if (n.includes('abdo') || n.includes('ventre') || n.includes('core') || n.includes('gain')) return 'abs';
  if (n.includes('quadri') || n.includes('cuisse') || n.includes('quad')) return 'quads';
  if (n.includes('ischio') || n.includes('hamstring')) return 'hamstrings';
  if (n.includes('fessier') || n.includes('glute') || n.includes('fesse')) return 'glutes';
  if (n.includes('mollet') || n.includes('calf') || n.includes('calves')) return 'calves';
  if (n.includes('dors') || n.includes('grand dorsal') || n.includes('lat') || n.includes('dos')) return 'lats';
  if (n.includes('trapèz') || n.includes('trap')) return 'traps';
  if (n.includes('lombair') || n.includes('bas du dos')) return 'lower-back';
  return null;
}

/** Convertit une liste de libellés bruts en identifiants dédupliqués, ordre préservé. */
function toIds(muscles: readonly string[]): MuscleId[] {
  const seen = new Set<MuscleId>();
  const ids: MuscleId[] = [];
  for (const muscle of muscles) {
    const id = normalizeMuscle(muscle);
    if (id && !seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

export function MuscleMap({
  primaryMuscles = [],
  secondaryMuscles = [],
  size = 'md',
  className = '',
}: MuscleMapProps) {
  const titleId = useId();
  const descId = useId();

  const primaryIds = toIds(primaryMuscles);
  const secondaryIds = toIds(secondaryMuscles);
  const primaries = new Set(primaryIds);
  const secondaries = new Set(secondaryIds);

  const scale = size === 'sm' ? 0.75 : size === 'lg' ? 1.25 : 1.0;
  const width = Math.round(220 * scale);
  const height = Math.round(180 * scale);

  // Alternative textuelle : la même information que le schéma, en mots.
  const primaryText = primaryIds.map((id) => MUSCLE_LABELS[id]).join(', ');
  const secondaryText = secondaryIds.map((id) => MUSCLE_LABELS[id]).join(', ');
  const altText =
    primaryIds.length === 0 && secondaryIds.length === 0
      ? 'Aucun muscle renseigné pour cet exercice.'
      : [
          primaryIds.length > 0 ? `Muscles principaux : ${primaryText}.` : null,
          secondaryIds.length > 0 ? `Muscles synergistes : ${secondaryText}.` : null,
        ]
          .filter(Boolean)
          .join(' ');

  const getColor = (id: MuscleId): string => {
    if (primaries.has(id)) return 'var(--accent)';
    if (secondaries.has(id)) return 'var(--accent-2)';
    return 'var(--accent-3)';
  };

  const getOpacity = (id: MuscleId): number => {
    if (primaries.has(id)) return 1;
    if (secondaries.has(id)) return 0.95;
    return 1;
  };

  return (
    <div
      className={`muscle-map-wrapper ${className}`.trim()}
      role="group"
      aria-labelledby={titleId}
      aria-describedby={descId}
    >
      <p id={titleId} className="muscle-map-title">
        Muscles sollicités
      </p>
      <p id={descId} className="visually-hidden">
        {altText}
      </p>

      <div className="muscle-map-views" aria-hidden="true">
        {/* VUE ANTERIEURE (FACE) */}
        <div className="muscle-figure">
          <span className="figure-label">FACE</span>
          <svg viewBox="0 0 100 160" className="muscle-svg" width={width / 2} height={height}>
            <defs>
              <filter id="glow-titan" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="1.5" style={{ floodColor: 'var(--accent)' }} floodOpacity="0.6" />
              </filter>
            </defs>
            {/* Silhouette / Tête */}
            <circle cx="50" cy="12" r="8" fill="#141d18" stroke="#2a3d32" strokeWidth="1" />
            <path d="M46 20 L54 20 L55 24 L45 24 Z" fill="#18231d" />

            {/* Épaules / Deltoïdes antérieurs */}
            <path
              d="M32 25 C30 28 28 35 30 40 C33 39 37 34 38 28 Z"
              style={{ fill: getColor('shoulders') }}
              opacity={getOpacity('shoulders')}
            />
            <path
              d="M68 25 C70 28 72 35 70 40 C67 39 63 34 62 28 Z"
              style={{ fill: getColor('shoulders') }}
              opacity={getOpacity('shoulders')}
            />

            {/* Pectoraux */}
            <path
              d="M38 27 C42 27 49 28 49 38 C42 41 36 38 35 34 C35 30 36 27 38 27 Z"
              style={{ fill: getColor('chest') }}
              opacity={getOpacity('chest')}
            />
            <path
              d="M62 27 C58 27 51 28 51 38 C58 41 64 38 65 34 C65 30 64 27 62 27 Z"
              style={{ fill: getColor('chest') }}
              opacity={getOpacity('chest')}
            />

            {/* Biceps */}
            <path
              d="M27 39 C26 44 26 50 28 55 C31 54 32 48 31 41 Z"
              style={{ fill: getColor('biceps') }}
              opacity={getOpacity('biceps')}
            />
            <path
              d="M73 39 C74 44 74 50 72 55 C69 54 68 48 69 41 Z"
              style={{ fill: getColor('biceps') }}
              opacity={getOpacity('biceps')}
            />

            {/* Avant-bras */}
            <path
              d="M26 56 C24 63 24 72 26 78 C28 77 30 70 29 58 Z"
              style={{ fill: getColor('forearms') }}
              opacity={getOpacity('forearms')}
            />
            <path
              d="M74 56 C76 63 76 72 74 78 C72 77 70 70 71 58 Z"
              style={{ fill: getColor('forearms') }}
              opacity={getOpacity('forearms')}
            />

            {/* Abdominaux */}
            <path
              d="M44 41 L56 41 L55 64 L45 64 Z"
              style={{ fill: getColor('abs') }}
              opacity={getOpacity('abs')}
            />

            {/* Quadriceps */}
            <path
              d="M37 68 C35 78 35 95 38 108 C42 108 45 98 46 80 C46 72 43 68 37 68 Z"
              style={{ fill: getColor('quads') }}
              opacity={getOpacity('quads')}
            />
            <path
              d="M63 68 C65 78 65 95 62 108 C58 108 55 98 54 80 C54 72 57 68 63 68 Z"
              style={{ fill: getColor('quads') }}
              opacity={getOpacity('quads')}
            />

            {/* Mollets face */}
            <path
              d="M37 114 C36 122 37 135 39 144 C42 144 43 135 43 124 C43 118 41 114 37 114 Z"
              style={{ fill: getColor('calves') }}
              opacity={getOpacity('calves')}
            />
            <path
              d="M63 114 C64 122 63 135 61 144 C58 144 57 135 57 124 C57 118 59 114 63 114 Z"
              style={{ fill: getColor('calves') }}
              opacity={getOpacity('calves')}
            />
          </svg>
        </div>

        {/* VUE POSTERIEURE (DOS) */}
        <div className="muscle-figure">
          <span className="figure-label">DOS</span>
          <svg viewBox="0 0 100 160" className="muscle-svg" width={width / 2} height={height}>
            {/* Tête dos */}
            <circle cx="50" cy="12" r="8" fill="#141d18" stroke="#2a3d32" strokeWidth="1" />
            <path d="M46 20 L54 20 L55 24 L45 24 Z" fill="#18231d" />

            {/* Trapèzes */}
            <path
              d="M45 23 L55 23 L62 29 L50 37 L38 29 Z"
              style={{ fill: getColor('traps') }}
              opacity={getOpacity('traps')}
            />

            {/* Épaules dos (deltoïdes postérieurs) */}
            <path
              d="M32 26 C30 30 30 36 33 40 C35 38 37 33 37 28 Z"
              style={{ fill: getColor('shoulders') }}
              opacity={getOpacity('shoulders')}
            />
            <path
              d="M68 26 C70 30 70 36 67 40 C65 38 63 33 63 28 Z"
              style={{ fill: getColor('shoulders') }}
              opacity={getOpacity('shoulders')}
            />

            {/* Grands dorsaux */}
            <path
              d="M37 32 C42 35 47 38 48 54 C42 53 38 48 35 40 Z"
              style={{ fill: getColor('lats') }}
              opacity={getOpacity('lats')}
            />
            <path
              d="M63 32 C58 35 53 38 52 54 C58 53 62 48 65 40 Z"
              style={{ fill: getColor('lats') }}
              opacity={getOpacity('lats')}
            />

            {/* Triceps */}
            <path
              d="M28 38 C27 45 27 52 29 57 C31 55 32 48 31 40 Z"
              style={{ fill: getColor('triceps') }}
              opacity={getOpacity('triceps')}
            />
            <path
              d="M72 38 C73 45 73 52 71 57 C69 55 68 48 69 40 Z"
              style={{ fill: getColor('triceps') }}
              opacity={getOpacity('triceps')}
            />

            {/* Lombaires */}
            <path
              d="M45 55 L55 55 L54 65 L46 65 Z"
              fill={getColor('lower-back')}
              opacity={getOpacity('lower-back')}
            />

            {/* Fessiers */}
            <path
              d="M37 66 C43 65 48 68 49 79 C44 82 38 81 35 75 Z"
              style={{ fill: getColor('glutes') }}
              opacity={getOpacity('glutes')}
            />
            <path
              d="M63 66 C57 65 52 68 51 79 C56 82 62 81 65 75 Z"
              style={{ fill: getColor('glutes') }}
              opacity={getOpacity('glutes')}
            />

            {/* Ischio-jambiers */}
            <path
              d="M37 81 C40 81 47 83 46 102 C42 104 38 101 37 92 Z"
              style={{ fill: getColor('hamstrings') }}
              opacity={getOpacity('hamstrings')}
            />
            <path
              d="M63 81 C60 81 53 83 54 102 C58 104 62 101 63 92 Z"
              style={{ fill: getColor('hamstrings') }}
              opacity={getOpacity('hamstrings')}
            />

            {/* Mollets dos */}
            <path
              d="M37 112 C35 120 36 134 39 144 C42 144 44 133 44 122 C44 116 41 112 37 112 Z"
              style={{ fill: getColor('calves') }}
              opacity={getOpacity('calves')}
            />
            <path
              d="M63 112 C65 120 64 134 61 144 C58 144 56 133 56 122 C56 116 59 112 63 112 Z"
              style={{ fill: getColor('calves') }}
              opacity={getOpacity('calves')}
            />
          </svg>
        </div>
      </div>

      {/* Légende : identifie les couleurs du schéma */}
      <div className="muscle-map-legend">
        <div className="legend-item">
          <span className="legend-dot primary" aria-hidden="true" />
          <span>Moteur principal</span>
        </div>
        {secondaries.size > 0 && (
          <div className="legend-item">
            <span className="legend-dot secondary" aria-hidden="true" />
            <span>Synergiste / stabilisateur</span>
          </div>
        )}
      </div>
    </div>
  );
}
