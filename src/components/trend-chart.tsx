"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ChartPoint = { label: string; value: number | null };

export function TrendChart({
  data,
  unit,
  color,
  kind,
  domain,
}: {
  data: ChartPoint[];
  unit: string;
  color: string;
  kind: "area" | "line";
  domain?: [number, number];
}) {
  const axis = { fontSize: 11, fill: "hsl(155 9% 40%)" };
  const grid = <CartesianGrid stroke="hsl(150 13% 88%)" vertical={false} />;
  const x = <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} minTickGap={28} />;
  const y = (
    <YAxis
      tick={axis}
      axisLine={false}
      tickLine={false}
      width={40}
      domain={domain ?? ["auto", "auto"]}
    />
  );
  const tooltip = (
    <Tooltip
      contentStyle={{
        borderRadius: 12,
        border: "1px solid hsl(150 13% 88%)",
        fontSize: 12,
        boxShadow: "0 8px 24px hsl(158 22% 11% / 0.08)",
      }}
      formatter={(value) => [`${value ?? "—"} ${unit}`, ""]}
    />
  );

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {kind === "area" ? (
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            {grid}
            {x}
            {y}
            {tooltip}
            <Area type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={0.16} strokeWidth={2} connectNulls={false} dot={false} />
          </AreaChart>
        ) : (
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            {grid}
            {x}
            {y}
            {tooltip}
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} connectNulls={false} dot={false} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
