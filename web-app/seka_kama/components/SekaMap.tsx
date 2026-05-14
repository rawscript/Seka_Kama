// web-app/seka_kama/components/SekaMap.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { api } from '@/lib/api';
import ScenarioDrawer from './ScenarioDrawer';

interface SekaMapProps {
  onScenarioRun?: (result: any) => void;
}

export default function SekaMap({ onScenarioRun }: SekaMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState<string>('');

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap',
          },
        },
        layers: [
          {
            id: 'osm',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [35.1, -1.25], // Seka Kama center
      zoom: 9,
    });

    map.current.on('load', async () => {
      setLoading(false);
      await loadBaselineData();
      await loadProtectedAreas();
    });

    return () => map.current?.remove();
  }, []);

  const loadBaselineData = async () => {
    const bounds = map.current?.getBounds();
    const bbox = bounds ? {
      minLon: bounds.getWest(),
      minLat: bounds.getSouth(),
      maxLon: bounds.getEast(),
      maxLat: bounds.getNorth(),
    } : undefined;

    const data = await api.getBaseline(selectedUnit || undefined, bbox);
    
    if (map.current?.getSource('lions')) {
      (map.current.getSource('lions') as maplibregl.GeoJSONSource).setData(data);
    } else {
      map.current?.addSource('lions', {
        type: 'geojson',
        data: data as any,
      });
      
      map.current?.addLayer({
        id: 'lions',
        type: 'circle',
        source: 'lions',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'lion_density'],
            0, 4,
            10, 8,
            20, 12,
            30, 16,
          ],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'lion_density'],
            0, '#feb24c',
            10, '#fd8d3c',
            20, '#f03b20',
            30, '#bd0026',
          ],
          'circle-opacity': 0.7,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#fff',
        },
      });
    }
  };

  const loadProtectedAreas = async () => {
    const data = await api.getProtectedAreas();
    
    if (map.current?.getSource('protected')) {
      (map.current.getSource('protected') as maplibregl.GeoJSONSource).setData(data);
    } else {
      map.current?.addSource('protected', {
        type: 'geojson',
        data: data as any,
      });
      
      map.current?.addLayer({
        id: 'protected',
        type: 'fill',
        source: 'protected',
        paint: {
          'fill-color': '#2c7fb8',
          'fill-opacity': 0.3,
          'fill-outline-color': '#1c5a8a',
        },
      });
    }
  };

  const handleDrawComplete = async (geometry: GeoJSON.Polygon, modifications: Record<string, number>, query: string) => {
    const result = await api.runScenario({
      geometry,
      feature_modifications: modifications,
      management_units: selectedUnit ? [selectedUnit] : undefined,
      user_query: query,
    });
    
    onScenarioRun?.(result);
    
    // Show popup with results
    new maplibregl.Popup()
      .setLngLat(geometry.coordinates[0][0] as [number, number])
      .setHTML(`
        <div style="padding: 10px;">
          <h3>Scenario Result</h3>
          <p>Lion change: ${result.delta_lions.toFixed(1)} (${result.delta_percent.toFixed(1)}%)</p>
          <p>Total: ${result.predicted_total_lions.toFixed(0)} lions</p>
          <small>${result.llm_narrative.substring(0, 200)}...</small>
        </div>
      `)
      .addTo(map.current!);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      
      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000 }}>
        <select 
          value={selectedUnit} 
          onChange={(e) => setSelectedUnit(e.target.value)}
          style={{ padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
        >
          <option value="">All Conservancies</option>
          <option value="Mara North">Mara North</option>
          <option value="Olare-Motorogi">Olare-Motorogi</option>
          <option value="Naboisho">Naboisho</option>
          <option value="Ol Kinyei">Ol Kinyei</option>
        </select>
      </div>
      
      <ScenarioDrawer onDrawComplete={handleDrawComplete} />
      
      {loading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'white',
          padding: 20,
          borderRadius: 8,
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          zIndex: 1000,
        }}>
          Loading Seka Kama Digital Twin...
        </div>
      )}
    </div>
  );
}