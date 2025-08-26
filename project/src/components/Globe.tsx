import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { TextureLoader } from 'three';
import AlumniMarker from './AlumniMarker';
import { useAlumniContext } from '../context/AlumniContext';
import type { Alumni } from '../types';

interface GlobeProps {
  onSelectAlumni: (id: string) => void;
  onHoverChange?: (hovered: boolean) => void;
  zoomTarget: Alumni | null;
}

const Globe: React.FC<GlobeProps> = ({ onSelectAlumni, onHoverChange, zoomTarget }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [markerHovered, setMarkerHovered] = useState(false);
  const { filteredAlumni, cameraControls } = useAlumniContext();
  const rotationSpeed = 0.002;
  const { camera } = useThree();

  // State for managing the zoom animation
  const animationState = useRef({
    isAnimating: false,
    isPausing: false,
    isClearAction: false,
    startPosition: new THREE.Vector3(),
    targetPosition: new THREE.Vector3(),
    startTime: 0,
    duration: 1600,
  }).current;

  // Enable auto-rotation shortly after mount
  useEffect(() => {
    if (cameraControls && groupRef.current) {
      setTimeout(() => {
        cameraControls.autoRotate = true;
        animationState.isAnimating = false;
        animationState.isPausing = false;
      }, 100);
    }
  }, [cameraControls]);

  // Trigger zoom animation when the zoomTarget changes
  useEffect(() => {
    if (zoomTarget === null && cameraControls) {
      // Filters were cleared - reset to normal view
      animationState.isAnimating = false;
      animationState.isPausing = false;
      animationState.isClearAction = true;

      // Reset globe rotation to 0
      if (groupRef.current && atmosphereRef.current) {
        groupRef.current.rotation.y = 0;
        atmosphereRef.current.rotation.y = 0;
      }

      // Animate camera back to normal position
      animationState.isAnimating = true;
      animationState.startPosition.copy(camera.position);
      animationState.targetPosition.set(0, 0, 15);
      animationState.startTime = performance.now();

    } else if (zoomTarget && cameraControls) {
      // Mark as NOT a clear action - pause needed after navigation
      animationState.isClearAction = false;
      // Disable auto rotation during navigation
      cameraControls.autoRotate = false;

      // Reset globe rotation to ensure marker is in expected position
      if (groupRef.current && atmosphereRef.current) {
        groupRef.current.rotation.y = 0;
        atmosphereRef.current.rotation.y = 0;
      }

      // Start animation
      animationState.isAnimating = true;
      animationState.startPosition.copy(camera.position);

      // Calculate target position with a comfortable viewing distance
      animationState.targetPosition = latLongToVector3(zoomTarget.latitude, zoomTarget.longitude, 9);

      animationState.startTime = performance.now();
    }
  }, [zoomTarget, cameraControls, animationState, camera.position]);

  // Main animation loop
  useFrame(() => {
    // Handle the zoom animation if it's active
    if (animationState.isAnimating) {
      const elapsed = performance.now() - animationState.startTime;
      let progress = Math.min(elapsed / animationState.duration, 1);
      // Apply easing function for a smooth effect
      progress = 1 - Math.pow(1 - progress, 3);

      camera.position.lerpVectors(animationState.startPosition, animationState.targetPosition, progress);
      camera.lookAt(0, 0, 0);

      // When animation finishes
      if (progress >= 1) {
        animationState.isAnimating = false;

        // Only pause if this is NOT a clear action
        if (!animationState.isClearAction) {
          animationState.isPausing = true; // Start 5-second pause for navigation
          setTimeout(() => {
            animationState.isPausing = false;
            if (cameraControls) {
              cameraControls.autoRotate = true;
            }
          }, 5000);
        } else {
          // Clear action - start rotating immediately
          animationState.isPausing = false;
          if (cameraControls) {
            cameraControls.autoRotate = true;
          }
        }
      }
    } else if (groupRef.current && atmosphereRef.current && cameraControls) {
      // Handle the regular auto-rotation when not animating
      // Enable/disable auto-rotation based on hover state, animation, and pause
      const shouldRotate = !markerHovered && !hovered && !animationState.isAnimating && !animationState.isPausing;

      if (shouldRotate) {
        // Enable auto-rotation when should be rotating
        if (!cameraControls.autoRotate) {
          cameraControls.autoRotate = true;
        }
        groupRef.current.rotation.y += rotationSpeed;
        atmosphereRef.current.rotation.y = groupRef.current.rotation.y;
      } else {
        // Disable auto-rotation when hovering, animating, or pausing
        if (cameraControls.autoRotate) {
          cameraControls.autoRotate = false;
        }
      }
    }
  });

  // Load high-quality Earth textures
  const [colorMap] = useLoader(TextureLoader, [
    'https://unpkg.com/three-globe@2.30.0/example/img/earth-blue-marble.jpg'
  ]);

  // Program-based color mapping
  const programColors = useMemo(() => ({
    'Computer Science': '#00FF00',        // Bright green
    'Data Science': '#0080FF',           // Bright blue
    'Business Administration': '#FFFF00', // Bright yellow
    'MBA': '#FF8000',                    // Bright orange
    'Digital Marketing': '#FF0000',       // Bright red
    'Marketing': '#FF4000',              // Red-orange
    'Artificial Intelligence': '#0040FF', // Blue
    'Cybersecurity': '#FF0040',          // Red
    'Mechanical Engineering': '#00C0FF',  // Light blue
    'Software Engineering': '#40FF00',    // Green
    'Finance': '#FFAA00',                // Orange-yellow
    'Biomedical Engineering': '#00FFAA',  // Green-blue
    'Robotics': '#4080FF',               // Blue
    'Environmental Science': '#80FF00',   // Yellow-green
    'default': '#0080FF'                 // Bright blue
  }), []);

  // Notify parent about hover state changes
  useEffect(() => {
    onHoverChange?.(hovered || markerHovered);
  }, [hovered, markerHovered, onHoverChange]);

  // Latitude/longitude to 3D sphere coordinates conversion
  const latLongToVector3 = (lat: number, lon: number, radius: number): THREE.Vector3 => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    return new THREE.Vector3(x, y, z);
  };

  const handleMarkerClick = (id: string) => {
    onSelectAlumni(id);
  };

  return (
    <group
      ref={groupRef}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Earth sphere with high-resolution textures */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[5, 128, 128]} />
        <meshStandardMaterial
          map={colorMap}
          transparent={false}
          side={THREE.FrontSide}
          roughness={0.6}
          metalness={0.02}
        />
      </mesh>

      {/* Atmosphere glow effect */}
      <mesh ref={atmosphereRef}>
        <sphereGeometry args={[5.3, 64, 64]} />
        <meshBasicMaterial
          color="#4da6ff"
          transparent={true}
          opacity={0.06}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Alumni markers positioned at geographic coordinates */}
      {filteredAlumni.map((marker) => {
        // Use radius 5.15 to position markers slightly above the globe surface
        const position = latLongToVector3(marker.latitude, marker.longitude, 5.15);
        const markerColor = programColors[marker.program as keyof typeof programColors] || programColors.default;

        return (
          <AlumniMarker
            key={marker.id}
            position={position}
            marker={marker}
            onClick={() => handleMarkerClick(marker.id)}
            color={markerColor}
            stable={true}
            onHover={setMarkerHovered}
          />
        );
      })}
    </group>
  );
};

export default Globe;
