import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { Marker } from '../types';
// Load the SVG asset as raw text for dynamic tinting per marker color
import locationSvgRaw from '../assets/location.svg?raw';

interface AlumniMarkerProps {
  position: THREE.Vector3;
  marker: Marker;
  onClick: () => void;
  color: string;
  stable: boolean;
  onHover?: (hovered: boolean) => void;
}

const AlumniMarker: React.FC<AlumniMarkerProps> = ({ position, marker, onClick, color, onHover }) => {
  const markerRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [scale] = useState(() => 0.1 + Math.random() * 0.03);

  // Create a texture from the SVG asset, tinted by program color
  const texture = useMemo(() => {
    // Helpers to compute a lighter and darker variant of the base color
    const clamp = (n: number) => Math.max(0, Math.min(255, n));
    const hexToRgb = (hex: string) => {
      const h = hex.replace('#', '');
      const bigint = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
      return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
    };
    const rgbToHex = (r: number, g: number, b: number) =>
      '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
    const lighten = (hex: string, amt: number) => {
      const { r, g, b } = hexToRgb(hex);
      return rgbToHex(clamp(r + amt), clamp(g + amt), clamp(b + amt));
    };
    const darken = (hex: string, amt: number) => {
      const { r, g, b } = hexToRgb(hex);
      return rgbToHex(clamp(r - amt), clamp(g - amt), clamp(b - amt));
    };

    const start = lighten(color, 60); // lighter start
    const end = darken(color, 80);    // darker end

    // Replace the gradient stop colors in the raw SVG with program-tinted colors
    let tintedSvg = locationSvgRaw
      .replace(/stop-color="#[^"]+"/g, (match) => {
        // first stop -> start, second stop -> end
        // Use a counter by checking how many replacements already in the string
        // Simpler: replace the first occurrence with start, second with end
        return match; // placeholder, will do targeted replacements below
      });
    // Perform targeted first/second stop replacements to avoid affecting other stops if added later
    tintedSvg = tintedSvg.replace(
      /(<stop[^>]*offset="0%"[^>]*stop-color=")#[^"]+("[^>]*>)/,
      `$1${start}$2`
    );
    tintedSvg = tintedSvg.replace(
      /(<stop[^>]*offset="100%"[^>]*stop-color=")#[^"]+("[^>]*>)/,
      `$1${end}$2`
    );

    const canvas = document.createElement('canvas');
    canvas.width = 96;
    canvas.height = 96;
    const ctx = canvas.getContext('2d')!;

    const img = new Image();
    const svgBlob = new Blob([tintedSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);

    const canvasTexture = new THREE.CanvasTexture(canvas);

    img.onload = () => {
      ctx.clearRect(0, 0, 96, 96);
      // The SVG already includes a shadow/filter; draw directly
      ctx.drawImage(img, 0, 0, 96, 96);
      canvasTexture.needsUpdate = true;
      URL.revokeObjectURL(url);
    };

    img.src = url;
    return canvasTexture;
  }, [color]); useFrame((state) => {
    if (markerRef.current) {
      // Make the marker always face the camera
      markerRef.current.lookAt(state.camera.position);

      // Enhanced pulse effect based on marker's unique properties
      const t = state.clock.getElapsedTime();
      const uniqueOffset = marker.id.charCodeAt(0) * 0.1;
      const pulseScale = scale * (1 + 0.2 * Math.sin(t * 2 + uniqueOffset));
      markerRef.current.scale.setScalar(hovered ? pulseScale * 1.5 : pulseScale);
    }
  });

  return (
    <mesh
      ref={markerRef}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        onHover?.(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
        onHover?.(false);
        document.body.style.cursor = 'default';
      }}
    >
      {/* SVG location pin icon */}
      <mesh>
        <planeGeometry args={[2.8, 2.8]} />
        <meshBasicMaterial
          map={texture}
          transparent={true}
          opacity={hovered ? 1.0 : 0.95}
          side={THREE.DoubleSide}
          alphaTest={0.1}
        />
      </mesh>
    </mesh>
  );
};

export default AlumniMarker;