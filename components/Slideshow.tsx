
import React, { useState } from 'react';
import { User } from '../types';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';

interface SlideshowProps {
  mutuals: User[]; // This will start with one user
  onReset: () => void;
}

const MAX_INTERACTIONS = 5;

const Slideshow: React.FC<SlideshowProps> = ({ mutuals, onReset }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [localMutuals, setLocalMutuals] = useState<User[]>(mutuals);
  
  const [isFetchingNext, setIsFetchingNext] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNextMutual = async () => {
    if (isFetchingNext) return;
    setIsFetchingNext(true);
    setError(null);
    try {
        const seenUserIds = localMutuals.map(u => u.id);
        const res = await fetch('/api/next-interaction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ seenUserIds }),
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Failed to fetch next interaction.');
        }

        const { mutual } = await res.json();

        setIsFading(true);
        setTimeout(() => {
            if (mutual) {
                setLocalMutuals(prev => [...prev, mutual]);
                setCurrentIndex(prev => prev + 1);
            } else {
                setHasMore(false); // No more users found
            }
            setIsFading(false);
        }, 300);

    } catch (e: any) {
        setError("Não foi possível buscar a próxima conexão. Tente novamente mais tarde.");
    } finally {
        // A small delay to let the fade-in animation complete if a user was found
        setTimeout(() => setIsFetchingNext(false), 500);
    }
  };

  const handleControlClick = (direction: 'next' | 'prev') => {
    if (isFading || isFetchingNext) return;

    if (direction === 'next') {
        if (currentIndex === localMutuals.length - 1) {
            if (hasMore) {
                if (localMutuals.length >= MAX_INTERACTIONS) {
                    setHasMore(false);
                    return;
                }
                fetchNextMutual();
            }
            return;
        }
    }

    setIsFading(true);
    
    setTimeout(() => {
      if (direction === 'next') {
        setCurrentIndex((prevIndex) => Math.min(prevIndex + 1, localMutuals.length - 1));
      } else {
        setCurrentIndex((prevIndex) => Math.max(prevIndex - 1, 0));
      }
      setIsFading(false);
    }, 300);
  };
  
  const currentUser = localMutuals[currentIndex];
  
  if (!currentUser) {
      return (
        <div className="text-center">
            <p className="text-gray-400">Nenhuma interação encontrada.</p>
            <button onClick={onReset} className="mt-4 text-blue-400 hover:text-blue-300">Voltar</button>
        </div>
      );
  }

  const isAtEnd = currentIndex === localMutuals.length - 1;
  const canShowNext = hasMore || !isAtEnd;
  const canShowPrev = currentIndex > 0;

  return (
    <div className="w-full flex flex-col items-center">
      <div className="relative w-full max-w-sm aspect-square mb-6">
        {localMutuals.map((user, index) => (
          <img
            key={user.id}
            src={user.profileImageUrl.replace('_normal', '_400x400')}
            alt={user.name}
            className={`absolute top-0 left-0 w-full h-full rounded-2xl object-cover transition-opacity duration-300 ease-in-out ${
              index === currentIndex && !isFading ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
        <div className="absolute inset-0 bg-black bg-opacity-30 rounded-2xl pointer-events-none"></div>
      </div>

      <div className={`text-center transition-opacity duration-300 w-full max-w-md ${isFading ? 'opacity-0' : 'opacity-100'}`}>
        <h2 className="text-3xl font-bold">{currentUser.name}</h2>
        <p className="text-gray-400 text-lg mb-4">@{currentUser.username}</p>
        
        <blockquote className="mt-2 p-3 bg-gray-800/50 border-l-4 border-purple-400 text-gray-300 italic rounded-r-lg min-h-[60px] flex items-center justify-center">
             <p>"{currentUser.analysis}"</p>
        </blockquote>
      </div>

      <div className="flex items-center justify-center space-x-6 mt-8 h-20 w-full">
         <button
          onClick={() => handleControlClick('prev')}
          disabled={!canShowPrev || isFading || isFetchingNext}
          className="w-16 h-16 bg-gray-800 text-white rounded-full flex items-center justify-center shadow-lg transform transition-all hover:scale-110 hover:bg-gray-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
          aria-label="Previous"
        >
          <ArrowLeftIcon className="w-8 h-8" />
        </button>

        <div className="w-20 h-20 flex items-center justify-center">
            { isFetchingNext ? (
                <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : canShowNext ? (
                <button
                onClick={() => handleControlClick('next')}
                disabled={isFading}
                className="w-20 h-20 bg-white text-black rounded-full flex items-center justify-center shadow-lg transform transition-all hover:scale-110 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                aria-label="Next"
                >
                <ArrowRightIcon className="w-10 h-10" />
                </button>
            ) : (
                <div className="w-20 h-20 flex items-center justify-center rounded-full bg-gray-800">
                    <p className="text-sm font-bold text-gray-400">FIM</p>
                </div>
            )}
        </div>
      </div>
      
      <div className="h-10 mt-4 text-center">
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {!hasMore && isAtEnd && (
             <p className="text-gray-400 animate-pulse">
                {localMutuals.length >= MAX_INTERACTIONS
                    ? "Por hoje é só! Que tal recomeçar a brincadeira?"
                    : "Você viu tudo por hoje! Interaja mais e volte depois. 🎉"
                }
            </p>
        )}
      </div>
      
      <button
        onClick={onReset}
        className="mt-8 text-gray-400 hover:text-white transition-colors"
      >
        Recomeçar a brincadeira 😏
      </button>
    </div>
  );
};

export default Slideshow;
