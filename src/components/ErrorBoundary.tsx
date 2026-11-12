import { Component, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

/** A render crash must never lose the vote: the session is persisted, so offer a reload. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="screen screen-center" style={{ gap: 14 }}>
        <h1 className="display" style={{ fontSize: 30 }}>
          Algo ha fallado
        </h1>
        <p className="muted" style={{ margin: 0, maxWidth: 420 }}>
          Los votos y propuestas están guardados en este móvil. Recarga para continuar donde lo dejasteis.
        </p>
        <button className="btn btn-gold btn-lg" onClick={() => location.reload()}>
          Recargar
        </button>
      </div>
    );
  }
}
