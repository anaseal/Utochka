import { Link2, Unlink2 } from 'lucide-react';
import { Stepper } from '../common/Stepper';
import { SectionHelp } from '../common/SectionHelp';
import { APP_CONSTRAINTS, BEAD_THEME } from '../../config/theme';
import { CROSS_WEAVE_THEME } from '../../config/crossWeaveTheme';
import { PEYOTE_THEME } from '../../config/peyoteTheme';
import { LOOM_THEME } from '../../config/loomTheme';
import { Taper } from '../../types/bead';
import './Sidebar.css';
import './GridSidebar.css';

interface SharedGridSidebarProps {
  open: boolean;
}

interface SilyankaGridSidebarProps {
  gridWidth: number;
  gridHeight: number;
  spacing: number;
  topSpan: number;
  bottomSpan: number;
  onWidthChange: (delta: number) => void;
  onHeightChange: (delta: number) => void;
  onSpacingChange: (delta: number) => void;
  onSetWidth?: (v: number) => void;
  onSetHeight?: (v: number) => void;
  onSetSpacing?: (v: number) => void;
  onTopSpanChange: (delta: number) => void;
  onBottomSpanChange: (delta: number) => void;
  onSetTopSpan?: (v: number) => void;
  onSetBottomSpan?: (v: number) => void;
  onTopEdgeReset: () => void;
  onBottomEdgeReset: () => void;
  topEdgeEnabled: boolean;
  onTopEdgeToggle: () => void;
  bottomEdgeEnabled: boolean;
  onBottomEdgeToggle: () => void;
  hasPendants: boolean;
  hasDecorTails: boolean;
  extendLeftEdge: boolean;
  extendRightEdge: boolean;
  onToggleExtendLeftEdge: () => void;
  onToggleExtendRightEdge: () => void;
  taper: Taper;
  taperRowsMax: number;
  taperDepthMax: number;
  onTaperRowsChange: (edge: 'top' | 'bottom', delta: number) => void;
  onSetTaperRows: (edge: 'top' | 'bottom', v: number) => void;
  onTaperSideReset: (edge: 'top' | 'bottom') => void;
  onTaperDepthChange: (delta: number) => void;
  onSetTaperDepth: (v: number) => void;
  onTaperDepthReset: () => void;
  taperRowsLinked: boolean;
  onToggleTaperRowsLinked: () => void;
  onResetAll: () => void;
  resetAllDisabled: boolean;
}

// Общий костяк панели «Grid» у crossWeave, Peyote и Loom — ни одна из них не
// знает про span/edges/taper/decor силянки, только размер сетки. Единый
// интерфейс, а не три дословно одинаковых (CrossWeaveGridSidebarProps/
// PeyoteGridSidebarProps/LoomGridSidebarProps), чтобы каждая новая техника
// не дублировала его снова.
interface BasicGridSidebarProps {
  gridWidth: number;
  gridHeight: number;
  spacing: number;
  onWidthChange: (delta: number) => void;
  onHeightChange: (delta: number) => void;
  onSpacingChange: (delta: number) => void;
  onSetWidth?: (v: number) => void;
  onSetHeight?: (v: number) => void;
  onSetSpacing?: (v: number) => void;
  onResetAll: () => void;
  resetAllDisabled: boolean;
}

type CrossWeaveGridSidebarProps = BasicGridSidebarProps;
type PeyoteGridSidebarProps = BasicGridSidebarProps;
type LoomGridSidebarProps = BasicGridSidebarProps;

type GridSidebarProps = SharedGridSidebarProps & (
  | { technique: 'silyanka'; silyankaProps: SilyankaGridSidebarProps; crossWeaveProps?: undefined; peyoteProps?: undefined; loomProps?: undefined }
  | { technique: 'crossWeave'; crossWeaveProps: CrossWeaveGridSidebarProps; silyankaProps?: undefined; peyoteProps?: undefined; loomProps?: undefined }
  | { technique: 'peyote'; peyoteProps: PeyoteGridSidebarProps; silyankaProps?: undefined; crossWeaveProps?: undefined; loomProps?: undefined }
  | { technique: 'loom'; loomProps: LoomGridSidebarProps; silyankaProps?: undefined; crossWeaveProps?: undefined; peyoteProps?: undefined }
);

