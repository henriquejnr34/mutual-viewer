
import React, { useState, useCallback } from 'react';
import { User } from './types';
import { getMutuals } from './services/xService';
import Landing from './components/Landing';
import Slideshow from './components/Slideshow';
import LoadingSpinner from './components/LoadingSpinner';

type AppState = 'idle' | 'loading' | 'slideshow' | 'error';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('idle');
  const [mutuals, setMutuals] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFindMutuals = useCallback(async () => {
    setAppState('loading');
    setError(null);
    try {
      // Use the provided API key in the service call to simulate a real API request.
      const fetchedMutuals = await getMutuals('@naoerapaulo', '7w0mj24wrpM1xaKcatgmoUORA');
      if (fetchedMutuals.length === 0) {
        setError("Couldn't find any mutuals for @naoerapaulo. Please try again later.");
        setAppState('error');
        return;
      }
      setMutuals(fetchedMutuals);
      setAppState('slideshow');
    } catch (e) {
      setError('Failed to fetch mutuals. The X API might be down or the key is invalid.');
      setAppState('error');
    }
  }, []);

  const handleReset = () => {
    setAppState('idle');
    setMutuals([]);
    setError(null);
  };

  const renderContent = () => {
    switch (appState) {
      case 'loading':
        return <LoadingSpinner text="Finding mutuals for @naoerapaulo..." />;
      case 'slideshow':
        return <Slideshow mutuals={mutuals} onReset={handleReset} />;
      case 'error':
        return (
          <div className="text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={handleReset}
              className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        );
      case 'idle':
      default:
        return <Landing onFind={handleFindMutuals} />;
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
