import type { BlockWeek, BlockZone } from '../../workout/blockReview';
import { formatVolume } from '../../workout/summary';

/**
 * Grille de volume : huit semaines en colonnes, les treize zones en lignes.
 *
 * La carte musculaire montre une silhouette ; cette grille montre le temps. Une
 * zone peut être très travaillée une semaine et oubliée les sept suivantes —
 * c'est exactement ce que la revue de bloc doit rendre visible.
 */

interface ZoneHeatmapProps {
  weeks: readonly BlockWeek[];
  zones: readonly BlockZone[];
}

export function ZoneHeatmap({ weeks, zones }: ZoneHeatmapProps) {
  const max = Math.max(1, ...zones.flatMap((zone) => zone.weeks));

  return (
    <div className="zone-heatmap-wrap">
      <table className="zone-heatmap">
        <caption className="sr-only">Volume par zone musculaire et par semaine, en kilogrammes-répétitions</caption>
        <thead>
          <tr>
            <th scope="col">Zone</th>
            {weeks.map((week, index) => (
              <th scope="col" key={week.start} title={`Semaine ${index + 1} — du ${week.label}`}>
                S{index + 1}
              </th>
            ))}
            <th scope="col" className="zone-heat-total">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {zones.map((zone) => (
            <tr key={zone.id}>
              <th scope="row">{zone.label}</th>
              {zone.weeks.map((volume, index) => (
                <td
                  key={weeks[index].start}
                  className={volume === 0 ? 'zone-heat-zero' : undefined}
                  aria-label={`${zone.label}, semaine du ${weeks[index].label}\u00a0: ${formatVolume(volume)} kg·rép.`}
                >
                  <span
                    className="zone-heat-cell"
                    aria-hidden="true"
                    style={{ opacity: volume === 0 ? 1 : 0.16 + 0.84 * (volume / max) }}
                  />
                </td>
              ))}
              <td className="zone-heat-total">{formatVolume(zone.totalKg)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="zone-heat-legend" aria-hidden="true">
        <span>Peu</span>
        <i style={{ opacity: 0.24 }} />
        <i style={{ opacity: 0.56 }} />
        <i style={{ opacity: 1 }} />
        <span>Beaucoup</span>
      </div>
    </div>
  );
}
