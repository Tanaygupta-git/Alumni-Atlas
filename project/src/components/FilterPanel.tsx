import React, { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { useAlumniContext } from '../context/AlumniContext';
import type { Alumni } from '../types';

interface FilterPanelProps {
  onFilterApplied?: (filteredAlumni: Alumni[] | null) => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ onFilterApplied }) => {
  const { programOptions, yearOptions, countryOptions, setFilters, alumni } = useAlumniContext();
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [program, setProgram] = useState<string>('');
  const [year, setYear] = useState<string>('');
  const [country, setCountry] = useState<string>('');

  const calculateFilteredAlumni = (filters: any): Alumni[] => {
    return alumni.filter((alumnus) => {
      const matchesSearch = filters.searchTerm
        ? alumnus.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        alumnus.company.toLowerCase().includes(filters.searchTerm.toLowerCase())
        : true;

      const matchesProgram = filters.program
        ? alumnus.program === filters.program
        : true;

      const matchesYear = filters.year
        ? String(alumnus.graduationYear) === filters.year
        : true;

      const alumniCountry = alumnus.location.split(', ').pop() || 'Unknown';
      const matchesCountry = filters.country
        ? alumniCountry === filters.country
        : true;

      return matchesSearch && matchesProgram && matchesYear && matchesCountry;
    });
  };

  const handleFilter = () => {
    const newFilters = {
      searchTerm,
      program: program === 'All' ? '' : program,
      year: year === 'All' ? '' : year,
      country: country === 'All' ? '' : country,
    };

    setFilters(newFilters);

    // Pass the actual filtered alumni array
    if (onFilterApplied) {
      const filtered = calculateFilteredAlumni(newFilters);
      onFilterApplied(filtered);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setProgram('');
    setYear('');
    setCountry('');
    setFilters({
      searchTerm: '',
      program: '',
      year: '',
      country: '',
    });

    // Pass null to indicate filters are cleared
    if (onFilterApplied) {
      onFilterApplied(null);
    }
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsExpanded(true);
  };

  return (
    <div className={`panel transition-all duration-300 ${isExpanded ? 'w-64' : 'w-12 p-0'}`}>
      {isExpanded ? (
        <div className="animate-fadeIn">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium">Filter Alumni</h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-white/70 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-white/70 mb-1">Search</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Name or company..."
                  className="input pr-8 text-sm"
                />
                <Search size={14} className="absolute right-3 top-2.5 text-white/50" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-white/70 mb-1">Program</label>
              <select
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                className="input text-sm"
              >
                <option value="">All Programs</option>
                {programOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-white/70 mb-1">Graduation Year</label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="input text-sm"
              >
                <option value="">All Years</option>
                {yearOptions.map((yr) => (
                  <option key={yr} value={String(yr)}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-white/70 mb-1">Country</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="input text-sm"
              >
                <option value="">All Countries</option>
                {countryOptions.map((ctry) => (
                  <option key={ctry} value={ctry}>
                    {ctry}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={handleFilter}
                className="btn btn-primary py-1.5 text-sm flex-1"
              >
                Apply
              </button>
              <button
                onClick={handleClearFilters}
                className="btn btn-outline py-1.5 text-sm"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={handleExpandClick}
          className="w-full h-full flex items-center justify-center text-white/70 hover:text-white cursor-pointer bg-transparent rounded-xl min-h-[48px]"
          title="Open filters"
          type="button"
        >
          <Filter size={18} />
        </button>
      )}
    </div>
  );
};

export default FilterPanel;
