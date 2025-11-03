
import React, 'react';
import { User, AuthenticatedUser } from './types';
import Landing from './components/Landing';
import Slideshow from './components/Slideshow';
import LoadingSpinner from './components/LoadingSpinner';
import Dashboard from './components/Dashboard';

type AppState = 'initialLoading' | 'loggedOut' | 'loggedIn' | 'fetchingMutuals' | 'slideshow' | 'error';

const App: React.FC = () => {
  const [appState, setAppState] = React.useState<AppState>('initialLoading');
  const [user, setUser] = React.useState<AuthenticatedUser | null>(null);
  const [mutuals, setMutuals] = React.useState<User[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  // Check login status on initial load
  React.useEffect(() => {
    const checkUser = async () => {
      try {
        const res = await fetch('/api/me');
        if (res.ok) {
          const userData: AuthenticatedUser = await res.json();
          setUser(userData);
          setAppState('loggedIn');
        } else {
          setAppState('loggedOut');
        }
      } catch (e) {
        setAppState('loggedOut');
      }
    };
    checkUser();
  }, []);

  const handleFindMutuals = React.useCallback(async () => {
    if (!user) return;
    setAppState('fetchingMutuals');
    setError(null);
    try {
      const res = await fetch('/api/mutuals');
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch mutuals.');
      }
      
      const fetchedMutuals: User[] = await res.json();
      if (fetchedMutuals.length === 0) {
        setError(`Couldn't find any mutuals for @${user.username}. This can happen if the API is busy or if you have no mutuals.`);
        setAppState('error');
        return;
      }
      setMutuals(fetchedMutuals);
      setAppState('slideshow');
    } catch (e: any) {
      setError(e.message || 'An unexpected error occurred. Please try again later.');
      setAppState('error');
    }
  }, [user]);

  const handleTryAgain = () => {
    setAppState('loggedIn');
    setError(null);
  };
  
  const handleReset = () => {
     window.location.href = '/api/logout';
  };

  const renderContent = () => {
    switch (appState) {
      case 'initialLoading':
        return <LoadingSpinner text="Checking session..." />;
      case 'loggedOut':
        return <Landing />;
      case 'loggedIn':
        return user ? <Dashboard user={user} onFindMutuals={handleFindMutuals} /> : <LoadingSpinner />;
      case 'fetchingMutuals':
         return <LoadingSpinner text={`Finding mutuals for @${user?.username}...`} />;
      case 'slideshow':
        return <Slideshow mutuals={mutuals} onReset={handleReset} />;
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
             <button
              onClick={handleReset}
              className="mt-6 text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Logout
            </button>
          </div>
        );
      default:
        return <Landing />;
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
