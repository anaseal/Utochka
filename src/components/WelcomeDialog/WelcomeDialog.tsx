import { Pencil, SlidersHorizontal, ListChecks, FolderOpen } from 'lucide-react';
import { WeaveSwitchIcon } from '../Editor/Header/icons';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import './WelcomeDialog.css';

// Приветственное окно первого запуска: коротко о том, что это за редактор и
// с чего начать. Показывается ровно один раз (флаг app:welcomeSeen, см.
// useAppSettings.ts), дальше — только по кнопке «?» в хедере.
//
// Один экран со всеми разделами, а не тур по шагам: рассказывать нечего сверх
// пяти абзацев, а тур заставлял бы кликать Next ради текста, который целиком
// помещается на экран. Текст английский, как и весь UI (та же причина, что и
// у WeaveHelp — второй такой же обзорной подсказки, но для режима плетения:
// там про отметки прогресса, здесь про приложение целиком).
//
// Затемнение, панель, шапка с крестиком, подвал, Escape и клик по фону —
// общие для всех модалок проекта, они в <Modal> (layout="scroll": тело
// прокручивается, шапка и подвал закреплены). Класс .welcome оставлен на
// панели ради наследуемой типографики текста и селектора .welcome b.
export const WelcomeDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Beadlace"
      size="md"
      className="welcome"
      footer={(
        <>
          <span className="welcome__note">Reopen this any time from the <b>?</b> in the toolbar.</span>
          {/* Класс остаётся только ради места в подвале (не сжиматься, а на
              узком экране растянуться) — оформление целиком в <Button>. */}
          <Button variant="primary" className="welcome__start" onClick={onClose} autoFocus>
            Start designing
          </Button>
        </>
      )}
    >
      <p className="welcome__lead">
        Beadlace draws schemes for beaded jewellery. It is not a pixel grid: the app builds the
        weave itself, so every bead sits where the thread would really put it — change the size
        or the shape of the piece and the beads rearrange the way the real thing would.
      </p>

      <ul className="welcome__list">
        <li>
          <span className="welcome__icon"><WeaveSwitchIcon size={15} /></span>
          <span>
            <b>Pick a technique.</b> The switch at the left end of the toolbar: sylianka
            (net weave), RAW, peyote, loom. Each keeps its own work — come back to it and
            everything is where you left it.
          </span>
        </li>
        <li>
          <span className="welcome__icon"><Pencil size={14} /></span>
          <span>
            <b>Draw the pattern.</b> Take a colour from the palette, then click beads or drag
            across them. Eraser (E) clears, Fill (G) covers a whole area, Stamp (S) copies a
            piece of the pattern to put down again, Mirror keeps the two halves alike, and
            Ctrl+Z takes a step back. Techniques differ a little — the toolbar shows what the
            current one has.
          </span>
        </li>
        <li>
          <span className="welcome__icon"><SlidersHorizontal size={14} /></span>
          <span>
            <b>Shape the piece.</b> Grid settings on the right sets width, height and how tight
            the weave sits. Sylianka has a second panel next to it for pendants, chains, teeth
            and edge decor.
          </span>
        </li>
        <li>
          <span className="welcome__icon"><ListChecks size={14} /></span>
          <span>
            <b>Weave along.</b> When you sit down with the beads, turn on weave mode and mark
            what you have already woven. It never tells you what to weave next — it only
            remembers where you stopped.
          </span>
        </li>
        <li>
          <span className="welcome__icon"><FolderOpen size={14} /></span>
          <span>
            <b>Nothing gets lost.</b> Your work stays in the browser and is still here next
            time. Projects, at the top left, keeps named copies of it; you can also save it to
            a file or copy a link to share.
          </span>
        </li>
      </ul>
    </Modal>
  );
};
