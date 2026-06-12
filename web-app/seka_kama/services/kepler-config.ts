import { KeplerGlSchema } from '@kepler.gl/schemas';

export const createKeplerConfig = (managementUnits: string[], hasScenario: boolean = false) => {
  const layers: any[] = [
    {
      id: 'lion_density',
      type: 'point',
      config: {
        dataId: 'grid_cells',
        label: 'Baseline Lion Density',
        color: [33, 102, 172],
        columns: { lat: 'latitude', lng: 'longitude' },
        isVisible: !hasScenario, // Hide baseline if showing scenario
        visConfig: {
          radius: 8,
          fixedRadius: false,
          opacity: 0.8,
          outline: false,
          thickness: 2,
          colorRange: {
            name: 'Viridis',
            type: 'sequential',
            category: 'Uber',
            colors: ['#440154', '#482677', '#3B528B', '#2D708E', '#238A8D', '#20A387', '#4AC16D', '#AADC32', '#DCE319', '#FDE725'],
          },
          radiusRange: [4, 16],
          strokeColor: null,
          radiusScale: 10,
          strokeWidth: 1,
          stroked: false,
          filled: true,
          enable3d: false,
        },
        visualChannels: {
          colorField: { name: 'lion_density', type: 'real' },
          colorScale: 'quantile',
          sizeField: { name: 'lion_density', type: 'real' },
          sizeScale: 'sqrt',
        },
      },
    },
    {
      id: 'nightlight_intensity',
      type: 'point',
      config: {
        dataId: 'grid_cells',
        label: 'Nightlight Intensity (DNB radiance)',
        color: [255, 153, 31],
        columns: { lat: 'latitude', lng: 'longitude' },
        isVisible: false,
        visConfig: {
          radius: 6,
          fixedRadius: false,
          opacity: 0.7,
          colorRange: {
            name: 'YlOrRd',
            type: 'sequential',
            colors: ['#FFFFB2', '#FED976', '#FEB24C', '#FD8D3C', '#F03B20', '#BD0026'],
          },
          radiusRange: [3, 12],
        },
        visualChannels: {
          colorField: { name: 'nightlight_intensity', type: 'real' },
          colorScale: 'quantile',
          sizeField: { name: 'nightlight_intensity', type: 'real' },
          sizeScale: 'sqrt',
        },
      },
    },
    {
      id: 'nightlight_trend',
      type: 'point',
      config: {
        dataId: 'grid_cells',
        label: 'Nightlight Trend (annual slope)',
        color: [166, 97, 26],
        columns: { lat: 'latitude', lng: 'longitude' },
        isVisible: false,
        visConfig: {
          radius: 6,
          fixedRadius: false,
          opacity: 0.7,
          colorRange: {
            name: 'RdYlBu',
            type: 'diverging',
            colors: ['#D73027', '#F46D43', '#FDAE61', '#FEE08B', '#FFFFBF', '#D9EF8B', '#A6D96A', '#66BD63', '#1A9850'],
          },
          radiusRange: [3, 12],
        },
        visualChannels: {
          colorField: { name: 'nightlight_trend', type: 'real' },
          colorScale: 'quantile',
          sizeField: { name: 'nightlight_trend', type: 'real' },
          sizeScale: 'sqrt',
        },
      },
    },
    {
      id: 'protected_areas',
      type: 'polygon',
      config: {
        dataId: 'protected_areas',
        label: 'Protected Areas (WDPA)',
        color: [41, 128, 185],
        columns: { lat: 'latitude', lng: 'longitude' },
        isVisible: true,
        visConfig: {
          opacity: 0.25,
          thickness: 2,
          colorRange: {
            name: 'Set1',
            type: 'qualitative',
            colors: ['#E41A1C', '#377EB8', '#4DAF4A', '#984EA3', '#FF7F00', '#FFFF33', '#A65628', '#F781BF', '#999999'],
          },
          strokeColor: [255, 255, 255],
          strokeWidth: 1.5,
          stroked: true,
          filled: true,
          enable3d: false,
          wireframe: false,
        },
        visualChannels: {
          colorField: { name: 'designation', type: 'string' },
          colorScale: 'ordinal',
        },
        textLabel: [
          {
            field: { name: 'site_name', type: 'string' },
            color: [255, 255, 255],
            size: 12,
            offset: [0, 0],
            anchor: 'start',
            alignment: 'center',
          },
        ],
      },
    },
  ];

  // Add scenario prediction layer if scenario data is present
  if (hasScenario) {
    layers.push({
      id: 'scenario_predictions',
      type: 'point',
      config: {
        dataId: 'scenario_predictions',
        label: 'Scenario Predictions (XGBoost)',
        color: [239, 68, 68],
        columns: { lat: 'latitude', lng: 'longitude' },
        isVisible: true,
        visConfig: {
          radius: 10,
          fixedRadius: false,
          opacity: 0.85,
          outline: true,
          thickness: 2,
          colorRange: {
            name: 'Inferno',
            type: 'sequential',
            colors: ['#000004', '#320A5A', '#781C6D', '#BB3754', '#ED6925', '#FBB318', '#F0F921'],
          },
          radiusRange: [5, 20],
          strokeColor: [255, 255, 255],
          radiusScale: 12,
          strokeWidth: 1.5,
          stroked: true,
          filled: true,
          enable3d: false,
        },
        visualChannels: {
          colorField: { name: 'scenario_density', type: 'real' },
          colorScale: 'quantile',
          sizeField: { name: 'delta', type: 'real' },
          sizeScale: 'sqrt',
        },
      },
    });

    // Add delta comparison layer
    layers.push({
      id: 'scenario_delta',
      type: 'point',
      config: {
        dataId: 'scenario_predictions',
        label: 'Δ Lions (Scenario - Baseline)',
        color: [16, 185, 129],
        columns: { lat: 'latitude', lng: 'longitude' },
        isVisible: false,
        visConfig: {
          radius: 8,
          fixedRadius: false,
          opacity: 0.8,
          colorRange: {
            name: 'RdYlGn',
            type: 'diverging',
            colors: ['#D73027', '#F46D43', '#FDAE61', '#FEE08B', '#FFFFBF', '#D9EF8B', '#A6D96A', '#66BD63', '#1A9850'],
          },
          radiusRange: [4, 16],
        },
        visualChannels: {
          colorField: { name: 'delta', type: 'real' },
          colorScale: 'quantile',
          sizeField: { name: 'delta', type: 'real' },
          sizeScale: 'sqrt',
        },
      },
    });
  }

  const tooltipFields: any = {
    grid_cells: [
      { name: 'lion_density', format: '.2f' },
      { name: 'nightlight_intensity', format: '.4f' },
      { name: 'nightlight_trend', format: '.5f' },
      { name: 'dist_km', format: '.1f' },
      { name: 'management_unit', format: null },
    ],
    protected_areas: [
      { name: 'site_name', format: null },
      { name: 'designation', format: null },
    ],
  };

  if (hasScenario) {
    tooltipFields.scenario_predictions = [
      { name: 'baseline_density', format: '.2f' },
      { name: 'scenario_density', format: '.2f' },
      { name: 'delta', format: '.2f' },
      { name: 'cell_id', format: null },
    ];
  }

  return {
    version: 'v1',
    config: {
      visState: {
        filters: [
          {
            id: 'management_unit_filter',
            dataId: 'grid_cells',
            name: 'management_unit',
            type: 'multiSelect',
            value: managementUnits,
            enlarged: false,
          },
        ],
        layers,
        interactionConfig: {
          tooltip: {
            fieldsToShow: tooltipFields,
            compareMode: hasScenario,
            compareType: 'absolute',
            enabled: true,
          },
          brush: { size: 0.5, enabled: false },
          geocoder: { enabled: true },
          coordinate: { enabled: true },
        },
        layerBlending: 'normal',
        splitMaps: hasScenario ? [{ layers: {} }] : [],
        animationConfig: { currentTime: null, speed: 1 },
      },
      mapState: {
        bearing: 0,
        dragRotate: true,
        latitude: -1.25,
        longitude: 35.1,
        pitch: 0,
        zoom: 9,
        isSplit: false,
      },
      mapStyle: {
        styleType: 'dark',
        topLayerGroups: {},
        visibleLayerGroups: {
          label: true,
          road: true,
          border: false,
          building: true,
          water: true,
          land: true,
          '3d building': false,
        },
        threeDBuildingColor: [9, 19, 33],
      },
    },
  };
};