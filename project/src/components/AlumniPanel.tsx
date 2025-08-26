import React from 'react';
import { X, MapPin, GraduationCap, Briefcase, Mail, Linkedin, Twitter } from 'lucide-react';
import { useAlumniContext } from '../context/AlumniContext';

interface AlumniPanelProps {
  alumniId: string;
  onClose: () => void;
}

const AlumniPanel: React.FC<AlumniPanelProps> = ({ alumniId, onClose }) => {
  const { alumni } = useAlumniContext();
  const alumniData = alumni.find(a => a.id === alumniId);

  if (!alumniData) return null;

  return (
    <div className="absolute bottom-20 md:bottom-auto md:top-20 right-4 md:right-6 lg:right-8 w-full max-w-xs z-10 animate-slideUp">
      <div className="panel">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold">{alumniData.name}</h3>
          <button 
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        
        <div className="space-y-3 text-sm">
          <div className="flex items-center text-white/80">
            <GraduationCap size={16} className="mr-2 text-primary-400" />
            <span>
              {alumniData.program}, Class of {alumniData.graduationYear}
            </span>
          </div>
          
          <div className="flex items-center text-white/80">
            <Briefcase size={16} className="mr-2 text-primary-400" />
            <span>
              {alumniData.jobTitle} at {alumniData.company}
            </span>
          </div>
          
          <div className="flex items-center text-white/80">
            <MapPin size={16} className="mr-2 text-primary-400" />
            <span>{alumniData.location}</span>
          </div>
          
          <div className="pt-2 border-t border-white/10">
            <div className="flex items-center space-x-3 mt-2">
              <a href={`mailto:${alumniData.email}`} className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                <Mail size={14} />
              </a>
              {alumniData.linkedin && (
                <a href={alumniData.linkedin} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                  <Linkedin size={14} />
                </a>
              )}
              {alumniData.twitter && (
                <a href={alumniData.twitter} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                  <Twitter size={14} />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlumniPanel;