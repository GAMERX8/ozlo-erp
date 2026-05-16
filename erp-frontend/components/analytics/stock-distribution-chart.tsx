"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface StockDistributionItem {
    category: string;
    value: number;
    count: number;
}

interface StockDistributionChartProps {
    data: StockDistributionItem[];
    colors: string[];
}

export function StockDistributionChart({ data, colors }: StockDistributionChartProps) {
    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={data}
                    dataKey="value"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                >
                    {data.map((entry, index) => (
                        <Cell 
                            key={`cell-${index}`} 
                            fill={colors[index % colors.length]} 
                        />
                    ))}
                </Pie>
                <Tooltip 
                    formatter={(value, name, props) => {
                        const count = (props?.payload as { count?: number })?.count ?? 0;
                        return [
                            `S/ ${Number(value).toLocaleString("es-PE")} (${count} productos)`,
                            name
                        ];
                    }}
                />
            </PieChart>
        </ResponsiveContainer>
    );
}
