import { useEffect, useRef, useState } from 'react';
import { type AccentId, accents } from '../../domain/palettes';
import type { ProfileId } from '../../domain/types';
import { importProfileData } from '../../storage/backup';
import { telechargerCalendrierSuivi, telechargerSauvegarde } from '../../storage/backupFile';
import { debutDePause, mettreEnPause, reprendreCycle } from '../../storage/cyclePause';
import { deleteProfileData, listSessions } from '../../storage/sessionRepository';
import { isSoundEnabled, playTimerChime, setSoundEnabled } from '../../workout/alerts';
import { ArrowLeft, ArrowRight, DownloadSimple, Timer, Trash, Warning } from '../ui/Icons';
import { profileLabels } from './HomeScreen';

const ERASE_WORD = 'SUPPRIMER';

interface SessionCounts {
  total: number;
  completed: number;
}

interface SettingsScreenProps {
  profile: ProfileId;
  /** Couleur choisie par ce profil, appliquée immédiatement. */
  accent: AccentId;
  onAccentChange: (accent: AccentId) => void;
  onBack: () => void;
  onSwitch: () => void;
  onNotice: (notice: string) => void;
  onImported: () => void;
  isOnline: boolean;
  offlineReady: boolean;
  serviceWorkerReady: boolean;
  installAvailable: boolean;
  onInstall: () => void;
  notificationPermission: NotificationPermission | 'unsupported';
  onEnableNotifications: () => void;
  /** Force la vérification d'une nouvelle version (service worker). */
  onCheckUpdate: () => void;
}

