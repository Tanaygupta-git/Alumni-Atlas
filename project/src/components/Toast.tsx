import React, { useState, useEffect } from 'react';
import { X, RotateCcw, ZoomIn, MousePointer } from 'lucide-react';

interface ToastProps {
    duration?: number;
    onClose?: () => void;
}

const Toast: React.FC<ToastProps> = ({
    duration = 5000,
    onClose
}) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            if (onClose) {
                setTimeout(onClose, 300); // Wait for fade out animation
            }
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const handleClose = () => {
        setIsVisible(false);
        if (onClose) {
            setTimeout(onClose, 300);
        }
    };

    if (!isVisible) {
        return null;
    }

    return (
        <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
            <div className="bg-black/30 backdrop-blur-sm rounded-lg px-6 py-3 max-w-2xl mx-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 text-white/90">
                        <div className="flex items-center space-x-2 text-sm whitespace-nowrap">
                            <RotateCcw size={16} className="text-blue-400" />
                            <span>Drag to rotate</span>
                            <span className="text-white/40">•</span>
                            <ZoomIn size={16} className="text-green-400" />
                            <span>Scroll to zoom</span>
                            <span className="text-white/40">•</span>
                            <MousePointer size={16} className="text-purple-400" />
                            <span>Click on markers to view alumni details</span>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="ml-4 text-white/50 hover:text-white/80 transition-colors flex-shrink-0"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Toast;
