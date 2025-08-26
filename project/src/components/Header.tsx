import React, { useState } from 'react';
import { Globe2, Users, Info, Map } from 'lucide-react';
import { useAlumniContext } from '../context/AlumniContext';

interface HeaderProps {
  onJoinNetwork: () => void;
}

const Header: React.FC<HeaderProps> = ({ onJoinNetwork }) => {
  const [showCountryList, setShowCountryList] = useState(false);
  const [showProgramsList, setShowProgramsList] = useState(false);
  const [showStatisticsList, setShowStatisticsList] = useState(false);

  // Track if dropdown was opened by click (to prevent hover from closing it)
  const [clickedPrograms, setClickedPrograms] = useState(false);
  const [clickedStatistics, setClickedStatistics] = useState(false);
  const [clickedCountry, setClickedCountry] = useState(false);

  const { alumni, programOptions } = useAlumniContext();

  // Timeout refs for hover delays
  const programsTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const statisticsTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const countryTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handler functions for combined hover/click behavior
  const handleProgramsClick = () => {
    if (clickedPrograms) {
      // If already clicked open, close it
      setShowProgramsList(false);
      setClickedPrograms(false);
    } else {
      // Close other dropdowns first
      setShowStatisticsList(false);
      setShowCountryList(false);
      setClickedStatistics(false);
      setClickedCountry(false);

      // If not clicked open (either closed or just hovering), lock it open
      setShowProgramsList(true);
      setClickedPrograms(true);
      if (programsTimeoutRef.current) {
        clearTimeout(programsTimeoutRef.current);
        programsTimeoutRef.current = null;
      }
    }
  };

  const handleStatisticsClick = () => {
    if (clickedStatistics) {
      setShowStatisticsList(false);
      setClickedStatistics(false);
    } else {
      // Close other dropdowns first
      setShowProgramsList(false);
      setShowCountryList(false);
      setClickedPrograms(false);
      setClickedCountry(false);

      setShowStatisticsList(true);
      setClickedStatistics(true);
      if (statisticsTimeoutRef.current) {
        clearTimeout(statisticsTimeoutRef.current);
        statisticsTimeoutRef.current = null;
      }
    }
  };

  const handleCountryClick = () => {
    if (clickedCountry) {
      setShowCountryList(false);
      setClickedCountry(false);
    } else {
      // Close other dropdowns first
      setShowProgramsList(false);
      setShowStatisticsList(false);
      setClickedPrograms(false);
      setClickedStatistics(false);

      setShowCountryList(true);
      setClickedCountry(true);
      if (countryTimeoutRef.current) {
        clearTimeout(countryTimeoutRef.current);
        countryTimeoutRef.current = null;
      }
    }
  };

  const handleProgramsMouseEnter = () => {
    if (programsTimeoutRef.current) {
      clearTimeout(programsTimeoutRef.current);
      programsTimeoutRef.current = null;
    }
    if (!clickedPrograms) {
      setShowProgramsList(true);
    }
  };

  const handleProgramsMouseLeave = () => {
    if (!clickedPrograms) {
      programsTimeoutRef.current = setTimeout(() => {
        setShowProgramsList(false);
      }, 150);
    }
  };

  const handleStatisticsMouseEnter = () => {
    if (statisticsTimeoutRef.current) {
      clearTimeout(statisticsTimeoutRef.current);
      statisticsTimeoutRef.current = null;
    }
    if (!clickedStatistics) {
      setShowStatisticsList(true);
    }
  };

  const handleStatisticsMouseLeave = () => {
    if (!clickedStatistics) {
      statisticsTimeoutRef.current = setTimeout(() => {
        setShowStatisticsList(false);
      }, 150);
    }
  };

  const handleCountryMouseEnter = () => {
    if (countryTimeoutRef.current) {
      clearTimeout(countryTimeoutRef.current);
      countryTimeoutRef.current = null;
    }
    if (!clickedCountry) {
      setShowCountryList(true);
    }
  };

  const handleCountryMouseLeave = () => {
    if (!clickedCountry) {
      countryTimeoutRef.current = setTimeout(() => {
        setShowCountryList(false);
      }, 150);
    }
  };

  // Click outside to close dropdowns
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setShowProgramsList(false);
        setShowStatisticsList(false);
        setShowCountryList(false);
        setClickedPrograms(false);
        setClickedStatistics(false);
        setClickedCountry(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      // Clear any pending timeouts on unmount
      if (programsTimeoutRef.current) clearTimeout(programsTimeoutRef.current);
      if (statisticsTimeoutRef.current) clearTimeout(statisticsTimeoutRef.current);
      if (countryTimeoutRef.current) clearTimeout(countryTimeoutRef.current);
    };
  }, []);

  // Group alumni by country
  const alumniByCountry = alumni.reduce((acc, alumnus) => {
    const country = alumnus.location.split(', ').pop() || 'Unknown';
    if (!acc[country]) {
      acc[country] = [];
    }
    acc[country].push(alumnus);
    return acc;
  }, {} as Record<string, typeof alumni>);

  return (
    <header className="bg-neutral-900/70 backdrop-blur-md border-b border-white/10 px-4 md:px-6 py-4 z-10">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Globe2 className="h-7 w-7 text-primary-400" />
          <h1 className="text-xl font-bold text-white">
            <span className="text-primary-400">IET</span> DAVV
          </h1>
        </div>

        <div className="hidden md:flex items-center space-x-4">
          <div
            className="relative group dropdown-container"
            onMouseLeave={handleCountryMouseLeave}
          >
            <button
              className="btn btn-outline flex items-center space-x-2"
              onClick={handleCountryClick}
              onMouseEnter={handleCountryMouseEnter}
              aria-haspopup="menu"
              aria-expanded={showCountryList}
              aria-controls="country-menu"
              type="button"
            >
              <Users size={18} className="text-blue-400" />
              <span>Alumni</span>
            </button>
            <div
              className={`absolute top-full left-0 mt-2 w-80 max-h-96 overflow-y-auto bg-neutral-900 border border-white/10 rounded-lg shadow-xl transition-all duration-200 ${showCountryList ? 'opacity-100 visible' : 'opacity-0 invisible'
                }`}
              id="country-menu"
              role="menu"
              onMouseEnter={handleCountryMouseEnter}
              onMouseLeave={handleCountryMouseLeave}
            >
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-4">Alumni by Country</h3>
                {Object.entries(alumniByCountry).map(([country, countryAlumni]) => (
                  <div key={country} className="mb-4">
                    <h4 className="text-primary-400 font-medium mb-2">{country} ({countryAlumni.length})</h4>
                    <div className="space-y-2">
                      {countryAlumni.map((alumnus) => (
                        <div key={alumnus.id} className="text-sm text-white/80 hover:text-white">
                          <p className="font-medium">{alumnus.name}</p>
                          <p className="text-xs text-white/60">{alumnus.program} - {alumnus.company}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            className="relative group dropdown-container"
            onMouseLeave={handleProgramsMouseLeave}
          >
            <button
              className="btn btn-outline flex items-center space-x-2"
              onClick={handleProgramsClick}
              onMouseEnter={handleProgramsMouseEnter}
              aria-haspopup="menu"
              aria-expanded={showProgramsList}
              aria-controls="programs-menu"
              type="button"
            >
              <Map size={18} className="text-green-400" />
              <span>Programs</span>
            </button>
            <div
              className={`absolute top-full left-0 mt-2 w-64 bg-neutral-900 border border-white/10 rounded-lg shadow-xl transition-all duration-200 ${showProgramsList ? 'opacity-100 visible' : 'opacity-0 invisible'
                }`}
              id="programs-menu"
              role="menu"
              onMouseEnter={handleProgramsMouseEnter}
              onMouseLeave={handleProgramsMouseLeave}
            >
              <div className="p-4 space-y-2">
                {programOptions.map((program) => (
                  <button key={program} type="button" className="block w-full text-left hover:bg-white/10 p-2 rounded transition-colors">
                    {program}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div
            className="relative group dropdown-container"
            onMouseLeave={handleStatisticsMouseLeave}
          >
            <button
              className="btn btn-outline flex items-center space-x-2"
              onClick={handleStatisticsClick}
              onMouseEnter={handleStatisticsMouseEnter}
              aria-haspopup="menu"
              aria-expanded={showStatisticsList}
              aria-controls="about-menu"
              type="button"
            >
              <Info size={18} className="text-purple-400" />
              <span>About</span>
            </button>
            <div
              className={`absolute top-full left-0 mt-2 w-64 bg-neutral-900 border border-white/10 rounded-lg shadow-xl transition-all duration-200 ${showStatisticsList ? 'opacity-100 visible' : 'opacity-0 invisible'
                }`}
              id="about-menu"
              role="menu"
              onMouseEnter={handleStatisticsMouseEnter}
              onMouseLeave={handleStatisticsMouseLeave}
            >
              <div className="p-4 space-y-2">
                <div className="block hover:bg-white/10 p-2 rounded transition-colors">
                  <h4 className="text-primary-400 font-medium">IET DAVV Alumni Network</h4>
                  <p className="text-sm text-white/80 mt-1">Connecting graduates from the Institute of Engineering & Technology, Devi Ahilya Vishwavidyalaya</p>
                </div>
                <div className="block hover:bg-white/10 p-2 rounded transition-colors">
                  <h4 className="text-primary-400 font-medium">Global Community</h4>
                  <p className="text-sm text-white/80 mt-1">Our alumni work at leading companies worldwide, from tech giants to innovative startups</p>
                </div>
                <div className="block hover:bg-white/10 p-2 rounded transition-colors">
                  <h4 className="text-primary-400 font-medium">Career Growth</h4>
                  <p className="text-sm text-white/80 mt-1">Supporting career development through mentorship, networking, and knowledge sharing</p>
                </div>
                <div className="block hover:bg-white/10 p-2 rounded transition-colors">
                  <h4 className="text-primary-400 font-medium">Join Us</h4>
                  <p className="text-sm text-white/80 mt-1">Connect with fellow alumni and expand your professional network globally</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onJoinNetwork}
          className="btn btn-primary"
        >
          Join Network
        </button>
      </div>
    </header>
  );
};

export default Header;