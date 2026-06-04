import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import LandingPage from './components/LandingPage';
import DashboardPage from './components/DashboardPage';
import BoothPage from './components/BoothPage';
import GalleryPage from './components/GalleryPage';
import './App.css';

function App() {
  const { user, loading, login, register, loginWithGoogle, logout } = useAuth();
  const [page, setPage] = useState('home'); // 'home', 'booth', 'gallery'

  // If user state updates to null (logout) or is loaded, handle redirections
  useEffect(() => {
    if (!user) {
      setPage('landing');
    } else if (page === 'landing') {
      setPage('home');
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-amber-500 font-mono">
        <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-xs uppercase tracking-widest">Warming studio lamps...</span>
      </div>
    );
  }

  return (
    <>
      {/* Global Vintage Film Grain Moving Noise Overlay */}
      <div className="film-grain pointer-events-none" aria-hidden="true" />

      {/* Page router view */}
      {!user || page === 'landing' ? (
        <LandingPage
          onAuthSuccess={() => setPage('home')}
          login={login}
          register={register}
          loginWithGoogle={loginWithGoogle}
        />
      ) : (
        <>
          {page === 'home' && (
            <DashboardPage
              user={user}
              onLogout={logout}
              setPage={setPage}
            />
          )}

          {page === 'booth' && (
            <BoothPage
              user={user}
              setPage={setPage}
            />
          )}

          {page === 'gallery' && (
            <GalleryPage
              user={user}
              setPage={setPage}
            />
          )}
        </>
      )}
    </>
  );
}

export default App;
