
import React from 'react';
import { User, AuthenticatedUser } from './types';
import Landing from './components/Landing';
import Slideshow from './components/Slideshow';
import LoadingSpinner from './components/LoadingSpinner';
import Dashboard from './components/Dashboard';

type AppState = 'initialLoading' | 'loggedOut' | 'loggedIn' | 'fetchingInteractions' | 'slideshow' | 'error';

interface DiagnosisResult {
  status: 'OK' | 'CONFIG_ERROR' | 'ENV_VAR_MISSING' | 'ERROR';
  message: string;
}

const App: React.FC = () => {
  const [appState, setAppState] = React.useState<AppState>('initialLoading');
  const [user, setUser] = React.useState<AuthenticatedUser | null>(null);
  const [mutuals, setMutuals] = React.useState<User[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [isDiagnosing, setIsDiagnosing] = React.useState(false);
  const [diagnosis, setDiagnosis] = React.useState<DiagnosisResult | null>(null);

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

  const handleFindInteractions = React.useCallback(async () => {
    if (!user) return;
    setAppState('fetchingInteractions');
    setError(null);
    setDiagnosis(null);
    try {
      const res = await fetch('/api/mutuals');
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch interactions.');
      }
      
      const fetchedInteractions: User[] = await res.json();
      if (fetchedInteractions.length === 0) {
        setError(`Couldn't find any recent interactions for @${user.username}. Try liking some tweets or interacting with other users!`);
        setAppState('error');
        return;
      }
      setMutuals(fetchedInteractions);
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
  
  const handleDiagnose = async () => {
    setIsDiagnosing(true);
    setDiagnosis(null);
    try {
        const res = await fetch('/api/diagnose');
        const data: DiagnosisResult = await res.json();
        setDiagnosis(data);
    } catch (e) {
        setDiagnosis({
            status: 'ERROR',
            message: 'Failed to run diagnosis. Check the browser console and server logs.'
        });
    } finally {
        setIsDiagnosing(false);
    }
  };


  const handleTryAgain = () => {
    setAppState('loggedIn');
    setError(null);
  };
  
  const handleLogout = () => {
     window.location.href = '/api/logout';
  };

  const renderContent = () => {
    switch (appState) {
      case 'initialLoading':
        return <LoadingSpinner text="Checking session..." />;
      case 'loggedOut':
        return <Landing />;
      case 'loggedIn':
        return user ? <Dashboard user={user} onFindInteractions={handleFindInteractions} /> : <LoadingSpinner />;
      case 'fetchingInteractions':
         return <LoadingSpinner text={`Analyzing interactions for @${user?.username}...`} />;
      case 'slideshow':
        return <Slideshow mutuals={mutuals} onReset={handleLogout} />;
      case 'error':
        const isApiConfigError = error?.includes("attached to a Project");
        return (
          <div className="text-center w-full max-w-2xl bg-gray-800 p-8 rounded-lg border border-red-500/50 shadow-2xl">
            {isApiConfigError ? (
              <div className="flex flex-col text-left space-y-6">
                 <div>
                  <h2 className="text-2xl font-bold text-red-400 mb-2">Action Required: Your X App Must Be in a Project</h2>
                  <p className="text-gray-400">
                    The error <code className="text-sm bg-gray-900/70 text-red-300 px-1 py-0.5 rounded">Client Forbidden</code> means your app lacks the required v2 API access. This is because the app is not correctly associated with a <strong>Project</strong> in the X Developer Portal. <strong className="text-white">Standalone Apps will not work.</strong>
                  </p>
                </div>

                <div className="space-y-5">
                  <h3 className="font-semibold text-white text-lg">How to Fix This</h3>

                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-700 text-white font-bold rounded-full">1</div>
                    <div>
                      <h4 className="font-semibold text-white">Verify App Setup in the X Developer Portal</h4>
                      <p className="text-sm text-gray-400">
                        Go to your dashboard. Your App <strong className="text-white">must</strong> be listed under a "Project". If it's under "Standalone Apps", that is the source of the error. You must create a new App <strong className="text-white">inside</strong> a Project to get v2 API access.
                      </p>
                       <a
                          href="https://developer.twitter.com/en/portal/dashboard"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-block text-sm text-blue-400 hover:text-blue-300"
                      >
                          Open X Developer Portal &rarr;
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-700 text-white font-bold rounded-full">2</div>
                    <div>
                      <h4 className="font-semibold text-white">Get the Correct OAuth 2.0 Keys</h4>
                      <p className="text-sm text-gray-400">
                        Click on your App <strong className="text-white">that is inside a Project</strong>. Go to its "Keys and tokens" tab, and copy the <strong className="text-white">Client ID</strong> and <strong className="text-white">Client Secret</strong>.
                      </p>
                      <p className="text-sm text-yellow-400 mt-2 p-2 bg-yellow-900/30 rounded-md">
                        <span className="font-bold">Important:</span> The "API Key" and "API Key Secret" are for OAuth 1.0a and <span className="underline">will not work</span> for this application.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-700 text-white font-bold rounded-full">3</div>
                    <div>
                      <h4 className="font-semibold text-white">Update Environment Variables & Redeploy</h4>
                      <p className="text-sm text-gray-400">
                        Update <code className="text-sm bg-gray-900/70 text-gray-300 px-1 py-0.5 rounded">X_CLIENT_ID</code> and <code className="text-sm bg-gray-900/70 text-gray-300 px-1 py-0.5 rounded">X_CLIENT_SECRET</code> with the new values. You must **redeploy** your application to apply these changes.
                      </p>
                    </div>
                  </div>
                  
                   <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-700 text-white font-bold rounded-full">4</div>
                    <div className="w-full">
                      <h4 className="font-semibold text-white">Verify and Re-authenticate</h4>
                       <p className="text-sm text-gray-400 mb-4">
                        After redeploying, use this button to verify the new server configuration. If it succeeds, you can log out and connect again.
                      </p>
                      <div className="bg-gray-900/50 p-4 rounded-lg">
                          <button
                              onClick={handleDiagnose}
                              disabled={isDiagnosing}
                              className="w-full text-center px-6 py-2 bg-yellow-600 text-black font-semibold rounded-lg hover:bg-yellow-500 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                          >
                              {isDiagnosing ? 'Diagnosing...' : 'Verify Server Configuration'}
                          </button>
                          {diagnosis && (
                              <div className={`mt-4 p-3 rounded-md text-sm ${
                                  diagnosis.status === 'CONFIG_ERROR' || diagnosis.status === 'ENV_VAR_MISSING' ? 'bg-red-900/50 text-red-300' :
                                  diagnosis.status === 'OK' ? 'bg-green-900/50 text-green-300' : 'bg-gray-700 text-gray-300'
                              }`}>
                                  <p className="font-bold mb-1">
                                      {
                                          diagnosis.status === 'CONFIG_ERROR' ? 'Verification Failed: Configuration Error' :
                                          diagnosis.status === 'ENV_VAR_MISSING' ? 'Verification Failed: Missing Keys' :
                                          diagnosis.status === 'OK' ? 'Verification Success' : 'Diagnosis Result'
                                      }
                                  </p>
                                  <p>{diagnosis.message}</p>
                              </div>
                          )}
                      </div>
                      <button
                          onClick={handleLogout}
                          className="mt-4 w-full text-center px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                      >
                          Logout and Connect Again
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
               <>
                <h2 className="text-2xl font-bold text-red-400 mb-4">Something went wrong</h2>
                <p className="text-gray-300 mb-6 whitespace-pre-wrap">{error}</p>
                <div className="flex items-center justify-center space-x-4">
                    <button
                      onClick={handleTryAgain}
                      className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Try Again
                    </button>
                     <button
                      onClick={handleLogout}
                      className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      Logout
                    </button>
                </div>
              </>
            )}
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