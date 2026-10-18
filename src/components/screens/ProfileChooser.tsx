import { useEffect, useState } from 'react';
import type { ProfileId } from '../../domain/types';
import { listSessions } from '../../storage/sessionRepository';
import { totalsForWeek } from '../../workout/summary';
import { ArrowRight } from '../ui/Icons';
import { LogoMark } from '../ui/LogoMark';

const PROFILES: ReadonlyArray<{ id: ProfileId; name: string; description: string }> = [
  { id: 'ottman', name: 'Ottman', description: 'Programme force & cardio' },
  { id: 'laura', name: 'Laura', description: 'Programme tonique & cardio' },
];

interface ProfileChooserProps {
  onChoose: (profile: ProfileId) => void;
}

type ProfileLoadState =
  | { status: 'loading' }
  | { status: 'ready'; counts: Record<ProfileId, number> }
  | { status: 'error' };

function weekStatusLabel(count: number): string {
  if (count === 0) return 'Aucune séance cette semaine';
  return `${count} séance${count > 1 ? 's' : ''} cette semaine`;
}

export function ProfileChooser({ onChoose }: ProfileChooserProps) {
  const [profileLoad, setProfileLoad] = useState<ProfileLoadState>({ status: 'loading' });
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const now = new Date();
    void retryToken;
    const load = async () => {
      try {
        const entries = await Promise.all(
          PROFILES.map(async (profile) => {
            const sessions = await listSessions(profile.id);
            return [profile.id, totalsForWeek(sessions, now).sessions] as const;
          }),
        );
        if (!cancelled)
          setProfileLoad({ status: 'ready', counts: Object.fromEntries(entries) as Record<ProfileId, number> });
      } catch {
        if (!cancelled) setProfileLoad({ status: 'error' });
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [retryToken]);

  return (
    <main className="app-shell profile-screen">
      <section className="profile-card">
        <div className="brand-lockup" aria-label="Coach Ottman et Laura">
          <span className="brand-mark" aria-hidden="true">
            <LogoMark size={34} />
          </span>
          <span className="brand-wordmark">COACH</span>
        </div>
        <p className="eyebrow">ESPACE PERSONNEL · HORS LIGNE</p>
        <h1>
          Ta séance,
          <br />
          <em>sans friction.</em>
          <span className="sr-only">Choisis ton profil</span>
        </h1>
        <p className="intro">
          Choisis ton espace personnel. Les programmes et l’historique restent séparés sur cet appareil.
        </p>
        {profileLoad.status === 'loading' && (
          <p role="status" aria-live="polite">
            Chargement des séances…
          </p>
        )}
        {profileLoad.status === 'error' && (
          <div role="alert">
            <p>Impossible de charger les séances.</p>
            <button
              type="button"
              onClick={() => {
                setProfileLoad({ status: 'loading' });
                setRetryToken((token) => token + 1);
              }}
            >
              Réessayer
            </button>
          </div>
        )}
        <div className="profile-actions">
          {PROFILES.map((profile) => (
            <button className="profile-choice" type="button" key={profile.id} onClick={() => onChoose(profile.id)}>
              <span className={`avatar avatar-${profile.id}`}>{profile.name[0]}</span>
              <span>
                <strong>{profile.name}</strong>
                <small>{profile.description}</small>
                <small className="profile-week">
                  {profileLoad.status === 'ready' ? weekStatusLabel(profileLoad.counts[profile.id]) : '\u00A0'}
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
