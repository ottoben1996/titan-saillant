import { useEffect, useState } from 'react';
import type { ProfileId } from '../../domain/types';
import { listSessions } from '../../storage/sessionRepository';
import { totalsForWeek } from '../../workout/summary';
import { ChevronRight } from '../ui/Icons';
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
        {/* Le nom de l'application est écrit en texte : aucun aria-label sur un
            conteneur sans rôle, que les lecteurs d'écran ignoreraient. */}
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            <LogoMark size={44} />
          </span>
          <span className="sr-only">Coach Ottman et Laura</span>
        </div>
        <h1>
          Bienvenue
          <span className="sr-only">, choisis ton profil</span>
        </h1>
        <p className="intro">Choisis ton espace. Programmes et historique restent séparés sur cet appareil.</p>
        {profileLoad.status === 'loading' && (
          <p className="profile-load" role="status" aria-live="polite">
            Chargement des séances…
          </p>
        )}
        {profileLoad.status === 'error' && (
          <div className="profile-load" role="alert">
            <p>Impossible de charger les séances.</p>
            <button
              type="button"
              className="secondary-button"
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
            <button
              className={`profile-choice profile-choice-${profile.id}`}
              type="button"
              key={profile.id}
              onClick={() => onChoose(profile.id)}
            >
              <span className={`avatar avatar-${profile.id}`} aria-hidden="true">
                {profile.name[0]}
              </span>
              <span>
                <strong>{profile.name}</strong>
                <small>{profile.description}</small>
                <small className="profile-week">
                  {profileLoad.status === 'ready' ? weekStatusLabel(profileLoad.counts[profile.id]) : '\u00A0'}
                </small>
              </span>
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          ))}
        </div>
        <p className="privacy-note">Données locales · aucun compte requis</p>
      </section>
    </main>
  );
}
