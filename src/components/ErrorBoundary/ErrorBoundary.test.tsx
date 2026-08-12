// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

const Bomb = () => {
  throw new Error('boom');
};

// Обе кнопки экрана падения дёргают location.reload. Спаем не обойтись:
// reload у jsdom живёт на прототипе Location и не всегда перезаписывается,
// поэтому подменяется весь window.location — он configurable — и
// возвращается на место после каждого теста.
const originalLocation = window.location;

const stubReload = () => {
  const reload = vi.fn();
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { ...originalLocation, href: originalLocation.href, reload },
  });
  return reload;
};

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: originalLocation,
  });
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
    const reload = stubReload();
    renderWithBomb();

    fireEvent.click(screen.getByText('Reload page'));

    expect(reload).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('silyanka:designMap')).not.toBeNull();
  });

  it('первый клик по сбросу только спрашивает — ничего не стирает и не перезагружает', () => {
    localStorage.setItem('silyanka:designMap', JSON.stringify({ 'node-0-0': '#ff0000' }));
    const reload = stubReload();
    renderWithBomb();

    fireEvent.click(screen.getByText('Reset data and start over'));

    expect(screen.getByText('Reset everything')).toBeTruthy();
    expect(reload).not.toHaveBeenCalled();
    expect(localStorage.getItem('silyanka:designMap')).not.toBeNull();
  });

  it('отмена подтверждения возвращает экран в исходный вид и данные не трогает', () => {
    localStorage.setItem('silyanka:designMap', JSON.stringify({ 'node-0-0': '#ff0000' }));
    const reload = stubReload();
    renderWithBomb();

    fireEvent.click(screen.getByText('Reset data and start over'));
    fireEvent.click(screen.getByText('Cancel'));

    expect(screen.queryByText('Reset everything')).toBeNull();
    expect(screen.getByText('Reset data and start over')).toBeTruthy();
    expect(reload).not.toHaveBeenCalled();
    expect(localStorage.getItem('silyanka:designMap')).not.toBeNull();
  });

  it('подтверждение стирает свои ключи, чужие не трогает, и перезагружает', () => {
    localStorage.setItem('silyanka:designMap', JSON.stringify({ 'node-0-0': '#ff0000' }));
    localStorage.setItem('app:welcomeSeen', 'true');
    localStorage.setItem('some-other-app:token', 'secret');
    const reload = stubReload();
    renderWithBomb();

    fireEvent.click(screen.getByText('Reset data and start over'));
    fireEvent.click(screen.getByText('Reset everything'));

    expect(localStorage.getItem('silyanka:designMap')).toBeNull();
    expect(localStorage.getItem('app:welcomeSeen')).toBeNull();
    expect(localStorage.getItem('some-other-app:token')).toBe('secret');
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
