import { useEffect, useRef, useState, Dispatch, SetStateAction } from 'react';

// Задержка перед фактической записью в localStorage — состояния вроде
// designMap меняются на каждую задетую бисерину при протяжке кисти;
// синхронный JSON.stringify+setItem на каждую из них блокировал main thread
// и вызывал подвисания при рисовании (тот же паттерн уже чинили точечно для
// pinch-zoom в useTouchPanZoom). Дебаунс схлопывает быстрый поток изменений
// в одну запись через паузу после последнего.
const PERSIST_DEBOUNCE_MS = 300;

export function usePersistedState<T>(
  key: string,
  initial: T,
  validate?: (value: unknown) => value is T,
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return initial;
      const parsed = JSON.parse(raw);
      if (validate && !validate(parsed)) return initial;
      return parsed as T;
    } catch {
      return initial;
    }
  });

  // Отложенная запись читает состояние на момент срабатывания таймера, а не на
  // момент подписки, — иначе дебаунс сохранял бы устаревший снимок.
  const latestStateRef = useRef(state);
  // eslint-disable-next-line react-hooks/refs -- свежее значение для таймера, см. выше
  latestStateRef.current = state;

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(latestStateRef.current));
      } catch { /* localStorage недоступен или переполнен — не критично */ }
    }, PERSIST_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [key, state]);

  return [state, setState];
}
