"use client";

import { useState, use, useEffect } from "react";
import { useWorkspace } from "@/hooks/use-workspace";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm, useFieldArray, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";

// Icons
import {
  ArrowLeft,
  Plus,
  Trash2,
  Package,
  CalendarIcon,
  Check,
  ChevronsUpDown,
  User,
  Truck,
  Store,
} from "lucide-react";

// Types
import {
  salesChannelLabels,
  deliveryTypeLabels,
  regionLabels,
  paymentMethodLabels,
} from "@/types/order";

// Actions
import { getOrder, updateOrder } from "@/lib/sales-actions";
import { getClients, getProducts } from "@/lib/clients-actions";
import { getCouriers } from "@/lib/couriers-actions";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Schema de validación
const orderItemSchema = z.object({
  id: z.string().optional(),
  product_id: z.string().min(1, "Selecciona un producto"),
  variant_id: z.string().optional(),
  quantity: z.number().min(1, "La cantidad mínima es 1"),
  unit_price: z.number().min(0, "El precio no puede ser negativo"),
  discount_amount: z.number().min(0).default(0),
  notes: z.string().optional(),
});

const orderSchema = z.object({
  client_id: z.string().min(1, "Selecciona un cliente"),
  sales_channel: z.enum(["FACEBOOK", "WHATSAPP", "INSTAGRAM", "TIKTOK", "OTHER"]),
  delivery_type: z.enum(["DELIVERY", "PICKUP"]),
  region: z.enum(["LIMA", "PROVINCE"]),
  payment_method: z.enum(["CASH", "YAPE", "PLIN", "TRANSFER", "CARD", "DEPOSIT"]),
  advance_amount: z.number().min(0).default(0),
  notes: z.string().optional(),
  internal_notes: z.string().optional(),
  shipping_address: z.string().optional(),
  shipping_reference: z.string().optional(),
  estimated_delivery_date: z.date().optional().nullable(),
  courier_id: z.string().optional().nullable(),
  items: z.array(orderItemSchema).min(1, "Agrega al menos un producto"),
});

type OrderFormValues = z.infer<typeof orderSchema>;

