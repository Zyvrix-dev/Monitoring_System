import React, { useState, useEffect } from 'react';
import MetricChart from './components/MetricChart';

function App() {
  const [metrics, setMetrics] = useState([]);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:9002');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setMetrics(prev => [...prev.slice(-29), { ...data, time: new Date().toLocaleTimeString() }]);
    };
    ws.onopen = () => console.log('WS open');
    ws.onclose = () => console.log('WS closed');
    return () => ws.close();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Monitoring Dashboard</h1>
      <MetricChart data={metrics} />
    </div>
  );
}

export default App;
