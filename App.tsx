
import React from 'react';
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
        setError(`Couldn't find any mutuals for @${user.username}. This can happen if you have no mutuals or if the X API is busy.`);
        setAppState('error');
        return;
      }
      setMutuals(fetchedMutuals);
      setAppState('slideshow');
    } catch (e: any) {
      let errorMessage = e.message || 'An unexpected error occurred. Please try again later.';
      if (errorMessage.includes('must use keys and tokens from a Twitter developer App that is attached to a Project')) {
          errorMessage = "It looks like your X Developer App isn't configured correctly.\n\nPlease ensure your App is attached to a Project in the X Developer Portal to get the necessary API access.";
      }
      setError(errorMessage);
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
        const isApiConfigError = error?.includes("attached to a Project");
        return (
          <div className="text-center w-full max-w-lg bg-gray-800 p-8 rounded-lg border border-red-500/50 shadow-2xl">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Something went wrong</h2>
            <p className="text-gray-300 mb-6 whitespace-pre-wrap">{error}</p>
            
            {isApiConfigError && (
                 <a
                    href="https://developer.twitter.com/en/portal/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-6 group relative inline-flex items-center justify-center px-8 py-3 bg-white text-black font-bold rounded-full overflow-hidden transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-blue-500/50"
                >
                    <span className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                    <span className="relative">Go to X Developer Portal</span>
                </a>
            )}
    
            <div className="flex items-center justify-center space-x-4">
                <button
                  onClick={handleTryAgain}
                  className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
                 <button
                  onClick={handleReset}
                  className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Logout
                </button>
            </div>
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