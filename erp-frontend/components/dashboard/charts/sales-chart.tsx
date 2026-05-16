"use client";

/**
 * Componente de gráfico de ventas usando Recharts
 */

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { DailySalesData } from "@/types/dashboard";

interface SalesChartProps {
  data: DailySalesData[];
  title?: string;
  description?: string;
  showOrders?: boolean;
  className?: string;
  loading?: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    dataKey: string;
    color: string;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background p-3 shadow-sm">
        <p className="mb-2 font-medium">
          {label && format(parseISO(label), "EEEE d 'de' MMMM", { locale: es })}
        </p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="size-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">
              {entry.dataKey === "amount" ? "Ventas:" : "Órdenes:"}
            </span>
            <span className="font-medium">
              {entry.dataKey === "amount"
                ? `S/ ${Number(entry.value).toLocaleString("es-PE", { minimumFractionDigits: 2 })}`
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export function SalesChart({
  data,
  title = "Ventas en el tiempo",
  description = "Evolución de ventas durante el período seleccionado",
  showOrders = true,
  className,
  loading = false,
}: SalesChartProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `S/ ${(value / 1000).toFixed(0)}k`;
    }
    return `S/ ${value}`;
  };

  const formatDate = (dateStr: string) => {
    return format(parseISO(dateStr), "d MMM", { locale: es });
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="h-5 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
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
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                {showOrders && (
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                )}
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--muted-foreground) / 0.2)"
              />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                dy={10}
              />
              <YAxis
                yAxisId="left"
                tickFormatter={formatCurrency}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                width={60}
              />
              {showOrders && (
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  width={40}
                />
              )}
              <Tooltip content={<CustomTooltip />} />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="amount"
                name="Ventas"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorAmount)"
              />
              {showOrders && (
                <Area
                  yAxisId="right"
                  type="monotone"
                  dataKey="orders"
                  name="Órdenes"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorOrders)"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// Versión simplificada solo con línea de ventas
export function SimpleSalesChart({
  data,
  className,
  loading,
}: {
  data: DailySalesData[];
  className?: string;
  loading?: boolean;
}) {
  return (
    <SalesChart
      data={data}
      showOrders={false}
      title="Ventas"
      description="Últimos 7 días"
      className={className}
      loading={loading}
    />
  );
}
