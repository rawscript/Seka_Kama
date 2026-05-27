'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import './react-polyfill';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useDispatch, Provider } from 'react-redux';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import { taskMiddleware } from 'react-palm/tasks';
import KeplerGl from '@kepler.gl/components';
import { addDataToMap } from '@kepler.gl/actions';
import { keplerGlReducer } from '@kepler.gl/reducers';
import { StyleSheetManager } from 'styled-components';

import { api, type GridCell } from '@/services/api';
import { createKeplerConfig } from '@/services/kepler-config';

interface KeplerMapProps {
  managementUnit?: string;
  onCellSelect?: (cellId: number) => void;
  onScenarioApply?: (cells: any[], modifications: Record<string, number>) => void;
}

// ── Redux Setup ─────────────────────────────────────────────────────────────
const reducers = combineReducers({
  keplerGl: keplerGlReducer,
});

// Create store with palm middleware for task handling
const store = createStore(reducers, {}, applyMiddleware(taskMiddleware));

function KeplerMapInner({ managementUnit, onCellSelect, onScenarioApply }: KeplerMapProps) {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) return;
    
    try {
      setIsLoading(true);
      setError(null);

      // Fetch both baseline and protected areas
      const [baselineResponse, protectedResponse] = await Promise.all([
        api.getBaseline(managementUnit),
        api.getProtectedAreas(),
      ]);

      // Extract management units for the filter config
      const managementUnits: string[] = Array.from(
        new Set(
          (baselineResponse.features || [])
            .map((f: any) => f.properties?.management_unit)
            .filter((u: any): u is string => !!u)
        )
      );

      const keplerConfig = createKeplerConfig(managementUnits);

      // Add data to Map with direct GeoJSON datasets for better reliability
      dispatch(
        addDataToMap({
          datasets: [
            {
              info: { id: 'grid_cells', label: 'Lion Density Grid' },
              data: {
                fields: [
                  { name: 'geometry', type: 'geojson' },
                  { name: 'lion_density', type: 'real' },
                  { name: 'management_unit', type: 'string' },
                  { name: 'nightlight_intensity', type: 'real' },
                  { name: 'nightlight_trend', type: 'real' },
                  { name: 'dist_km', type: 'real' }
                ],
                rows: (baselineResponse.features || []).map((f: any) => [
                  f.geometry,
                  f.properties.lion_density || 0,
                  f.properties.management_unit || 'Unknown',
                  f.properties.nightlight_intensity || 0,
                  f.properties.nightlight_trend || 0,
                  f.properties.distance_to_protected_km || 0
                ]),
              },
            },
            {
              info: { id: 'protected_areas', label: 'Protected Areas' },
              data: {
                fields: [
                  { name: 'geometry', type: 'geojson' },
                  { name: 'site_name', type: 'string' },
                  { name: 'designation', type: 'string' }
                ],
                rows: (protectedResponse.features || []).map((f: any) => [
                  f.geometry,
                  f.properties.site_name || 'Unnamed Site',
                  f.properties.designation || 'ProtectedArea'
                ]),
              },
            },
          ],
          options: { centerMap: true, readOnly: false },
          config: keplerConfig,
        } as any)
      );
    } catch (err) {
      console.error('Kepler loading error:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize database');
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, managementUnit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (error || !process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
    const isTokenMissing = !process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%',
        backgroundColor: '#0f172a', color: '#f87171', padding: '40px', textAlign: 'center',
      }}>
        <div style={{ maxWidth: '400px', padding: '32px', background: 'rgba(0,0,0,0.4)', borderRadius: '24px', border: '1px solid rgba(248,113,113,0.2)' }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '18px', fontWeight: 800 }}>{isTokenMissing ? 'Missing Mapbox Token' : 'Geospatial Error'}</h3>
          <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#94a3b8', lineHeight: 1.6 }}>
            {isTokenMissing ? 'Provide a valid NEXT_PUBLIC_MAPBOX_TOKEN to enable Kepler.gl exploration.' : error}
          </p>
          {!isTokenMissing && <button onClick={loadData} style={{ padding: '10px 24px', background: '#10b981', color: 'white', borderRadius: '12px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>Retry Sync</button>}
        </div>
      </div>
    );
  }

  return (
    <StyleSheetManager shouldForwardProp={(prop) => prop !== 'testId'}>
      <div 
        ref={mapContainerRef} 
        id="kepler-container"
        style={{ 
          width: '100%', 
          height: '100%', 
          position: 'absolute', 
          top: 0, left: 0,
          background: '#0a0a20',
          overflow: 'hidden'
        }}
      >
        {isLoading && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', background: '#0a0a20', color: '#10b981'
          }}>
            <div style={{ width: '48px', height: '48px', border: '3px solid rgba(16,185,129,0.2)', borderTopColor: '#10b981', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <div style={{ marginTop: '20px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.2em' }}>Loading Landscape Data...</div>
            <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
          </div>
        )}
        
        <KeplerGl
          id="sekakama"
          width={mapContainerRef.current?.clientWidth || 1600}
          height={mapContainerRef.current?.clientHeight || 900}
          mapboxApiAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        />

        {/* Global Overrides to fix Kepler UI malformation in Next.js */}
        <style dangerouslySetInnerHTML={{ __html: `
          #kepler-container .kepler-gl {
            font-family: inherit !important;
          }
          #kepler-container .side-panel__container {
            background-color: #141824 !important;
            border-right: 1px solid rgba(255,255,255,0.08) !important;
            box-shadow: 10px 0 30px rgba(0,0,0,0.5) !important;
            z-index: 101 !important;
          }
          #kepler-container .side-panel__header {
            background-color: #1a2030 !important;
          }
          #kepler-container .map-control-panel {
            right: 20px !important;
            top: 20px !important;
          }
          /* Ensure icons are visible */
          #kepler-container svg {
            fill: currentColor;
          }
          /* Fix for compressed map container */
          #kepler-container .react-map-gl-container, 
          #kepler-container .mapboxgl-map {
            width: 100% !important;
            height: 100% !important;
          }
        `}} />
      </div>
    </StyleSheetManager>
  );
}

export default function KeplerMap(props: KeplerMapProps) {
  return (
    <Provider store={store}>
      <KeplerMapInner {...props} />
    </Provider>
  );
}
