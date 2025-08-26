import React from 'react';
import { Globe2 } from 'lucide-react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-neutral-950">
      <div className="flex flex-col items-center animate-pulse">
        <Globe2 className="h-16 w-16 text-primary-400 mb-4" />
        <h2 className="text-2xl font-bold mb-2">
          <span className="text-primary-400">Alumni</span>
          <span className="text-white">Globe</span>
        </h2>
        <p className="text-white/70 text-sm mb-6">Loading the network...</p>
        
        <div className="flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-primary-500 animate-[pulse_1s_ease-in-out_infinite]"></div>
          <div className="w-3 h-3 rounded-full bg-primary-500 animate-[pulse_1s_ease-in-out_0.2s_infinite]"></div>
          <div className="w-3 h-3 rounded-full bg-primary-500 animate-[pulse_1s_ease-in-out_0.4s_infinite]"></div>
        </div>
      </div>
      
      <div className="absolute bottom-8 text-center max-w-sm px-4">
        <p className="text-xs text-white/50">
          Connecting you to alumni across the globe. This may take a moment depending on your connection.
        </p>
      </div>
    </div>
  );
};

export default LoadingScreen;