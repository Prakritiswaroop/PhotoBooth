import { useState } from 'react';
import { Camera, Sparkles, AlertCircle } from 'lucide-react';

export default function LandingPage({ onAuthSuccess, login, register, loginWithGoogle }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all credentials.');
      return;
    }

    if (isRegistering && !displayName) {
      setError('Please enter a display name.');
      return;
    }

    setLoading(true);
    try {
      if (isRegistering) {
        const user = await register(email, password, displayName);
        onAuthSuccess(user);
      } else {
        const user = await login(email, password);
        onAuthSuccess(user);
      }
    } catch (err) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const user = await loginWithGoogle();
      onAuthSuccess(user);
    } catch (err) {
      setError('Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-zinc-950 px-4 py-16 overflow-hidden">
      {/* Decorative Warm Vignette / Lights */}
      <div className="absolute inset-0 bg-radial-[circle_at_center,rgba(180,83,9,0.12)_0%,transparent_70%] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none" />

      {/* Main Theatre Ticket Container */}
      <div className="relative w-full max-w-md bg-stone-900 border-4 border-amber-600 rounded-3xl p-8 shadow-2xl animate-film-jitter">
        
        {/* Ticket Perforations (Left & Right Cutouts) */}
        <div className="absolute -left-5 top-1/2 -translate-y-1/2 w-10 h-10 bg-zinc-950 rounded-full border-r-4 border-amber-600" />
        <div className="absolute -right-5 top-1/2 -translate-y-1/2 w-10 h-10 bg-zinc-950 rounded-full border-l-4 border-amber-600" />

        {/* Outer dotted ticket line */}
        <div className="border border-dashed border-stone-700/60 rounded-xl p-6 flex flex-col items-center">
          
          {/* Carnival Bulb Title Header */}
          <div className="text-center mb-8 relative">
            <div className="flex justify-center gap-1.5 mb-3">
              {[...Array(9)].map((_, i) => (
                <div 
                  key={i} 
                  className={`w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b] ${
                    i % 2 === 0 ? 'animate-pulse' : 'opacity-70'
                  }`}
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>

            <h1 className="font-abril text-4xl sm:text-5xl text-amber-500 uppercase tracking-wide leading-none animate-neon-flicker">
              Flash & Fade
            </h1>
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-amber-600 mt-1">
              • PHOTOSTUDIO & BOOTH •
            </p>
          </div>

          {/* Ticket Header Tagline */}
          <div className="w-full text-center py-2.5 border-y border-stone-800 mb-6">
            <span className="font-serif italic text-amber-100/90 text-sm">
              "Step in. Strike a pose. Take a memory home."
            </span>
          </div>

          {/* Auth Card Content */}
          <div className="w-full">
            {error && (
              <div className="mb-4 p-3 bg-red-950/80 border border-red-800 text-red-200 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegistering && (
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 mb-1">
                    Your Stage Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Swarop"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg py-2 px-3 text-stone-200 text-sm font-mono focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@vintage.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg py-2 px-3 text-stone-200 text-sm font-mono focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 mb-1">
                  Secret Passcode
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg py-2 px-3 text-stone-200 text-sm font-mono focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-stone-950 font-serif font-bold text-base py-2.5 px-4 rounded-xl shadow-lg border border-amber-500 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>{isRegistering ? 'Issue My Ticket' : 'Enter the Booth'}</span>
                  </>
                )}
              </button>
            </form>

            {/* Form Toggle Divider */}
            <div className="relative flex py-5 items-center">
              <div className="flex-grow border-t border-stone-800"></div>
              <span className="flex-shrink mx-3 text-[10px] font-mono uppercase tracking-widest text-stone-500">OR</span>
              <div className="flex-grow border-t border-stone-800"></div>
            </div>

            {/* Quick Demo Google Sign In */}
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-stone-950 hover:bg-stone-900 border border-stone-800 hover:border-amber-700/60 active:scale-[0.98] text-stone-300 font-mono text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-3"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Instant Google Entry (Demo)</span>
            </button>

            {/* Toggle Link */}
            <div className="text-center mt-6">
              <button
                onClick={() => {
                  setError('');
                  setIsRegistering(!isRegistering);
                }}
                className="text-amber-600 hover:text-amber-500 font-mono text-xs underline cursor-pointer"
              >
                {isRegistering
                  ? "Already have a ticket? Step inside"
                  : "Don't have a ticket? Register here"}
              </button>
            </div>

          </div>

          {/* Ticket Footer details */}
          <div className="w-full mt-6 pt-4 border-t border-dashed border-stone-800/80 text-center flex justify-between items-center text-[9px] font-mono text-stone-500 uppercase tracking-wider">
            <span>NO. 0626-70</span>
            <span className="flex items-center gap-1"><Sparkles className="w-2.5 h-2.5 text-amber-600" /> VINTAGE KODAK SOUL</span>
            <span>PRICE: 10¢</span>
          </div>

        </div>
      </div>
    </div>
  );
}
