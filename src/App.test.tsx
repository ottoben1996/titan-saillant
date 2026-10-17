import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders the profile chooser', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /choisis ton profil/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ottman/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /laura/i })).toBeInTheDocument();
  });
});
