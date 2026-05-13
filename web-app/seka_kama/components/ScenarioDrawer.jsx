// components/ScenarioDrawer.jsx
import { useMap } from 'react-leaflet';
import { DrawControl } from '@mapbox/mapbox-gl-draw';

function ScenarioDrawer({ onScenarioSubmit }) {
  const map = useMap();
  
  const handleDrawComplete = async (geometry) => {
    const scenario = {
      geometry: geometry.toGeoJSON(),
      feature_modifications: {
        "longterm_slope_mean": 0.15,  // +15% nightlight trend
        "all_skew_std": 0.05
      },
      management_units: ["Olare-Motorogi", "Mara North"],
      user_query: "What if a new lodge is built here?"
    };
    
    const response = await fetch('/api/scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scenario)
    });
    const result = await response.json();
    
    // Display results
    alert(`Lion abundance change: ${result.delta_lions} lions (${result.delta_percent}%)`);
    onScenarioSubmit(result);
  };
  // Add API calls
    const API_URL = process.env.NEXT_PUBLIC_API_URL;

    const handleScenarioSubmit = async (geometry, modifications) => {
      const response = await fetch(`${API_URL}/scenario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          geometry: geometry,
          feature_modifications: modifications,
          management_units: selectedUnits,
          user_query: userQuery
        })
      });
      
      const result = await response.json();
      displayResults(result);
    };
  return <DrawControl onDrawComplete={handleDrawComplete} />;
}