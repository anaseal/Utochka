// src/config/theme.ts
export const BEAD_THEME = {
  colors: {
    node: '#22d3ee',
    span: '#e879f9',
    selected: '#ffffff',
  },
  sizes: {
    nodeRadius: 5,
    spanRadius: 3.5,
    strokeWidth: 2,
  },
  // Добавляем этот блок, если его нет
  animations: {
    standard: 'transition-all duration-300 ease-in-out',
  },
  effects: {
    nodeShadow: 'drop-shadow(0 0 8px rgba(34, 211, 238, 0.8))',
    // Если ты хочешь держать переход здесь, добавь его:
    transition: 'all 0.3s ease-in-out', 
  }
};