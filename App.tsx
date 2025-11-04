
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
        setError(`Não encontramos nenhuma interação recente para @${user.username}. Curta uns tweets ou interaja com a galera e tente de novo!`);
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
        return <LoadingSpinner text="Verificando a sessão..." />;
      case 'loggedOut':
        return <Landing />;
      case 'loggedIn':
        return user ? <Dashboard user={user} onFindInteractions={handleFindInteractions} /> : <LoadingSpinner />;
      case 'fetchingInteractions':
         return <LoadingSpinner text={`Analisando suas interações e gerando conexões sapecas...`} />;
      case 'slideshow':
        return <Slideshow mutuals={mutuals} onReset={handleLogout} />;
      case 'error':
        const isApiConfigError = error?.includes("attached to a Project");
        return (
          <div className="text-center w-full max-w-2xl bg-gray-800 p-8 rounded-lg border border-red-500/50 shadow-2xl">
            {isApiConfigError ? (
              <div className="flex flex-col text-left space-y-6">
                 <div>
                  <h2 className="text-2xl font-bold text-red-400 mb-2">Ação Necessária: Sua App do X Precisa Estar em um Projeto</h2>
                  <p className="text-gray-400">
                    O erro <code className="text-sm bg-gray-900/70 text-red-300 px-1 py-0.5 rounded">Client Forbidden</code> significa que sua app não tem o acesso necessário à API v2. Isso acontece porque a app não está corretamente associada a um <strong>Projeto</strong> no Portal de Desenvolvedor do X. <strong className="text-white">Apps "Standalone" não funcionarão.</strong>
                  </p>
                </div>

                <div className="space-y-5">
                  <h3 className="font-semibold text-white text-lg">Como Corrigir</h3>

                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-700 text-white font-bold rounded-full">1</div>
                    <div>
                      <h4 className="font-semibold text-white">Verifique a Configuração no Portal de Desenvolvedor</h4>
                      <p className="text-sm text-gray-400">
                        Vá para o seu dashboard. Sua App <strong className="text-white">precisa</strong> estar listada dentro de um "Projeto". Se estiver em "Standalone Apps", essa é a causa do erro. Você precisa criar uma nova App <strong className="text-white">dentro</strong> de um Projeto para obter acesso à API v2.
                      </p>
                       <a
                          href="https://developer.twitter.com/en/portal/dashboard"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-block text-sm text-blue-400 hover:text-blue-300"
                      >
                          Abrir Portal de Desenvolvedor &rarr;
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-700 text-white font-bold rounded-full">2</div>
                    <div>
                      <h4 className="font-semibold text-white">Obtenha as Chaves OAuth 2.0 Corretas</h4>
                      <p className="text-sm text-gray-400">
                        Clique na sua App <strong className="text-white">que está dentro de um Projeto</strong>. Vá para a aba "Keys and tokens" e copie o <strong className="text-white">Client ID</strong> e o <strong className="text-white">Client Secret</strong>.
                      </p>
                      <p className="text-sm text-yellow-400 mt-2 p-2 bg-yellow-900/30 rounded-md">
                        <span className="font-bold">Importante:</span> "API Key" e "API Key Secret" são para OAuth 1.0a e <span className="underline">não funcionarão</span> para esta aplicação.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-700 text-white font-bold rounded-full">3</div>
                    <div>
                      <h4 className="font-semibold text-white">Atualize as Variáveis de Ambiente e Reimplante</h4>
                      <p className="text-sm text-gray-400">
                        Atualize <code className="text-sm bg-gray-900/70 text-gray-300 px-1 py-0.5 rounded">X_CLIENT_ID</code> e <code className="text-sm bg-gray-900/70 text-gray-300 px-1 py-0.5 rounded">X_CLIENT_SECRET</code> com os novos valores. Você precisa **reimplantar** sua aplicação para que as mudanças tenham efeito.
                      </p>
                    </div>
                  </div>
                  
                   <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-700 text-white font-bold rounded-full">4</div>
                    <div className="w-full">
                      <h4 className="font-semibold text-white">Verifique e Reautentique</h4>
                       <p className="text-sm text-gray-400 mb-4">
                        Após reimplantar, use este botão para verificar a nova configuração do servidor. Se for bem-sucedido, você pode deslogar e conectar novamente.
                      </p>
                      <div className="bg-gray-900/50 p-4 rounded-lg">
                          <button
                              onClick={handleDiagnose}
                              disabled={isDiagnosing}
                              className="w-full text-center px-6 py-2 bg-yellow-600 text-black font-semibold rounded-lg hover:bg-yellow-500 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                          >
                              {isDiagnosing ? 'Diagnosticando...' : 'Verificar Configuração do Servidor'}
                          </button>
                          {diagnosis && (
                              <div className={`mt-4 p-3 rounded-md text-sm ${
                                  diagnosis.status === 'CONFIG_ERROR' || diagnosis.status === 'ENV_VAR_MISSING' ? 'bg-red-900/50 text-red-300' :
                                  diagnosis.status === 'OK' ? 'bg-green-900/50 text-green-300' : 'bg-gray-700 text-gray-300'
                              }`}>
                                  <p className="font-bold mb-1">
                                      {
                                          diagnosis.status === 'CONFIG_ERROR' ? 'Verificação Falhou: Erro de Configuração' :
                                          diagnosis.status === 'ENV_VAR_MISSING' ? 'Verificação Falhou: Chaves Faltando' :
                                          diagnosis.status === 'OK' ? 'Verificação com Sucesso' : 'Resultado do Diagnóstico'
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
                          Deslogar e Conectar Novamente
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
               <>
                <h2 className="text-2xl font-bold text-red-400 mb-4">Ops, algo deu errado</h2>
                <p className="text-gray-300 mb-6 whitespace-pre-wrap">{error}</p>
                <div className="flex items-center justify-center space-x-4">
                    <button
                      onClick={handleTryAgain}
                      className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Tentar Novamente
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