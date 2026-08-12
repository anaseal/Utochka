import { useEffect, useRef, useState } from 'react';
import {
  HelpCircle, Diamond, MousePointerClick, Eraser, Crosshair, Undo2, RotateCcw, Percent, Maximize2,
} from 'lucide-react';
import { IconButton } from '../../common/IconButton';
import { Technique } from './Header.types';
import './WeaveHelp.css';

// Короткая инструкция к режиму плетения — пузырёк из кнопки «?» в хедере,
// а не модалка: режим и так занимает весь экран, а подсказку читают одним
// глазом, не прерывая работу. Открытие/закрытие — как у MirrorMenu
// (клик снаружи + Escape), текст английский, как и весь UI.
// Четыре ветки текста ниже — по одной на каждую технику (silyanka/loom/
// peyote/crossWeave), т.к. правило сегмента у каждой своё.
export const WeaveHelp = ({ technique, className }: { technique: Technique; className?: string }) => {
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
    <div className={`weave-help${className ? ` ${className}` : ''}`} ref={ref}>
      <IconButton
        ref={triggerRef}
        variant="chip"
        className="tool-btn"
        active={open}
        onClick={() => setOpen(o => !o)}
        title="How this mode works"
        aria-haspopup="dialog"
        aria-expanded={open}
        icon={<HelpCircle size={14} />}
      />

      {open && (
        <div className="weave-help__bubble u-scroll" role="dialog" aria-label="How weaving mode works">
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
                ) : technique === 'loom' ? (
                  <> A step is one whole row — one pass of the weft thread. Click any bead in
                    the row to mark it all at once.</>
                ) : technique === 'peyote' ? (
                  <> A step is one whole column — one pass of the thread. Click any bead in
                    the column to mark it all at once.</>
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
              <Percent size={12} className="weave-help__icon" />
              <span><b>Done</b> — how many beads are marked out of the whole piece.</span>
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
            <li>
              <Maximize2 size={12} className="weave-help__icon" />
              <span><b>Fullscreen</b> — hides the browser's own bars for more room, handy on a
                phone or tablet.</span>
            </li>
          </ul>
          <p className="weave-help__note">
            The rotate/flip button next to Zoom turns the piece the same way it lies in front of
            you — lay it flat, stand it up, mirror it left to right. It works here and while
            drawing, and only changes how the piece lies on screen: the design and the marks stay
            untouched.
            {technique === 'silyanka' && ' Mirroring also switches the side each step takes, so the marks follow your hand.'}
          </p>

          <p className="weave-help__note">
            Progress saves itself and is still there when you come back. Each technique that
            supports this mode keeps its own.
          </p>
        </div>
      )}
    </div>
  );
};
