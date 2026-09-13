import { useMemo } from 'react';
import { cycleLengthWeeks, measurementZones, profileBody, type WeeklyMeasurement } from '../../domain/measurements';
import type { LoadConsigne } from '../../domain/types';
import type { ProfileId, WorkoutSession } from '../../domain/types';
import { getProgram } from '../../domain/programs';
import {
  bodyMassIndex,
  buildWeeklyReading,
  firstOfCycle,
  formatNombre,
  isExcluded,
  movingAverage,
  lastExerciseLoads,
  navyBodyFat,
  previousMeasurement,
  relativeFatMass,
  waistToHeight,
  weightVelocity,
  zoneDelta,
} from '../../workout/followup';
import { sessionVolume, workoutDayLabel } from '../../workout/summary';
import { formFromEnergy, seancesDeLaSemaine, weeklyCheckinSummary } from '../../workout/followup';
import { ArrowLeft, DownloadSimple } from '../ui/Icons';

interface BilanScreenProps {
  profileId: ProfileId;
  measurements: readonly WeeklyMeasurement[];
  current: WeeklyMeasurement;
  sessions: readonly WorkoutSession[];
  onBack: () => void;
}

/** Courbe simple, sans dépendance : les points, une ligne, jamais de décoration. */
function Courbe({
  titre,
  unite,
  points,
  cible,
  moyenne,
  note,
}: {
  titre: string;
  unite: string;
  points: readonly { label: string; value: number }[];
  cible?: number;
  /** Moyenne mobile, alignée sur les points. Lisse le bruit d'une semaine. */
  moyenne?: readonly (number | undefined)[];
  /** Phrase de lecture affichée sous la courbe. */
  note?: string;
}) {
  if (points.length === 0) return null;
  const largeur = 560;
  const hauteur = 150;
  const valeurs = points.map((point) => point.value);
  const min = Math.min(...valeurs, ...(cible !== undefined ? [cible] : []));
  const max = Math.max(...valeurs, ...(cible !== undefined ? [cible] : []));
  const marge = Math.max(0.6, (max - min) * 0.25);
  const bas = min - marge;
  const haut = max + marge;
  const x = (index: number) => (points.length === 1 ? largeur / 2 : 20 + (index * (largeur - 40)) / (points.length - 1));
  const y = (value: number) => hauteur - 30 - ((value - bas) / (haut - bas)) * (hauteur - 50);
  const trace = points.map((point, index) => `${x(index)},${y(point.value)}`).join(' ');
  const traceMoyenne = (moyenne ?? [])
    .map((valeur, index) => (valeur === undefined ? null : `${x(index)},${y(valeur)}`))
    .filter((segment): segment is string => segment !== null)
    .join(' ');

  return (
    <div className="bilan-chart">
      <h4>
        {titre} <span>{unite}</span>
      </h4>
      <svg viewBox={`0 0 ${largeur} ${hauteur}`} role="img" aria-label={`${titre} sur ${points.length} relevés`}>
        <line x1="0" y1={y(min)} x2={largeur} y2={y(min)} stroke="#eef2ef" />
        <line x1="0" y1={y(max)} x2={largeur} y2={y(max)} stroke="#eef2ef" />
        {cible !== undefined && (
          <line x1="0" y1={y(cible)} x2={largeur} y2={y(cible)} stroke="#d9c9a8" strokeDasharray="4 4" />
        )}
        {traceMoyenne.length > 0 && (
          <polyline points={traceMoyenne} fill="none" stroke="#3f7dbf" strokeWidth="2" strokeDasharray="6 4" strokeLinecap="round" />
        )}
        <polyline points={trace} fill="none" stroke="#5f9b3f" strokeWidth="2.5" strokeLinecap="round" />
        {points.map((point, index) => (
          <circle key={point.label} cx={x(index)} cy={y(point.value)} r="4" fill="#5f9b3f" />
        ))}
        {points.map((point, index) => (
          <text
            key={`t-${point.label}`}
            x={x(index)}
            y={hauteur - 8}
            fontSize="10"
            fill="#55655c"
            textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}
          >
            {point.label}
          </text>
        ))}
      </svg>
      {traceMoyenne.length > 0 && (
        <p className="bilan-note bilan-chart-legende">
          <span className="trait-plein" /> Relevé du samedi
          <span className="trait-moyenne" /> Moyenne sur {Math.min(4, points.length)} semaines
        </p>
      )}
      {note && <p className="bilan-note">{note}</p>}
    </div>
  );
}

