import { Component, type ErrorInfo, type ReactNode } from 'react';
import { enregistrerErreur } from '../../storage/journalErreurs';

/**
 * Filet de sécurité d'affichage.
 *
 * Sans lui, une erreur de rendu dans un écran laisse une page blanche et
 * l'utilisateur en salle n'a aucun moyen de reprendre sa séance. Les données
 * restent dans IndexedDB : ce garde-fou ne propose donc jamais d'effacer quoi
 * que ce soit, seulement de recharger proprement.
 */

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Erreur inattendue',
    };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    // Trace locale uniquement : aucune donnée ne quitte l'appareil. Le journal
    // la conserve pour qu'on puisse diagnostiquer après coup, sans serveur.
    const message = error instanceof Error ? error.message : String(error);
    enregistrerErreur(message, info.componentStack ?? 'rendu');
  }

  private reload = () => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="app-shell error-shell">
        <section className="error-panel" role="alert">
          <p className="eyebrow">ERREUR D’AFFICHAGE</p>
          <h1>L’écran n’a pas pu s’afficher.</h1>
          <p className="intro">
            Ta séance et ton historique sont enregistrés sur cet appareil, rien n’est perdu. Recharge l’application pour
            reprendre là où tu t’es arrêté.
          </p>
          <p className="error-detail">{this.state.message}</p>
          <button className="primary-button full" type="button" onClick={this.reload}>
            Recharger l’application
          </button>
        </section>
      </main>
    );
  }
}
