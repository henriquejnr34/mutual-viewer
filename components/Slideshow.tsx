
import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { PlayIcon } from './icons/PlayIcon';
import { PauseIcon } from './icons/PauseIcon';

interface SlideshowProps {
  mutuals: User[];
  onReset: () => void;
}

const SLIDESHOW_SPEED_MS = 2000;

const Slideshow: React.FC<SlideshowProps> = ({ mutuals, onReset }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const intervalRef = useRef<number | null>(null);
  
  const currentUser = mutuals[currentIndex];

  useEffect(() => {
    if (!isPaused) {
      intervalRef.current = window.setInterval(() => {
        setIsFading(true);
        setTimeout(() => {
          setCurrentIndex((prevIndex) => (prevIndex + 1) % mutuals.length);
          setIsFading(false);
        }, 500);
      }, SLIDESHOW_SPEED_MS);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, mutuals.length]);

  return (
    <div className="w-full flex flex-col items-center">
      <div className="relative w-full max-w-sm aspect-square mb-6">
        {mutuals.map((user, index) => (
          <img
            key={user.id}
            src={user.profileImageUrl.replace('_normal', '_400x400')}
            alt={user.name}
            className={`absolute top-0 left-0 w-full h-full rounded-2xl object-cover transition-opacity duration-500 ease-in-out ${
              index === currentIndex && !isFading ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
        <div className="absolute inset-0 bg-black bg-opacity-30 rounded-2xl pointer-events-none"></div>
      </div>

      <div className={`text-center transition-opacity duration-500 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
        <h2 className="text-3xl font-bold">{currentUser.name}</h2>
        <p className="text-gray-400 text-lg">@{currentUser.username}</p>
      </div>

      <div className="flex items-center space-x-4 mt-8">
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center shadow-lg transform transition-transform hover:scale-110 focus:outline-none"
          aria-label={isPaused ? 'Play' : 'Pause'}
        >
          {isPaused ? <PlayIcon className="w-8 h-8" /> : <PauseIcon className="w-8 h-8" />}
        </button>
      </div>
      
      <button
        onClick={onReset}
        className="mt-12 text-gray-400 hover:text-white transition-colors"
      >
        Logout & Start Over
      </button>
    </div>
  );
};

export default Slideshow;
