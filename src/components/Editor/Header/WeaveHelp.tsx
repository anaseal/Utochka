import { useEffect, useRef, useState } from 'react';
import {
  HelpCircle, Diamond, MousePointerClick, Eraser, Crosshair, Undo2, RotateCcw, FlipHorizontal,
} from 'lucide-react';
import './WeaveHelp.css';

// Короткая инструкция к режиму плетения — пузырёк из кнопки «?» в хедере,
// а не модалка: режим и так занимает весь экран, а подсказку читают одним
// глазом, не прерывая работу. Открытие/закрытие — как у MirrorMenu
// (клик снаружи + Escape), текст английский, как и весь UI.
export const WeaveHelp = ({ technique }: { technique: 'silyanka' | 'crossWeave' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="weave-help" ref={ref}>
      <button
        ref={triggerRef}
        onClick={() => setOpen(o => !o)}
        className={`grid-controls__btn ${open ? 'grid-controls__btn--on' : ''}`}
        title="How this mode works"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <HelpCircle size={13} />
      </button>

      {open && (
        <div className="weave-help__bubble" role="dialog" aria-label="How weaving mode works">
          <p className="weave-help__lead">
            Mark what you have already woven. The app never tells you what to weave next —
            you follow your own pattern, it only remembers where you stopped.
            Marked beads go dim, bright ones are still ahead.
          </p>

          <h4 className="weave-help__title">Marking</h4>
          <ul className="weave-help__list">
            <li>
              <Diamond size={12} className="weave-help__icon" />
              <span>
                <b>Segment</b> — one click marks a whole step, not one bead.
                {technique === 'silyanka' ? (
                  <> A step is one pass of the thread: a node, the two edges going down from it
                    and the nodes they reach. Click any bead of it — the node or a bead in an edge.</>
                ) : (
                  <> A step is one cross of four beads. Click the bead that <b>finishes</b> the
                    cross: the right one while you weave sideways, the bottom one once you turn
                    downwards. Beads already marked stay as they are, so a new cross adds only
                    the 2–3 beads you have just picked up.</>
                )}
              </span>
            </li>
            <li>
              <MousePointerClick size={12} className="weave-help__icon" />
              <span><b>Bead</b> — one bead per click, for anything a step does not cover.</span>
            </li>
            <li>
              <Eraser size={12} className="weave-help__icon" />
              <span><b>Erase</b> — takes marks off again.</span>
            </li>
          </ul>
          <p className="weave-help__note">
            Hold and drag across the canvas to mark several in one go — the whole drag counts
            as a single step back.
          </p>

          <h4 className="weave-help__title">Keeping your place</h4>
          <ul className="weave-help__list">
            <li>
              <span className="weave-help__icon weave-help__icon--text">%</span>
              <span><b>Woven</b> — how many beads are marked out of the whole piece.</span>
            </li>
            <li>
              <Crosshair size={12} className="weave-help__icon" />
              <span><b>Locate</b> — flashes a dashed frame around the last thing you marked.
                Press it when you come back to the work after a break.</span>
            </li>
            <li>
              <Undo2 size={12} className="weave-help__icon" />
              <span><b>Undo</b> — takes back the last marking. Progress has its own undo and
                never touches your drawing history.</span>
            </li>
            <li>
              <RotateCcw size={12} className="weave-help__icon" />
              <span><b>Reset</b> — clears all marks and starts the piece over.</span>
            </li>
          </ul>

          <h4 className="weave-help__title">Turning the piece</h4>
          <ul className="weave-help__list">
            <li>
              <span className="weave-help__icon weave-help__icon--text">↔</span>
              <span>Lay the piece across the screen or stand it upright — whichever way it lies
                in front of you.</span>
            </li>
            <li>
              <FlipHorizontal size={12} className="weave-help__icon" />
              <span>
                <b>Mirror</b> — flips it left to right, for weaving the other way round.
                {technique === 'silyanka' && ' It also switches the side each step takes, so the marks follow your hand.'}
              </span>
            </li>
          </ul>
          <p className="weave-help__note">
            Both only change how the piece lies in front of you — the design and the marks stay
            untouched. Drawing tools are hidden here, so nothing gets recoloured by accident.
          </p>

          <p className="weave-help__note">
            Progress saves itself and is still there when you come back. Silyanka and cross-weave
            each keep their own.
          </p>
        </div>
      )}
    </div>
  );
};
