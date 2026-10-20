import { useEffect, useMemo } from 'react';
import { exerciseLabel } from '../../domain/labels';
import type { MeasurementZone, WeeklyMeasurement } from '../../domain/measurements';
import { getProgram, PROGRAM_WEEKS } from '../../domain/programs';
import type { ProfileId, WorkoutSession } from '../../domain/types';
import { blockReview } from '../../workout/blockReview';
import { zoneDelta } from '../../workout/followup';
import { formatLoadKg, formatMinutes, formatSignedKg, formatVolume } from '../../workout/summary';
import { DownloadSimple } from '../ui/Icons';
import { ZoneHeatmap } from '../ui/ZoneHeatmap';
import { profileLabels } from './HomeScreen';

/**
 * Revue de bloc imprimable.
 *
 * Le bilan hebdomadaire raconte une semaine ; ce document raconte huit
 * semaines. Il reprend les mêmes règles d'impression que le bilan — document
 * blanc, chrome masqué, A4 — pour que le coach reçoive une page, pas une copie
 * d'écran.
 */

interface BlockReviewScreenProps {
  profileId: ProfileId;
  history: readonly WorkoutSession[];
  measurements: readonly WeeklyMeasurement[];
}

const dateCourte = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

const dateLongue = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

const MESURES: readonly { zone: MeasurementZone; label: string; unite: string }[] = [
  { zone: 'weightKg', label: 'Poids', unite: 'kg' },
  { zone: 'waistCm', label: 'Tour de taille', unite: 'cm' },
];

