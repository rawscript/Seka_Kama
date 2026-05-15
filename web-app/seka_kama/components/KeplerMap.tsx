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

import { api, type GridCell, type ProtectedArea } from '@/lib/api';
import { createKeplerConfig } from '@/lib/kepler-config';

interface KeplerMapProps {
  managementUnit?: string;
  onSelectionComplete?: (selectedCells: GridCell[]) => void;
  onCellClick?: (cell: GridCell) => void;
}

const reducers = combineReducers({
  keplerGl: keplerGlReducer,
});

const store = createStore(reducers, {}, applyMiddleware(taskMiddleware));

function KeplerMapInner({ managementUnit, onSelectionComplete, onCellClick }: KeplerMapProps) {
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

      const managementUnits = Array.from(
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
              id: 'grid_cells',
              label: 'Seka Kama Grid Cells',
              data: gridCellsData,
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
            },
            {
              id: 'protected_areas',
              label: 'Protected Areas',
              data: protectedAreasData,
              fields: [
                { name: 'site_name', type: 'string' },
                { name: 'designation', type: 'string' },
                { name: 'iucn_category', type: 'string' },
                { name: 'area_km2', type: 'real', format: '.1f' },
                { name: 'year_established', type: 'integer' },
              ],
            },
          ],
          options: { centerMap: true, readOnly: false },
          config: keplerConfig,
        })
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
    if (info.object && onCellClick) {
      onCellClick(info.object);
    }
  }, [onCellClick]);

  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        backgroundColor: '#fafafa',
        color: '#d32f2f',
        padding: '20px',
        textAlign: 'center',
      }}>
        <div>
          <h3>Data Loading Error</h3>
          <p>{error}</p>
          <button
            onClick={() => loadData()}
            style={{
              marginTop: '12px',
              padding: '8px 16px',
              backgroundColor: '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        backgroundColor: '#1a1a2e',
        color: 'white',
      }}>
        Loading spatial data...
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