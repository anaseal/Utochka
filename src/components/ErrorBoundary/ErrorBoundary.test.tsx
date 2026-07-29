// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

const Bomb = () => {
  throw new Error('boom');
};

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it('рендерит детей, пока ошибок не было', () => {
  render(
    <ErrorBoundary>
      <div>content</div>
    </ErrorBoundary>,
  );
  expect(screen.getByText('content')).toBeTruthy();
});

describe('после падения дочернего компонента', () => {
  const renderWithBomb = () => {
    // React сам шумит в консоль при перехваченной ошибке — тест проверяет
    // поведение ErrorBoundary, а не факт наличия этого лога.
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
  };

  it('показывает fallback-экран вместо пустого дерева', () => {
    renderWithBomb();
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Something went wrong')).toBeTruthy();
  });

  it('кнопка "Reload page" перезагружает страницу без очистки localStorage', () => {
    localStorage.setItem('silyanka:designMap', JSON.stringify({ 'node-0-0': '#ff0000' }));
    const reload = vi.spyOn(window.location, 'reload').mockImplementation(() => {});
    renderWithBomb();

    fireEvent.click(screen.getByText('Reload page'));

    expect(reload).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('silyanka:designMap')).not.toBeNull();
  });

  it('кнопка сброса без подтверждения ничего не стирает и не перезагружает', () => {
    localStorage.setItem('silyanka:designMap', JSON.stringify({ 'node-0-0': '#ff0000' }));
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const reload = vi.spyOn(window.location, 'reload').mockImplementation(() => {});
    renderWithBomb();

    fireEvent.click(screen.getByText('Reset data and start over'));

    expect(reload).not.toHaveBeenCalled();
    expect(localStorage.getItem('silyanka:designMap')).not.toBeNull();
  });

  it('кнопка сброса с подтверждением стирает свои ключи, чужие не трогает, и перезагружает', () => {
    localStorage.setItem('silyanka:designMap', JSON.stringify({ 'node-0-0': '#ff0000' }));
    localStorage.setItem('some-other-app:token', 'secret');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const reload = vi.spyOn(window.location, 'reload').mockImplementation(() => {});
    renderWithBomb();

    fireEvent.click(screen.getByText('Reset data and start over'));

    expect(localStorage.getItem('silyanka:designMap')).toBeNull();
    expect(localStorage.getItem('some-other-app:token')).toBe('secret');
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
