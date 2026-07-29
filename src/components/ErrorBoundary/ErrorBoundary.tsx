import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { clearOwnStorage } from '../../utils/projectFile';
import './ErrorBoundary.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// componentDidCatch ловит ошибки рендера только в классовых компонентах —
// хук-эквивалента у React нет.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught a render error:', error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  // Вторая кнопка — на случай, если падение вызвано не случайностью, а
  // испорченными данными в localStorage (например, некорректным размером
  // сетки): обычная перезагрузка в этом случае приводит к той же ошибке по
  // кругу, и единственный выход — стереть свои данные и начать заново.
  private handleReset = () => {
    if (!window.confirm('This will permanently delete your saved design and progress. Continue?')) {
      return;
    }
    clearOwnStorage();
    window.location.reload();
  };

  override render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="error-boundary" role="alert">
        <AlertTriangle size={40} className="error-boundary__icon" />
        <h1 className="error-boundary__title">Something went wrong</h1>
        <p className="error-boundary__text">
          Your work is saved in the browser and hasn't been lost. Try reloading the page.
        </p>
        <button type="button" className="error-boundary__button" onClick={this.handleReload}>
          Reload page
        </button>
        <button
          type="button"
          className="error-boundary__button error-boundary__button--reset"
          onClick={this.handleReset}
        >
          Reset data and start over
        </button>
      </div>
    );
  }
}
