import React, { ReactNode } from 'react';
import Header from './Header';
import FilterPanel from './FilterPanel';
import FilterToast from './FilterToast';
import type { Alumni } from '../types';

interface LayoutProps {
  children: ReactNode;
  onJoinNetwork: () => void;
  onFilterApplied?: (filteredAlumni: Alumni[] | null) => void;
  showFilterToast?: boolean;
  filterResultCount?: number;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  onJoinNetwork,
  onFilterApplied,
  showFilterToast = false,
  filterResultCount = 0
}) => {
  return (
    <div className="flex flex-col h-full bg-neutral-950">
      <Header onJoinNetwork={onJoinNetwork} />
      <main className="flex-1 relative overflow-hidden">
        {children}
        <div className="absolute top-20 left-4 z-50 md:left-6 lg:left-8">
          <div className="relative">
            <FilterPanel onFilterApplied={onFilterApplied} />
            {showFilterToast && (
              <FilterToast
                alumniCount={filterResultCount}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;