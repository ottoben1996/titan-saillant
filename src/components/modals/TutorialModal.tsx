import { useEffect, useState } from 'react';
import type { Tutorial } from '../../domain/types';
import { Anatomie, ArrowLeft, ArrowUpRight, Barbell, Bolt, Repeat, Timer, Video, Warning } from '../ui/Icons';
import { MuscleMap } from '../ui/MuscleMap';
import { Sheet, SheetContent, SheetTitle } from '../ui/Sheet';

interface TutorialModalProps {
  tutorial: Tutorial;
  onClose: () => void;
  /** Le bouton du bas nomme ce qu'il retrouve : séance, fiche ou écran. */
  backLabel?: string;
}

export function TutorialModal({ tutorial, onClose, backLabel = 'Retour à la séance' }: TutorialModalProps) {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const hasShort = Boolean(tutorial.youtubeShortId);
  const [activeTab, setActiveTab] = useState<'video' | 'anatomy'>(() =>
    hasShort && (typeof navigator === 'undefined' || navigator.onLine) ? 'video' : 'anatomy',
  );

  // Monitor online / offline changes
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      setActiveTab('anatomy');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" onClose={onClose} aria-describedby="tutorial-desc">
        {/* Barre d'onglets : Vidéo Short / Anatomie & Repères */}
        {hasShort && (
          <div className="tutorial-tabs-container">
            <div className="tutorial-tabs">
              <button
                type="button"
                className={`tutorial-tab-btn ${activeTab === 'video' ? 'active' : ''}`}
                onClick={() => setActiveTab('video')}
              >
                <Video size={14} /> Démo Short
              </button>
              <button
                type="button"
                className={`tutorial-tab-btn ${activeTab === 'anatomy' ? 'active' : ''}`}
                onClick={() => setActiveTab('anatomy')}
              >
                <Anatomie size={14} /> Anatomie & Repères
              </button>
            </div>
          </div>
        )}

        {/* Tab 1: Vidéo YouTube Short intégrée dans l'app */}
        {activeTab === 'video' && hasShort ? (
          <div className="tutorial-short-section">
            {!isOnline ? (
              <div className="tutorial-offline-banner">
                <span>Mode hors-ligne : reconnecte-toi pour voir le short YouTube.</span>
              </div>
            ) : (
              <>
                <div className="tutorial-short-wrapper">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${tutorial.youtubeShortId}?autoplay=1&mute=1&loop=1&playlist=${tutorial.youtubeShortId}&playsinline=1&controls=1&rel=0&modestbranding=1`}
                    title={`Short Démonstration : ${tutorial.title}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="tutorial-short-iframe"
                  />
                </div>
                <div className="tutorial-short-meta">
                  <span className="tutorial-short-hint">
                    <Repeat size={13} /> Boucle continue · Mute automatique en salle
                  </span>
                  <a
                    href={`https://www.youtube.com/shorts/${tutorial.youtubeShortId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tutorial-yt-link"
                    title="Ouvrir dans l’application YouTube"
                  >
                    Ouvrir sur YouTube <ArrowUpRight size={16} />
                  </a>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Les médias d'exercice sont retirés de cette vue pour préserver la mise en page mobile. */}
            <div className="tutorial-cover">
              <Barbell size={52} weight="duotone" />
            </div>
          </>
        )}

        <p className="eyebrow">TUTORIEL & ANATOMIE</p>
        <SheetTitle id="tutorial-title">{tutorial.title}</SheetTitle>
        <div className="chip-row">
          {tutorial.muscles.map((muscle) => (
            <span key={muscle}>{muscle}</span>
          ))}
          {tutorial.tempoRecommended && (
            <span className="chip-tempo">
              <Timer size={14} /> Tempo : {tutorial.tempoRecommended}
            </span>
          )}
        </div>

        {tutorial.keyCue && (
          <div
            style={{
              padding: '.6rem .85rem',
              borderRadius: '.85rem',
              background: 'var(--surface-2)',
              border: '1px solid var(--line)',
              color: 'var(--text-1)',
              fontSize: '.75rem',
              fontWeight: 700,
              margin: '.6rem 0',
            }}
          >
            <Bolt size={14} /> Repère clé du coach : {tutorial.keyCue}
          </div>
        )}

        {/* Mini-Carte Anatomique SVG vectorielle */}
        <MuscleMap
          primaryMuscles={tutorial.primaryMuscles ?? tutorial.muscles}
          secondaryMuscles={tutorial.secondaryMuscles ?? []}
          size="sm"
        />

        <div id="tutorial-desc">
          <h3>Position & exécution</h3>
          <p>{tutorial.position}</p>
          <ol>
            {tutorial.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>

          <h3>À éviter</h3>
          <p>{tutorial.commonMistakes.join(' · ')}</p>
          <div className="safety-callout">
            <Warning size={16} /> {tutorial.safety[0]}
          </div>
        </div>

        <button
          type="button"
          className="primary-button full tutorial-back-button"
          onClick={onClose}
          style={{ marginTop: '1rem' }}
        >
          <ArrowLeft size={18} /> {backLabel}
        </button>
      </SheetContent>
    </Sheet>
  );
}
