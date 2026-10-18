import { Barbell, ChartLine, Gear, Repeat, UserCircle } from '../ui/Icons';

export type Screen =
  | 'home'
  | 'workout'
  | 'history'
  | 'progression'
  | 'settings'
  | 'loads'
  /** Suivi hebdomadaire : saisie du samedi et historique des semaines. */
  | 'followup'
  /** Bilan imprimable d'une semaine, destiné au coach. */
  | 'bilan';

interface BottomNavProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
}

/** Returns the primary navigation destination that owns a contextual screen. */
export function navigationParent(screen: Screen): Screen {
  switch (screen) {
    case 'followup':
    case 'bilan':
      return 'progression';
    default:
      return screen;
  }
}

const navItems = [
  { screen: 'loads' as const, label: 'Charges', Icon: Gear },
  { screen: 'home' as const, label: 'Séances', Icon: Barbell },
  { screen: 'progression' as const, label: 'Progression', Icon: ChartLine },
  { screen: 'history' as const, label: 'Historique', Icon: Repeat },
  { screen: 'settings' as const, label: 'Profil', Icon: UserCircle },
];

export function BottomNav({ currentScreen, onNavigate }: BottomNavProps) {
  const activeScreen = navigationParent(currentScreen);

  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      {navItems.map(({ screen, label, Icon }) => (
        <button
          key={screen}
          type="button"
          aria-label={label}
          aria-current={activeScreen === screen ? 'page' : undefined}
          className={activeScreen === screen ? 'active' : ''}
          onClick={() => onNavigate(screen)}
        >
          <Icon size={21} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
