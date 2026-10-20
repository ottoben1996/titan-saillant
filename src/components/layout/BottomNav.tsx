import { Calendar, ChartLine, Person, Rings } from '../ui/Icons';

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
  | 'bilan'
  /** Revue imprimable des huit dernières semaines. */
  | 'block';

interface BottomNavProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  /** Pastille discrète sur un onglet : quelque chose y attend la personne. */
  badges?: Partial<Record<Screen, boolean>>;
}

/** Returns the primary navigation destination that owns a contextual screen. */
export function navigationParent(screen: Screen): Screen {
  switch (screen) {
    case 'history':
    case 'followup':
    case 'bilan':
    case 'block':
      return 'progression';
    default:
      return screen;
  }
}

const navItems = [
  { screen: 'home' as const, label: 'Aujourd’hui', Icon: Rings },
  { screen: 'loads' as const, label: 'Programme', Icon: Calendar },
  { screen: 'progression' as const, label: 'Progrès', Icon: ChartLine },
  { screen: 'settings' as const, label: 'Profil', Icon: Person },
];

export function BottomNav({ currentScreen, onNavigate, badges }: BottomNavProps) {
  const activeScreen = navigationParent(currentScreen);

  return (
    <nav className="bottom-nav verre" aria-label="Navigation principale">
      {navItems.map(({ screen, label, Icon }) => {
        const active = activeScreen === screen;
        const badge = badges?.[screen] === true;
        return (
          <button
            key={screen}
            type="button"
            aria-current={active ? 'page' : undefined}
            className={active ? 'active' : ''}
            onClick={() => onNavigate(screen)}
          >
            <span className="bottom-nav-icone" aria-hidden="true">
              <Icon size={24} />
              {badge && <span className="bottom-nav-pastille" />}
            </span>
            <span className="bottom-nav-libelle">{label}</span>
            {badge && <span className="sr-only">, action en attente</span>}
          </button>
        );
      })}
    </nav>
  );
}
