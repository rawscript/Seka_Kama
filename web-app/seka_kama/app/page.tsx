// web-app/seka_kama/app/page.tsx
'use client';

import { useState } from 'react';
import DashboardTabs from '@/components/DashboardTabs';
import ScenarioResultPanel from '@/components/ScenarioResultPanel';

export default function Home() {
  const [scenarioResult, setScenarioResult] = useState<any>(null);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <DashboardTabs onScenarioRun={setScenarioResult} />
      
      {scenarioResult && (
        <ScenarioResultPanel
          result={scenarioResult}
          onClose={() => setScenarioResult(null)}
        />
      )}
    </div>
  );
}