# ERP SaaS - Sistema de Gestión Empresarial

Este proyecto es una solución ERP (Enterprise Resource Planning) orientada a la gestión de ventas, compras, almacenes (inventario) y operaciones logísticas para comercios, principalmente eCommerce.

## Arquitectura del Proyecto

El proyecto está dividido en dos repositorios/carpetas principales:

### 1. Frontend (`/erp-frontend`)
Desarrollado con las últimas tecnologías web para proporcionar una interfaz moderna, responsiva y orientada a la experiencia de usuario.
- **Framework:** Next.js (React)
- **Estilos:** Tailwind CSS
- **Componentes:** shadcn/ui (Radix UI)
- **Gráficos:** Recharts
- **Lenguaje:** TypeScript

### 2. Backend (`/erp-backend`)
Un backend robusto y estructurado para manejar toda la lógica de negocio y las reglas de integración de la base de datos.
- **Framework:** NestJS
- **ORM:** Prisma
- **Base de Datos:** PostgreSQL
- **Lenguaje:** TypeScript

## Funcionalidades Principales

- 🔐 **Autenticación y Workspaces:** Soporte Multi-Tenant. Cada empresa tiene su propio `workspace_id` para aislar datos.
- 📦 **Gestión de Inventario (Kardex):** Control de existencias, soporte para múltiples almacenes, registro automático de movimientos de entrada (`IN`) y salida (`OUT`) para total trazabilidad.
- 🛒 **Gestión de Ventas (Órdenes):** Seguimiento del ciclo de vida de la orden a través de un Pipeline (No Confirmado, Preparando, Listo, Enviado, Entregado, etc.). Generación y tracking de envíos con couriers.
- 🚚 **Gestión de Compras y Proveedores:** Recepción parcial o total de inventario, actualización automática de stock, vinculación de costos.
- 📊 **Dashboard y Reportes:** Métricas clave de rendimiento, reportes de ventas por canal, ventas por estado, productos más vendidos, etc.
- 👥 **Clientes y Proveedores:** Base de datos relacional para llevar el control de frecuencia de compras y gastos.

## Estructura de Base de Datos (Prisma)

El esquema de la base de datos es central a la aplicación y cubre:
- `User`, `Workspace`, `WorkspaceMember`
- `Product`, `ProductVariant`, `Category`
- `Warehouse`, `Inventory`, `StockMovement` (Kardex)
- `Order`, `OrderItem`, `Client`, `Courier`
- `Purchase`, `PurchaseItem`, `Supplier`
- `AuditLog` para seguimiento de los cambios en los estados.

## Guía de Instalación y Uso (Local)

Asegúrate de tener instalado [Node.js](https://nodejs.org/en/) (recomendado v18 o superior) y una base de datos PostgreSQL.

### 1. Configuración del Backend
```bash
cd erp-backend
npm install
# Configura tus variables de entorno en el archivo .env (DATABASE_URL, JWT_SECRET, etc.)

# Sincroniza la base de datos
npx prisma db push

# Inicia el servidor de desarrollo
npm run dev
```

### 2. Configuración del Frontend
```bash
cd erp-frontend
npm install
# Configura el .env.local con las variables del API (ej: NEXT_PUBLIC_API_URL=http://localhost:3000)

# Inicia la aplicación en modo desarrollo
npm run dev
```

El servidor del backend usualmente correrá en el puerto `3000` y el frontend en el `3001` o `3000` dependiendo de la configuración. 

---
_Desarrollado con ❤️ usando Antigravity._
