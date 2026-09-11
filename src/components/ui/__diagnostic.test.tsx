import { it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProfileChooser } from '../screens/ProfileChooser';
import App from '../../App';

it('diagnostic', () => {
  const { unmount } = render(<ProfileChooser onChoose={() => {}} />);
  // eslint-disable-next-line no-console
  console.log(
    '[DIAG ProfileChooser] bouton ottman:',
    Boolean(screen.queryByRole('button', { name: /ottman/i }))
  );
  unmount();

  const { container } = render(<App />);
  console.log('[DIAG App] texte initial:', container.textContent?.replace(/\s+/g, ' ').slice(0, 300));
});
