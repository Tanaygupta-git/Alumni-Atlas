import React, { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useAlumniContext } from '../context/AlumniContext';

const CameraController: React.FC = () => {
    const { camera } = useThree();
    const { setCameraControls } = useAlumniContext();
    const controlsRef = useRef<any>();

    useEffect(() => {
        if (controlsRef.current) {
            setCameraControls(controlsRef.current);
        }

        return () => {
            setCameraControls(null);
        };
    }, [setCameraControls]);

    // Set initial camera position for globe view
    useEffect(() => {
        camera.position.set(0, 0, 15);
    }, [camera]);

    return (
        <OrbitControls
            ref={controlsRef}
            enableDamping={true}
            dampingFactor={0.05}
            minDistance={7}
            maxDistance={20}
            autoRotate={false}
            autoRotateSpeed={0.5}
        />
    );
};

export default CameraController;
