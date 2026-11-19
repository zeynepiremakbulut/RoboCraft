import React, {
  Suspense,
  useRef,
  useState,
  useEffect,
  useCallback,
  ErrorInfo,
} from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  OrbitControls,
  Grid,
  Html,
  useGLTF,
  useProgress,
} from '@react-three/drei';
import * as THREE from 'three';

THREE.Cache.enabled = true;
import { RotateCcw, Home, Maximize2, Minimize2, Download } from 'lucide-react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import LoadingSpinner from './LoadingSpinner';

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export interface ModelViewerProps {
  modelUrl: string;
  jobId: string;
  format: string;
  onDownload?: (format: string) => void;
}

interface UseCameraControlsReturn {
  resetCamera: () => void;
  toggleAutoRotate: () => void;
  isAutoRotating: boolean;
}

/* ------------------------------------------------------------------ */
/* useCameraControls hook                                               */
/* ------------------------------------------------------------------ */

export function useCameraControls(
  controlsRef: React.RefObject<OrbitControlsImpl | null>
): UseCameraControlsReturn {
  const [isAutoRotating, setIsAutoRotating] = useState(false);

  const resetCamera = useCallback(() => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;
    controls.reset();
  }, [controlsRef]);

  const toggleAutoRotate = useCallback(() => {
    setIsAutoRotating((prev) => {
      const next = !prev;
      if (controlsRef.current) {
        controlsRef.current.autoRotate = next;
      }
      return next;
    });
  }, [controlsRef]);

  return { resetCamera, toggleAutoRotate, isAutoRotating };
}

/* ------------------------------------------------------------------ */
/* Inner model component (runs inside Canvas)                          */
/* ------------------------------------------------------------------ */

interface ModelProps {
  url: string;
}

function Model({ url }: ModelProps) {
  const { scene } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);

  /* Centre + auto-scale to fit view */
  useEffect(() => {
    if (!groupRef.current) return;

    const box = new THREE.Box3().setFromObject(groupRef.current);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z);
    const targetSize = 2.5; // world units to fill
    const scale = maxDim > 0 ? targetSize / maxDim : 1;

    groupRef.current.scale.setScalar(scale);
    groupRef.current.position.set(
      -center.x * scale,
      -box.min.y * scale,
      -center.z * scale
    );
  }, [scene]);

  /* Enable shadows on all meshes */
  useEffect(() => {
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  return <primitive ref={groupRef} object={scene} />;
}

/* ------------------------------------------------------------------ */
/* Error boundary for model loading failures                            */
/* ------------------------------------------------------------------ */

interface ModelErrorBoundaryState {
  hasError: boolean;
  errorMsg: string;
}

class ModelErrorBoundary extends React.Component<
  React.PropsWithChildren<Record<string, unknown>>,
  ModelErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<Record<string, unknown>>) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(error: Error): ModelErrorBoundaryState {
    return { hasError: true, errorMsg: error.message };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    console.error('[ModelViewer] Model load error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Html center>
          <div
            style={{
              background: '#1a1a2e',
              border: '1px solid #ef4444',
              borderRadius: 8,
              padding: '16px 24px',
              color: '#f87171',
              fontFamily: 'system-ui, sans-serif',
              fontSize: 13,
              maxWidth: 300,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 8 }}>⚠️</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>
              Failed to load model
            </div>
            <div style={{ color: '#a0a0b8', fontSize: 11 }}>
              {this.state.errorMsg || 'Unknown error'}
            </div>
          </div>
        </Html>
      );
    }
    return this.props.children;
  }
}

/* ------------------------------------------------------------------ */
/* Scene lighting                                                       */
/* ------------------------------------------------------------------ */

function Lighting() {
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-5, 5, -5]} intensity={0.8} />
      <directionalLight position={[0, -5, 0]} intensity={0.3} />
      <pointLight position={[0, 4, 3]} intensity={0.6} color="#818cf8" />
      <hemisphereLight args={['#2a2a4e', '#0a0a0f', 0.5]} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* CameraRig – syncs autoRotate state to OrbitControls ref             */
/* ------------------------------------------------------------------ */

interface CameraRigProps {
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  isAutoRotating: boolean;
}

function CameraRig({ controlsRef, isAutoRotating }: CameraRigProps) {
  useFrame(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = isAutoRotating;
    }
  });
  return null;
}

/* ------------------------------------------------------------------ */
/* Overlay control button                                               */
/* ------------------------------------------------------------------ */

interface ControlBtnProps {
  onClick: () => void;
  title: string;
  active?: boolean;
  children: React.ReactNode;
}

