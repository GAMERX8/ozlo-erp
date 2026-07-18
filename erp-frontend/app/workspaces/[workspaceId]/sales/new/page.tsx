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
import { Separator } from "@/components/ui/separator";
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
  Calculator,
  MessageSquare,
} from "lucide-react";

// Types
import {
  salesChannelLabels,
  deliveryTypeLabels,
  regionLabels,
  paymentMethodLabels,
} from "@/types/order";

// Actions
import { createOrder } from "@/lib/sales-actions";
import { getClients } from "@/lib/clients-actions";
import { getProducts } from "@/lib/clients-actions";
import { getCouriers } from "@/lib/couriers-actions";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Schema de validación
const orderItemSchema = z.object({
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
  internal_notes: z.string().optional(),
  shipping_address: z.string().optional(),
  shipping_reference: z.string().optional(),
  estimated_delivery_date: z.date().optional(),
  courier_id: z.string().optional(),
  items: z.array(orderItemSchema).min(1, "Agrega al menos un producto"),
});

type OrderFormValues = z.infer<typeof orderSchema>;

export default function NewSalePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId: slug } = use(params);
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
      internal_notes: "",
      courier_id: "",
      items: [{ product_id: "", quantity: 1, unit_price: 0, discount_amount: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Tipos locales
  interface Client {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    document_number?: string;
    address?: string;
  }

  interface Product {
    id: string;
    name: string;
    price: number;
    inventory?: any[];
  }

  // Query para obtener clientes
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["clients", workspaceId],
    queryFn: async () => {
      console.log('Fetching clients for WorkspaceId:', workspaceId);
      if (!workspaceId) return [];
      const result = await getClients(workspaceId);
      console.log('Clients fetched:', result.success ? result.data.length : 'error');
      return result.success ? result.data : [];
    },
    enabled: !!workspaceId,
  });

  // Query para obtener productos
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products", workspaceId],
    queryFn: async () => {
      console.log('Fetching products for WorkspaceId:', workspaceId);
      if (!workspaceId) return [];
      const result = await getProducts(workspaceId);
      console.log('Products fetched:', result.success ? result.data.length : 'error');
      return result.success ? result.data : [];
    },
    enabled: !!workspaceId,
  });

  // Query para obtener couriers
  const { data: couriers = [] } = useQuery({
    queryKey: ["couriers", workspaceId],
    queryFn: async () => {
      console.log('Fetching couriers for WorkspaceId:', workspaceId);
      if (!workspaceId) return [];
      const result = await getCouriers(workspaceId);
      console.log('Couriers fetch result:', result);
      return result.success ? result.data : [];
    },
    enabled: !!workspaceId,
  });

  // Calcular totales
  const items = form.watch("items");
  const advanceAmount = form.watch("advance_amount") || 0;
  
  const subtotal = items.reduce((sum, item) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unit_price) || 0;
    const discount = Number(item.discount_amount) || 0;
    return sum + (quantity * unitPrice) - discount;
  }, 0);

  const shippingCost = form.watch("delivery_type") === "DELIVERY" 
    ? (form.watch("region") === "LIMA" ? 10 : 25) 
    : 0;
  
  const total = subtotal + shippingCost;
  const balance = total - advanceAmount;

  // Actualizar precio cuando se selecciona un producto
  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find((p: Product) => p.id === productId);
    if (product) {
      form.setValue(`items.${index}.unit_price`, product.price);

      if (!product.price || product.price === 0) {
        toast.warning("Este producto no tiene precio. Debes ingresar el precio unitario obligatoriamente.", { duration: 5000 });
      }

      const totalStock = product.inventory?.reduce((sum: number, inv: any) => sum + (inv.quantity || 0), 0) || 0;
      if (totalStock <= 0) {
        toast.warning("Este producto no cuenta con stock. Ponte en contacto con tu proveedor para ingresar más.", { duration: 6000 });
      }
    }
  };

  const onSubmit = async (values: OrderFormValues) => {
    if (!workspaceId) return;

    // Validaciones de stock y precio antes de enviar
    for (const item of values.items) {
      const product = products.find((p: Product) => p.id === item.product_id);
      if (product) {
        if (!item.unit_price || item.unit_price <= 0) {
          toast.error(`El producto "${product.name}" debe tener un precio unitario mayor a 0.`);
          return;
        }

        const totalStock = product.inventory?.reduce((sum: number, inv: any) => sum + (inv.quantity || 0), 0) || 0;
        if (totalStock <= 0) {
          toast.error(`No puedes registrar la venta. El producto "${product.name}" no cuenta con stock.`);
          return;
        }

        if (item.quantity > totalStock) {
          toast.error(`No hay suficiente stock de "${product.name}". Tienes ${totalStock} y quieres vender ${item.quantity}.`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    
    // Mapear el método de pago a los valores soportados por el backend
    const mapPaymentMethod = (method: string) => {
      const mapping: Record<string, string> = {
        'CASH': 'CASH',
        'YAPE': 'YAPE',
        'PLIN': 'PLIN',
        'TRANSFER': 'TRANSFER',
        'CARD': 'CASH', // Valor por defecto si no coincide
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
      internal_notes: values.internal_notes,
      courier_id: values.courier_id || undefined,
      items: values.items.map(item => ({
        product_id: item.product_id,
        variant_id: item.variant_id || undefined,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        discount: Number(item.discount_amount) || 0,
      })),
    };

    const result = await createOrder(workspaceId, orderData as any);

    if (result.success) {
      toast.success("Venta registrada correctamente");
      queryClient.invalidateQueries({ queryKey: ["orders", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["operations-kanban", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["operations-stats", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["products", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["lowStock", workspaceId] });
      router.push(`/workspaces/${slug}/sales`);
    } else {
      toast.error(result.error || "Error al registrar la venta");
    }
    
    setIsSubmitting(false);
  };

  const selectedClientId = form.watch("client_id");
  const selectedClient = clients.find((c: Client) => c.id === selectedClientId);

  if (workspaceLoading) {
    return (
      <div>
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

  if (!workspace) {
    return (
      <div className="flex flex-col animate-in fade-in duration-500 gap-6">
        <div className="text-center py-12">
          <Package className="mx-auto size-12 text-muted-foreground opacity-50" />
          <h3 className="mt-4 text-lg font-medium">Workspace no encontrado</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col animate-in fade-in duration-500 gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/workspaces/${slug}/sales`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Nueva Venta</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Registra una nueva orden de venta.
            </p>
          </div>
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
                        <FormLabel>Seleccionar Cliente *</FormLabel>
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
                                        <div className="text-xs text-muted-foreground">
                                          {client.phone} {client.email && `• ${client.email}`}
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

                  {selectedClient && (
                    <div className="p-3 bg-muted rounded-lg text-sm">
                      <div className="font-medium">{selectedClient.name}</div>
                      {selectedClient.phone && (
                        <div className="text-muted-foreground">{selectedClient.phone}</div>
                      )}
                      {selectedClient.address && (
                        <div className="text-muted-foreground mt-1">
                          📍 {selectedClient.address}
                        </div>
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
                    <Card key={field.id}>
                      <CardContent className="p-4 flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Item #{index + 1}</span>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
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
                                              console.log("Selected product:", product);
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
                            <FormLabel>Notas del item</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Ej: Talla M, color azul..."
                                className="text-sm"
                                {...field}
                              />
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
                      append({ product_id: "", quantity: 1, unit_price: 0, discount_amount: 0 })
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar Producto
                  </Button>
                </CardContent>
              </Card>

              {/* Detalles de Entrega */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Detalles de Entrega
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                  {form.watch("delivery_type") === "DELIVERY" && (
                    <>
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
                            <FormLabel>Referencia</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Ej: Frente al parque, casa azul..."
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
                                      ? couriers.find((c: any) => c.id === field.value)?.name || "Seleccionar courier..."
                                      : "Seleccionar courier..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="p-0 w-[300px]" align="start">
                                <Command>
                                  <CommandInput placeholder="Buscar courier..." />
                                  <CommandList>
                                    {couriers.length === 0 ? (
                                      <CommandEmpty>No se encontraron couriers.</CommandEmpty>
                                    ) : (
                                      <CommandGroup>
                                        {couriers.map((courier: any) => (
                                          <CommandItem
                                            key={courier.id}
                                            value={`${courier.name} ${courier.id}`}
                                            onSelect={() => {
                                              console.log("Selected courier:", courier);
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
                                    )}
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

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
                              selected={field.value}
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

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Notas Internas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="internal_notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            placeholder="Notas para el equipo (no visibles para el cliente)..."
                            className="h-24 resize-none"
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
              {/* Canal y Pago */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5" />
                    Canal y Pago
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <FormField
                    control={form.control}
                    name="sales_channel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Canal de Venta *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(salesChannelLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(paymentMethodLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
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
                </CardContent>
              </Card>

              {/* Totales */}
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Resumen
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>S/ {subtotal.toFixed(2)}</span>
                  </div>
                  
                  {form.watch("delivery_type") === "DELIVERY" && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Envío:</span>
                      <span>S/ {shippingCost.toFixed(2)}</span>
                    </div>
                  )}

                  <Separator />

                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>S/ {total.toFixed(2)}</span>
                  </div>

                  {advanceAmount > 0 && (
                    <>
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Adelanto:</span>
                        <span>- S/ {advanceAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-base font-semibold">
                        <span>Saldo:</span>
                        <span className={balance > 0 ? "text-orange-600" : "text-green-600"}>
                          S/ {(typeof balance === 'number' && !isNaN(balance) ? balance : 0).toFixed(2)}
                        </span>
                      </div>
                    </>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full mt-4" 
                    size="lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Guardando..." : "Guardar Venta"}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
