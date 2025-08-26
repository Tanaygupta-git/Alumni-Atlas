// This file provides a simple API client for interacting with the alumni backend

// Deployments: set VITE_API_BASE_URL to your production backend URL
// Public clones don’t need any env; defaults to http://localhost:8002 (local backend pointing to DBMS server port 8002)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8002';

export interface Alumni {
    id: string;
    name: string;
    email: string;
    program: string;
    graduationYear: number;
    jobTitle: string;
    company: string;
    location: string;
    linkedin?: string;
    twitter?: string;
    latitude: number;
    longitude: number;
}

export interface AlumniCreateData {
    name: string;
    email: string;
    program: string;
    graduationYear: number;
    jobTitle: string;
    company: string;
    location: string;
    linkedin?: string;
    twitter?: string;
    // Optional when submitting a join request; backend may geocode if absent
    latitude?: number;
    longitude?: number;
}

class AlumniAPI {
    async getAllAlumni(): Promise<Alumni[]> {
        try {
            const response = await fetch(`${API_BASE_URL}/alumni`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching alumni:', error);
            throw error;
        }
    }

    async createAlumni(alumniData: AlumniCreateData): Promise<Alumni> {
        try {
            const response = await fetch(`${API_BASE_URL}/alumni`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(alumniData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error creating alumni:', error);
            throw error;
        }
    }

    // Submit a join request (pending moderation)
    async submitJoinRequest(alumniData: AlumniCreateData): Promise<{ queued: boolean; id: string }> {
        const response = await fetch(`${API_BASE_URL}/join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(alumniData),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }
        return response.json();
    }

    async deleteAlumni(alumniId: string): Promise<void> {
        try {
            const response = await fetch(`${API_BASE_URL}/alumni/${alumniId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error deleting alumni:', error);
            throw error;
        }
    }
}

export const alumniAPI = new AlumniAPI();
