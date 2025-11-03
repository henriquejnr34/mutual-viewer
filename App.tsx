
import React, { useState, useCallback } from 'react';
import { User, AuthenticatedUser } from './types';
import { getMutuals } from './services/xService';
import Landing from './components/Landing';
import Slideshow from './components/Slideshow';
import LoadingSpinner from './components/LoadingSpinner';
import Dashboard from './components/Dashboard';

type AuthState = 'loggedOut' | 'loggingIn' | 'loggedIn';
type SlideshowState = 'idle' | 'loading' | 'slideshow' | 'error';

const App: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>('loggedOut');
  const [slideshowState, setSlideshowState] = useState<SlideshowState>('idle');
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [mutuals, setMutuals] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = useCallback(() => {
    setAuthState('loggingIn');
    // In a real app, this would redirect to the X authentication page.
    // Here, we simulate the callback after a successful login.
    setTimeout(() => {
      setUser({
        id: 'mockuser123',
        name: 'Alex Doe',
        username: 'alex_the_dev',
        profileImageUrl: 'https://i.pravatar.cc/512?u=mockuser123',
      });
      setAuthState('loggedIn');
    }, 1500);
  }, []);

  const handleLogout = () => {
    setAuthState('loggedOut');
    setSlideshowState('idle');
    setUser(null);
    setMutuals([]);
    setError(null);
  };

  const handleFindMutuals = useCallback(async () => {
    if (!user) return;
    setSlideshowState('loading');
    setError(null);
    try {
      const fetchedMutuals = await getMutuals();
      if (fetchedMutuals.length === 0) {
        setError(`Couldn't find any mutuals for @${user.username}. Please try again later.`);
        setSlideshowState('error');
        return;
      }
      setMutuals(fetchedMutuals);
      setSlideshowState('slideshow');
    } catch (e) {
      setError('Failed to fetch mutuals. Our backend might be experiencing issues. Please try again later.');
      setSlideshowState('error');
    }
  }, [user]);

  const handleTryAgain = () => {
    setSlideshowState('idle');
    setError(null);
  };

  const renderContent = () => {
    switch (authState) {
      case 'loggingIn':
        return <LoadingSpinner text="Connecting your X account..." />;
      case 'loggedIn':
        if (!user) return null; // Should not happen
        switch (slideshowState) {
          case 'loading':
            return <LoadingSpinner text={`Finding mutuals for @${user.username}...`} />;
          case 'slideshow':
            return <Slideshow mutuals={mutuals} onReset={handleLogout} />;
          case 'error':
            return (
              <div className="text-center">
                <p className="text-red-400 mb-4">{error}</p>
                <button
                  onClick={handleTryAgain}
                  className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            );
          case 'idle':
          default:
            return <Dashboard user={user} onFindMutuals={handleFindMutuals} onLogout={handleLogout} />;
        }
      case 'loggedOut':
      default:
        return <Landing onLogin={handleLogin} />;
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <main className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
