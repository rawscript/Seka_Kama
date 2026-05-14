// web-app/seka_kama/components/ScenarioDrawer.tsx
'use client';

import { useState } from 'react';
import { DrawControl } from '@mapbox/mapbox-gl-draw';
import { useMap } from 'react-map-gl';

interface ScenarioDrawerProps {
  onDrawComplete: (geometry: any, modifications: Record<string, number>, query: string) => void;
}

const DEFAULT_MODIFICATIONS = {
  longterm_slope_mean: 0.15,  // +15% nightlight trend
  all_skew_std: 0.05,          // +5% heterogeneity
};

export default function ScenarioDrawer({ onDrawComplete }: ScenarioDrawerProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [modifications, setModifications] = useState(DEFAULT_MODIFICATIONS);
  const [userQuery, setUserQuery] = useState('');
  const [drawnGeometry, setDrawnGeometry] = useState<any>(null);

  const startDrawing = () => {
    setIsDrawing(true);
    // Initialize draw control
    const draw = new DrawControl({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
    });
    // Add to map...
  };

  const handleSubmit = () => {
    if (drawnGeometry) {
      onDrawComplete(drawnGeometry, modifications, userQuery);
      setIsDrawing(false);
      setDrawnGeometry(null);
      setUserQuery('');
    }
  };

  return (
    <div style={{
      position: 'absolute',
      bottom: 20,
      left: 20,
      right: 20,
      backgroundColor: 'white',
      borderRadius: 8,
      boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
      padding: 16,
      zIndex: 1000,
      maxWidth: 400,
    }}>
      <h3 style={{ margin: '0 0 12px 0' }}>What-If Scenario</h3>
      
      <button
        onClick={startDrawing}
        style={{
          width: '100%',
          padding: 10,
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          marginBottom: 12,
        }}
      >
        {isDrawing ? 'Drawing... Click on map to draw polygon' : 'Draw Area on Map'}
      </button>
      
      {isDrawing && drawnGeometry && (
        <>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4 }}>Scenario Description:</label>
            <textarea
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="e.g., What if a new lodge is built here?"
              style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
              rows={2}
            />
          </div>
          
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4 }}>Nightlight Trend Change:</label>
            <input
              type="range"
              min="-0.3"
              max="0.3"
              step="0.01"
              value={modifications.longterm_slope_mean}
              onChange={(e) => setModifications({
                ...modifications,
                longterm_slope_mean: parseFloat(e.target.value),
              })}
              style={{ width: '100%' }}
            />
            <span>{((modifications.longterm_slope_mean || 0) * 100).toFixed(0)}%</span>
          </div>
          
          <button
            onClick={handleSubmit}
            style={{
              width: '100%',
              padding: 10,
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Run Scenario
          </button>
        </>
      )}
      
      <div style={{ fontSize: 12, color: '#666', marginTop: 12 }}>
        <strong>Tip:</strong> Draw a polygon on the map to simulate new development.
        The model will predict lion abundance changes based on increased nightlight.
      </div>
    </div>
  );
}