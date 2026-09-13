import { useMemo, useState } from 'react';
import {
  cycleLengthWeeks,
  measurementId,
  measurementZones,
  profileBody,
  type MeasurementZone,
  type WeeklyMeasurement,
} from '../../domain/measurements';
import type { ProfileId } from '../../domain/types';
import { implausibleZones, nextTargetWeek, previousMeasurement, zoneDelta } from '../../workout/followup';
import { Check, Plus, Minus, Repeat, ArrowLeft, ChartLine, Warning } from '../ui/Icons';

interface FollowupScreenProps {
  profileId: ProfileId;
  measurements: readonly WeeklyMeasurement[];
  sessionsThisWeek: number;
  onSave: (measurement: WeeklyMeasurement) => void;
  onOpenBilan: (measurement: WeeklyMeasurement) => void;
  onBack: () => void;
}

const toNumber = (value: string): number | undefined => {
  const cleaned = value.trim().replace(',', '.');
  if (cleaned === '') return undefined;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const afficher = (value: number | undefined, decimals = 1) =>
  typeof value === 'number' ? value.toLocaleString('fr-FR', { maximumFractionDigits: decimals }) : '—';

export function FollowupScreen({
  profileId,
  measurements,
  sessionsThisWeek,
  onSave,
  onOpenBilan,
  onBack,
}: FollowupScreenProps) {
  const body = profileBody[profileId];
  /**
   * Semaine renseignée pendant cette visite. Tant qu'elle est là, l'écran reste
   * dessus : valider la semaine 3 ne doit pas basculer l'en-tête et le bouton
   * de bilan sur la semaine 4 sous les yeux de l'utilisateur.
   */
  const [semaineEnregistree, setSemaineEnregistree] = useState<WeeklyMeasurement | null>(null);
  const target = useMemo(() => {
    if (semaineEnregistree) return { cycle: semaineEnregistree.cycle, week: semaineEnregistree.week };
    return nextTargetWeek(measurements);
  }, [measurements, semaineEnregistree]);
  const existing = useMemo(
    () => measurements.find((item) => item.cycle === target.cycle && item.week === target.week),
    [measurements, target],
  );
  const reference = useMemo(
    () =>
      existing
        ? previousMeasurement(measurements, existing)
        : [...measurements].sort((a, b) => (a.cycle === b.cycle ? a.week - b.week : a.cycle - b.cycle)).at(-1),
    [measurements, existing],
  );

  const [draft, setDraft] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const zone of measurementZones) {
      const value = existing?.[zone.key];
      initial[zone.key] = typeof value === 'number' ? String(value).replace('.', ',') : '';
    }
    return initial;
  });
  const [enregistre, setEnregistre] = useState(false);
  /** Réponse du coach, collée à la main après son retour. */
  const [retourCoach, setRetourCoach] = useState(() => existing?.coachNote ?? '');

  const setValue = (zone: MeasurementZone, raw: string) => {
    setDraft((current) => ({ ...current, [zone]: raw.replace(/[^0-9,.]/g, '') }));
    setEnregistre(false);
  };

  const ajuster = (zone: MeasurementZone, step: number) => {
    const current = toNumber(draft[zone]) ?? toNumber(String(reference?.[zone] ?? '')) ?? 0;
    const next = Math.max(0, Math.round((current + step) * 10) / 10);
    setValue(zone, String(next).replace('.', ','));
  };

  /** Reprend toutes les valeurs de la semaine précédente, à ajuster ensuite. */
  const reporter = () => {
    const next: Record<string, string> = {};
    for (const zone of measurementZones) {
      const value = reference?.[zone.key];
      next[zone.key] = typeof value === 'number' ? String(value).replace('.', ',') : draft[zone.key] ?? '';
    }
    setDraft(next);
    setEnregistre(false);
  };

  const brouillon: WeeklyMeasurement = useMemo(() => {
    const measurement: WeeklyMeasurement = {
      id: measurementId(profileId, target.cycle, target.week),
      profileId,
      cycle: target.cycle,
      week: target.week,
      measuredOn: new Date().toISOString(),
    };
    for (const zone of measurementZones) {
      const value = toNumber(draft[zone.key] ?? '');
      if (value !== undefined) measurement[zone.key] = value;
    }
    return measurement;
  }, [draft, profileId, target.cycle, target.week]);

  const invraisemblables = useMemo(
    () => implausibleZones(brouillon, reference),
    [brouillon, reference],
  );
  const rien = measurementZones.every((zone) => toNumber(draft[zone.key] ?? '') === undefined);

  const valider = () => {
    if (rien) return;
    const point = {
      ...brouillon,
      coachNote: retourCoach.trim() || undefined,
      excluded: invraisemblables.length > 0 ? invraisemblables : undefined,
    };
    onSave(point);
    setSemaineEnregistree(point);
    setEnregistre(true);
  };

  /** Passe à la semaine suivante : les champs repartent vides. */
  const semaineSuivante = () => {
    const vide: Record<string, string> = {};
    for (const zone of measurementZones) vide[zone.key] = '';
    setDraft(vide);
    setSemaineEnregistree(null);
    setEnregistre(false);
  };

  const bilan = semaineEnregistree ?? existing;
  const historique = [...measurements].sort((a, b) => (b.cycle === a.cycle ? b.week - a.week : b.cycle - a.cycle));

  return (
    <section className="followup">
      <button type="button" className="back-link" onClick={onBack}>
        <ArrowLeft size={16} /> Retour
      </button>

      <p className="eyebrow">POINT DU SAMEDI</p>
      <h1>
        Semaine {target.week} <em>du cycle {target.cycle}</em>
      </h1>
      <div className="cycle-track" aria-label={`Semaine ${target.week} sur ${cycleLengthWeeks}`}>
        {Array.from({ length: cycleLengthWeeks }, (_, index) => {
          const week = index + 1;
          const done = week < target.week;
          return (
            <i
              key={week}
              className={done ? 'done' : week === target.week ? 'now' : ''}
              aria-hidden="true"
            />
          );
        })}
      </div>

      <button type="button" className="report-button" onClick={reporter} disabled={!reference}>
        <Repeat size={15} /> Reporter la semaine dernière
      </button>

      <div className="followup-card">
        {measurementZones.map((zone) => {
          const delta = zoneDelta(reference, brouillon, zone.key);
          const value = toNumber(draft[zone.key] ?? '');
          const deltaClass = delta === undefined ? '' : delta < 0 ? 'down' : delta > 0 ? 'up' : 'flat';
          const alarming = invraisemblables.includes(zone.key);
          return (
            <div className={`followup-field${alarming ? ' alarming' : ''}`} key={zone.key}>
              <span className="followup-label">
                <b>{zone.label}</b>
                {reference && typeof reference[zone.key] === 'number' ? (
                  <button
                    type="button"
                    className="followup-reuse"
                    // Reprendre la valeur précédente d'un appui : trois mensurations
                    // sur huit bougent réellement chaque semaine.
                    onClick={() => setValue(zone.key, afficher(reference[zone.key] as number))}
                    aria-label={`Reprendre la valeur de la semaine ${reference.week} pour ${zone.label} : ${afficher(
                      reference[zone.key] as number,
                    )} ${zone.unit}`}
                  >
                    S{reference.week} : {afficher(reference[zone.key])} {zone.unit}
                  </button>
                ) : (
                  <small>premier relevé</small>
                )}
              </span>
              <span className="followup-stepper">
                <button
                  type="button"
                  onClick={() => ajuster(zone.key, -zone.step)}
                  aria-label={`Diminuer ${zone.label}`}
                >
                  <Minus size={14} />
                </button>
                <input
                  inputMode="decimal"
                  value={draft[zone.key] ?? ''}
                  onChange={(event) => setValue(zone.key, event.target.value)}
                  aria-label={`${zone.label} en ${zone.unit === 'kg' ? 'kilogrammes' : 'centimètres'}`}
                  placeholder="—"
                />
                <button
                  type="button"
                  onClick={() => ajuster(zone.key, zone.step)}
                  aria-label={`Augmenter ${zone.label}`}
                >
                  <Plus size={14} />
                </button>
              </span>
              <span className={`followup-delta ${deltaClass}`}>
                {value === undefined || delta === undefined
                  ? '—'
                  : delta === 0
                    ? '='
                    : `${delta > 0 ? '+' : ''}${afficher(delta)}`}
              </span>
            </div>
          );
        })}
      </div>

      {invraisemblables.length > 0 && (
        <div className="followup-warning" role="status">
          <Warning size={15} />
          <span>
            Écart invraisemblable sur {invraisemblables.length > 1 ? 'ces zones' : 'cette zone'}. La valeur est
            gardée mais écartée des tendances : vérifie la mesure avant de valider.
          </span>
        </div>
      )}

      <div className="followup-summary">
        <span>
          Hauteur <b>{body.heightCm} cm</b> — poids de départ <b>{afficher(body.initialWeightKg, 2)} kg</b>
        </span>
        <span>
          {sessionsThisWeek} séance{sessionsThisWeek > 1 ? 's' : ''} cette semaine
        </span>
      </div>

      <label className="followup-coach">
        <span>
          Ce que le coach a répondu (facultatif)
          <small>Repris en tête du bilan de la semaine prochaine.</small>
        </span>
        <textarea
          value={retourCoach}
          onChange={(event) => setRetourCoach(event.target.value)}
          rows={2}
          placeholder="Colle ici sa réponse de la semaine…"
        />
      </label>

      <button className="primary-button full" type="button" onClick={valider} disabled={rien}>
        <Check size={16} /> {existing ? 'Mettre à jour la semaine' : 'Valider le point de la semaine'}
      </button>

      {enregistre && (
        <p className="followup-saved" role="status">
          Point enregistré. Le bilan de la semaine est prêt.
        </p>
      )}

      {bilan && (
        <button type="button" className="secondary-button full bilan-button" onClick={() => onOpenBilan(bilan)}>
          <ChartLine size={16} /> Voir le bilan de la semaine {bilan.week} (PDF)
        </button>
      )}

      {semaineEnregistree && (
        <button type="button" className="text-button followup-next" onClick={semaineSuivante}>
          Renseigner la semaine suivante
        </button>
      )}

      {historique.length > 0 && (
        <>
          <h2 className="followup-history-title">Suivi semaine par semaine</h2>
          <div className="followup-history">
            {historique.map((item) => {
              const poids = typeof item.weightKg === 'number' ? afficher(item.weightKg) : '—';
              const taille = typeof item.waistCm === 'number' ? `${afficher(item.waistCm)} cm` : 'non renseignée';
              return (
                <div className="followup-row" key={item.id}>
                  <span className="followup-week">
                    C{item.cycle} · S{item.week}
                  </span>
                  <span className="followup-row-values">
                    <b>{poids} kg</b>
                    <small>taille {taille}</small>
                  </span>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => onOpenBilan(item)}
                    aria-label={`Voir le bilan de la semaine ${item.week}`}
                  >
                    Bilan
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
