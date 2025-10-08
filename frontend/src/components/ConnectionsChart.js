import React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

const tooltipFormatter = (value) => `${value?.toLocaleString?.() ?? value}`;

function ConnectionsChart({ data }) {
  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="connectionsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-orange)" stopOpacity={0.6} />
              <stop offset="100%" stopColor="var(--chart-orange)" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
          <XAxis dataKey="time" tick={{ fill: 'var(--text-surface-muted)', fontSize: 12 }} />
          <YAxis
            width={60}
            tick={{ fill: 'var(--text-surface-muted)', fontSize: 12 }}
            allowDecimals={false}
            domain={['auto', 'auto']}
          />
          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            contentStyle={{
              background: 'var(--surface-elevated)',
              borderRadius: 12,
              border: '1px solid var(--border-soft)',
              color: 'var(--text-surface)',
              fontSize: 13
            }}
            labelStyle={{ color: 'var(--text-surface-muted)' }}
            itemStyle={{ color: 'var(--text-surface)' }}
            formatter={tooltipFormatter}
          />
          <Area
            type="monotone"
            dataKey="connections"
            stroke="var(--chart-orange)"
            strokeWidth={2.4}
            fill="url(#connectionsGradient)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export default ConnectionsChart;
