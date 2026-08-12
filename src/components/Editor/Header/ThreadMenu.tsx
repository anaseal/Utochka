import { useState } from 'react';
import { X } from 'lucide-react';
import { ThreadIcon } from './icons';
import { ThreadStyleFields } from './ThreadStyleFields';
import { IconButton } from '../../common/IconButton';
import { Menu } from '../../common/Menu';
import { THREAD_STRAND_DEFAULT_COLORS } from '../../../config/theme';
import { DrawingTool } from '../../../hooks/useDrawing';
import { Thread } from '../../../types/thread';

// Кнопка «Нитка» у крестика — не простой тоггл, а мини-попап с выбором одной
// из двух нитей (крестик физически плетётся двумя нитками одновременно,
// см. spec.md, «Нитка»): клик по пункту сразу и выбирает нить, и включает
// инструмент. Единственное меню хедера с хвостом под пунктами (children у
// <Menu>): цвет и прозрачность кисти — не строка «иконка + подпись», пунктом
// их не выразить.
export const ThreadMenu = ({
  activeTool, setActiveTool, activeThreadStrand, onSelectThreadStrand, threads, onClearAllThreads,
  activeThreadColor, activeThreadOpacity, onThreadColorChange, onThreadOpacityChange,
}: {
  activeTool: DrawingTool;
  setActiveTool: (tool: DrawingTool) => void;
  activeThreadStrand: 1 | 2;
  onSelectThreadStrand: (strand: 1 | 2) => void;
  threads: Thread[];
  onClearAllThreads: () => void;
  activeThreadColor: string;
  activeThreadOpacity: number;
  onThreadColorChange: (color: string) => void;
  onThreadOpacityChange: (opacity: number) => void;
}) => {
  const [open, setOpen] = useState(false);

  const selectStrand = (strand: 1 | 2) => {
    onSelectThreadStrand(strand);
    setActiveTool('thread');
    setOpen(false);
  };

  return (
    <Menu
      open={open}
      onClose={() => setOpen(false)}
      trigger={
        <>
          <IconButton
            variant="chip"
            className="tool-btn"
            active={activeTool === 'thread'}
            onClick={() => setOpen(o => !o)}
            title="Thread (1/2)"
            aria-haspopup="menu"
            aria-expanded={open}
            icon={<ThreadIcon size={14} />}
          />

          {/* Бейдж на углу кнопки, а не пункт меню: очистка видна и когда меню
              закрыто. Стоит после кнопки намеренно — <Menu> возвращает фокус
              по Escape на первый фокусируемый узел корня (см. Menu.tsx). */}
          {activeTool === 'thread' && threads.length > 0 && (
            <button
              onClick={onClearAllThreads}
              className="tool-btn-group__badge tool-btn-group__badge--cancel"
              title="Clear all threads"
            >
              <X size={9} />
            </button>
          )}
        </>
      }
      items={([1, 2] as const).map((strand) => ({
        icon: (
          <span
            style={{
              width: 10, height: 10, borderRadius: '50%', display: 'inline-block',
              background: THREAD_STRAND_DEFAULT_COLORS[strand],
            }}
          />
        ),
        label: `Thread ${strand}`,
        active: activeTool === 'thread' && activeThreadStrand === strand,
        title: `Thread ${strand} (${strand})`,
        onClick: () => selectStrand(strand),
      }))}
    >
      <div className="menu__divider" />
      <ThreadStyleFields
        color={activeThreadColor}
        opacity={activeThreadOpacity}
        onColorChange={onThreadColorChange}
        onOpacityChange={onThreadOpacityChange}
      />
    </Menu>
  );
};