function ControlBtn({ onClick, title, active, children }: ControlBtnProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        borderRadius: 8,
        border: `1px solid ${active ? '#6366f1' : '#2a2a3e'}`,
        background: active ? 'rgba(99,102,241,0.2)' : 'rgba(10,10,15,0.75)',
        color: active ? '#818cf8' : '#a0a0c0',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        backdropFilter: 'blur(8px)',
      }}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Main ModelViewer component                                           */
/* ------------------------------------------------------------------ */

const ModelViewer: React.FC<ModelViewerProps> = ({
  modelUrl,
  jobId: _jobId,
  format,
  onDownload,
}) => {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { resetCamera, toggleAutoRotate, isAutoRotating } =
    useCameraControls(controlsRef);

  /* Fullscreen API */
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  }, []);

  useEffect(() => {
    const handler = () =>
      setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  /* Determine download URL – proxied through Vite to avoid CORS */
  const downloadUrl = modelUrl;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#0a0a0f',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      {/* ---- 3-D Canvas ---- */}
      <Canvas
        shadows
        camera={{ fov: 45, position: [0, 2, 5] }}
        gl={{ antialias: true }}
        style={{ background: '#0a0a0f' }}
      >
        <Lighting />

        {/* Grid floor */}
        <Grid
          position={[0, -1, 0]}
          args={[20, 20]}
          cellSize={0.5}
          sectionSize={3}
          cellColor="#1e1e2e"
          sectionColor="#2a2a3e"
          fadeDistance={20}
          infiniteGrid={false}
        />

        {/* Model with Suspense */}
        <Suspense fallback={null}>
          <ModelErrorBoundary>
            <Model url={modelUrl} />
          </ModelErrorBoundary>
        </Suspense>

        {/* Orbit controls */}
        <OrbitControls
          ref={controlsRef}
          makeDefault
          enablePan
          enableZoom
          enableRotate
          autoRotate={isAutoRotating}
          minDistance={1}
          maxDistance={20}
        />

        <CameraRig
          controlsRef={controlsRef}
          isAutoRotating={isAutoRotating}
        />
      </Canvas>

      {/* ---- Suspense loading overlay (outside Canvas for full coverage) ---- */}
      <CanvasLoadingOverlay modelUrl={modelUrl} />

      {/* ---- Top-right controls ---- */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          zIndex: 30,
        }}
      >
        <ControlBtn
          onClick={toggleAutoRotate}
          title={isAutoRotating ? 'Stop rotation' : 'Auto-rotate'}
          active={isAutoRotating}
        >
          <RotateCcw size={16} />
        </ControlBtn>

        <ControlBtn onClick={resetCamera} title="Reset camera">
          <Home size={16} />
        </ControlBtn>

        <ControlBtn
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          active={isFullscreen}
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </ControlBtn>
      </div>

      {/* ---- Bottom info + download panel ---- */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          right: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 30,
        }}
      >
        {/* Format badge */}
        <span
          style={{
            background: 'rgba(99,102,241,0.2)',
            border: '1px solid rgba(99,102,241,0.4)',
            borderRadius: 6,
            color: '#818cf8',
            fontSize: 11,
            fontWeight: 600,
            fontFamily: 'system-ui, sans-serif',
            padding: '3px 10px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            backdropFilter: 'blur(8px)',
          }}
        >
          {format}
        </span>

        {/* Download button */}
        {onDownload ? (
          <button
            onClick={() => onDownload(format)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(99,102,241,0.85)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '7px 14px',
              fontSize: 13,
              fontFamily: 'system-ui, sans-serif',
              fontWeight: 600,
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Download size={14} />
            Download {format.toUpperCase()}
          </button>
        ) : (
          <a
            href={downloadUrl}
            download={`model.${format}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(99,102,241,0.85)',
              color: '#fff',
              borderRadius: 8,
              padding: '7px 14px',
              fontSize: 13,
              fontFamily: 'system-ui, sans-serif',
              fontWeight: 600,
              textDecoration: 'none',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Download size={14} />
            Download {format.toUpperCase()}
          </a>
        )}
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Loading overlay – tracks whether the GLTF has resolved yet          */
/* ------------------------------------------------------------------ */

/**
 * We render this outside the Canvas so it covers the full viewer area
 * during the initial load. It listens to the same useGLTF promise via
 * a simple polling approach on the THREE cache.
 */
function CanvasLoadingOverlay({ modelUrl: _modelUrl }: { modelUrl: string }) {
  const { active, progress } = useProgress();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    // Safety timeout: after 2.5s, always hide the overlay to reveal the model
    const timer = setTimeout(() => setTimedOut(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  if (timedOut || (!active && progress === 100)) return null;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 15,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(10, 10, 15, 0.75)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <LoadingSpinner />
    </div>
  );
}

export default ModelViewer;
