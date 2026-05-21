'use client';
import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from 'recharts';

interface Trend {
    year: number;
    lion_count: number;
}

interface Props {
    trends: Trend[];
    unit?: string;
}

export default function TrendChart({ trends, unit = 'Regional Total' }: Props) {
    // Sort just in case
    const data = [...trends].sort((a, b) => a.year - b.year);

    return (
        <div
            className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-4
                 shadow-lg animate-in fade-in slide-in-from-left-8 duration-600"
        >
            <h3 className="text-sm font-medium text-slate-300 mb-2">
                Historical Lion Population – {unit}
            </h3>
            <ResponsiveContainer width="100%" height={260}>
                <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis
                        dataKey="year"
                        stroke="#cbd5e1"
                        tick={{ fontSize: 10 }}
                        axisLine={false}
                    />
                    <YAxis
                        stroke="#cbd5e1"
                        tick={{ fontSize: 10 }}
                        axisLine={false}
                        tickFormatter={(v) => `${v}`}
                    />
                    <Tooltip
                        contentStyle={{
                            background: 'rgba(0,0,0,0.85)',
                            border: 'none',
                            color: '#fff',
                        }}
                    />
                    <Line
                        type="monotone"
                        dataKey="lion_count"
                        stroke="rgba(0,255,171,0.9)"
                        strokeWidth={3}
                        dot={{ r: 3, fill: '#00ffab' }}
                        activeDot={{ r: 5, fill: '#00ffab' }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
