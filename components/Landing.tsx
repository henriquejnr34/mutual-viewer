
import React from 'react';
import { XIcon } from './icons/XIcon';

const Landing: React.FC = () => {
  return (
    <div className="text-center flex flex-col items-center">
      <div className="mb-8 p-4 bg-gray-800 rounded-full">
        <XIcon className="w-12 h-12 text-white" />
      </div>
      <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
        Mutuals Slideshow
      </h1>
      <p className="text-lg text-gray-400 max-w-md mb-8">
        Connect your X account to see your mutual follows in a fun, interactive way. Get ready to spot your friends!
      </p>
      <a
        href="/api/login"
        className="group relative inline-flex items-center justify-center px-8 py-3 bg-white text-black font-bold rounded-full overflow-hidden transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-blue-500/50"
      >
        <span className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
        <span className="relative flex items-center">
            <XIcon className="w-5 h-5 mr-2 text-black" />
            Connect with X
        </span>
      </a>
    </div>
  );
};

export default Landing;
