import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export default function MetricChart({ data }) {
  return (
    <LineChart width={800} height={400} data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="time" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Line type="monotone" dataKey="cpu" stroke="#8884d8" />
      <Line type="monotone" dataKey="memory" stroke="#82ca9d" />
      <Line type="monotone" dataKey="connections" stroke="#ff7300" />
    </LineChart>
  );
}
