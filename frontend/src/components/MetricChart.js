import React from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function MetricChart({ data }) {
  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={data}
          margin={{ top: 12, right: 24, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" />
          <XAxis
            dataKey="time"
            tick={{ fill: "var(--text-surface-muted)", fontSize: 12 }}
          />
          <YAxis
            width={60}
            tick={{ fill: "var(--text-surface-muted)", fontSize: 12 }}
            domain={[0, 100]}
            unit="%"
          />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            contentStyle={{
              background: "var(--surface-elevated)",
              borderRadius: 12,
              border: "1px solid var(--border-soft)",
              color: "var(--text-surface)",
              fontSize: 13,
            }}
            labelStyle={{ color: "var(--text-surface-muted)" }}
            itemStyle={{ color: "var(--text-surface)" }}
          />
          <Legend
            verticalAlign="top"
            height={32}
            iconType="circle"
            iconSize={10}
            wrapperStyle={{ color: "var(--text-surface-muted)" }}
          />
          <Line
            type="monotone"
            dataKey="cpu"
            stroke="var(--chart-blue)"
            strokeWidth={2.4}
            dot={false}
            isAnimationActive={false}
            name="CPU %"
          />
          <Line
            type="monotone"
            dataKey="memory"
            stroke="var(--chart-green)"
            strokeWidth={2.4}
            dot={false}
            isAnimationActive={false}
            name="Memory %"
          />
          <Line
            type="monotone"
            dataKey="disk"
            stroke="var(--chart-purple)"
            strokeWidth={2.4}
            dot={false}
            isAnimationActive={false}
            name="Disk %"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default MetricChart;
