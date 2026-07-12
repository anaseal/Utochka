const API_URL = 'http://localhost:3001/api/generate-palette';

const hexToRgbTuple = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

// Каждый слот: либо 'N' (пусть Colormind сгенерирует), либо закреплённый hex-цвет —
// Colormind вернёт его без изменений и подберёт остальные слоты под него.
export async function generatePaletteFromColormind(locked: (string | null)[] = []): Promise<string[]> {
  const model = 'default';
  const input = Array.from({ length: 5 }, (_, i) => {
    const color = locked[i];
    return color ? hexToRgbTuple(color) : 'N';
  });

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, input }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = (await response.json()) as { result: number[][] };

    return data.result.map(([r, g, b]) =>
      '#' + [r, g, b].map(c => Math.round(c).toString(16).padStart(2, '0')).join('')
    );
  } catch (error) {
    console.error('Palette generation error:', error);
    throw error;
  }
}
