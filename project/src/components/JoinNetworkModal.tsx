import React, { useMemo, useState } from 'react';
import { X, MapPin, User, Mail, Briefcase, Building, GraduationCap, Calendar, Linkedin, Twitter } from 'lucide-react';
import { useAlumniContext } from '../context/AlumniContext';
import { alumniAPI } from '../services/api';
import type { JoinNetworkFormData } from '../types';

interface JoinNetworkModalProps {
  onClose: () => void;
}

const JoinNetworkModal: React.FC<JoinNetworkModalProps> = ({ onClose }) => {
  const { programOptions, yearOptions } = useAlumniContext();
  // Canonical list to ensure useful options even when API is sparse, merged with dedupe
  const DEFAULT_PROGRAMS = [
    'Computer Science',
    'Data Science',
    'Business Administration',
    'MBA',
    'Digital Marketing',
    'Artificial Intelligence',
  ];
  const combinedPrograms = useMemo(
    () => Array.from(new Set([...(programOptions || []), ...DEFAULT_PROGRAMS])).sort(),
    [programOptions]
  );
  const combinedYears = useMemo(() => {
    const recent = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);
    const unique = new Set([...(yearOptions || []), ...recent]);
    return Array.from(unique).sort((a, b) => b - a);
  }, [yearOptions]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [formData, setFormData] = useState<JoinNetworkFormData>({
    name: '',
    email: '',
    program: '',
    graduationYear: new Date().getFullYear(),
    jobTitle: '',
    company: '',
    location: '',
    linkedin: '',
    twitter: '',
  });

  // Include a generic 'form' error slot in addition to field-specific errors
  const [errors, setErrors] = useState<Partial<Record<keyof JoinNetworkFormData | 'form', string>>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name as keyof JoinNetworkFormData]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof JoinNetworkFormData | 'form', string>> = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.program) newErrors.program = 'Program is required';
    if (!formData.graduationYear) newErrors.graduationYear = 'Graduation year is required';
    if (!formData.jobTitle.trim()) newErrors.jobTitle = 'Job title is required';
    if (!formData.company.trim()) newErrors.company = 'Company is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // In a real application, we would send this data to a backend API
      // For now, we'll simulate a network request
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Generate random lat/long for demo; normally use geocoding
      const latitude = Math.random() * 180 - 90;
      const longitude = Math.random() * 360 - 180;

      // Submit a join request for moderation
      await alumniAPI.submitJoinRequest({
        ...formData,
        graduationYear: Number(formData.graduationYear),
        latitude,
        longitude,
      });

      setSubmitSuccess(true);

      // Close modal after showing success message
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({ ...errors, form: 'An error occurred. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal" onClick={onClose}>
      <div
        className="modal-content max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {submitSuccess ? (
          <div className="text-center py-8 animate-fadeIn">
            <div className="bg-accent-500/20 text-accent-500 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Request Submitted!</h3>
            <p className="text-white/70 mb-4">
              Your details were sent for admin review. You’ll appear on the globe after approval.
            </p>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Join the Alumni Network</h2>
              <button
                onClick={onClose}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-white/70 mb-1">Full Name</label>
                <div className="relative">
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`input pl-10 ${errors.name ? 'border-red-500' : ''}`}
                    placeholder="John Doe"
                  />
                  <User size={16} className="absolute left-3 top-2.5 text-white/50" />
                </div>
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1">Email</label>
                <div className="relative">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`input pl-10 ${errors.email ? 'border-red-500' : ''}`}
                    placeholder="john.doe@example.com"
                  />
                  <Mail size={16} className="absolute left-3 top-2.5 text-white/50" />
                </div>
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/70 mb-1">Program</label>
                  <div className="relative">
                    <select
                      name="program"
                      value={formData.program}
                      onChange={handleChange}
                      className={`input pl-10 ${errors.program ? 'border-red-500' : ''}`}
                    >
                      <option value="">Select Program</option>
                      {combinedPrograms.map((program) => (
                        <option key={program} value={program}>
                          {program}
                        </option>
                      ))}
                    </select>
                    <GraduationCap size={16} className="absolute left-3 top-2.5 text-white/50" />
                  </div>
                  {errors.program && <p className="text-red-500 text-xs mt-1">{errors.program}</p>}
                </div>

                <div>
                  <label className="block text-sm text-white/70 mb-1">Graduation Year</label>
                  <div className="relative">
                    <select
                      name="graduationYear"
                      value={formData.graduationYear}
                      onChange={handleChange}
                      className={`input pl-10 ${errors.graduationYear ? 'border-red-500' : ''}`}
                    >
                      <option value="">Select Year</option>
                      {combinedYears.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                    <Calendar size={16} className="absolute left-3 top-2.5 text-white/50" />
                  </div>
                  {errors.graduationYear && <p className="text-red-500 text-xs mt-1">{errors.graduationYear}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1">Job Title</label>
                <div className="relative">
                  <input
                    type="text"
                    name="jobTitle"
                    value={formData.jobTitle}
                    onChange={handleChange}
                    className={`input pl-10 ${errors.jobTitle ? 'border-red-500' : ''}`}
                    placeholder="Software Engineer"
                  />
                  <Briefcase size={16} className="absolute left-3 top-2.5 text-white/50" />
                </div>
                {errors.jobTitle && <p className="text-red-500 text-xs mt-1">{errors.jobTitle}</p>}
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1">Company</label>
                <div className="relative">
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className={`input pl-10 ${errors.company ? 'border-red-500' : ''}`}
                    placeholder="Google"
                  />
                  <Building size={16} className="absolute left-3 top-2.5 text-white/50" />
                </div>
                {errors.company && <p className="text-red-500 text-xs mt-1">{errors.company}</p>}
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1">Location</label>
                <div className="relative">
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className={`input pl-10 ${errors.location ? 'border-red-500' : ''}`}
                    placeholder="New York, USA"
                  />
                  <MapPin size={16} className="absolute left-3 top-2.5 text-white/50" />
                </div>
                {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/70 mb-1">LinkedIn (optional)</label>
                  <div className="relative">
                    <input
                      type="url"
                      name="linkedin"
                      value={formData.linkedin}
                      onChange={handleChange}
                      className="input pl-10"
                      placeholder="https://linkedin.com/in/..."
                    />
                    <Linkedin size={16} className="absolute left-3 top-2.5 text-white/50" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-white/70 mb-1">Twitter (optional)</label>
                  <div className="relative">
                    <input
                      type="url"
                      name="twitter"
                      value={formData.twitter}
                      onChange={handleChange}
                      className="input pl-10"
                      placeholder="https://twitter.com/..."
                    />
                    <Twitter size={16} className="absolute left-3 top-2.5 text-white/50" />
                  </div>
                </div>
              </div>

              {errors.form && (
                <div className="bg-red-500/20 text-red-500 p-3 rounded text-sm">
                  {errors.form}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  className="btn btn-primary w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : 'Join Network'}
                </button>
              </div>

              <p className="text-xs text-white/50 text-center mt-4">
                By joining, you agree to our Terms of Service and Privacy Policy.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default JoinNetworkModal;