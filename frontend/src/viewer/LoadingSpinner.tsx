import React from 'react';

/**
 * LoadingSpinner – shown as the Suspense fallback while the GLB model loads.
 * Uses pure CSS animation; no R3F canvas needed.
 */
const LoadingSpinner: React.FC = () => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#0a0a0f',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
      }}
    >
      {/* Animated ring */}
      <div style={{ position: 'relative', width: 72, height: 72 }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '3px solid #1e1e2e',
            borderTopColor: '#6366f1',
            animation: 'spin 1s linear infinite',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 10,
            borderRadius: '50%',
            border: '2px solid #1e1e2e',
            borderBottomColor: '#818cf8',
            animation: 'spin 1.5s linear infinite reverse',
          }}
        />
        {/* Center dot */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#6366f1',
              animation: 'pulse 1s ease-in-out infinite',
            }}
          />
        </div>
      </div>

      <p
        style={{
          color: '#a5a5c0',
          fontSize: 14,
          fontFamily: 'system-ui, sans-serif',
          letterSpacing: '0.05em',
          margin: 0,
        }}
      >
        Loading 3D Model...
      </p>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.5; transform: scale(0.7); }
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;
