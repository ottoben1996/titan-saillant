import { useEffect, useState } from 'react';
import { exerciseMedia } from '../../domain/media';
import type { Tutorial } from '../../domain/types';
import { ArrowLeft, ArrowRight, ArrowUpRight, Barbell, Bolt, Play, Repeat, Timer, Video, Warning } from '../ui/Icons';
import { MuscleMap } from '../ui/MuscleMap';
import { Sheet, SheetContent, SheetTitle } from '../ui/Sheet';

interface TutorialModalProps {
  tutorial: Tutorial;
  onClose: () => void;
}

export function TutorialModal({ tutorial, onClose }: TutorialModalProps) {
  const media = exerciseMedia[tutorial.exerciseId];
  const [activeFrame, setActiveFrame] = useState<'start' | 'peak'>('start');
  const [isAnimating, setIsAnimating] = useState(true);
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

  // Animation ping-pong (départ <-> pic) toutes les 1200ms quand on est sur l'onglet anatomie
  useEffect(() => {
    if (!media?.start || !media?.peak || !isAnimating || activeTab !== 'anatomy') return;
    const interval = window.setInterval(() => {
      setActiveFrame((prev) => (prev === 'start' ? 'peak' : 'start'));
    }, 1200);
    return () => window.clearInterval(interval);
  }, [media?.start, media?.peak, isAnimating, activeTab]);

  const frameStyle = { width: '45%', height: '100%', objectFit: 'contain' } as const;

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
                🧬 Anatomie & Repères
              </button>
            </div>
          </div>
        )}

        {/* Tab 1: Vidéo YouTube Short intégrée dans l'app */}
        {activeTab === 'video' && hasShort ? (
          <div className="tutorial-short-section">
            {!isOnline ? (
              <div className="tutorial-offline-banner">
                <span>📡</span>
                <span>Mode hors-ligne : reconnecte-toi pour voir le short YouTube.</span>
              </div>
            ) : (
              <>
                <div className="tutorial-short-wrapper">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${tutorial.youtubeShortId}?autoplay=1&mute=1&loop=1&playlist=${tutorial.youtubeShortId}&playsinline=1&controls=1&rel=0&modestbranding=1`}
                    title={`Short Démonstration : ${tutorial.title}`}
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
          /* Tab 2: Animation RepDB / Cover anatomique */
          <div
            className="tutorial-cover"
            style={media ? { background: '#101713', overflow: 'hidden', position: 'relative' } : undefined}
          >
            {media?.start && media?.peak ? (
              <div className="tutorial-animation-container">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '.6rem',
                    width: '100%',
                    height: '100%',
                  }}
                >
                  <img
                    src={activeFrame === 'start' ? media.start : media.peak}
                    alt={`Position ${activeFrame} : ${tutorial.title}`}
                    className="tutorial-animated-frame"
                    style={{ maxHeight: '7.5rem', objectFit: 'contain', transition: 'opacity 0.25s ease' }}
                  />
                  <button
                    type="button"
                    className="motion-toggle-pill"
                    onClick={() => setIsAnimating(!isAnimating)}
                    title={isAnimating ? 'Mettre en pause l’animation' : 'Animer le mouvement'}
                  >
                    <Play size={12} weight={isAnimating ? 'fill' : 'regular'} />
                    <span>{isAnimating ? 'Boucle' : 'Pause'}</span>
                  </button>
                </div>
              </div>
            ) : media?.start ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '.4rem',
                  width: '100%',
                  height: '100%',
                }}
              >
                <img src={media.start} alt={`Départ : ${tutorial.title}`} style={frameStyle} />
                <ArrowRight size={20} className="tutorial-arrow" />
                <img src={media.peak ?? media.main ?? media.start} alt={`Fin : ${tutorial.title}`} style={frameStyle} />
              </div>
            ) : media?.main ? (
              <img
                src={media.main}
                alt={tutorial.title}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <Barbell size={52} weight="duotone" />
            )}
          </div>
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
            <Bolt size={14} /> Repère clé du coach : {tutorial.keyCue}
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
          {media && (
            <p style={{ marginTop: '1rem', color: 'var(--text-3)', fontSize: '0.75rem' }}>
              Illustrations : Exercise data by RepDB (repdb.co) · attribution conservée.
            </p>
          )}
        </div>

        <button
          type="button"
          className="primary-button full tutorial-back-button"
          onClick={onClose}
          style={{ marginTop: '1rem' }}
        >
          <ArrowLeft size={18} /> Retour à la séance
        </button>
      </SheetContent>
    </Sheet>
  );
}
