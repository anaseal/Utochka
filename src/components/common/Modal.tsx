import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';
import './Modal.css';

export type ModalSize = 'sm' | 'md' | 'lg';
export type ModalLayout = 'scroll' | 'stack' | 'alert';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  size?: ModalSize;
  // scroll — шапка, прокручиваемое тело, необязательный подвал (приветственное
  // окно); stack — шапка есть, общего тела нет, содержимое встаёт колонкой
  // прямо в панели и заводит прокрутку себе само (галерея: полоса ошибки и
  // тулбар под шапкой уезжать не должны); alert — шапки-полосы нет вовсе,
  // заголовок идёт первой строкой содержимого (диалог подтверждения). Разбор
  // раскладок — Modal.css.
  layout?: ModalLayout;
  footer?: ReactNode;
  // Подпись крестика для screen reader'ов: у галереи это «Close project
  // gallery», в подсказке под курсором везде остаётся короткое «Close».
  closeLabel?: string;
  // Кладётся на панель, а не на затемнение: местам вызова он нужен под
  // раскладку и наследуемую типографику содержимого (.welcome).
  className?: string;
  children?: ReactNode;
}

// Стопка открытых модалок: Escape закрывает только верхнюю. Слушатель у каждой
// висит на document — фокус внутри окна не удерживается, ловить клавишу на
// самой панели нечем, — и без стопки Escape над диалогом подтверждения,
// открытым из галереи, закрыл бы заодно и галерею под ним.
const openModals: symbol[] = [];

// Общая оболочка модальных окон: затемнение, панель, шапка с крестиком, Escape
// и клик по фону. Три окна проекта (диалог подтверждения, приветственное окно,
// галерея проектов) держали это тремя копиями одного кода, которые успели
// разойтись в мелочах.
//
// useDismissablePopup сюда не подходит: тот сам владеет флагом open и
// закрывается по клику снаружи, а у модалки «снаружи» — собственное
// затемнение, и открытость задаёт место вызова.
export function Modal({
  open,
  onClose,
  title,
  size = 'md',
  layout = 'scroll',
  footer,
  closeLabel,
  className,
  children,
}: ModalProps) {
  const titleId = useId();

  // onClose читается через ref, а не стоит в зависимостях эффекта ниже: у мест
  // вызова это стрелка (`onClose={() => setOpen(false)}`), новая на каждый
  // рендер родителя. Иначе эффект перезапускался бы на чужом рендере и
  // переставлял окно на верх стопки, забирая Escape у открытого поверх него.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return undefined;
    const token = Symbol('modal');
    openModals.push(token);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (openModals[openModals.length - 1] !== token) return;
      onCloseRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      openModals.splice(openModals.indexOf(token), 1);
    };
  }, [open]);

  if (!open) return null;

  const isAlert = layout === 'alert';
  const panelClasses = ['modal', `modal--${size}`, `modal--${layout}`, className ?? '']
    .filter(Boolean)
    .join(' ');

  // Клик по затемнению гасится, а не только закрывает: диалог подтверждения
  // вызывается в том числе из галереи проектов, и без этого тот же клик всплыл
  // бы на её затемнение и закрыл заодно и её.
  return (
    <div
      className="modal__backdrop"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className={panelClasses}
        role={isAlert ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        {isAlert ? (
          <h2 className="modal__heading" id={titleId}>{title}</h2>
        ) : (
          <div className="modal__header">
            <h2 className="modal__title" id={titleId}>{title}</h2>
            <IconButton
              variant="chip"
              onClick={onClose}
              title="Close"
              aria-label={closeLabel ?? 'Close'}
              icon={<X size={16} />}
            />
          </div>
        )}

        {layout === 'scroll' ? <div className="modal__body u-scroll">{children}</div> : children}

        {footer && <div className="modal__footer">{footer}</div>}
      </div>
    </div>
  );
}