export default function EditOrderPage({
  params,
}: {
  params: Promise<{ workspaceId: string; orderId: string }>;
}) {
  const { workspaceId: slug, orderId } = use(params);
  const { data: workspace, isLoading: workspaceLoading } = useWorkspace(slug);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [productSearchOpen, setProductSearchOpen] = useState<{ [key: number]: boolean }>({});
  const [courierSearchOpen, setCourierSearchOpen] = useState(false);

  const workspaceId = workspace?.id;

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema) as Resolver<OrderFormValues>,
    defaultValues: {
      client_id: "",
      sales_channel: "WHATSAPP",
      delivery_type: "DELIVERY",
      region: "LIMA",
      payment_method: "CASH",
      advance_amount: 0,
      shipping_address: "",
      shipping_reference: "",
      notes: "",
      internal_notes: "",
      courier_id: null,
      items: [],
      estimated_delivery_date: null,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Query para obtener la orden
  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ["order", orderId, workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;
      const result = await getOrder(orderId, workspaceId);
      return result.success ? result.data : null;
    },
    enabled: !!workspaceId,
  });

  // Cargar datos en el formulario
  useEffect(() => {
    if (order) {
      form.reset({
        client_id: order.client_id,
        sales_channel: (order.channel || "WHATSAPP") as any,
        delivery_type: (order.delivery_type || "DELIVERY") as any,
        region: (order.delivery_region || "LIMA") as any,
        payment_method: (order.payment_method || "CASH") as any,
        advance_amount: order.advance_payment || 0,
        shipping_address: order.shipping_address || "",
        shipping_reference: order.shipping_reference || "",
        notes: order.notes || "",
        internal_notes: (order as any).internal_notes || "",
        courier_id: order.courier_id || null,
        estimated_delivery_date: order.estimated_delivery_date ? new Date(order.estimated_delivery_date) : null,
        items: order.items.map((item: any) => ({
          id: item.id,
          product_id: item.product_id,
          variant_id: item.variant_id || undefined,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_amount: item.discount || 0,
          notes: item.notes || "",
        })),
      });
    }
  }, [order, form]);

  // Tipos locales
  interface Client {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
  }

  interface Product {
    id: string;
    name: string;
    price: number;
  }

  // Query para obtener clientes
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["clients", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const result = await getClients(workspaceId);
      return result.success ? result.data : [];
    },
    enabled: !!workspaceId,
  });

  // Query para obtener productos
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const result = await getProducts(workspaceId);
      return result.success ? result.data : [];
    },
    enabled: !!workspaceId,
  });

  // Query para obtener couriers
  const { data: couriers = [] } = useQuery({
    queryKey: ["couriers", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const result = await getCouriers(workspaceId);
      return result.success ? result.data : [];
    },
    enabled: !!workspaceId,
  });

  // Calcular totales
  const formItems = form.watch("items");
  const advanceAmount = form.watch("advance_amount") || 0;
  
  const subtotal = formItems.reduce((sum, item) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unit_price) || 0;
    const discount = Number(item.discount_amount) || 0;
    return sum + (quantity * unitPrice) - discount;
  }, 0);

  const shippingCostValue = form.watch("delivery_type") === "DELIVERY" 
    ? (form.watch("region") === "LIMA" ? 10 : 25) 
    : 0;
  
  const total = subtotal + shippingCostValue;
  const balance = total - advanceAmount;

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find((p: Product) => p.id === productId);
    if (product) {
      form.setValue(`items.${index}.unit_price`, product.price);
    }
  };

  const onSubmit = async (values: OrderFormValues) => {
    if (!workspaceId) return;

    setIsSubmitting(true);
    
    // Mapear el método de pago a los valores soportados por el backend
    const mapPaymentMethod = (method: string) => {
      const mapping: Record<string, string> = {
        'CASH': 'CASH',
        'YAPE': 'YAPE',
        'PLIN': 'PLIN',
        'TRANSFER': 'TRANSFER',
        'CARD': 'CASH',
        'DEPOSIT': 'TRANSFER'
      };
      return mapping[method] || 'CASH';
    };

    const orderData = {
      client_id: values.client_id,
      channel: values.sales_channel,
      delivery_type: values.delivery_type,
      delivery_region: values.region,
      payment_method: mapPaymentMethod(values.payment_method),
      advance_payment: Number(values.advance_amount) || 0,
      notes: values.notes,
      internal_notes: values.internal_notes,
      courier_id: values.courier_id || undefined,
      estimated_delivery_date: values.estimated_delivery_date,
      shipping_address: values.shipping_address,
      shipping_reference: values.shipping_reference,
      shipping_cost: shippingCostValue,
      items: values.items.map(item => ({
        id: item.id,
        product_id: item.product_id,
        variant_id: item.variant_id || undefined,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        discount: Number(item.discount_amount) || 0,
        notes: item.notes,
      })),
    };

    const result = await updateOrder(orderId, workspaceId, orderData as any);

    if (result.success) {
      toast.success("Venta actualizada correctamente");
      queryClient.invalidateQueries({ queryKey: ["orders", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["operations-kanban", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["products", workspaceId] });
      router.push(`/workspaces/${slug}/sales/${orderId}`);
    } else {
      toast.error(result.error || "Error al actualizar la venta");
    }
    
    setIsSubmitting(false);
  };

  const selectedClientId = form.watch("client_id");
  const selectedClient = clients.find((c: Client) => c.id === selectedClientId);

  if (workspaceLoading || orderLoading) {
    return (
      <div className="p-8">
        <Skeleton className="h-10 w-48 mb-6" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Skeleton className="h-[400px] w-full" />
          </div>
          <Skeleton className="h-[300px] w-full" />
        </div>
      </div>
    );
  }

  if (!workspace || !order) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Package className="size-12 text-muted-foreground opacity-50" />
        <h3 className="mt-4 text-lg font-medium">Orden no encontrada</h3>
        <Button variant="link" asChild>
           <Link href={`/workspaces/${slug}/sales`}>Volver a ventas</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col animate-in fade-in duration-500 gap-6 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/workspaces/${slug}/sales/${orderId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Editar Venta #{order.order_number || orderId.slice(0, 8)}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Modifica los detalles de la orden de venta.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" asChild disabled={isSubmitting}>
               <Link href={`/workspaces/${slug}/sales/${orderId}`}>Cancelar</Link>
            </Button>
            <Button onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : "Guardar Cambios"}
            </Button>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Columna principal */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* Cliente */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <FormField
                    control={form.control}
                    name="client_id"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Cliente *</FormLabel>
                        <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "justify-between",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value
                                  ? clients.find((client: Client) => client.id === field.value)?.name
                                  : "Buscar cliente..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="p-0 w-[400px]">
                            <Command>
                              <CommandInput placeholder="Buscar cliente..." />
                              <CommandList>
                                <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                                <CommandGroup>
                                  {clients.map((client: Client) => (
                                    <CommandItem
                                      key={client.id}
                                      value={`${client.name} ${client.id}`}
                                      onSelect={() => {
                                        form.setValue("client_id", client.id);
                                        setClientSearchOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          field.value === client.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <div>
                                        <div className="font-medium">{client.name}</div>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedClient && (
                    <div className="p-3 bg-muted rounded-lg text-sm">
                      <div className="font-medium">{selectedClient.name}</div>
                      {selectedClient.phone && (
                        <div className="text-muted-foreground">{selectedClient.phone}</div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Productos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Productos
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {fields.map((field, index) => (
                    <Card key={field.id} className="border-dashed border-2">
                      <CardContent className="p-4 flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Item #{index + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.product_id`}
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel>Producto *</FormLabel>
                              <Popover 
                                open={productSearchOpen[index]} 
                                onOpenChange={(open) => 
                                  setProductSearchOpen({ ...productSearchOpen, [index]: open })
                                }
                              >
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      className={cn(
                                        "justify-between",
                                        !field.value && "text-muted-foreground"
                                      )}
                                    >
                                      {field.value
                                        ? products.find((p: Product) => p.id === field.value)?.name
                                        : "Seleccionar producto..."}
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="p-0 w-[350px]">
                                  <Command>
                                    <CommandInput placeholder="Buscar producto..." />
                                    <CommandList>
                                      <CommandEmpty>No se encontraron productos.</CommandEmpty>
                                      <CommandGroup>
                                        {products.map((product: Product) => (
                                          <CommandItem
                                            key={product.id}
                                            value={`${product.name} ${product.id}`}
                                            onSelect={() => {
                                              form.setValue(`items.${index}.product_id`, product.id);
                                              handleProductSelect(index, product.id);
                                              setProductSearchOpen({ ...productSearchOpen, [index]: false });
                                            }}
                                          >
                                            <Check
                                              className={cn(
                                                "mr-2 h-4 w-4",
                                                field.value === product.id ? "opacity-100" : "opacity-0"
                                              )}
                                            />
                                            <div className="flex-1">
                                              <div className="font-medium">{product.name}</div>
                                              <div className="text-xs text-muted-foreground">
                                                S/ {product.price}
                                              </div>
                                            </div>
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cantidad *</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min={1}
                                  {...field}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <FormField
                          control={form.control}
                          name={`items.${index}.unit_price`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Precio Unit. (S/) *</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min={0}
                                  {...field}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name={`items.${index}.discount_amount`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Descuento (S/)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min={0}
                                  {...field}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex items-end">
                          <div className="p-2 bg-muted rounded text-sm w-full">
                            <span className="text-muted-foreground">Subtotal: </span>
                            <span className="font-medium">
                              S/ {(
                                (form.watch(`items.${index}.quantity`) || 0) * 
                                (form.watch(`items.${index}.unit_price`) || 0) - 
                                (form.watch(`items.${index}.discount_amount`) || 0)
                              ).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <FormField
                        control={form.control}
                        name={`items.${index}.notes`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Notas del Item</FormLabel>
                            <FormControl>
                              <Input placeholder="Notas para este producto..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                    </Card>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() =>
                      append({ product_id: "", quantity: 1, unit_price: 0, discount_amount: 0, notes: "" })
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar Producto
                  </Button>
                </CardContent>
              </Card>

              {/* Entrega */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Entrega
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="delivery_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Entrega *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="DELIVERY">{deliveryTypeLabels.DELIVERY}</SelectItem>
                              <SelectItem value="PICKUP">{deliveryTypeLabels.PICKUP}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="region"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Región *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="LIMA">{regionLabels.LIMA}</SelectItem>
                              <SelectItem value="PROVINCE">{regionLabels.PROVINCE}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="shipping_address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dirección de Entrega</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Ingresa la dirección completa..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="shipping_reference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Referencia de Envío</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Ej. Casa de rejas blancas..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                   <FormField
                    control={form.control}
                    name="courier_id"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Courier / Transportista</FormLabel>
                        <Popover open={courierSearchOpen} onOpenChange={setCourierSearchOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "justify-between",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value
                                  ? couriers.find((c: any) => c.id === field.value)?.name || "Seleccionar..."
                                  : "Seleccionar..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="p-0 w-[400px]" align="start">
                            <Command>
                              <CommandInput placeholder="Buscar courier..." />
                              <CommandList>
                                <CommandEmpty>No se hallaron resultados.</CommandEmpty>
                                <CommandGroup>
                                  {couriers.map((courier: any) => (
                                    <CommandItem
                                      key={courier.id}
                                      value={`${courier.name} ${courier.id}`}
                                      onSelect={() => {
                                        form.setValue("courier_id", courier.id);
                                        setCourierSearchOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          field.value === courier.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      {courier.name}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="estimated_delivery_date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Fecha Estimada de Entrega</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP", { locale: es })
                                ) : (
                                  <span>Seleccionar fecha</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value || undefined}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Notas */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5" />
                    Notas y Comentarios
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notas para el Cliente (Públicas)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Notas que el cliente puede ver en su pedido..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="internal_notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notas Internas (Equipo)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Solo para uso interno del equipo..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="flex flex-col gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5" />
                    Pago y Canal
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <FormField
                    control={form.control}
                    name="sales_channel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Canal *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(salesChannelLabels).map(([v, l]) => (
                                <SelectItem key={v} value={v}>{l}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="payment_method"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Método de Pago *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(paymentMethodLabels).map(([v, l]) => (
                                <SelectItem key={v} value={v}>{l}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                   <FormField
                    control={form.control}
                    name="advance_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Adelanto (S/)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Resumen */}
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle>Resumen</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                   <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>S/ {subtotal.toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between text-sm">
                      <span>Envío</span>
                      <span>S/ {shippingCostValue.toFixed(2)}</span>
                   </div>
                   <Separator className="my-2" />
                   <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>S/ {total.toFixed(2)}</span>
                   </div>
                   <div className="flex justify-between text-sm text-destructive mt-2">
                      <span>Saldo Pendiente</span>
                      <span>S/ {balance.toFixed(2)}</span>
                   </div>
                </CardContent>
              </Card>

              <Button 
                className="w-full h-12 text-lg" 
                onClick={form.handleSubmit(onSubmit)}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
