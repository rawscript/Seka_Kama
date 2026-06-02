/**
 * Export utilities for Seka Kama dashboard
 * Supports CSV, JSON, and GeoJSON export formats.
 */

export function exportToCSV(data: any[], filename: string) {
  if (!data || !data.length) return;

  const headers = Object.keys(data[0]);
  const csvRows: string[] = [];

  // Header row
  csvRows.push(headers.map(h => `"${h}"`).join(','));

  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header] ?? '';
      const escaped = ('' + val).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  downloadBlob(csvRows.join('\n'), `${filename}.csv`, 'text/csv;charset=utf-8;');
}

export function exportToJSON(data: any, filename: string) {
  const json = JSON.stringify(data, null, 2);
  downloadBlob(json, `${filename}.json`, 'application/json');
}

export function exportToGeoJSON(geojson: any, filename: string) {
  const json = JSON.stringify(geojson, null, 2);
  downloadBlob(json, `${filename}.geojson`, 'application/geo+json');
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportScenarioResult(result: any, format: 'csv' | 'json' | 'geojson' = 'csv') {
  const baseFilename = `seka_kama_scenario_${result.scenario_id || Date.now()}`;

  if (format === 'geojson' && result.scenario_geojson) {
    exportToGeoJSON(result.scenario_geojson, baseFilename);
    return;
  }

  if (format === 'json') {
    exportToJSON({
      metadata: {
        platform: 'Seka Kama Digital Twin v2.1.0',
        model: 'SekaNet XGBoost Ensemble',
        exported_at: new Date().toISOString(),
        scenario_id: result.scenario_id || null,
      },
      scenario: {
        title: result.user_description || result.llm_narrative?.slice(0, 80) || 'Untitled Scenario',
        baseline_population: result.baseline_total_lions || 0,
        predicted_population: result.predicted_total_lions || 0,
        delta_lions: result.delta_lions ?? result.predicted_lion_delta ?? 0,
        delta_percent: result.delta_percent || 0,
        affected_cells: result.affected_cells || 0,
        affected_units: result.affected_units || {},
        feature_modifications: result.request_data?.feature_modifications || {},
        ecological_context: result.ecological_context || {},
        narrative: result.llm_narrative || '',
      },
    }, baseFilename);
    return;
  }

  // Default: CSV
  const formattedData = [
    {
      'Scenario ID': result.scenario_id || 'TEMP',
      'Title': result.user_description || 'Untitled Scenario',
      'Impact Delta (Lions)': result.delta_lions ?? result.predicted_lion_delta ?? 0,
      'Impact Delta (%)': result.delta_percent || 0,
      'Baseline Population': result.baseline_total_lions || 0,
      'Predicted Population': result.predicted_total_lions || 0,
      'Affected Cells': result.affected_cells || 0,
      'HWC Risk Score': result.ecological_context?.avg_hwc_risk ?? 'N/A',
      'Avg Rainfall (mm/yr)': result.ecological_context?.avg_rainfall_mm ?? 'N/A',
      'Avg Prey Density (/km²)': result.ecological_context?.avg_prey_density ?? 'N/A',
      'AI Narrative': result.llm_narrative || 'N/A',
      'Data Source': 'SekaNet v2.1.0 (XGBoost + NASA POWER + GBIF)',
      'Exported At': new Date().toISOString(),
    }
  ];

  exportToCSV(formattedData, baseFilename);
}
