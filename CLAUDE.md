# CLAUDE.md

## Commands
- `npm run dev` / `npm run build` / `npm run lint`

> Domain reference: [src/spec.md](src/spec.md) — comprehensive Russian-language spec (domain model, all features, numeric constants). Read it for non-trivial work.

## Project Overview
Parametric SVG editor for **silyanka** (beaded net jewelry). Simulates physical weaving geometry instead of a pixel grid.

## Domain Model
- **Two bead types** ([src/types/bead.ts](src/types/bead.ts)): `NODE` (structural) and `SPAN` (filler).
- **Grid geometry**: Alternating even/odd rows (shifted +50% stepX) create diamond cells.
- **Top Row (r=0)**: Special horizontal edge chain.
- **Design Map**: `Record<string, string>` (bead.id → color). State is decoupled from geometry.
- **Span-row index encoding**: `r % 2 === 0 ? bottomSpan : topSpan` (even = ножки/legs, odd = плечи/shoulders). Centralised in [src/utils/spans.ts](src/utils/spans.ts) (`resolveSpanCount`, `clampSpan`) — used by `generator.ts`, `App.tsx`, and `CanvasRulers`.

## Architecture
- [src/utils/generator.ts](src/utils/generator.ts): Core algorithm. Builds `nodeGrid`, then interpolates `SPAN` beads.
- `useGrid`: Memoized wrapper for the generator.
- `useDrawing`: Drawing state + stroke-based Undo/Redo. Exposes `activeTool: 'pencil' | 'eraser'` — selecting any palette color resets tool to `pencil` (enforced in `Header.tsx`).
- `CanvasView`: SVG-based renderer using `BeadView` (circle with hitbox).
- `CanvasRulers`: row/col number labels **and** per-row span ± controls — the UI surface for `rowSpanOverrides`.
- `CanvasStats`: real-time material specification — total bead count + per-color breakdown built from `designMap`.

## Constraints & Shortcuts
- Span (top/bottom): **3–10**
- Zoom: **25%–300%, step 10%**
- History: **max 30 strokes** (stroke-level, not per-click; `clearAll` also snapshots)
- Keyboard: `Ctrl/Cmd+Z` undo, `Ctrl/Cmd+Y` or `Ctrl/Cmd+Shift+Z` redo
- Palette is hardcoded in [src/App.tsx](src/App.tsx); Header adds a custom-color picker (`<input type="color">`) and an EyeDropper button when `'EyeDropper' in window`.

## Important Notes
- **Styling**: Visual/geometry constants in [src/config/theme.ts](src/config/theme.ts). UI design tokens (`--color-page`, `--color-panel`, …) live as CSS variables in [src/index.css](src/index.css), not in theme.ts.
- **Tailwind v4** via `@import "tailwindcss"` in `index.css` + `@tailwindcss/postcss` — no `tailwind.config.js`.
- **Zoom**: CSS-based via `--canvas-zoom` and `transform: scale()`.
- **Constraints**: Horizontal step adapts to prevent top-row overlaps (`stepX = max(spacing * horizontalStepMultiplier, (internalTop + 1) * minBeadPitch)`).
