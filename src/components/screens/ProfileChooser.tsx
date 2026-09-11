import type { ProfileId } from '../../domain/types';
import { ArrowRight, Barbell } from '../ui/Icons';

interface ProfileChooserProps {
  onChoose: (profile: ProfileId) => void;
}

export function ProfileChooser({ onChoose }: ProfileChooserProps) {
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
          <button className="profile-choice" type="button" onClick={() => onChoose('ottman')}>
            <span className="avatar avatar-ottman">O</span>
            <span>
              <strong>Ottman</strong>
              <small>Programme force & cardio</small>
            </span>
            <ArrowRight size={20} />
          </button>
          <button className="profile-choice" type="button" onClick={() => onChoose('laura')}>
            <span className="avatar avatar-laura">L</span>
            <span>
              <strong>Laura</strong>
              <small>Programme tonique & cardio</small>
            </span>
            <ArrowRight size={20} />
          </button>
        </div>
        <p className="privacy-note">
          <span className="status-dot" /> Données locales · aucun compte requis
        </p>
      </section>
    </main>
  );
}
