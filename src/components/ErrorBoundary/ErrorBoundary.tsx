import { Component, type ErrorInfo, type ReactNode } from 'react';
import { clearOwnStorage } from '../../utils/projectFile';
import './ErrorBoundary.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  confirmingReset: boolean;
}

// componentDidCatch ловит ошибки рендера только в классовых компонентах —
// хук-эквивалента у React нет.
//
// Экран падения намеренно не тянет ничего общего: ни Modal/Button, ни иконки
// из lucide. Если упало как раз в них, общий код утащил бы за собой и сам
// fallback, а падение внутри fallback'а React уже не ловит — он снимает всё
// дерево, и остаётся белый экран. Плата — своя разметка подтверждения вместо
// единого ConfirmDialog; здесь независимость важнее единообразия.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false, confirmingReset: false };

  static getDerivedStateFromError(): Pick<ErrorBoundaryState, 'hasError'> {
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
    this.setState({ confirmingReset: true });
  };

  private handleResetConfirmed = () => {
    clearOwnStorage();
    window.location.reload();
  };

  private handleResetCancelled = () => {
    this.setState({ confirmingReset: false });
  };

  override render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="error-boundary" role="alert">
        {/* Иконка нарисована здесь, а не взята из lucide, по той же причине,
            по которой ниже нет ConfirmDialog. Геометрия — lucide/triangle-alert,
            чтобы экран не выбивался из остального UI. */}
        <svg
          className="error-boundary__icon"
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
        <h1 className="error-boundary__title">Something went wrong</h1>
        <p className="error-boundary__text">
          Your work is saved in the browser and hasn't been lost. Try reloading the page.
        </p>
        <button type="button" className="error-boundary__button" onClick={this.handleReload}>
          Reload page
        </button>

        {this.state.confirmingReset ? (
          // Что именно стирается, названо точно: clearOwnStorage чистит
          // localStorage целиком по всем техникам и настройкам, но галерея
          // проектов и картинка референса лежат в IndexedDB и уцелеют.
          // Прежний текст («your saved design and progress») пугал сильнее,
          // чем есть, и одновременно умалчивал про соседние техники.
          <>
            <p className="error-boundary__text error-boundary__text--warning">
              This deletes your current work in every technique, along with app settings.
              Projects saved to the gallery and the reference image are kept.
            </p>
            <div className="error-boundary__confirm">
              <button
                type="button"
                className="error-boundary__button error-boundary__button--danger"
                onClick={this.handleResetConfirmed}
                autoFocus
              >
                Reset everything
              </button>
              <button
                type="button"
                className="error-boundary__button"
                onClick={this.handleResetCancelled}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            className="error-boundary__button error-boundary__button--reset"
            onClick={this.handleReset}
          >
            Reset data and start over
          </button>
        )}
      </div>
    );
  }
}
