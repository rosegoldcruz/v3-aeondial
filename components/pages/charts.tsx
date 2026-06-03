"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const tick = { fill: "oklch(0.65 0 0)", fontSize: 12 };
const grid = { strokeDasharray: "3 3", stroke: "oklch(0.22 0.005 260)" };
const tooltipStyle = {
  background: "oklch(0.12 0.005 260)",
  border: "1px solid oklch(0.22 0.005 260)",
  borderRadius: 8,
  fontSize: 12,
};

export function RevenueAreaChart({ data, valueKey = "value", targetKey = "target" }: { data: Record<string, string | number>[]; valueKey?: string; targetKey?: string }) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="oklch(0.7 0.18 220)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="oklch(0.7 0.18 220)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="targetGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="oklch(0.7 0.18 145)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="oklch(0.7 0.18 145)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid {...grid} vertical={false} />
          <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} />
          <YAxis tick={tick} axisLine={false} tickLine={false} width={72} />
          <Tooltip contentStyle={tooltipStyle} />
          <Area type="monotone" dataKey={valueKey} stroke="oklch(0.7 0.18 220)" fill="url(#revenueGradient)" strokeWidth={2} />
          <Area type="monotone" dataKey={targetKey} stroke="oklch(0.7 0.18 145)" fill="url(#targetGradient)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarMetricChart({ data, bars }: { data: Record<string, string | number>[]; bars: { key: string; color: string; name?: string }[] }) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid {...grid} vertical={false} />
          <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} />
          <YAxis tick={tick} axisLine={false} tickLine={false} width={72} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ color: "oklch(0.65 0 0)", fontSize: 12 }} />
          {bars.map((bar) => <Bar key={bar.key} dataKey={bar.key} fill={bar.color} name={bar.name ?? bar.key} radius={[6, 6, 0, 0]} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function LineMetricChart({ data, lines }: { data: Record<string, string | number>[]; lines: { key: string; color: string; name?: string }[] }) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid {...grid} vertical={false} />
          <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} />
          <YAxis tick={tick} axisLine={false} tickLine={false} width={72} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ color: "oklch(0.65 0 0)", fontSize: 12 }} />
          {lines.map((line) => <Line key={line.key} type="monotone" dataKey={line.key} stroke={line.color} name={line.name ?? line.key} strokeWidth={2.25} dot={false} />)}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
