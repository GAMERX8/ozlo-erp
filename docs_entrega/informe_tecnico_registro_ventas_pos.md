# INFORME TÉCNICO DE IMPLEMENTACIÓN: REGISTRO DE VENTAS (POS)
## Interfaz Ágil y Descuento Automático de Stock (Kardex)

**Documento Técnico - Sistema ERP E-Commerce**  
**Fecha:** 27 de Junio de 2026  
**Tecnologías:** Next.js (Frontend), React Hook Form (Gestión de Estado), NestJS (Backend), Prisma ORM (Base de Datos)

---

## 1. Objetivo de la Implementación

El objetivo de este módulo es proporcionar una interfaz de **Punto de Venta (POS) / Nueva Venta** que sea extremadamente ágil para los cajeros y agentes de ventas. Permite armar un "carrito de compras" añadiendo múltiples productos, asignando un cliente rápidamente y calculando totales en vivo.

Además, el proceso debe asegurar la integridad del negocio: al momento de confirmarse o entregarse la venta, el sistema debe **descontar automáticamente el stock físico** y registrar la salida en el Kardex de forma silenciosa, transparente y a prueba de fallos.

---

## 2. Arquitectura y Gestión de Estado (Frontend)

Para garantizar que el cajero no experimente retrasos mientras llena los datos del cliente y los productos, la vista `/sales/new` utiliza una arquitectura basada en **formularios controlados y estado reactivo local**.

### Componentes Involucrados:
- **`react-hook-form` + `zod`:** Gestiona el estado completo del carrito (items, cantidades, descuentos) en la memoria del navegador. Zod valida que no existan cantidades nulas o precios negativos antes de tocar el servidor.
- **`useFieldArray`:** Permite agregar (`append`) o eliminar (`remove`) líneas de productos dinámicamente sin que React vuelva a renderizar todo el árbol DOM innecesariamente.
- **Buscadores en Tiempo Real (Command & Popover):** Los selectores de Cliente y Producto están virtualizados en el cliente gracias a TanStack Query (`useQuery`), permitiendo buscar por nombre sin hacer *round-trips* al servidor en cada tecla presionada.

---

## 3. Lógica Backend: El Ciclo de Vida del Stock

Una de las reglas de negocio más importantes ocurre en el **Backend (`OrdersService`)**. En el ERP, la venta pasa por un ciclo de vida, y el stock no se descuenta apenas se crea el borrador de la venta, sino cuando la orden pasa a un estado operativo de almacén (preparado, enviado o entregado).

### Descuento Automático e Integración con Kardex
El método `handleStockForStatusChange` actúa como un interceptor automático de inventario:

```typescript
// src/orders/orders.service.ts (Backend)

private async handleStockForStatusChange(order: any, workspaceId: string, newStatus: string) {
  // Sólo estados operativos descuentan el stock
  const stockDeductingStatuses = ['READY', 'SHIPPED', 'DELIVERED'];
  const isDeductStatus = stockDeductingStatuses.includes(newStatus);
  
  const hasMovements = order.stockMovements && order.stockMovements.length > 0;

  // 1. Si entra a estado operativo y no se había descontado antes: DESCONTAR
  if (isDeductStatus && !hasMovements) {
    await this.deductOrderStock(order, workspaceId);
  } 
  // 2. Si retrocede a estado borrador/cancelado: DEVOLVER STOCK
  else if (!isDeductStatus && hasMovements) {
    await this.restoreOrderStock(order, workspaceId);
  }
}
```

El método interno `deductOrderStock` ejecuta transacciones que:
1. Reducen físicamente el `stock` en la tabla `inventory`.
2. Generan un registro inmutable en `stock_movements` con el tipo `OUT` (Salida), referenciando el ID exacto de la orden que provocó el descuento.

---

## 4. Implementación Extendida: Cálculos en Tiempo Real (Código)

El cálculo del carrito no necesita contactar al backend. El frontend observa (`watch`) los cambios de los inputs en tiempo real y calcula Subtotal, Descuentos y Envíos:

```typescript
// app/workspaces/[workspaceId]/sales/new/page.tsx (Frontend)

// Observar todo el arreglo de productos del carrito y el monto adelantado
const items = form.watch("items");
const advanceAmount = form.watch("advance_amount") || 0;

// Re-cálculo reactivo (Se ejecuta en 1ms ante cada pulsación de tecla)
const subtotal = items.reduce((sum, item) => {
  const quantity = Number(item.quantity) || 0;
  const unitPrice = Number(item.unit_price) || 0;
  const discount = Number(item.discount_amount) || 0;
  
  return sum + (quantity * unitPrice) - discount;
}, 0);

// Lógica de coste de envío condicional según tipo (DELIVERY o PICKUP) y región
const shippingCost = form.watch("delivery_type") === "DELIVERY" 
  ? (form.watch("region") === "LIMA" ? 10 : 25) 
  : 0;

const total = subtotal + shippingCost;
const balance = total - advanceAmount; // Deuda restante del cliente
```

Luego de confirmarse y enviarse al backend con éxito, el cliente revalida el caché silenciosamente para que la tabla de historial de ventas (`queryClient.invalidateQueries`) se actualice sin recargar el navegador.

---

## 5. Propuesta de Capturas de Pantalla en el Informe

Para ilustrar este módulo ante los validadores o capacitadores, se recomiendan las siguientes capturas:

#### A. Buscador Reactivo de Clientes y Productos (Combobox)
> **Descripción:** Captura del formulario "Nueva Venta" con el menú desplegable (`CommandList`) abierto buscando un cliente.
> **Elementos a destacar:** Cómo aparece la lista de clientes con su teléfono y correo debajo del nombre inmediatamente al tipear.

#### B. Componente del Carrito Multilínea
> **Descripción:** La tarjeta (Card) central que muestra varios productos agregados.
> **Elementos a destacar:** Los campos de Cantidad, Precio Unitario, y Descuento; así como el botón de la papelera (`Trash2`) para eliminar una línea y el indicador "Subtotal: S/ XXX.XX" calculado en la base de la celda de cada ítem.

#### C. Resumen Financiero y Tipos de Entrega
> **Descripción:** La sección inferior del formulario.
> **Elementos a destacar:** Selección visual entre "DELIVERY" y "PICKUP" (Recojo en tienda), y cómo al seleccionar Delivery se despliegan automáticamente los campos obligatorios para Dirección y Transportista.
