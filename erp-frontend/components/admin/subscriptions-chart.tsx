"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { AdminPlan } from "@/lib/admin-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard } from "lucide-react";

const chartConfig = {
  subscriptions: {
    label: "Suscripciones",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

interface SubscriptionsChartProps {
  subscriptions: AdminPlan[];
  isLoading?: boolean;
}

export function SubscriptionsChart({ subscriptions, isLoading }: SubscriptionsChartProps) {
  const chartData = useMemo(() => {
    // Crear array con los últimos 30 días
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split("T")[0];
    });

    // Agrupar suscripciones por fecha (usando current_period_start)
    const grouped = subscriptions.reduce((acc, sub) => {
      const dateStr = sub.current_subscription?.current_period_start 
        ? new Date(sub.current_subscription.current_period_start).toISOString().split("T")[0]
        : null;
      if (dateStr) {
        acc[dateStr] = (acc[dateStr] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Generar datos para los últimos 30 días (rellenando con 0 si no hay datos)
    return last30Days.map((date) => ({
      date,
      subscriptions: grouped[date] || 0,
    }));
  }, [subscriptions]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Suscripciones Recientes</CardTitle>
          <CardDescription>
            Suscripciones nuevas en los últimos 30 días
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Suscripciones Recientes</CardTitle>
          <CardDescription>
            Suscripciones nuevas en los últimos 30 días
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex flex-col items-center justify-center">
            <CreditCard className="size-12 text-muted-foreground opacity-50" />
            <h3 className="mt-4 text-lg font-medium">Sin datos</h3>
            <p className="text-sm text-muted-foreground mt-1">No se encontraron suscripciones recientes.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Suscripciones Recientes</CardTitle>
        <CardDescription>
          Suscripciones nuevas en los últimos 30 días
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="fillSubscriptions" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-subscriptions)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-subscriptions)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("es-ES", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("es-ES", {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="subscriptions"
              type="natural"
              fill="url(#fillSubscriptions)"
              stroke="var(--color-subscriptions)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
