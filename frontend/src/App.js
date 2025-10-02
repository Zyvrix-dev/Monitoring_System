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
    return () => ws.close();
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>Server Monitoring Dashboard</h1>
      <MetricChart data={metrics} />
      <p>Live metrics via WebSocket from C++ backend</p>
      <p>Historical metrics available in Grafana at <a href="http://localhost:3001" target="_blank">Grafana</a></p>
    </div>
  );
}

export default App;
