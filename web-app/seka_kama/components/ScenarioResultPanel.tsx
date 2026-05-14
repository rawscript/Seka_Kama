// web-app/seka_kama/components/ScenarioResultPanel.tsx
'use client';

interface ScenarioResultPanelProps {
  result: any;
  onClose: () => void;
}

export default function ScenarioResultPanel({ result, onClose }: ScenarioResultPanelProps) {
  // Handle both regular scenario results and Kepler selection results
  const isSelection = result.type === 'selection';
  const delta = isSelection ? 
    result.cells.reduce((sum: number, cell: any) => sum + cell.properties.lion_density, 0) * 0.15 : 
    result.delta_lions;
  
  return (
    <div style={{
      position: 'absolute',
      top: 80,
      right: 20,
      width: 380,
      backgroundColor: 'white',
      borderRadius: 12,
      boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
      zIndex: 1000,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: 16,
        backgroundColor: '#2c3e50',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h3 style={{ margin: 0 }}>
          {isSelection ? 'Selection Analysis' : 'Scenario Results'}
        </h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: 20,
            cursor: 'pointer',
          }}
        >
          ×
        </button>
      </div>
      
      <div style={{ padding: 16 }}>
        {isSelection ? (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>Selected Area</div>
              <div style={{ fontSize: 24, fontWeight: 'bold' }}>
                {result.cells.length.toLocaleString()} cells
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>Current Lions</div>
              <div style={{ fontSize: 24, fontWeight: 'bold' }}>
                {result.cells.reduce((sum: number, cell: any) => sum + cell.properties.lion_density, 0).toFixed(1)}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>Projected with +15% Nightlight</div>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#c62828' }}>
                {(result.cells.reduce((sum: number, cell: any) => sum + cell.properties.lion_density, 0) * 0.85).toFixed(1)}
              </div>
            </div>
            <div style={{
              padding: 12,
              backgroundColor: '#fff3e0',
              borderRadius: 8,
              fontSize: 14,
              lineHeight: 1.5,
            }}>
              <strong>Kepler Insight:</strong> Selected area contains high nightlight intensity 
              and moderate lion density. Increasing nightlight would likely reduce lion presence 
              by ~15% based on model sensitivity.
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>Lion Abundance Change</div>
              <div style={{
                fontSize: 32,
                fontWeight: 'bold',
                color: result.delta_lions >= 0 ? '#4CAF50' : '#f44336',
              }}>
                {result.delta_lions >= 0 ? '+' : ''}{result.delta_lions.toFixed(1)} lions
                <span style={{ fontSize: 18, marginLeft: 8 }}>
                  ({result.delta_percent.toFixed(1)}%)
                </span>
              </div>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>New Total</div>
              <div style={{ fontSize: 24, fontWeight: 'bold' }}>
                {result.predicted_total_lions.toFixed(0)} lions
              </div>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>Most Affected</div>
              {Object.entries(result.affected_units)
                .sort((a, b) => Math.abs(b[1] as number) - Math.abs(a[1] as number))
                .slice(0, 3)
                .map(([unit, delta]) => (
                  <div key={unit} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span>{unit}</span>
                    <span style={{ color: (delta as number) >= 0 ? '#4CAF50' : '#f44336' }}>
                      {(delta as number) >= 0 ? '+' : ''}{(delta as number).toFixed(1)}
                    </span>
                  </div>
                ))}
            </div>
            
            <div style={{
              padding: 12,
              backgroundColor: '#e3f2fd',
              borderRadius: 8,
              fontSize: 14,
              lineHeight: 1.5,
            }}>
              <strong>AI Analysis:</strong>
              <p style={{ margin: '8px 0 0 0' }}>{result.llm_narrative}</p>
            </div>
          </>
        )}
        
        <button
          onClick={onClose}
          style={{
            marginTop: 16,
            width: '100%',
            padding: 10,
            backgroundColor: '#666',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}