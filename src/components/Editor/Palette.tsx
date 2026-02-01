interface PaletteProps {
  palette: string[];
  activeColor: string;
  setActiveColor: (color: string) => void;
}

export const Palette = ({ palette, activeColor, setActiveColor }: PaletteProps) => {
  return (
    /* ТЗ №5: position: fixed гарантирует, что панель всегда сверху */
    <header className="fixed top-0 left-0 w-full h-16 bg-[#020617] border-b border-white/5 flex items-center justify-center z-50 shadow-2xl">
      <div className="flex gap-3 px-4 py-2 bg-zinc-900/50 rounded-full border border-white/5">
        {palette.map((color) => (
          <button
            key={color}
            onClick={() => setActiveColor(color)}
            className={`
              w-8 h-8 rounded-full transition-all duration-300 
              hover:scale-110 active:scale-90 cursor-pointer
              ${activeColor === color 
                ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-950 scale-110' 
                : 'opacity-50 hover:opacity-100'}
            `}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </header>
  );
};