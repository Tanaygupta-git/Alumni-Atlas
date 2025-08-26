import React from 'react';
import { Users } from 'lucide-react';

interface FilterToastProps {
    alumniCount: number;
}

const FilterToast: React.FC<FilterToastProps> = ({
    alumniCount
}) => {
    // Don't show toast if count is -1 (filters cleared) or if no filters applied
    if (alumniCount === -1) {
        return null;
    }

    return (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 max-w-xs">
            <div className="bg-blue-600/90 backdrop-blur-sm rounded-lg px-4 py-3 shadow-lg border border-blue-500/20">
                <div className="flex items-center space-x-2 text-white">
                    <Users size={18} className="text-blue-200" />
                    <span className="font-medium text-sm">
                        {alumniCount} {alumniCount === 1 ? 'alumnus' : 'alumni'} found
                    </span>
                </div>
            </div>
        </div>
    );
};

export default FilterToast;
