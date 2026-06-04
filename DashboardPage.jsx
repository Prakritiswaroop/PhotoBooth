import { Camera, Image as ImageIcon, LogOut, Film } from 'lucide-react';

export default function DashboardPage({ user, onLogout, setPage }) {
  return (
    <div className="min-h-screen bg-aged-paper relative flex flex-col">
      {/* Coffee Stain 1 (Left) */}
      <div 
        className="absolute left-[10%] top-[25%] w-36 h-32 rounded-[40%_60%_70%_30%] border border-amber-900/5 rotate-[15deg] pointer-events-none"
        style={{
          boxShadow: 'inset 0 0 15px rgba(115, 60, 16, 0.03), 0 0 10px rgba(115, 60, 16, 0.02)'
        }}
      />
      {/* Coffee Stain 2 (Right Bottom) */}
      <div 
        className="absolute right-[12%] bottom-[15%] w-48 h-44 rounded-[50%_40%_60%_50%] border-2 border-dashed border-amber-900/[0.02] rotate-[-45deg] pointer-events-none"
        style={{
          boxShadow: 'inset 0 0 20px rgba(115, 60, 16, 0.04)'
        }}
      />

      {/* Film Strip Navigation Bar */}
      <nav className="film-strip-nav py-6 px-6 sm:px-12 flex justify-between items-center text-vintage-cream z-10">
        <div className="flex items-center gap-3 select-none">
          <Film className="w-6 h-6 text-amber-500 animate-pulse" />
          <span className="font-abril text-2xl tracking-wider text-amber-500 hover:scale-105 transition-transform cursor-pointer" onClick={() => setPage('home')}>
            Flash & Fade
          </span>
        </div>

        {/* User Info & Navigation Actions */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2.5">
            <img 
              src={user.photoURL} 
              alt={user.displayName} 
              className="w-8 h-8 rounded-full border border-amber-500 bg-stone-900"
            />
            <span className="font-mono text-xs hidden sm:inline text-amber-200">
              {user.displayName}
            </span>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 font-mono text-xs bg-red-950/40 hover:bg-red-950/70 text-red-300 border border-red-900/40 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            title="Log Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Step Out</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col items-center justify-center p-6 text-center max-w-4xl mx-auto w-full z-10">
        
        {/* Welcome Headline */}
        <div className="mb-12 animate-film-jitter">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-vintage-gold font-bold">
            WELCOME TO THE SHOW
          </span>
          <h2 className="font-serif font-extrabold text-4xl sm:text-6xl text-vintage-charcoal mt-3 leading-tight">
            Hello, {user.displayName} —
            <span className="block italic font-normal text-amber-800">
              Ready for your close-up?
            </span>
          </h2>
          <div className="w-24 h-1 bg-vintage-gold/30 mx-auto mt-6 rounded-full" />
        </div>

        {/* Action CTAs Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl px-4">
          
          {/* CTA 1: Open Booth */}
          <button
            onClick={() => setPage('booth')}
            className="group flex flex-col items-center justify-center p-8 bg-[#fdfbf7] hover:bg-white border-2 border-vintage-charcoal rounded-2xl shadow-[6px_6px_0px_#2c2523] hover:shadow-[10px_10px_0px_#2c2523] active:translate-x-1 active:translate-y-1 active:shadow-[2px_2px_0px_#2c2523] transition-all cursor-pointer text-left"
          >
            <div className="w-16 h-16 rounded-full bg-amber-100 group-hover:bg-amber-200 text-amber-600 flex items-center justify-center mb-6 border-2 border-vintage-charcoal transition-colors">
              <Camera className="w-8 h-8" />
            </div>
            <h3 className="font-serif font-bold text-2xl text-vintage-charcoal mb-2">
              Open Booth
            </h3>
            <p className="font-mono text-xs text-stone-600 leading-relaxed text-center">
              Fire up the lens, pick your template format, and capture some retro snapshots!
            </p>
          </button>

          {/* CTA 2: My Gallery */}
          <button
            onClick={() => setPage('gallery')}
            className="group flex flex-col items-center justify-center p-8 bg-[#fdfbf7] hover:bg-white border-2 border-vintage-charcoal rounded-2xl shadow-[6px_6px_0px_#2c2523] hover:shadow-[10px_10px_0px_#2c2523] active:translate-x-1 active:translate-y-1 active:shadow-[2px_2px_0px_#2c2523] transition-all cursor-pointer text-left"
          >
            <div className="w-16 h-16 rounded-full bg-stone-100 group-hover:bg-stone-200 text-vintage-charcoal flex items-center justify-center mb-6 border-2 border-vintage-charcoal transition-colors">
              <ImageIcon className="w-8 h-8" />
            </div>
            <h3 className="font-serif font-bold text-2xl text-vintage-charcoal mb-2">
              My Gallery
            </h3>
            <p className="font-mono text-xs text-stone-600 leading-relaxed text-center">
              Browse your library of printed polaroids, download files, or clear memories.
            </p>
          </button>

        </div>

        {/* Sub-notice */}
        <p className="mt-16 font-mono text-[10px] uppercase text-stone-500 tracking-wider">
          • Analog Emulation V1.0 • Browser Camera Required •
        </p>

      </main>
    </div>
  );
}
