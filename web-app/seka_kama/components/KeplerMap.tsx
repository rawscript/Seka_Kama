'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import { taskMiddleware } from 'react-palm/tasks';
import { Provider } from 'react-redux';
import KeplerGl from '@kepler.gl/components';
import { addDataToMap, toggleSplitMap, updateMap } from '@kepler.gl/actions';
import { keplerGlReducer } from '@kepler.gl/reducers';
// KeplerGlState type is removed as it was unused and missing from @kepler.gl/types in this version.
// If needed in the future, it can be imported from @kepler.gl/reducers.

import { api, type GridCell, type ProtectedArea } from '@/services/api';
import { createKeplerConfig } from '@/services/kepler-config';

interface KeplerMapProps {
  managementUnit?: string;
  onSelectionComplete?: (selectedCells: GridCell[]) => void;
  onCellClick?: (cell: GridCell) => void;
  onCellSelect?: (cellId: any) => void;
  onScenarioApply?: (cells: any, modifications: any) => void;
}

const reducers = combineReducers({
  keplerGl: keplerGlReducer,
});

const store = createStore(reducers, {}, applyMiddleware(taskMiddleware));

function KeplerMapInner({ 
  managementUnit, 
  onSelectionComplete, 
  onCellClick,
  onCellSelect,
  onScenarioApply 
}: KeplerMapProps) {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selectedCellsRef = useRef<GridCell[]>([]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [baselineResponse, protectedResponse] = await Promise.all([
        api.getBaseline(managementUnit),
        api.getProtectedAreas(),
      ]);

      const gridCellsData = baselineResponse.features.map((feature: any) => ({
        ...feature.properties,
        latitude: feature.geometry.coordinates[1],
        longitude: feature.geometry.coordinates[0],
      }));

      const protectedAreasData = protectedResponse.features.map((feature: any) => ({
        ...feature.properties,
        geometry: feature.geometry,
      }));

      const managementUnits: string[] = Array.from(
        new Set(
          gridCellsData
            .map((d: any) => d.management_unit)
            .filter((u: any): u is string => typeof u === 'string' && u.length > 0)
        )
      );

      const keplerConfig = createKeplerConfig(managementUnits);

      dispatch(
        addDataToMap({
          datasets: [
            {
              info: {
                id: 'grid_cells',
                label: 'Seka Kama Grid Cells',
              },
              data: {
                fields: [
                  { name: 'latitude', type: 'real', format: '.6f' },
                  { name: 'longitude', type: 'real', format: '.6f' },
                  { name: 'lion_density', type: 'real', format: '.2f' },
                  { name: 'nightlight_intensity', type: 'real', format: '.4f' },
                  { name: 'nightlight_trend', type: 'real', format: '.5f' },
                  { name: 'distance_to_protected_km', type: 'real', format: '.1f' },
                  { name: 'management_unit', type: 'string' },
                  { name: 'longterm_slope_mean', type: 'real', format: '.5f' },
                  { name: 'all_skew_mean', type: 'real', format: '.3f' },
                  { name: 'all_kurtosis_mean', type: 'real', format: '.3f' },
                  { name: 'licorr_slope_mean', type: 'real', format: '.5f' },
                  { name: 'pop2018_mean', type: 'integer' },
                  { name: 'ann_amp_mean', type: 'real', format: '.4f' },
                  { name: 'ann_cv_mean', type: 'real', format: '.3f' },
                  { name: 'ann_peak_month_mean', type: 'integer' },
                ],
                rows: gridCellsData.map((d: any) => [
                  d.latitude,
                  d.longitude,
                  d.lion_density,
                  d.nightlight_intensity,
                  d.nightlight_trend,
                  d.distance_to_protected_km,
                  d.management_unit,
                  d.longterm_slope_mean,
                  d.all_skew_mean,
                  d.all_kurtosis_mean,
                  d.licorr_slope_mean,
                  d.pop2018_mean,
                  d.ann_amp_mean,
                  d.ann_cv_mean,
                  d.ann_peak_month_mean,
                ]),
              },
            },
            {
              info: {
                id: 'protected_areas',
                label: 'Protected Areas',
              },
              data: {
                fields: [
                  { name: 'site_name', type: 'string' },
                  { name: 'designation', type: 'string' },
                  { name: 'iucn_category', type: 'string' },
                  { name: 'area_km2', type: 'real', format: '.1f' },
                  { name: 'year_established', type: 'integer' },
                  { name: 'geometry', type: 'geojson' },
                ],
                rows: protectedAreasData.map((d: any) => [
                  d.site_name,
                  d.designation,
                  d.iucn_category,
                  d.area_km2,
                  d.year_established,
                  d.geometry,
                ]),
              },
            },
          ],
          options: { centerMap: true, readOnly: false },
          config: keplerConfig,
        } as any)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Kepler data loading error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, managementUnit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleKeplerGlClick = useCallback((layer: any, info: any) => {
    if (info.object) {
      if (onCellClick) onCellClick(info.object);
      if (onCellSelect) onCellSelect(info.object.id || info.object.cellId || info.object);
    }
  }, [onCellClick, onCellSelect]);

  if (error || !process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
    const isTokenMissing = !process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        backgroundColor: '#1a1a2e',
        color: '#ff6b6b',
        padding: '20px',
        textAlign: 'center',
      }}>
        <div style={{ background: 'rgba(0,0,0,0.5)', padding: '2rem', borderRadius: '12px', border: '1px solid rgba(255,107,107,0.3)' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontWeight: 'bold' }}>
            {isTokenMissing ? 'Mapbox Token Required' : 'Data Loading Error'}
          </h3>
          <p style={{ margin: '0 0 1.5rem 0' }}>
            {isTokenMissing 
              ? 'Please provide a valid NEXT_PUBLIC_MAPBOX_TOKEN in your environment variables to use Kepler.gl.'
              : error}
          </p>
          {!isTokenMissing && (
            <button
              onClick={() => loadData()}
              style={{
                padding: '8px 24px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        backgroundColor: '#0a0a20',
        color: '#4ade80',
      }}>
        <div className="animate-spin mb-4" style={{ width: '40px', height: '40px', border: '3px solid rgba(74, 222, 128, 0.3)', borderTopColor: '#4ade80', borderRadius: '50%' }} />
        <div style={{ fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.875rem' }}>
          Initializing Geospatial Engine...
        </div>
      </div>
    );
  }

  return (
    <KeplerGl
      id="sekakama"
      width="100%"
      height="100%"
      mapboxApiAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
      onLayerClick={handleKeplerGlClick}
    />
  );
}

export default function KeplerMap(props: KeplerMapProps) {
  return (
    <Provider store={store}>
      <KeplerMapInner {...props} />
    </Provider>
  );
}