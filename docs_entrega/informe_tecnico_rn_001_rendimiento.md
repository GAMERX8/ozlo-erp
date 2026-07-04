# INFORME TÉCNICO: RN-001 - Rendimiento de Dashboards (< 2s)
## Optimización Técnica mediante Caching para Estadísticas Instantáneas

**Documento Técnico - Sistema ERP E-Commerce**  
**Fecha:** 27 de Junio de 2026  
**Módulo:** Dashboard Analytics (Frontend Next.js y Backend NestJS)

---

## 1. Objetivo de la Implementación

El objetivo de la **Regla de Negocio RN-001** es **garantizar que la carga de datos de los Dashboards y estadísticas tome menos de 2 segundos (< 2s)**, independientemente del volumen histórico de ventas, clientes o inventario almacenado en el sistema.

Para lograr esto, la solución arquitectónica requiere implementar una **Capa de Caché (Caching)**. Esto elimina la necesidad de someter a la base de datos a cálculos analíticos de agregación pesados (ej. `GROUP BY`, `SUM`) cada vez que un usuario recarga la página del tablero de control.

---

## 2. Componentes Arquitectónicos Involucrados

La optimización abarca toda la vertical del flujo de datos, desde la interfaz hasta la base de datos:

1. **Frontend (Next.js - App Router):**
   - El tablero principal en `app/workspaces/[workspaceId]/page.tsx` es un **React Server Component (RSC)**.
   - Actualmente llama a `getDashboardData()` durante el renderizado del servidor (SSR). Si el backend tarda varios segundos en calcular los KPIs, **la página del usuario se bloqueará y quedará en blanco durante ese tiempo**.
   - Componentes UI internos como `SalesKPICard`, `SalesChart`, `OrdersByStatusChart` dependen enteramente de la velocidad con la que el RSC reciba los datos.

2. **Backend (NestJS - `DashboardService`):**
   - Es el componente crítico. Centraliza la lógica de Prisma ORM ejecutando bloques `Promise.all` con múltiples consultas simultáneas sobre tablas transaccionales (por ejemplo, `this.prisma.order.aggregate`).

3. **Capa de Caché (`@nestjs/cache-manager`):**
   - El nuevo componente a integrar. Utilizará almacenamiento en memoria para entornos locales y **Redis** para el entorno de producción, actuando como un intermediario ultrarrápido entre NestJS y PostgreSQL.

---

## 3. Estrategia de Optimización (Patrón Cache-Aside)

El flujo optimizado utilizará el patrón **Cache-Aside**:
1. Next.js solicita los datos del dashboard.
2. NestJS verifica si las métricas para ese `workspaceId` están en la caché de Redis.
3. **Si existen (Cache Hit):** NestJS devuelve el JSON serializado al instante. Latencia: **~10ms a 50ms**.
4. **Si no existen (Cache Miss):** NestJS ejecuta Prisma, guarda el resultado en Redis con un Tiempo de Vida (TTL) de 5 minutos, y devuelve el JSON. Latencia: **~800ms**.

---

## 4. Implementación Extendida (Ejemplos de Código)

A continuación, se detalla el código necesario para cada componente involucrado en la mejora.

### A. Configuración del Módulo de Caché en NestJS
En el archivo raíz (ej. `app.module.ts` o `dashboard.module.ts`), se importa y configura globalmente el administrador de caché. En producción, se recomienda conectar `cache-manager-redis-store`.

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    // Configuración global del Caché
    CacheModule.register({
      isGlobal: true,
      store: redisStore,
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      ttl: 300, // TTL por defecto: 5 minutos
    }),
    DashboardModule,
  ],
})
export class AppModule {}
```

### B. Refactorización del `DashboardService`
El servicio principal que calcula los KPIs se inyecta con `CACHE_MANAGER` y envuelve su lógica pesada en la comprobación de claves.

```typescript
// src/dashboard/dashboard.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache // <-- Inyección del componente
  ) {}

  async getDashboardData(workspaceId: string) {
    const cacheKey = `dashboard_data_${workspaceId}`;
    
    // 1. Lectura ultrarrápida desde Redis/Memoria
    const cachedData = await this.cacheManager.get(cacheKey);
    if (cachedData) {
      return cachedData; // Retorno en 0ms (garantizando < 2s)
    }

    // 2. Si no hay caché, ejecución intensiva en Base de Datos
    const [kpis, salesOverTime, topProducts] = await Promise.all([
      this.getKpis(workspaceId),
      this.getSalesOverTime(workspaceId, '30d'),
      this.getTopProducts(workspaceId, 5)
    ]);

    const result = {
      kpis,
      salesOverTime,
      topProducts,
      // ...
    };

    // 3. Guardado en caché (TTL explícito de 5 minutos = 300,000ms)
    await this.cacheManager.set(cacheKey, result, 300000);

    return result;
  }
  
  // (La lógica interna de getKpis y otros métodos permanece igual)
}
```

### C. Estrategia de Invalidación Proactiva (Eventos)
Para asegurar que las estadísticas se sientan "en vivo", no basta con esperar a que el TTL expire. Se pueden limpiar claves específicas del caché cuando ocurren eventos comerciales importantes en otros módulos.

Por ejemplo, cuando se registra una nueva venta en `OrdersService`:

```typescript
// src/orders/orders.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class OrdersService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  async completeOrder(orderId: string, workspaceId: string) {
    // Lógica para completar la orden en Prisma...
    await this.prisma.order.update({ /* ... */ });

    // Invalida inmediatamente el dashboard de ese Workspace específico
    // El próximo usuario que entre obligará a regenerar las analíticas exactas
    await this.cacheManager.del(`dashboard_data_${workspaceId}`);
  }
}
```

---

## 5. Resultados y Beneficios Arquitectónicos

1. **Rendimiento Garantizado en Frontend:** Al reducir el tiempo de respuesta del backend, el Server Component de Next.js (`page.tsx`) ya no bloqueará el renderizado. La página cargará instantáneamente.
2. **Protección de Base de Datos:** PostgreSQL ya no sufrirá picos de CPU si múltiples administradores abren sus dashboards simultáneamente, reservando recursos para transacciones de ventas y movimientos de stock (Kardex).
3. **Escalabilidad Multitenant:** Al componer las claves de Redis usando `workspaceId` (ej. `dashboard_data_xyz123`), garantizamos que el aislamiento de datos entre distintos clientes se mantenga hermético, sin riesgo de cruce de información en memoria.
