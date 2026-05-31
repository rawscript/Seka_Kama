/**
 * Export utilities for Seka Kama dashboard
 */

export function exportToCSV(data: any[], filename: string) {
  if (!data || !data.length) return;

  const headers = Object.keys(data[0]);
  const csvRows = [];
  
  csvRows.push(headers.join(','));

  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header];
      const escaped = ('' + val).replace(/"/g, '\\"');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportScenarioResult(result: any) {
  const filename = `seka_kama_scenario_${result.scenario_id || Date.now()}`;
  
  const formattedData = [
    {
      'Scenario Title': result.user_description || 'Untitled Scenario',
      'Impact Delta (Lions)': result.predicted_lion_delta || 0,
      'Impact Delta (%)': result.delta_percent || 0,
      'Baseline Population': result.baseline_total_lions || 0,
      'Predicted Population': result.predicted_total_lions || 0,
      'Affected Cells': result.affected_cells || 0,
      'AI Analysis': result.llm_narrative || 'N/A',
      'HWC Risk': result.ecological_context?.avg_hwc_risk || 'N/A',
      'Avg Rainfall (mm)': result.ecological_context?.avg_rainfall_mm || 'N/A',
      'Avg Prey Density': result.ecological_context?.avg_prey_density || 'N/A',
      'Timestamp': new Date().toISOString()
    }
  ];

  exportToCSV(formattedData, filename);
}
