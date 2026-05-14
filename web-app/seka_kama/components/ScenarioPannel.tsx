// web-app/seka_kama/components/ScenarioPanel.tsx
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Scenario {
  scenario_id: number;
  created_at: string;
  user_description: string;
  modified_features: Record<string, number>;
  predicted_lion_delta: number;
  affected_cells: number;
  llm_narrative: string;
}

interface ScenarioPanelProps {
  onScenarioSelect: (scenario: Scenario) => void;
}

export default function ScenarioPanel({ onScenarioSelect }: ScenarioPanelProps) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadScenarios = async () => {
      try {
        // Fetch scenarios from backend
        const response = await fetch('/api/scenarios/history');
        const data = await response.json();
        setScenarios(data);
      } catch (error) {
        console.error('Failed to load scenarios:', error);
        // Mock data for demo
        setScenarios([
          {
            scenario_id: 1,
            created_at: new Date().toISOString(),
            user_description: 'New lodge in Mara North',
            modified_features: { longterm_slope_mean: 0.15 },
            predicted_lion_delta: -12.5,
            affected_cells: 145,
            llm_narrative: 'Development would displace approximately 12 lions...',
          },
          {
            scenario_id: 2,
            created_at: new Date(Date.now() - 86400000).toISOString(),
            user_description: 'Road expansion near Olare-Motorogi',
            modified_features: { longterm_slope_mean: 0.25, all_skew_std: 0.1 },
            predicted_lion_delta: -28.3,
            affected_cells: 320,
            llm_narrative: 'Road expansion would significantly fragment habitat...',
          },
        ]);
      } finally {
        setLoading(false);
      }
    };
    loadScenarios();
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        backgroundColor: '#f5f5f5',
      }}>
        Loading scenario history...
      </div>
    );
  }

  return (
    <div style={{
      padding: 20,
      backgroundColor: '#f5f5f5',
      height: '100%',
      overflow: 'auto',
    }}>
      <h1 style={{ marginBottom: 20 }}>Scenario History</h1>
      
      <div style={{ display: 'grid', gap: 16 }}>
        {scenarios.map((scenario) => (
          <div
            key={scenario.scenario_id}
            style={{
              backgroundColor: 'white',
              borderRadius: 8,
              padding: 16,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onClick={() => onScenarioSelect(scenario)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <h3 style={{ margin: '0 0 8px 0' }}>
                  Scenario #{scenario.scenario_id}
                </h3>
                <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: 14 }}>
                  {scenario.user_description || 'Custom scenario'}
                </p>
              </div>
              <div style={{
                padding: '4px 12px',
                borderRadius: 20,
                backgroundColor: scenario.predicted_lion_delta < 0 ? '#ffebee' : '#e8f5e9',
                color: scenario.predicted_lion_delta < 0 ? '#c62828' : '#2e7d32',
                fontSize: 14,
                fontWeight: 'bold',
              }}>
                {scenario.predicted_lion_delta >= 0 ? '+' : ''}{scenario.predicted_lion_delta.toFixed(1)} lions
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: '#888' }}>
              <span>📅 {new Date(scenario.created_at).toLocaleDateString()}</span>
              <span>📍 {scenario.affected_cells} cells affected</span>
              <span>🔧 {Object.keys(scenario.modified_features).join(', ')}</span>
            </div>
            
            <p style={{
              margin: '12px 0 0 0',
              fontSize: 14,
              color: '#555',
              lineHeight: 1.5,
            }}>
              {scenario.llm_narrative.substring(0, 150)}...
            </p>
            
            <button
              style={{
                marginTop: 12,
                padding: '6px 16px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 12,
              }}
              onClick={(e) => {
                e.stopPropagation();
                onScenarioSelect(scenario);
              }}
            >
              Load & Re-run
            </button>
          </div>
        ))}
      </div>
      
      {scenarios.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: 40,
          color: '#888',
        }}>
          No scenarios yet. Create your first scenario using the Spatial Analysis tab.
        </div>
      )}
    </div>
  );
}