// Alumni type definitions
export interface Alumni {
  id: string;
  name: string;
  program: string;
  graduationYear: number;
  jobTitle: string;
  company: string;
  location: string;
  email: string;
  linkedin?: string;
  twitter?: string;
  latitude: number;
  longitude: number;
}

// Marker type for globe visualization
export type Marker = Alumni;

// Filter configuration
export interface AlumniFilters {
  searchTerm: string;
  program: string;
  year: string;
  country: string;
}

// Form data for joining network
export interface JoinNetworkFormData {
  name: string;
  email: string;
  program: string;
  graduationYear: number;
  jobTitle: string;
  company: string;
  location: string;
  linkedin?: string;
  twitter?: string;
  latitude?: number;
  longitude?: number;
}