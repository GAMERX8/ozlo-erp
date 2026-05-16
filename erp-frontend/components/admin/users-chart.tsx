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
import { Skeleton } from "@/components/ui/skeleton";
import { Users } from "lucide-react";

const chartConfig = {
  users: {
    label: "Usuarios",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

interface User {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  date_created: string;
  role?: string;
}

interface UsersChartProps {
  users: User[];
  isLoading?: boolean;
}

export function UsersChart({ users, isLoading }: UsersChartProps) {
  const chartData = useMemo(() => {
    // Crear array con los últimos 30 días
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return date.toISOString().split("T")[0];
    });

    // Agrupar usuarios por fecha
    const grouped = users.reduce((acc, user) => {
      if (!user.date_created) return acc;
      const date = new Date(user.date_created).toISOString().split("T")[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Generar datos para los últimos 30 días (rellenando con 0 si no hay datos)
    return last30Days.map((date) => ({
      date,
      users: grouped[date] || 0,
    }));
  }, [users]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usuarios Recientes</CardTitle>
          <CardDescription>
            Registros de usuarios en los últimos 30 días
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
          <CardTitle>Usuarios Recientes</CardTitle>
          <CardDescription>
            Registros de usuarios en los últimos 30 días
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex flex-col items-center justify-center">
            <Users className="size-12 text-muted-foreground opacity-50" />
            <h3 className="mt-4 text-lg font-medium">Sin datos</h3>
            <p className="text-sm text-muted-foreground mt-1">No se encontraron usuarios recientes.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usuarios Recientes</CardTitle>
        <CardDescription>
          Registros de usuarios en los últimos 30 días
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="fillUsers" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-users)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-users)"
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
              dataKey="users"
              type="natural"
              fill="url(#fillUsers)"
              stroke="var(--color-users)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