export const GridSidebar = (props: GridSidebarProps) => {
  const { open } = props;
  const silyankaProps = props.technique === 'silyanka' ? props.silyankaProps : undefined;
  const crossWeaveProps = props.technique === 'crossWeave' ? props.crossWeaveProps : undefined;
  const peyoteProps = props.technique === 'peyote' ? props.peyoteProps : undefined;
  const loomProps = props.technique === 'loom' ? props.loomProps : undefined;
  // crossWeave, Peyote и Loom делят один интерфейс (BasicGridSidebarProps) —
  // вместо N-арного `? :` на каждом поле ниже, один merge и дальше двойной
  // `? :` (силянка / остальное), как было раньше.
  const basicProps = crossWeaveProps ?? peyoteProps ?? loomProps;

  const width = silyankaProps ? silyankaProps.gridWidth : basicProps!.gridWidth;
  const height = silyankaProps ? silyankaProps.gridHeight : basicProps!.gridHeight;
  const spacing = silyankaProps ? silyankaProps.spacing : basicProps!.spacing;
  const spacingConstraints = silyankaProps ? BEAD_THEME.constraints
    : crossWeaveProps ? CROSS_WEAVE_THEME.constraints
    : peyoteProps ? PEYOTE_THEME.constraints
    : LOOM_THEME.constraints;

  // Depth — общий пол ширины для активных сторон: пока обе стороны выключены
  // (rows=0), он не срезает ничего (см. taper.ts), поэтому степпер гасим, а не
  // оставляем крутиться вхолостую.
  const taperDepthEnabled = !!silyankaProps
    && (silyankaProps.taper.top.rows > 0 || silyankaProps.taper.bottom.rows > 0);
  const taperActive = taperDepthEnabled;

  return (
    <aside className={`sidebar${open ? ' sidebar--open' : ''}`}>
      <div className="sidebar__header">
        <h2 className="sidebar__title">Grid</h2>
      </div>

      <div className="sidebar__body">
        <section className="sidebar__section">
          <header className="sidebar__section-heading">
            <div className="sidebar__section-heading-row">
              <h3 className="sidebar__section-title">Size</h3>
              <SectionHelp text="Width, height, and spacing of the grid." />
            </div>
          </header>
          <div className="grid-sidebar__steppers">
            <Stepper
              label="Width"
              value={width}
              onDelta={silyankaProps ? silyankaProps.onWidthChange : basicProps!.onWidthChange}
              onSet={silyankaProps ? silyankaProps.onSetWidth : basicProps!.onSetWidth}
              inputValue={width}
              min={1}
              max={APP_CONSTRAINTS.maxGridWidth}
            />
            <Stepper
              label="Height"
              value={height}
              onDelta={silyankaProps ? silyankaProps.onHeightChange : basicProps!.onHeightChange}
              onSet={silyankaProps ? silyankaProps.onSetHeight : basicProps!.onSetHeight}
              inputValue={height}
              min={silyankaProps ? 2 : 1}
              max={APP_CONSTRAINTS.maxGridHeight}
            />
            <Stepper
              label="Spacing"
              value={spacing}
              onDelta={(s) => (silyankaProps
                ? silyankaProps.onSpacingChange(s * spacingConstraints.spacingStep)
                : basicProps!.onSpacingChange(s * spacingConstraints.spacingStep))}
              onSet={silyankaProps ? silyankaProps.onSetSpacing : basicProps!.onSetSpacing}
              inputValue={spacing}
              min={spacingConstraints.minSpacing}
              max={spacingConstraints.maxSpacing}
            />
          </div>
        </section>

        {silyankaProps && (
          <>
            <section className="sidebar__section">
              <header className="sidebar__section-heading">
                <div className="sidebar__section-heading-row">
                  <h3 className="sidebar__section-title">Edges</h3>
                  <SectionHelp text="Bead count on the top and bottom edge." />
                </div>
              </header>
              <div className="grid-sidebar__steppers">
                <Stepper
                  label="Top Edge"
                  value={silyankaProps.topSpan}
                  onDelta={silyankaProps.onTopSpanChange}
                  onReset={silyankaProps.onTopEdgeReset}
                  onSet={silyankaProps.onSetTopSpan}
                  inputValue={silyankaProps.topSpan}
                  min={3}
                  max={10}
                />
                <Stepper
                  label="Bottom Edge"
                  value={silyankaProps.bottomSpan}
                  onDelta={silyankaProps.onBottomSpanChange}
                  onReset={silyankaProps.onBottomEdgeReset}
                  onSet={silyankaProps.onSetBottomSpan}
                  inputValue={silyankaProps.bottomSpan}
                  min={3}
                  max={10}
                />
              </div>
            </section>

            <section className="sidebar__section">
              <header className="sidebar__section-heading">
                <div className="sidebar__section-heading-row">
                  <h3 className="sidebar__section-title">Taper</h3>
                  <SectionHelp text="Narrows the ends, like decreasing rows toward a cord." />
                </div>
              </header>

              <div className="grid-sidebar__subsection">
                <div className="sidebar__section-heading-row grid-sidebar__subheading">
                  <h4 className="sidebar__section-title">Rows</h4>
                  <button
                    type="button"
                    className="grid-sidebar__link-btn"
                    onClick={silyankaProps.onToggleTaperRowsLinked}
                    aria-pressed={silyankaProps.taperRowsLinked}
                    aria-label={silyankaProps.taperRowsLinked ? 'Unlink top/bottom rows' : 'Link top/bottom rows'}
                    title={silyankaProps.taperRowsLinked ? 'Top and bottom change together — click to unlink' : 'Link top and bottom to change together (both take the larger value)'}
                  >
                    {silyankaProps.taperRowsLinked ? <Link2 size={13} /> : <Unlink2 size={13} />}
                  </button>
                </div>
                <p className="grid-sidebar__hint">
                  How many rows that end takes to slope in. 0 leaves the end straight.
                </p>
                <div className="grid-sidebar__steppers">
                  <Stepper
                    label="Top"
                    value={silyankaProps.taper.top.rows}
                    onDelta={(d) => silyankaProps.onTaperRowsChange('top', d)}
                    onReset={() => silyankaProps.onTaperSideReset('top')}
                    onSet={(v) => silyankaProps.onSetTaperRows('top', v)}
                    inputValue={silyankaProps.taper.top.rows}
                    min={0}
                    max={silyankaProps.taperRowsMax}
                  />
                  <Stepper
                    label="Bottom"
                    value={silyankaProps.taper.bottom.rows}
                    onDelta={(d) => silyankaProps.onTaperRowsChange('bottom', d)}
                    onReset={() => silyankaProps.onTaperSideReset('bottom')}
                    onSet={(v) => silyankaProps.onSetTaperRows('bottom', v)}
                    inputValue={silyankaProps.taper.bottom.rows}
                    min={0}
                    max={silyankaProps.taperRowsMax}
                  />
                </div>
              </div>

              <div className="grid-sidebar__subsection grid-sidebar__subsection--divider">
                <div className="grid-sidebar__subheading">
                  <h4 className="sidebar__section-title">Depth</h4>
                </div>
                <p className="grid-sidebar__hint">
                  {taperDepthEnabled
                    ? 'How deep the narrowing goes: what stays cut off after the slope has run out, all along the piece. Counted in half columns — 2 takes off one whole column per side.'
                    : 'Depth only limits an active slope — set Rows above 0 on at least one end first.'}
                </p>
                <div className="grid-sidebar__steppers">
                  <Stepper
                    label="Depth"
                    value={silyankaProps.taper.depth}
                    onDelta={(d) => silyankaProps.onTaperDepthChange(d)}
                    onReset={silyankaProps.onTaperDepthReset}
                    onSet={(v) => silyankaProps.onSetTaperDepth(v)}
                    inputValue={silyankaProps.taper.depth}
                    min={0}
                    max={silyankaProps.taperDepthMax}
                    disabled={!taperDepthEnabled}
                  />
                </div>
              </div>

              {taperActive && (silyankaProps.hasPendants || silyankaProps.hasDecorTails) && (
                <p className="grid-sidebar__hint">
                  Pendants and tails on the columns the taper cuts away are hidden, not deleted —
                  lower Rows or Depth and they come back.
                </p>
              )}
            </section>

            <section className="sidebar__section">
              <header className="sidebar__section-heading">
                <div className="sidebar__section-heading-row">
                  <h3 className="sidebar__section-title">Top Chain</h3>
                  <SectionHelp text="Decorative row above the first row." />
                </div>
              </header>
              <div className="bottom-chain-control">
                <button
                  type="button"
                  className={`bottom-chain-control__toggle${silyankaProps.topEdgeEnabled ? ' bottom-chain-control__toggle--active' : ''}`}
                  onClick={silyankaProps.onTopEdgeToggle}
                  aria-pressed={silyankaProps.topEdgeEnabled}
                  aria-label="Toggle Top Chain"
                />
              </div>
            </section>

            <section className="sidebar__section">
              <header className="sidebar__section-heading">
                <div className="sidebar__section-heading-row">
                  <h3 className="sidebar__section-title">Bottom Chain</h3>
                  <SectionHelp text="Decorative row below the last row." />
                </div>
              </header>
              <div className="bottom-chain-control">
                <button
                  type="button"
                  className={`bottom-chain-control__toggle${silyankaProps.bottomEdgeEnabled ? ' bottom-chain-control__toggle--active' : ''}`}
                  onClick={silyankaProps.onBottomEdgeToggle}
                  aria-pressed={silyankaProps.bottomEdgeEnabled}
                  aria-label="Toggle Bottom Chain"
                  disabled={!silyankaProps.bottomEdgeEnabled && (silyankaProps.hasPendants || silyankaProps.hasDecorTails)}
                  title={!silyankaProps.bottomEdgeEnabled && (silyankaProps.hasPendants || silyankaProps.hasDecorTails) ? 'Clear pendants and tails to enable Bottom Chain' : undefined}
                />
                {!silyankaProps.bottomEdgeEnabled && (silyankaProps.hasPendants || silyankaProps.hasDecorTails) && (
                  <p className="bottom-chain-control__hint">
                    Clear pendants and tails (Pendants &amp; Decor panel) to enable Bottom Chain
                  </p>
                )}
              </div>
            </section>

            <section className="sidebar__section">
              <header className="sidebar__section-heading">
                <div className="sidebar__section-heading-row">
                  <h3 className="sidebar__section-title">Edge Extension</h3>
                  <SectionHelp text="Adds a full diamond shape at the edge." />
                </div>
              </header>
              <div className="edge-extension-control">
                <div className="edge-extension-control__row">
                  <span className="edge-extension-control__label">Left</span>
                  <button
                    type="button"
                    className={`bottom-chain-control__toggle${silyankaProps.extendLeftEdge ? ' bottom-chain-control__toggle--active' : ''}`}
                    onClick={silyankaProps.onToggleExtendLeftEdge}
                    aria-pressed={silyankaProps.extendLeftEdge}
                    aria-label="Toggle left edge extension"
                  />
                </div>
                <div className="edge-extension-control__row">
                  <span className="edge-extension-control__label">Right</span>
                  <button
                    type="button"
                    className={`bottom-chain-control__toggle${silyankaProps.extendRightEdge ? ' bottom-chain-control__toggle--active' : ''}`}
                    onClick={silyankaProps.onToggleExtendRightEdge}
                    aria-pressed={silyankaProps.extendRightEdge}
                    aria-label="Toggle right edge extension"
                  />
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      <div className="sidebar__footer">
        <button
          type="button"
          className="sidebar__clear"
          onClick={silyankaProps ? silyankaProps.onResetAll : basicProps!.onResetAll}
          disabled={silyankaProps ? silyankaProps.resetAllDisabled : basicProps!.resetAllDisabled}
        >
          Reset all
        </button>
      </div>
    </aside>
  );
};
