
import React from 'react';
import { AuthenticatedUser } from '../types';
import { XIcon } from './icons/XIcon';

interface DashboardProps {
  user: AuthenticatedUser;
  onFindInteractions: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, onFindInteractions }) => {
  return (
    <div className="text-center flex flex-col items-center w-full">
      <div className="flex items-center space-x-4 mb-8">
        <img src={user.profileImageUrl} alt={user.name} className="w-20 h-20 rounded-full border-2 border-gray-700" />
        <div>
          <h1 className="text-3xl font-bold text-left">{user.name}</h1>
          <p className="text-lg text-gray-400 text-left">@{user.username}</p>
        </div>
      </div>
      <p className="text-lg text-gray-400 max-w-md mb-8">
        You're connected! Let's analyze your recent likes and mentions to create a slideshow of your top interactions.
      </p>
      <button
        onClick={onFindInteractions}
        className="group relative inline-flex items-center justify-center px-8 py-3 bg-white text-black font-bold rounded-full overflow-hidden transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-blue-500/50"
      >
        <span className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
        <span className="relative flex items-center">
            <XIcon className="w-5 h-5 mr-2 text-black" />
            Analyze My Interactions
        </span>
      </button>
      <a
        href="/api/logout"
        className="mt-6 text-sm text-gray-500 hover:text-gray-300 transition-colors"
      >
        Connect a different account
      </a>
    </div>
  );
};

export default Dashboard;