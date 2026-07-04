"use client";

/**
 * Componente de gráfico circular para órdenes por estado
 */

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { OrdersByStatus } from "@/types/dashboard";
import { orderStatusLabels, orderStatusColors } from "@/types/order";

interface OrdersByStatusChartProps {
  data: OrdersByStatus[];
  title?: string;
  description?: string;
  className?: string;
  loading?: boolean;
  type?: "donut" | "pie";
}

const STATUS_COLORS: Record<string, string> = {
  NO_CONFIRMED: "#eab308", // yellow-500
  CONTACTED: "#60a5fa",    // blue-400
  CONFIRMED: "#2563eb",    // blue-600
  PREPARING: "#a855f7",    // purple-500
  READY: "#6366f1",        // indigo-500
  SHIPPED: "#1d4ed8",      // blue-700
  DELIVERED: "#10b981",    // emerald-500
  CANCELLED: "#ef4444",    // red-500
  RETURNED: "#f97316",     // orange-500
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: {
      amount: number;
    };
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="rounded-lg border bg-background p-3 shadow-sm">
        <p className="font-medium">{data.name}</p>
        <div className="mt-1 space-y-1 text-sm text-muted-foreground">
          <p>Órdenes: <span className="font-medium text-foreground">{data.value}</span></p>
          <p>Monto: <span className="font-medium text-foreground">
            S/ {data.payload.amount.toLocaleString("es-PE", { minimumFractionDigits: 2 })}
          </span></p>
        </div>
      </div>
    );
  }
  return null;
}

export function OrdersByStatusChart({
  data,
  title = "Órdenes por estado",
  description = "Distribución de órdenes según su estado actual",
  className,
  loading = false,
  type = "donut",
}: OrdersByStatusChartProps) {
  // Transformar datos para el gráfico
  const chartData = data.map((item) => ({
    name: orderStatusLabels[item.status] || item.status,
    value: item.count,
    amount: item.amount,
    status: item.status,
    color: STATUS_COLORS[item.status] || "#6b7280",
  }));

  const totalOrders = data.reduce((sum, item) => sum + item.count, 0);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-56 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="h-[300px] animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={type === "donut" ? 60 : 0}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value: string, entry: any) => {
                  const percentage = totalOrders > 0 
                    ? ((entry?.payload?.value / totalOrders) * 100).toFixed(1)
                    : "0";
                  return `${value} (${percentage}%)`;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {type === "donut" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-3xl font-bold">{totalOrders}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Versión compacta para dashboards
export function CompactOrdersByStatus({
  data,
  className,
  loading,
}: {
  data: OrdersByStatus[];
  className?: string;
  loading?: boolean;
}) {
  return (
    <OrdersByStatusChart
      data={data}
      title="Estado de órdenes"
      description=""
      className={className}
      loading={loading}
      type="donut"
    />
  );
}
