"use client";

/**
 * Componente reutilizable para mostrar KPIs en tarjetas
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, type LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number; // Porcentaje de cambio (positivo o negativo)
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  trend?: "up" | "down" | "neutral";
  className?: string;
  loading?: boolean;
}

export function KPICard({
  title,
  value,
  subtitle,
  change,
  icon: Icon,
  iconColor = "text-primary",
  iconBgColor = "bg-primary/10",
  trend = "neutral",
  className,
  loading = false,
}: KPICardProps) {
  const getTrendColor = () => {
    if (trend === "up") return "text-emerald-600 dark:text-emerald-400";
    if (trend === "down") return "text-red-600 dark:text-red-400";
    return "text-muted-foreground";
  };

  const getTrendIcon = () => {
    if (trend === "up") return <ArrowUp className="size-3" />;
    if (trend === "down") return <ArrowDown className="size-3" />;
    return null;
  };

  if (loading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="size-8 animate-pulse rounded-full bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-3 w-24 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn("rounded-lg p-2", iconBgColor)}>
          <Icon className={cn("size-4", iconColor)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {(subtitle || change !== undefined) && (
          <div className="mt-1 flex items-center gap-1 text-xs">
            {change !== undefined && (
              <span
                className={cn(
                  "flex items-center gap-0.5 font-medium",
                  getTrendColor()
                )}
              >
                {getTrendIcon()}
                {Math.abs(change)}%
              </span>
            )}
            {subtitle && (
              <span className="text-muted-foreground">{subtitle}</span>
            )}
            {!subtitle && change !== undefined && (
              <span className="text-muted-foreground">vs período anterior</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Variantes predefinidas para casos comunes
export function SalesKPICard({
  amount,
  change,
  orders,
  loading,
}: {
  amount: number;
  change: number;
  orders: number;
  loading?: boolean;
}) {
  return (
    <KPICard
      title="Ventas del día"
      value={`S/ ${amount.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
      subtitle={`${orders} órdenes`}
      change={change}
      trend={change >= 0 ? "up" : "down"}
      icon={require("lucide-react").DollarSign}
      iconColor="text-emerald-600 dark:text-emerald-400"
      iconBgColor="bg-emerald-500/10"
      loading={loading}
    />
  );
}

export function PendingOrdersKPICard({
  count,
  urgent,
  loading,
}: {
  count: number;
  urgent: number;
  loading?: boolean;
}) {
  return (
    <KPICard
      title="Órdenes pendientes"
      value={count}
      subtitle={urgent > 0 ? `${urgent} urgentes` : "Sin urgencias"}
      icon={require("lucide-react").Clock}
      iconColor="text-amber-600 dark:text-amber-400"
      iconBgColor="bg-amber-500/10"
      trend={urgent > 5 ? "down" : "neutral"}
      loading={loading}
    />
  );
}

export function AverageTicketKPICard({
  amount,
  change,
  loading,
}: {
  amount: number;
  change: number;
  loading?: boolean;
}) {
  return (
    <KPICard
      title="Ticket promedio"
      value={`S/ ${amount.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
      change={change}
      trend={change >= 0 ? "up" : "down"}
      icon={require("lucide-react").Receipt}
      iconColor="text-blue-600 dark:text-blue-400"
      iconBgColor="bg-blue-500/10"
      loading={loading}
    />
  );
}

export function DeliveryRateKPICard({
  rate,
  change,
  loading,
}: {
  rate: number;
  change: number;
  loading?: boolean;
}) {
  return (
    <KPICard
      title="Tasa de entrega"
      value={`${rate.toFixed(1)}%`}
      change={change}
      trend={change >= 0 ? "up" : "down"}
      icon={require("lucide-react").Truck}
      iconColor="text-purple-600 dark:text-purple-400"
      iconBgColor="bg-purple-500/10"
      loading={loading}
    />
  );
}