/** Traductions courtes, pour que le coach lise sans jargon. */
const libelleForme = (forme: 'better' | 'same' | 'worse' | undefined) =>
  forme === 'better' ? 'mieux' : forme === 'worse' ? 'moins bien' : forme === 'same' ? 'habituelle' : '—';

const libelleConsigne = (consigne: LoadConsigne) =>
  consigne === 'increase' ? 'charger plus' : consigne === 'decrease' ? 'alléger' : 'même charge';

export function BilanScreen({ profileId, measurements, current, sessions, onBack }: BilanScreenProps) {
  const body = profileBody[profileId];
  const ordered = useMemo(
    () => [...measurements].sort((a, b) => (a.cycle === b.cycle ? a.week - b.week : a.cycle - b.cycle)),
    [measurements],
  );
  const previous = useMemo(() => previousMeasurement(ordered, current), [ordered, current]);
  const first = useMemo(() => firstOfCycle(ordered, current.cycle), [ordered, current.cycle]);
  const index = ordered.findIndex((item) => item.id === current.id);
  const jusqua = index >= 0 ? ordered.slice(0, index + 1) : ordered;

  const velocity = weightVelocity(jusqua);

  const tailleCourante = current.waistCm;
  const rfm =
    typeof tailleCourante === 'number' ? relativeFatMass(body.sex, body.heightCm, tailleCourante) : undefined;
  const rfmCycle =
    first && typeof first.waistCm === 'number' && first.id !== current.id
      ? relativeFatMass(body.sex, body.heightCm, first.waistCm)
      : undefined;
  const navy = navyBodyFat({
    sex: body.sex,
    heightCm: body.heightCm,
    waistCm: tailleCourante ?? 0,
    neckCm: current.neckCm,
  });

  const program = getProgram(profileId);
  const charges = program.days
    .filter((day) => day.id === 'full-body-a' || day.id === 'full-body-b')
    .map((day) => {
      const loads = lastExerciseLoads(sessions, day.id);
      const exercices = [...(day.warmup ?? []), ...day.exercises];
      return {
        day,
        lignes: loads
          .map((load) => ({
            nom: exercices.find((exercise) => exercise.id === load.exerciseId)?.name ?? load.exerciseId,
            ...load,
          }))
          .sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
      };
    })
    .filter((entree) => entree.lignes.length > 0);

  const volumeSemaine = sessions.reduce((total, session) => (session.completedAt ? total + sessionVolume(session) : total), 0);

  /** Poids relevés, du plus ancien au plus récent, sans les valeurs écartées. */
  const poidsPoints = jusqua
    .filter((item) => typeof item.weightKg === 'number' && !item.excluded?.includes('weightKg'))
    .map((item) => ({ label: `S${item.week}`, value: item.weightKg as number }));
  /**
   * Moyenne mobile sur quatre semaines : elle lisse le bruit d'hydratation, qui
   * fait varier le poids d'un jour à l'autre sans rien dire de la tendance.
   */
  const moyennePoids = movingAverage(poidsPoints.map((point) => point.value), 4);
  const lectureMoyenne = (() => {
    const dernier = poidsPoints.at(-1)?.value;
    const moyenneActuelle = moyennePoids.at(-1);
    if (dernier === undefined || moyenneActuelle === undefined || poidsPoints.length < 2) return undefined;
    const ecart = Math.abs(dernier - moyenneActuelle);
    // 0,3 % du poids : en dessous, la variation est du bruit d'hydratation.
    const seuil = Math.max(0.2, Math.abs(dernier) * 0.003);
    return ecart <= seuil
      ? 'La moyenne confirme la tendance : l\u2019écart d\u2019une semaine à l\u2019autre reste dans le bruit d\u2019hydratation.'
      : undefined;
  })();

  /** Séances terminées de la semaine, pour la page « Ressenti ». */
  const seancesSemaine = seancesDeLaSemaine(sessions, {
    depuis: previous?.measuredOn,
    jusqua: current.measuredOn,
  });
  const ressenti = weeklyCheckinSummary(seancesSemaine);

  const lecture = buildWeeklyReading({
    current,
    previous,
    first,
    profileId,
    sessionsThisWeek: sessions.filter((session) => session.completedAt).length,
  });

  const poids = typeof current.weightKg === 'number' ? current.weightKg : undefined;
  const bmi = poids !== undefined ? bodyMassIndex(poids, body.heightCm) : undefined;
  const bmiCycle = first && typeof first.weightKg === 'number' ? bodyMassIndex(first.weightKg, body.heightCm) : undefined;
  /** Écart arrondi, ou rien : jamais de « NaN » ni de fausse précision. */
  const ecart = (a: number | undefined, b: number | undefined, facteur: number) =>
    a === undefined || b === undefined ? undefined : Math.round((a - b) * facteur) / facteur;
  const rth = typeof tailleCourante === 'number' ? waistToHeight(tailleCourante, body.heightCm) : undefined;
  // Une semaine dont la valeur a été écartée pour invraisemblance ne sert ni de
  // comparaison ni de repère : mieux vaut un tiret qu'un chiffre faux.
  const tailleCycle = first && typeof first.waistCm === 'number' && !isExcluded(first, 'waistCm') ? first.waistCm : undefined;
  const tailleAvant = previous && typeof previous.waistCm === 'number' && !isExcluded(previous, 'waistCm') ? previous.waistCm : undefined;
  const rthCycle = tailleCycle !== undefined ? waistToHeight(tailleCycle, body.heightCm) : undefined;
  const avantRth = tailleAvant !== undefined ? waistToHeight(tailleAvant, body.heightCm) : undefined;
  const avantBmi = previous && typeof previous.weightKg === 'number' ? bodyMassIndex(previous.weightKg, body.heightCm) : undefined;
  const avantRfm = tailleAvant !== undefined ? relativeFatMass(body.sex, body.heightCm, tailleAvant) : undefined;

  /** Signe moins typographique (−) et non le trait d'union du clavier : c'est la
      convention déjà utilisée par les autres écrans de l'application. */
  const deltaAffiche = (value: number | undefined, decimals = 1) => {
    if (value === undefined) return '—';
    const arrondi = Math.round(value * 10 ** decimals) / 10 ** decimals;
    if (arrondi === 0) return '=';
    return `${arrondi > 0 ? '+' : ''}${formatNombre(arrondi, decimals).replace('-', '\u2212')}`;
  };
  const classeDelta = (value: number | undefined, sensPositif: boolean) => {
    if (value === undefined || value === 0) return '';
    const bon = sensPositif ? value > 0 : value < 0;
    return bon ? 'pos' : 'neg';
  };

  return (
    <div className="bilan">
      <div className="bilan-bar">
        <button type="button" className="back-link" onClick={onBack}>
          <ArrowLeft size={16} /> Retour
        </button>
        <button type="button" className="primary-button" onClick={() => window.print()}>
          <DownloadSimple size={16} /> Imprimer / Enregistrer en PDF
        </button>
      </div>

      <article className="bilan-doc">
        <header className="bilan-head">
          <div>
            <h2>Bilan hebdomadaire</h2>
            <p>
              {profileId === 'ottman' ? 'Ottman' : 'Laura'} — cycle {current.cycle}
            </p>
          </div>
          <div className="bilan-tag">
            <b>
              Semaine {current.week} / {cycleLengthWeeks}
            </b>
            {current.measuredOn
              ? new Date(current.measuredOn).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
              : 'point repris de la feuille de suivi'}
          </div>
        </header>

        <div className="bilan-kpis">
          <div>
            <span>Poids</span>
            <b>{poids !== undefined ? `${formatNombre(poids)} kg` : '—'}</b>
            <small>départ {formatNombre(body.initialWeightKg, 2)} kg</small>
          </div>
          <div>
            <span>Cette semaine</span>
            <b>{deltaAffiche(zoneDelta(previous, current, 'weightKg'))} kg</b>
            <small>semaine {previous?.week ?? '—'}</small>
          </div>
          <div>
            <span>Depuis le début</span>
            <b>{deltaAffiche(zoneDelta(first, current, 'weightKg'))} kg</b>
            <small>cycle en cours</small>
          </div>
          <div>
            <span>Vitesse</span>
            <b>{velocity ? `${formatNombre(velocity.kgPerWeek, 2)} kg` : '—'}</b>
            <small>{velocity ? `${formatNombre(velocity.percentPerWeek, 2)} % par semaine` : 'à préciser'}</small>
          </div>
        </div>

        <h3>Mensurations</h3>
        <table>
          <thead>
            <tr>
              <th>Zone</th>
              <th className="num">S{previous?.week ?? '—'}</th>
              <th className="num">S{current.week}</th>
              <th className="num">Écart</th>
              <th className="num">Début</th>
            </tr>
          </thead>
          <tbody>
            {measurementZones.map((zone) => {
              const ecart = zoneDelta(previous, current, zone.key);
              const cycle = zoneDelta(first, current, zone.key);
              const valeur = current[zone.key];
              const avant = previous?.[zone.key];
              return (
                <tr key={zone.key}>
                  <td>{zone.label}</td>
                  <td className="num">{typeof avant === 'number' ? formatNombre(avant) : '—'}</td>
                  <td className="num">{typeof valeur === 'number' ? formatNombre(valeur) : '—'}</td>
                  <td className={`num ${classeDelta(ecart, zone.key === 'waistCm' || zone.key === 'chestCm' ? false : true)}`}>
                    {ecart === undefined ? '—' : ecart === 0 ? '=' : deltaAffiche(ecart)}
                  </td>
                  <td className={`num ${classeDelta(cycle, zone.key === 'waistCm' || zone.key === 'chestCm' ? false : true)}`}>
                    {cycle === undefined ? '—' : cycle === 0 ? '=' : deltaAffiche(cycle)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <p className="bilan-note">
          « S2 » désigne la semaine précédente, « Début » l'écart depuis la première semaine du cycle. Un tiret
          signale une semaine sans mesure comparable (valeur manquante ou écartée).
        </p>

        <h3>Indicateurs</h3>
        <table>
          <thead>
            <tr>
              <th>Indicateur</th>
              <th className="num">S{previous?.week ?? '—'}</th>
              <th className="num">S{current.week}</th>
              <th className="num">Écart</th>
              <th className="num">Début</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Tour de taille / hauteur (repère 0,5)</td>
              <td className="num">{avantRth !== undefined ? formatNombre(avantRth, 2) : '—'}</td>
              <td className="num">{rth !== undefined ? formatNombre(rth, 2) : '—'}</td>
              <td className="num">{deltaAffiche(ecart(rth, avantRth, 100), 2)}</td>
              <td className="num">{deltaAffiche(ecart(rth, rthCycle, 100), 2)}</td>
            </tr>
            <tr>
              <td>Indice de masse corporelle</td>
              <td className="num">{avantBmi !== undefined ? formatNombre(avantBmi) : '—'}</td>
              <td className="num">{bmi !== undefined ? formatNombre(bmi) : '—'}</td>
              <td className="num">{deltaAffiche(ecart(bmi, avantBmi, 10))}</td>
              <td className="num">{deltaAffiche(ecart(bmi, bmiCycle, 10))}</td>
            </tr>
            <tr>
              <td>Masse grasse estimée (RFM, marge ±3 à 4 %)</td>
              <td className="num">{avantRfm !== undefined ? `${formatNombre(avantRfm)} %` : '—'}</td>
              <td className="num">{rfm !== undefined ? `${formatNombre(rfm)} %` : '—'}</td>
              <td className="num">{deltaAffiche(ecart(rfm, avantRfm, 10))}</td>
              <td className="num">{deltaAffiche(ecart(rfm, rfmCycle, 10))}</td>
            </tr>
            {navy !== undefined && (
              <tr>
                <td>Masse grasse (formule marine, second avis)</td>
                <td className="num">—</td>
                <td className="num">{formatNombre(navy)} %</td>
                <td className="num">—</td>
                <td className="num">—</td>
              </tr>
            )}
          </tbody>
        </table>

        {rth !== undefined && rth >= 0.6 && (
          <div className="bilan-read alert">
            <b>Tour de taille / hauteur : {formatNombre(rth, 2)}.</b> Au-dessus de 0,6, ce ratio est un facteur de
            risque cardio-métabolique reconnu, et il baisse avec vous : c'est le signe le plus encourageant des trois.
            Ce suivi sportif ne remplace pas un avis médical.
          </div>
        )}

        <h3>Évolution du poids</h3>
        <Courbe
          titre="Poids"
          unite="kg"
          cible={body.initialWeightKg}
          points={poidsPoints}
          moyenne={moyennePoids}
          note={lectureMoyenne}
        />
        <p className="bilan-note">
          Repère pointillé : poids de départ ({formatNombre(body.initialWeightKg, 2)} kg). Le rythme se lit sur
          plusieurs semaines : la variation d'une semaine dépend aussi de l'hydratation et du repas de la veille.
        </p>

        <h3>Évolution des mensurations</h3>
        <Courbe
          titre="Tour de taille"
          unite="cm"
          points={jusqua
            .filter((item) => typeof item.waistCm === 'number' && !item.excluded?.includes('waistCm'))
            .map((item) => ({ label: `S${item.week}`, value: item.waistCm as number }))}
        />
        <Courbe
          titre="Bras et cuisses (moyenne droite / gauche)"
          unite="cm"
          points={jusqua
            .map((item) => {
              const valeurs = [item.armRightCm, item.armLeftCm, item.thighRightCm, item.thighLeftCm].filter(
                (value): value is number => typeof value === 'number',
              );
              if (valeurs.length === 0) return undefined;
              return {
                label: `S${item.week}`,
                value: Math.round((valeurs.reduce((total, value) => total + value, 0) / valeurs.length) * 10) / 10,
              };
            })
            .filter((point): point is { label: string; value: number } => point !== undefined)}
        />

        {charges.length > 0 && (
          <>
            <h3>Charges de travail</h3>
            {charges.map((entree) => (
              <div key={entree.day.id} className="bilan-charges">
                <h4>{entree.day.name}</h4>
                <table>
                  <thead>
                    <tr>
                      <th>Exercice</th>
                      <th className="num">Avant</th>
                      <th className="num">Dernière</th>
                      <th className="num">Écart</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entree.lignes.map((ligne) => (
                      <tr key={ligne.exerciseId}>
                        <td>{ligne.nom}</td>
                        <td className="num">{ligne.previous !== undefined ? `${formatNombre(ligne.previous)} kg` : '—'}</td>
                        <td className="num">{ligne.last !== undefined ? `${formatNombre(ligne.last)} kg` : '—'}</td>
                        <td className={`num ${classeDelta(ligne.delta, true)}`}>
                          {ligne.delta === undefined ? '—' : ligne.delta === 0 ? '=' : `${ligne.delta > 0 ? '+' : ''}${formatNombre(ligne.delta)} kg`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
            <p className="bilan-note">
              Charges les plus lourdes réellement validées, relevées automatiquement dans les séances enregistrées.
              Volume soulevé sur l'ensemble du suivi : {Math.round(volumeSemaine).toLocaleString('fr-FR')} kg.
            </p>
          </>
        )}

        {ressenti.sessions > 0 && (
          <>
            <h3>Ressenti de la semaine</h3>
            <table>
              <thead>
                <tr>
                  <th>Séance</th>
                  <th className="num">Effort</th>
                  <th className="num">Forme</th>
                  <th className="note">Gêne</th>
                </tr>
              </thead>
              <tbody>
                {seancesSemaine.map((seance) => (
                  <tr key={seance.id}>
                    <td>{workoutDayLabel(seance.dayId)}</td>
                    <td className="num">
                      {typeof seance.perceivedExertion === 'number' ? `${seance.perceivedExertion}/10` : '—'}
                    </td>
                    <td className="num">{libelleForme(formFromEnergy(seance.energy))}</td>
                    <td className="note">
                      {seance.pain && seance.pain.toLowerCase() !== 'aucune'
                        ? `${seance.pain}${seance.painLocation ? ` (${seance.painLocation})` : ''}`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="bilan-note">
              {ressenti.averageRpe !== undefined
                ? `Effort moyen de la semaine : ${formatNombre(ressenti.averageRpe)}/10. `
                : ''}
              {ressenti.formTrend === 'better'
                ? 'Forme en hausse sur la semaine.'
                : ressenti.formTrend === 'worse'
                  ? 'Forme en baisse sur la semaine.'
                  : ressenti.formTrend === 'mixed'
                    ? 'Forme variable selon les séances.'
                    : ''}
              {ressenti.consignes.length > 0
                ? ` Consignes données : ${ressenti.consignes
                    .map((item) => `${workoutDayLabel(item.dayId).toLowerCase()} — ${libelleConsigne(item.consigne)}`)
                    .join(', ')}.`
                : ''}
            </p>
            {ressenti.painCount >= 2 && (
              <div className="bilan-read alert">
                <b>Gêne signalée {ressenti.painCount} fois cette semaine.</b> Deux séances de suite avec une gêne
                méritent d'être regardées de près avant d'augmenter les charges.
              </div>
            )}
            {ressenti.notes.length > 0 && (
              <p className="bilan-note">
                Notes : {ressenti.notes.map((item) => `${workoutDayLabel(item.dayId).toLowerCase()} — « ${item.notes} »`).join(' · ')}
              </p>
            )}
          </>
        )}

        <h3>Lecture de la semaine</h3>
        <div className={`bilan-read${lecture.alert ? ' alert' : ''}`}>
          <b>{lecture.title}.</b> {lecture.text}
        </div>

        <footer className="bilan-foot">
          <span>Généré localement par Coach Ottman &amp; Laura — aucune donnée envoyée automatiquement</span>
          <span>
            {profileId === 'ottman' ? 'Ottman' : 'Laura'} · cycle {current.cycle} · semaine {current.week}
          </span>
        </footer>
      </article>
    </div>
  );
}
