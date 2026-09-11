import { Barbell, ChartLine, Repeat, UserCircle } from '../ui/Icons';

export type Screen = 'home' | 'workout' | 'history' | 'progression' | 'settings';

interface BottomNavProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

export function BottomNav({ currentScreen, onNavigate }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      <button
        type="button"
        aria-label="Séances"
        aria-current={currentScreen === 'home' ? 'page' : undefined}
        className={currentScreen === 'home' ? 'active' : ''}
        onClick={() => onNavigate('home')}
      >
        <Barbell size={21} />
        <span>Séances</span>
      </button>
      <button
        type="button"
        aria-label="Progression"
        aria-current={currentScreen === 'progression' ? 'page' : undefined}
        className={currentScreen === 'progression' ? 'active' : ''}
        onClick={() => onNavigate('progression')}
      >
        <ChartLine size={21} />
        <span>Progression</span>
      </button>
      <button
        type="button"
        aria-label="Historique"
        aria-current={currentScreen === 'history' ? 'page' : undefined}
        className={currentScreen === 'history' ? 'active' : ''}
        onClick={() => onNavigate('history')}
      >
        <Repeat size={21} />
        <span>Historique</span>
      </button>
      <button
        type="button"
        aria-label="Profil"
        aria-current={currentScreen === 'settings' ? 'page' : undefined}
        className={currentScreen === 'settings' ? 'active' : ''}
        onClick={() => onNavigate('settings')}
      >
        <UserCircle size={21} />
        <span>Profil</span>
      </button>
    </nav>
  );
}
