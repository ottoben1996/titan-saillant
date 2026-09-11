import { useRef, useState } from 'react';
import type { ProfileId } from '../../domain/types';
import { exportProfileData, importProfileData } from '../../storage/backup';
import { deleteProfileData } from '../../storage/sessionRepository';
import { ArrowLeft, ArrowRight, DownloadSimple, Timer, Trash } from '../ui/Icons';
import { isSoundEnabled, playTimerChime, setSoundEnabled } from '../../workout/alerts';
import { profileLabels } from './HomeScreen';

interface SettingsScreenProps {
  profile: ProfileId;
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
}

export function SettingsScreen({
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
}: SettingsScreenProps) {
  const fileInput = useRef<HTMLInputElement>(null);

  const download = async () => {
    const blob = new Blob([await exportProfileData(profile)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `coach-${profile}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    onNotice('Sauvegarde exportée.');
  };

  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());

  const importFile = async (file: File) => {
    try {
      await importProfileData(await file.text(), profile);
      onImported();
      onNotice('Sauvegarde importée.');
    } catch (error) {
      onNotice(
        error instanceof Error && error.message.includes('autre profil')
          ? error.message
          : 'Fichier de sauvegarde invalide.'
      );
    }
  };

  const erase = async () => {
    if (window.confirm('Supprimer toutes les données de ce profil ?')) {
      await deleteProfileData(profile);
      onSwitch();
    }
  };

  const statusLabel = (ok: boolean, ready: string, pending: string) => (ok ? ready : pending);

  return (
    <section className="content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">ESPACE PERSONNEL</p>
          <h1>Réglages</h1>
        </div>
        <button className="text-button" onClick={onBack}>
          <ArrowLeft size={16} /> Retour
        </button>
      </div>

      <div className="settings-profile">
        <div className={`avatar avatar-${profile}`}>{profileLabels[profile][0]}</div>
        <div>
          <strong>{profileLabels[profile]}</strong>
          <small>Programme privé sur cet appareil</small>
        </div>
        <button className="text-button" onClick={onSwitch}>
          Changer
        </button>
      </div>

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
        <button onClick={download}>
          <DownloadSimple size={21} />
          <span>
            <strong>Exporter mes données</strong>
            <small>Créer une sauvegarde JSON</small>
          </span>
          <ArrowRight size={18} />
        </button>
        <button onClick={() => fileInput.current?.click()}>
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
        <button className="danger-row" onClick={() => void erase()}>
          <Trash size={21} />
          <span>
            <strong>Effacer ce profil</strong>
            <small>Supprime uniquement les données de {profileLabels[profile]}</small>
          </span>
          <ArrowRight size={18} />
        </button>
      </div>

      <div className="device-diagnostic">
        <div className="card-heading">
          <div>
            <p className="eyebrow">PRÊT POUR LA SALLE</p>
            <h2>État de l’application</h2>
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
                notificationPermission === 'granted'
                  ? 'ok'
                  : notificationPermission === 'denied'
                  ? 'warning'
                  : ''
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
        </div>

        {notificationPermission === 'default' && (
          <button className="secondary-button full" onClick={onEnableNotifications}>
            <Timer size={18} /> Activer les alertes système
          </button>
        )}
        {installAvailable && (
          <button className="primary-button full" onClick={onInstall}>
            <DownloadSimple size={18} /> Installer Coach sur cet appareil
          </button>
        )}
      </div>
      <p className="settings-footnote">Coach hors ligne · tes données restent dans le navigateur de cet appareil.</p>
      <p className="settings-footnote">
        Illustrations d’exercices :{' '}
        <a href="https://repdb.co" target="_blank" rel="noreferrer" style={{ color: '#b8f36b' }}>
          Exercise data by RepDB (repdb.co)
        </a>
        .
      </p>
    </section>
  );
}