export function BlockReviewScreen({ profileId, history, measurements }: BlockReviewScreenProps) {
  const programme = useMemo(() => getProgram(profileId), [profileId]);
  const revue = useMemo(() => blockReview(history, programme, new Date(), PROGRAM_WEEKS), [history, programme]);
  const noms = useMemo(
    () =>
      new Map(programme.days.flatMap((day) => day.exercises).map((exercise) => [exercise.id, exercise.name] as const)),
    [programme],
  );

  // La revue s'ouvre depuis le bas de la page Progrès : sans ce recalage, le
  // document s'affiche déjà défilé et son titre reste hors de l'écran.
  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  const debut = revue.weeks[0]?.start;
  const fin = revue.weeks.at(-1)?.end;

  const mesures = useMemo(() => {
    if (!debut || !fin) return [];
    const debutMs = Date.parse(debut);
    const finMs = Date.parse(fin);
    return measurements
      .filter((item) => {
        const at = item.measuredOn ? Date.parse(item.measuredOn) : Number.NaN;
        return Number.isFinite(at) && at >= debutMs && at < finMs;
      })
      .sort((a, b) => (a.measuredOn ?? '').localeCompare(b.measuredOn ?? ''));
  }, [measurements, debut, fin]);
  const premiereMesure = mesures[0];
  const derniereMesure = mesures.at(-1);
  // Un seul point ne fait pas un début et une fin : afficher « 92,4 → 92,4 »
  // donnerait l'illusion d'une mesure stable alors qu'il n'y a qu'une mesure.
  const lignesMesure =
    mesures.length < 2
      ? []
      : MESURES.map((mesure) => ({
          ...mesure,
          delta: zoneDelta(premiereMesure, derniereMesure, mesure.zone),
          avant: premiereMesure?.[mesure.zone],
          apres: derniereMesure?.[mesure.zone],
        })).filter(
          (
            ligne,
          ): ligne is {
            zone: MeasurementZone;
            label: string;
            unite: string;
            delta: number;
            avant: number;
            apres: number;
          } => ligne.delta !== undefined && typeof ligne.avant === 'number' && typeof ligne.apres === 'number',
        );

  const signaux = revue.stagnations.length > 0 || revue.lagging.length > 0;
  const lecture: string[] = [];
  if (revue.stagnations.length > 0) {
    lecture.push(
      `${revue.stagnations.length} mouvement${revue.stagnations.length > 1 ? 's' : ''} stagne${
        revue.stagnations.length > 1 ? 'nt' : ''
      } sur trois passages.`,
    );
  }
  if (revue.lagging.length > 0) {
    lecture.push(
      `${revue.lagging.map((zone) => zone.label).join(' et ')} reste${
        revue.lagging.length > 1 ? 'nt' : ''
      } sous la moitié de la médiane des zones travaillées sur les quatre dernières semaines.`,
    );
  }
  if (lecture.length === 0) {
    lecture.push('Aucune stagnation de charge ni zone en retard dans les zones travaillées sur ce bloc.');
  }

  return (
    <div className="bilan">
      <div className="bilan-bar">
        <span className="bilan-bar-titre">Revue des {PROGRAM_WEEKS} dernières semaines</span>
        <button type="button" className="primary-button" onClick={() => window.print()}>
          <DownloadSimple size={16} /> Exporter en PDF
        </button>
      </div>

      <article className="bilan-doc block-doc">
        <header className="bilan-head">
          <div>
            <h2>Revue de bloc</h2>
            <p>
              {profileLabels[profileId]} — {PROGRAM_WEEKS} semaines
            </p>
          </div>
          <div className="bilan-tag">
            <b>{revue.totals.sessions} séances</b>
            {debut && fin
              ? `du ${dateLongue(debut)} au ${dateLongue(new Date(Date.parse(fin) - 1).toISOString())}`
              : '—'}
          </div>
        </header>

        {revue.totals.sessions === 0 ? (
          <div className="block-empty">
            <p>Aucune séance terminée sur les {PROGRAM_WEEKS} dernières semaines.</p>
            <small>La revue se remplira dès la première séance enregistrée.</small>
          </div>
        ) : (
          <>
            <div className="bilan-kpis">
              <div>
                <span>Séances</span>
                <b>{revue.totals.sessions}</b>
                <small>
                  {revue.totals.activeWeeks} semaine{revue.totals.activeWeeks > 1 ? 's' : ''} active
                  {revue.totals.activeWeeks > 1 ? 's' : ''}
                </small>
              </div>
              <div>
                <span>Volume soulevé</span>
                <b>{formatVolume(revue.totals.volumeKg)}</b>
                <small>kg·rép.</small>
              </div>
              <div>
                <span>Temps actif</span>
                <b>{formatMinutes(revue.totals.activeSeconds)}</b>
                <small>sous tension</small>
              </div>
              <div>
                <span>RPE moyen</span>
                <b>{revue.checkin.rpeAverage ?? '—'}</b>
                <small>sur {revue.checkin.sessions} séances</small>
              </div>
            </div>

            <h3>Volume par zone</h3>
            <ZoneHeatmap weeks={revue.weeks} zones={revue.zones} />
            <p className={`bilan-note ${revue.lagging.length > 0 ? 'block-signal' : ''}`}>
              {revue.lagging.length > 0
                ? `Signal de déséquilibre — ${revue.lagging
                    .map(
                      (zone) =>
                        `${zone.label} ${formatVolume(zone.volumeKg)} kg·rép. contre ${formatVolume(
                          zone.medianKg,
                        )} de médiane`,
                    )
                    .join(' · ')}.`
                : 'Aucune zone travaillée sous la moitié de la médiane sur les quatre dernières semaines.'}
            </p>

            <h3>Meilleures charges du bloc</h3>
            <table>
              <thead>
                <tr>
                  <th scope="col">Mouvement</th>
                  <th scope="col" className="num">
                    Charge
                  </th>
                  <th scope="col" className="num">
                    Rép.
                  </th>
                  <th scope="col" className="num">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {revue.records.slice(0, 6).map((record) => (
                  <tr key={record.exerciseId}>
                    <td>{exerciseLabel(record.exerciseId, noms.get(record.exerciseId))}</td>
                    <td className="num">{formatLoadKg(record.loadKg)} kg</td>
                    <td className="num">{record.repetitions}</td>
                    <td className="num">{dateCourte(record.at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3>Progression par mouvement</h3>
            {revue.progressions.length === 0 ? (
              <p className="bilan-note">Aucune charge de travail répétée sur ce bloc.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th scope="col">Mouvement</th>
                    <th scope="col" className="num">
                      Premier
                    </th>
                    <th scope="col" className="num">
                      Dernier
                    </th>
                    <th scope="col" className="num">
                      Écart
                    </th>
                    <th scope="col" className="num">
                      Signal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {revue.progressions.map((item) => (
                    <tr key={item.exerciseId}>
                      <td>{exerciseLabel(item.exerciseId, item.nom)}</td>
                      <td className="num">{item.premier !== undefined ? `${formatLoadKg(item.premier)} kg` : '—'}</td>
                      <td className="num">{item.dernier !== undefined ? `${formatLoadKg(item.dernier)} kg` : '—'}</td>
                      <td
                        className={`num ${item.ecart && item.ecart > 0 ? 'pos' : item.ecart && item.ecart < 0 ? 'neg' : ''}`}
                      >
                        {item.ecart !== undefined ? `${formatSignedKg(item.ecart)} kg` : '—'}
                      </td>
                      <td className={`num ${item.stagnation ? 'neg' : ''}`}>{item.stagnation ? 'Stagne' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {lignesMesure.length > 0 && (
              <>
                <h3>Mensurations</h3>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Zone</th>
                      <th scope="col" className="num">
                        Début
                      </th>
                      <th scope="col" className="num">
                        Fin
                      </th>
                      <th scope="col" className="num">
                        Écart
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lignesMesure.map((ligne) => (
                      <tr key={ligne.zone}>
                        <td>{ligne.label}</td>
                        <td className="num">
                          {formatLoadKg(ligne.avant)} {ligne.unite}
                        </td>
                        <td className="num">
                          {formatLoadKg(ligne.apres)} {ligne.unite}
                        </td>
                        <td className="num">{`${formatSignedKg(ligne.delta)} ${ligne.unite}`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            <h3>Ressenti</h3>
            <p className="bilan-note">
              {revue.checkin.rpeAverage !== undefined
                ? `RPE moyen ${revue.checkin.rpeAverage}/10`
                : 'RPE non renseigné'}
              {revue.checkin.energyAverage !== undefined ? ` · énergie moyenne ${revue.checkin.energyAverage}/5` : ''}
              {` · ${revue.checkin.painSessions} séance${revue.checkin.painSessions > 1 ? 's' : ''} avec gêne signalée`}
            </p>

            <div className={`bilan-read ${signaux ? 'alert' : ''}`}>
              <b>Lecture du bloc</b>
              <p>{lecture.join(' ')}</p>
              {signaux && <p>Point à reprendre avec le coach avant d’enchaîner.</p>}
            </div>

            <footer className="bilan-foot">
              <span>{profileLabels[profileId]} — revue de bloc</span>
              <span>
                Générée le {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </footer>
          </>
        )}
      </article>
    </div>
  );
}
