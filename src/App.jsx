function App() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center p-10 bg-slate-800 rounded-3xl border border-slate-700 shadow-2xl">
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">
          SILYANKA READY
        </h1>
        <p className="text-slate-400 mt-4 font-mono">Tailwind CSS + Vite 7 + React</p>
        <div className="mt-6 flex gap-2 justify-center">
          <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 rounded-full text-sm border border-cyan-500/20">Speed</span>
          <span className="px-3 py-1 bg-fuchsia-500/10 text-fuchsia-400 rounded-full text-sm border border-fuchsia-500/20">Design</span>
        </div>
      </div>
    </div>
  )
}

export default App