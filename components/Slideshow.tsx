
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';

interface SlideshowProps {
  mutuals: User[];
  onReset: () => void;
}

const Slideshow: React.FC<SlideshowProps> = ({ mutuals, onReset }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [localMutuals, setLocalMutuals] = useState<User[]>(mutuals);
  const [isThrottled, setIsThrottled] = useState(false);

  // Fetch analysis on demand
  useEffect(() => {
    const fetchAnalysis = async (index: number) => {
      if (index < 0 || index >= localMutuals.length) return;

      const user = localMutuals[index];
      // Only fetch if analysis doesn't exist
      if (!user.analysis) {
        try {
          const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              targetUsername: user.username,
              tweets: user.tweets,
            }),
          });
          if (res.ok) {
            const { analysis } = await res.json();
            setLocalMutuals(prev =>
              prev.map((u, i) => (i === index ? { ...u, analysis } : u))
            );
          }
        } catch (error) {
          console.error("Failed to fetch analysis:", error);
           setLocalMutuals(prev =>
              prev.map((u, i) => (i === index ? { ...u, analysis: "Não foi possível analisar essa conexão. Tente mais tarde." } : u))
            );
        }
      }
    };

    // Fetch analysis ONLY for the currently displayed user.
    fetchAnalysis(currentIndex);

  }, [currentIndex, localMutuals]);


  const handleControlClick = (direction: 'next' | 'prev') => {
    if (isThrottled) return;

    setIsFading(true);
    setIsThrottled(true);

    setTimeout(() => {
      if (direction === 'next') {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % localMutuals.length);
      } else {
        setCurrentIndex((prevIndex) => (prevIndex - 1 + localMutuals.length) % localMutuals.length);
      }
      setIsFading(false);
    }, 300);
    
    // Increased throttle to 1.5 seconds to prevent too many requests
    setTimeout(() => setIsThrottled(false), 1500); 
  };
  
  const currentUser = localMutuals[currentIndex];

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
            {currentUser.analysis ? (
                 <p>"{currentUser.analysis}"</p>
            ) : (
                <p className="text-sm animate-pulse">Analisando a vibe... 😏</p>
            )}
        </blockquote>
      </div>

      <div className="flex items-center space-x-6 mt-8">
         <button
          onClick={() => handleControlClick('prev')}
          disabled={isThrottled}
          className="w-16 h-16 bg-gray-800 text-white rounded-full flex items-center justify-center shadow-lg transform transition-all hover:scale-110 hover:bg-gray-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
          aria-label="Previous"
        >
          <ArrowLeftIcon className="w-8 h-8" />
        </button>
        <button
          onClick={() => handleControlClick('next')}
          disabled={isThrottled}
          className="w-20 h-20 bg-white text-black rounded-full flex items-center justify-center shadow-lg transform transition-all hover:scale-110 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
          aria-label="Next"
        >
          <ArrowRightIcon className="w-10 h-10" />
        </button>
      </div>
      
      <button
        onClick={onReset}
        className="mt-12 text-gray-400 hover:text-white transition-colors"
      >
        Recomeçar a brincadeira 😏
      </button>
    </div>
  );
};

export default Slideshow;
