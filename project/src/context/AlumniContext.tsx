import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo } from 'react';
import type { Alumni, AlumniFilters } from '../types';
import { alumniAPI, type AlumniCreateData } from '../services/api';

interface AlumniContextType {
  alumni: Alumni[];
  filteredAlumni: Alumni[];
  programOptions: string[];
  yearOptions: number[];
  countryOptions: string[];
  filters: AlumniFilters;
  isLoading: boolean;
  error: string | null;
  cameraControls: any | null; // OrbitControls type
  setFilters: (filters: AlumniFilters) => void;
  addAlumni: (alumni: AlumniCreateData) => Promise<void>;
  deleteAlumni: (id: string) => Promise<void>;
  refreshAlumni: () => Promise<void>;
  setCameraControls: (controls: any | null) => void;
}

const AlumniContext = createContext<AlumniContextType | undefined>(undefined);

export const useAlumniContext = () => {
  const context = useContext(AlumniContext);
  if (!context) {
    throw new Error('useAlumniContext must be used within an AlumniProvider');
  }
  return context;
};

export const AlumniProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [alumni, setAlumni] = useState<Alumni[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cameraControls, setCameraControls] = useState<any | null>(null);
  const [filters, setFilters] = useState<AlumniFilters>({
    searchTerm: '',
    program: '',
    year: '',
    country: '',
  });

  // Load alumni from API
  const loadAlumni = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await alumniAPI.getAllAlumni();
      setAlumni(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alumni data');
      setAlumni([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load alumni on component mount
  useEffect(() => {
    loadAlumni();
  }, []);

  // Extract unique program options from alumni data
  const programOptions = useMemo(() => {
    const programs = new Set(alumni.map((a) => a.program));
    return Array.from(programs).sort();
  }, [alumni]);

  // Extract unique year options from alumni data
  const yearOptions = useMemo(() => {
    const years = new Set(alumni.map((a) => a.graduationYear));
    return Array.from(years).sort((a, b) => b - a); // Sort descending
  }, [alumni]);

  // Extract unique country options from alumni data
  const countryOptions = useMemo(() => {
    const countries = new Set(alumni.map((a) => a.location.split(', ').pop() || 'Unknown'));
    return Array.from(countries).sort();
  }, [alumni]);

  // Filter alumni based on search term, program, year, and country
  const filteredAlumni = useMemo(() => {
    const filtered = alumni.filter((alumnus) => {
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

    // Optional: add analytics hooks here if needed

    return filtered;
  }, [alumni, filters]);

  // Add a new alumni member
  const addAlumni = async (newAlumni: AlumniCreateData) => {
    try {
      setError(null);
      const createdAlumni = await alumniAPI.createAlumni(newAlumni);
      setAlumni((prevAlumni) => [...prevAlumni, createdAlumni]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add alumni');
      throw err;
    }
  };

  // Delete an alumni member
  const deleteAlumni = async (id: string) => {
    try {
      setError(null);
      await alumniAPI.deleteAlumni(id);
      setAlumni((prevAlumni) => prevAlumni.filter(alumni => alumni.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete alumni');
      throw err;
    }
  };

  // Refresh alumni data
  const refreshAlumni = async () => {
    await loadAlumni();
  };

  const value = {
    alumni,
    filteredAlumni,
    programOptions,
    yearOptions,
    countryOptions,
    filters,
    isLoading,
    error,
    cameraControls,
    setFilters,
    addAlumni,
    deleteAlumni,
    refreshAlumni,
    setCameraControls,
  };

  return (
    <AlumniContext.Provider value={value}>
      {children}
    </AlumniContext.Provider>
  );
};