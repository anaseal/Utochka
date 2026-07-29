import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
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
    console.error('ErrorBoundary поймал ошибку рендера:', error, info.componentStack);
  }

  override render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="error-boundary" role="alert">
        <AlertTriangle size={40} className="error-boundary__icon" />
        <h1 className="error-boundary__title">Что-то пошло не так</h1>
        <p className="error-boundary__text">
          Ваши данные сохранены в браузере и никуда не пропали. Попробуйте перезагрузить страницу.
        </p>
        <button
          type="button"
          className="error-boundary__button"
          onClick={() => window.location.reload()}
        >
          Перезагрузить страницу
        </button>
      </div>
    );
  }
}
