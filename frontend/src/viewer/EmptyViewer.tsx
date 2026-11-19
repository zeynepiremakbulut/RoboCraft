import React, { useEffect, useRef } from 'react';

/**
 * EmptyViewer – placeholder shown when no model has been generated yet.
 * Pure HTML/CSS; no R3F canvas required.
 */
const EmptyViewer: React.FC = () => {
  const gradientRef = useRef<HTMLDivElement>(null);

  /* Subtle animated gradient pulse */
  useEffect(() => {
    let frame: number;
    let t = 0;
    const animate = () => {
      t += 0.008;
      const opacity = 0.06 + 0.04 * Math.sin(t);
      if (gradientRef.current) {
        gradientRef.current.style.opacity = String(opacity);
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#0a0a0f',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Pulsing radial gradient in the background */}
      <div
        ref={gradientRef}
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 60% 50% at 50% 50%, #6366f1 0%, transparent 70%)',
          pointerEvents: 'none',
          opacity: 0.08,
          transition: 'opacity 0.1s ease',
        }}
      />

      {/* Centre content */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
          zIndex: 1,
        }}
      >
        {/* Wireframe cube SVG illustration */}
        <WireframeCube />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <p
            style={{
              color: '#c4c4d4',
              fontSize: 18,
              fontWeight: 600,
              fontFamily: 'system-ui, sans-serif',
              margin: 0,
              letterSpacing: '0.01em',
            }}
          >
            Your 3D model will appear here
          </p>
          <p
            style={{
              color: '#5a5a7a',
              fontSize: 14,
              fontFamily: 'system-ui, sans-serif',
              margin: 0,
            }}
          >
            Generate a model to preview it interactively
          </p>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* Wireframe cube drawn with SVG                                        */
/* ------------------------------------------------------------------ */

const WireframeCube: React.FC = () => {
  // Isometric projection of a unit cube, scaled to 100 × 100 viewBox
  const stroke = '#6366f1';
  const strokeDim = '#3b3b6b';
  const strokeW = 1.5;

  return (
    <svg
      width={120}
      height={120}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ animation: 'floatCube 4s ease-in-out infinite' }}
    >
      <style>{`
        @keyframes floatCube {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
      `}</style>

      {/* Back faces (dimmed) */}
      {/* Back-left vertical edge */}
      <line x1="20" y1="30" x2="20" y2="70" stroke={strokeDim} strokeWidth={strokeW} />
      {/* Back-top horizontal */}
      <line x1="20" y1="30" x2="50" y2="15" stroke={strokeDim} strokeWidth={strokeW} />
      {/* Back-right vertical edge */}
      <line x1="80" y1="30" x2="50" y2="15" stroke={strokeDim} strokeWidth={strokeW} />

      {/* Bottom face */}
      <line x1="20" y1="70" x2="50" y2="85" stroke={stroke} strokeWidth={strokeW} />
      <line x1="50" y1="85" x2="80" y2="70" stroke={stroke} strokeWidth={strokeW} />
      <line x1="80" y1="30" x2="80" y2="70" stroke={stroke} strokeWidth={strokeW} />

      {/* Top face */}
      <line x1="20" y1="30" x2="50" y2="45" stroke={stroke} strokeWidth={strokeW} />
      <line x1="50" y1="45" x2="80" y2="30" stroke={stroke} strokeWidth={strokeW} />
      <line x1="50" y1="15" x2="50" y2="45" stroke={stroke} strokeWidth={strokeW} />

      {/* Front vertical edges */}
      <line x1="50" y1="45" x2="50" y2="85" stroke={stroke} strokeWidth={strokeW} />

      {/* Glow dots at corners */}
      {[
        [20, 30], [80, 30], [50, 15],
        [20, 70], [80, 70], [50, 85], [50, 45],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={2.5} fill={stroke} opacity={0.9} />
      ))}
    </svg>
  );
};

export default EmptyViewer;