/** Version réellement embarquée dans cette copie de l'application. */
function buildLabel(): string {
  const date = new Date(__BUILD_DATE__);
  if (Number.isNaN(date.getTime())) return 'inconnue';
  return date.toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function describeSessions(counts: SessionCounts | null): string {
  if (!counts) return 'toutes les données de ce profil';
  if (counts.total === 0) return 'aucune séance enregistrée';
  const total = `${counts.total} séance${counts.total > 1 ? 's' : ''} enregistrée${counts.total > 1 ? 's' : ''}`;
  const inProgress = counts.total - counts.completed;
  return inProgress > 0 ? `${total} (dont ${inProgress} en cours)` : total;
}

export function SettingsScreen({
  accent,
  onAccentChange,
  profile,
  onBack,
  onSwitch,
  onNotice,
  onImported,
  isOnline,
  offlineReady,
  serviceWorkerReady,
  installAvailable,
  onInstall,
  notificationPermission,
  onEnableNotifications,
  onCheckUpdate,
}: SettingsScreenProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  /** Cycle en pause : la date de mise en pause, ou rien. */
  const [pause, setPause] = useState<Date | undefined>(() => debutDePause(profile));
  const [counts, setCounts] = useState<SessionCounts | null>(null);
  const [eraseConfirming, setEraseConfirming] = useState(false);
  const [eraseWord, setEraseWord] = useState('');
  const [erasing, setErasing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void listSessions(profile)
      .then((items) => {
        if (cancelled) return;
        setCounts({ total: items.length, completed: items.filter((item) => item.completedAt).length });
      })
      .catch(() => {
        if (!cancelled) setCounts(null);
      });
    return () => {
      cancelled = true;
    };
  }, [profile]);

  const download = async () => {
    await telechargerSauvegarde(profile);
    onNotice('Sauvegarde exportée.');
  };

  const ajouterAuCalendrier = () => {
    telechargerCalendrierSuivi(profile);
    onNotice('Fichier prêt : ouvre-le pour inscrire les huit rendez-vous.');
  };

  const importFile = async (file: File) => {
    try {
      await importProfileData(await file.text(), profile);
      onImported();
      onNotice('Sauvegarde importée.');
    } catch (error) {
      onNotice(
        error instanceof Error && error.message.includes('autre profil')
          ? error.message
          : 'Fichier de sauvegarde invalide.',
      );
    }
  };

  const eraseConfirmed = eraseWord.trim().toUpperCase() === ERASE_WORD;

  const erase = async () => {
    if (!eraseConfirmed || erasing) return;
    setErasing(true);
    try {
      await deleteProfileData(profile);
      onSwitch();
    } finally {
      setErasing(false);
    }
  };

  const cancelErase = () => {
    setEraseConfirming(false);
    setEraseWord('');
  };

  const statusLabel = (ok: boolean, ready: string, pending: string) => (ok ? ready : pending);

  return (
    <section className="content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ESPACE PERSONNEL</p>
          <h1>Réglages</h1>
        </div>
        <button className="text-button" onClick={onBack} type="button">
          <ArrowLeft size={16} /> Retour
        </button>
      </div>

      <div className="settings-profile">
        <div className={`avatar avatar-${profile}`}>{profileLabels[profile][0]}</div>
        <div>
          <strong>{profileLabels[profile]}</strong>
          <small>
            Programme privé sur cet appareil
            {counts ? ` · ${describeSessions(counts)}` : ''}
          </small>
        </div>
        <button className="text-button" onClick={onSwitch} type="button">
          Changer
        </button>
      </div>

      {/* -------------------------------------------------- cycle en pause --- */}
      <section className="settings-section">
        <h2 className="settings-title">Mon cycle</h2>
        <div className="settings-list">
          <button
            type="button"
            className="toggle-row"
            aria-pressed={pause !== undefined}
            onClick={() => {
              if (pause) {
                reprendreCycle(profile);
                setPause(undefined);
                onNotice('Cycle repris : le point du samedi est de nouveau attendu.');
              } else {
                const maintenant = new Date();
                mettreEnPause(profile, maintenant);
                setPause(maintenant);
                onNotice('Cycle en pause : les courbes sont gelées, pas faussées.');
              }
            }}
          >
            <Timer size={21} />
            <span>
              <strong>{pause ? 'Cycle en pause' : 'Cycle en cours'}</strong>
              <small>
                {pause
                  ? `Depuis le ${pause.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} · aucun point attendu`
                  : 'Blessure, vacances, semaine chargée : mets le cycle en pause plutôt que de sauter un point'}
              </small>
            </span>
            <span className={`toggle-pill${pause ? ' on' : ''}`} aria-hidden="true">
              <i />
            </span>
          </button>
        </div>
      </section>

      {/* ----------------------------------------------------- rappels ------- */}
      <section className="settings-section">
        <h2 className="settings-title">Rappels</h2>
        <div className="settings-list">
          <div className="settings-row">
            <div>
              <strong>Point du samedi</strong>
              <small>
                Huit rendez-vous de 30 minutes, avec un rappel 30 minutes avant, dans le calendrier du téléphone.
              </small>
            </div>
          </div>
        </div>
        <button type="button" className="secondary-button full" onClick={ajouterAuCalendrier}>
          <Timer size={16} /> Ajouter à mon calendrier
        </button>
        <p className="settings-footnote">
          Aucune notification serveur : le rappel vient du calendrier du téléphone, qui ne rate jamais une alerte, même
          application fermée.
        </p>
      </section>

      {/* --------------------------------------------------- ma couleur ------ */}
      <section className="settings-section">
        <h2 className="settings-title">Ma couleur</h2>
        {/* Clin d'œil : la couleur de Laura n'a pas été choisie par quelqu'un d'autre. */}
        {profile === 'laura' && <p className="accent-teaser">Parce qu'Ottman te connaît pas, choisis par toi-même.</p>}
        <div className="accent-choices" role="radiogroup" aria-label="Couleur de l'application">
          {accents.map((item) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={accent === item.id}
              className={`accent-choice${accent === item.id ? ' on' : ''}`}
              onClick={() => onAccentChange(item.id)}
            >
              <span className="accent-dot" style={{ background: item.accent }} aria-hidden="true" />
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------ préférences -- */}
      <section className="settings-section">
        <h2 className="settings-title">Préférences</h2>
        <div className="settings-list">
          <button
            className="toggle-row"
            aria-pressed={soundOn}
            onClick={() => {
              const next = !soundOn;
              setSoundOn(next);
              setSoundEnabled(next);
              if (next) playTimerChime('rest');
              onNotice(next ? 'Signal sonore activé.' : 'Signal sonore coupé.');
            }}
            type="button"
          >
            <Timer size={21} />
            <span>
              <strong>Signal sonore de fin de repos</strong>
              <small>{soundOn ? 'Activé · bip à la fin du chrono' : 'Coupé · vibration seulement'}</small>
            </span>
            <span className={`toggle-pill${soundOn ? ' on' : ''}`} aria-hidden="true">
              <i />
            </span>
          </button>
        </div>
      </section>

      {/* ----------------------------------------------------------- données -- */}
      <section className="settings-section">
        <h2 className="settings-title">Mes données</h2>
        <div className="settings-list">
          <button onClick={download} type="button">
            <DownloadSimple size={21} />
            <span>
              <strong>Exporter mes données</strong>
              <small>Créer une sauvegarde JSON de {profileLabels[profile]}</small>
            </span>
            <ArrowRight size={18} />
          </button>
          <button onClick={() => fileInput.current?.click()} type="button">
            <DownloadSimple size={21} />
            <span>
              <strong>Importer une sauvegarde</strong>
              <small>Restaurer un fichier JSON</small>
            </span>
            <ArrowRight size={18} />
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => e.target.files?.[0] && void importFile(e.target.files[0])}
          />
          {!eraseConfirming && (
            <button className="danger-row" onClick={() => setEraseConfirming(true)} type="button">
              <Trash size={21} />
              <span>
                <strong>Effacer ce profil</strong>
                <small>Supprime uniquement les données de {profileLabels[profile]}</small>
              </span>
              <ArrowRight size={18} />
            </button>
          )}
        </div>

        {eraseConfirming && (
          <div className="danger-confirm" role="alertdialog" aria-label="Confirmation de l’effacement du profil">
            <div className="danger-confirm-head">
              <Warning size={20} />
              <strong>Effacement définitif</strong>
            </div>
            <p className="danger-lead">
              Cette action supprime le profil de <strong>{profileLabels[profile]}</strong> et{' '}
              <strong>{describeSessions(counts)}</strong>. Aucune récupération n’est possible : pense à exporter une
              sauvegarde avant de continuer.
            </p>
            <label className="danger-word">
              <span>Écris « {ERASE_WORD} » pour confirmer</span>
              <input
                type="text"
                value={eraseWord}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                onChange={(event) => setEraseWord(event.target.value)}
                placeholder={ERASE_WORD}
              />
            </label>
            <div className="danger-actions">
              <button className="secondary-button" onClick={cancelErase} disabled={erasing} type="button">
                Annuler
              </button>
              <button
                className="danger-button"
                onClick={() => void erase()}
                disabled={!eraseConfirmed || erasing}
                type="button"
              >
                {erasing ? 'Suppression…' : 'Effacer définitivement'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------- application -- */}
      <section className="settings-section">
        <h2 className="settings-title">Application</h2>
        <div className="device-diagnostic">
          <div className="card-heading">
            <div>
              <p className="eyebrow">PRÊT POUR LA SALLE</p>
              <h3>État de l’application</h3>
            </div>
            <span>{isOnline ? 'Connecté' : 'Hors ligne'}</span>
          </div>
          <div className="diagnostic-list">
            <div>
              <span>Connexion</span>
              <strong className={isOnline ? 'ok' : 'warning'}>{isOnline ? 'En ligne' : 'Hors ligne'}</strong>
            </div>
            <div>
              <span>Mode hors ligne</span>
              <strong className={offlineReady || serviceWorkerReady ? 'ok' : 'warning'}>
                {statusLabel(offlineReady || serviceWorkerReady, 'Prêt', 'Préparation…')}
              </strong>
            </div>
            <div>
              <span>Données locales</span>
              <strong className="ok">{typeof indexedDB === 'undefined' ? 'Indisponibles' : 'Disponibles'}</strong>
            </div>
            <div>
              <span>Alertes de minuteur</span>
              <strong
                className={
                  notificationPermission === 'granted' ? 'ok' : notificationPermission === 'denied' ? 'warning' : ''
                }
              >
                {notificationPermission === 'unsupported'
                  ? 'Non disponibles'
                  : notificationPermission === 'granted'
                    ? 'Activées'
                    : notificationPermission === 'denied'
                      ? 'Bloquées'
                      : 'À activer'}
              </strong>
            </div>
            <div>
              <span>Version</span>
              <strong className="ok">{buildLabel()}</strong>
            </div>
          </div>

          {/* Une mise à jour peut être vérifiée à la demande : plus besoin
              d'attendre la vérification automatique au retour au premier plan. */}
          <button type="button" className="secondary-button full update-check-btn" onClick={onCheckUpdate}>
            Rechercher une mise à jour
          </button>

          {notificationPermission === 'default' && (
            <button className="secondary-button full" onClick={onEnableNotifications} type="button">
              <Timer size={18} /> Activer les alertes système
            </button>
          )}
          {installAvailable && (
            <button className="primary-button full" onClick={onInstall} type="button">
              <DownloadSimple size={18} /> Installer Coach sur cet appareil
            </button>
          )}
        </div>
      </section>

      <p className="settings-footnote">Coach hors ligne · tes données restent dans le navigateur de cet appareil.</p>
      <p className="settings-footnote">
        Illustrations d’exercices :{' '}
        <a href="https://repdb.co" target="_blank" rel="noreferrer">
          Exercise data by RepDB (repdb.co)
        </a>
        .
      </p>
    </section>
  );
}
