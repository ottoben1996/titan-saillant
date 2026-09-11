import { useEffect, useState } from 'react';
import type { ProfileId } from '../../domain/types';
import { listSessions } from '../../storage/sessionRepository';
import { totalsForWeek } from '../../workout/summary';
import { ArrowRight, Barbell } from '../ui/Icons';

const PROFILES: ReadonlyArray<{ id: ProfileId; name: string; description: string }> = [
  { id: 'ottman', name: 'Ottman', description: 'Programme force & cardio' },
  { id: 'laura', name: 'Laura', description: 'Programme tonique & cardio' },
];

interface ProfileChooserProps {
  onChoose: (profile: ProfileId) => void;
}

function weekStatusLabel(count: number): string {
  if (count === 0) return 'Aucune séance cette semaine';
  return `${count} séance${count > 1 ? 's' : ''} cette semaine`;
}

export function ProfileChooser({ onChoose }: ProfileChooserProps) {
  const [weekCounts, setWeekCounts] = useState<Record<ProfileId, number> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const now = new Date();
    const load = async () => {
      try {
        const entries = await Promise.all(
          PROFILES.map(async (profile) => {
            const sessions = await listSessions(profile.id);
            return [profile.id, totalsForWeek(sessions, now).sessions] as const;
          })
        );
        if (!cancelled) setWeekCounts(Object.fromEntries(entries) as Record<ProfileId, number>);
      } catch {
        if (!cancelled) setWeekCounts(null);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="app-shell profile-screen">
      <section className="profile-card">
        <div className="brand-mark">
          <Barbell size={24} weight="duotone" />
        </div>
        <p className="eyebrow">COACH · HORS LIGNE</p>
        <h1>
          Ta séance,<br />
          <em>sans friction.</em>
          <span className="sr-only">Choisis ton profil</span>
        </h1>
        <p className="intro">
          Choisis ton espace personnel. Les programmes et l’historique restent séparés sur cet appareil.
        </p>
        <div className="profile-actions">
          {PROFILES.map((profile) => (
            <button
              className="profile-choice"
              type="button"
              key={profile.id}
              onClick={() => onChoose(profile.id)}
            >
              <span className={`avatar avatar-${profile.id}`}>{profile.name[0]}</span>
              <span>
                <strong>{profile.name}</strong>
                <small>{profile.description}</small>
                <small className="profile-week">
                  {weekCounts ? weekStatusLabel(weekCounts[profile.id]) : '\u00A0'}
                </small>
              </span>
              <ArrowRight size={20} />
            </button>
          ))}
        </div>
        <p className="privacy-note">
          <span className="status-dot" /> Données locales · aucun compte requis
        </p>
      </section>
    </main>
  );
}
