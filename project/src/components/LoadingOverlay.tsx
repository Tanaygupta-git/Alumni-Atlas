import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
    message?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message = "Loading..." }) => {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-900 p-6 rounded-lg flex flex-col items-center space-y-4">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <p className="text-white">{message}</p>
            </div>
        </div>
    );
};

export default LoadingOverlay;
