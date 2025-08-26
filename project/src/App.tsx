import { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import Layout from './components/Layout';
import Globe from './components/Globe';
import CameraController from './components/CameraController';
import AlumniPanel from './components/AlumniPanel';
import JoinNetworkModal from './components/JoinNetworkModal';
import LoadingScreen from './components/LoadingScreen';
import LoadingOverlay from './components/LoadingOverlay';
import Toast from './components/Toast';
import { AlumniProvider, useAlumniContext } from './context/AlumniContext';
import type { Alumni } from './types';

function AppContent() {
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedAlumni, setSelectedAlumni] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(true);
  const [showFilterToast, setShowFilterToast] = useState(false);
  const [filterResultCount, setFilterResultCount] = useState(0);
  const [zoomTarget, setZoomTarget] = useState<Alumni | null>(null);
  const { isLoading, error } = useAlumniContext();

  const showFilterResults = (filtered: Alumni[] | null) => {
    // If null, filters were cleared
    if (filtered === null) {
      setShowFilterToast(false);
      setZoomTarget(null);
    } else {
      // Filters were applied
      setFilterResultCount(filtered.length);
      setShowFilterToast(true);
      // If there are results, set the first one as the target for zooming
      if (filtered.length > 0) {
        setZoomTarget(filtered[0]);
      } else {
        setZoomTarget(null);
      }
    }
  };

  if (isLoading) {
    return <LoadingOverlay message="Loading alumni data..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Error Loading Data</h2>
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <Layout
      onJoinNetwork={() => setShowJoinModal(true)}
      onFilterApplied={showFilterResults}
      showFilterToast={showFilterToast}
      filterResultCount={filterResultCount}
    >
      <div className="w-full h-full relative">
        <Suspense fallback={<LoadingScreen />}>
          <Canvas
            camera={{ position: [0, 0, 15], fov: 45 }}
            className="w-full h-full"
            dpr={[1, 2]}
          >
            <ambientLight intensity={1.5} />
            <Suspense fallback={null}>
              <Globe
                onSelectAlumni={setSelectedAlumni}
                zoomTarget={zoomTarget}
              />
              <Stars radius={300} depth={50} count={5000} factor={4} />
            </Suspense>
            <CameraController />
          </Canvas>
        </Suspense>

        {selectedAlumni && (
          <AlumniPanel
            alumniId={selectedAlumni}
            onClose={() => setSelectedAlumni(null)}
          />
        )}

        {showJoinModal && (
          <JoinNetworkModal onClose={() => setShowJoinModal(false)} />
        )}

        {showToast && (
          <Toast onClose={() => setShowToast(false)} />
        )}
      </div>
    </Layout>
  );
}

function App() {
  return (
    <AlumniProvider>
      <AppContent />
    </AlumniProvider>
  );
}
export default App;
