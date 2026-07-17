"use client";

import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useUbigeo } from "@/hooks/use-ubigeo";
import { createClient, updateClient } from "@/lib/clients-actions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const clientSchema = z.object({
  name: z.string()
    .min(2, "Mínimo 2 caracteres")
    .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/, "El nombre solo puede contener letras y espacios"),
  document_type: z.enum(["DNI", "RUC", "CE", "PASSPORT"]),
  document_number: z.string().optional().default(""),
  phone: z.string().optional().refine((val) => {
    if (!val) return true;
    return /^\d{9}$/.test(val);
  }, {
    message: "El teléfono debe tener exactamente 9 dígitos",
  }),
  address: z.string().optional(),
  district_id: z.string().optional(),
  reference: z.string().optional(),
}).refine((data) => {
  if (data.document_type === "DNI" && data.document_number) {
    return /^\d{1,8}$/.test(data.document_number);
  }
  return true;
}, {
  message: "El DNI debe tener solo números y hasta 8 dígitos",
  path: ["document_number"],
});

type ClientFormValues = z.infer<typeof clientSchema>;

interface ClientFormProps {
  workspaceId: string;
  initialData?: any;
  onSuccess: () => void;
}

export function ClientForm({ workspaceId, initialData, onSuccess }: ClientFormProps) {
  const {
    departments,
    provinces,
    districts,
    selectedDepartment,
    setSelectedDepartment,
    selectedProvince,
    setSelectedProvince,
    selectedDistrict,
    setSelectedDistrict,
    loading: ubigeoLoading
  } = useUbigeo();

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema) as Resolver<ClientFormValues>,
    defaultValues: initialData 
      ? {
          name: initialData.name || "",
          document_type: initialData.document_type || "DNI",
          document_number: initialData.document_number || "",
          phone: initialData.phone ? initialData.phone.replace("+51", "").replace(/\D/g, "").slice(-9) : "",
          address: initialData.address || "",
          district_id: initialData.district_id || "",
          reference: initialData.reference || "",
        }
      : {
          name: "",
          document_type: "DNI",
          document_number: "",
          phone: "",
          address: "",
          district_id: "",
          reference: "",
        },
  });

  const onSubmit = async (values: ClientFormValues) => {
    try {
      const payload = {
        ...values,
        phone: values.phone ? `+51${values.phone}` : "",
        district_id: selectedDistrict || values.district_id,
      };

      if (initialData) {
        const result = await updateClient(workspaceId, initialData.id, payload);
        if (result.success) {
          toast.success("Cliente actualizado correctamente");
          onSuccess();
        } else {
          toast.error(result.error || "Error al actualizar cliente");
        }
      } else {
        const result = await createClient(workspaceId, payload);
        if (result.success) {
          toast.success("Cliente creado correctamente");
          onSuccess();
        } else {
          toast.error(result.error || "Error al crear cliente");
        }
      }
    } catch (error: any) {
      toast.error("Ocurrió un error inesperado");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Razón Social / Nombre</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Nombre del cliente" 
                  {...field} 
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, "");
                    field.onChange(val);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="document_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="DNI">DNI</SelectItem>
                    <SelectItem value="RUC">RUC</SelectItem>
                    <SelectItem value="CE">C.E.</SelectItem>
                    <SelectItem value="PASSPORT">Pasaporte</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="document_number"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Número de Documento</FormLabel>
                <FormControl>
                  <Input 
                    placeholder={form.watch("document_type") === "DNI" ? "12345678" : "Número de documento"} 
                    {...field} 
                    onChange={(e) => {
                      let val = e.target.value;
                      if (form.watch("document_type") === "DNI") {
                        val = val.replace(/\D/g, "").slice(0, 8);
                      }
                      field.onChange(val);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teléfono</FormLabel>
              <FormControl>
                <div className="flex rounded-md shadow-sm">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-xs font-mono select-none">
                    🇵🇪 +51
                  </span>
                  <Input
                    type="text"
                    placeholder="999999999"
                    className="rounded-l-none focus-visible:ring-emerald-500 font-mono text-sm"
                    {...field}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 9);
                      field.onChange(val);
                    }}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormItem className="w-full">
            <FormLabel>Departamento</FormLabel>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Departamento" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>

          <FormItem className="w-full">
            <FormLabel>Provincia</FormLabel>
            <Select 
              value={selectedProvince} 
              onValueChange={setSelectedProvince}
              disabled={!selectedDepartment || ubigeoLoading}
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Provincia" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {provinces.map((prov) => (
                  <SelectItem key={prov.id} value={prov.id}>
                    {prov.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>

          <FormItem className="w-full">
            <FormLabel>Distrito</FormLabel>
            <Select 
              value={selectedDistrict} 
              onValueChange={setSelectedDistrict}
              disabled={!selectedProvince || ubigeoLoading}
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Distrito" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {districts.map((dist) => (
                  <SelectItem key={dist.id} value={dist.id}>
                    {dist.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormItem>
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dirección</FormLabel>
              <FormControl>
                <Input placeholder="Av. Principal 123" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="reference"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Referencia</FormLabel>
              <FormControl>
                <Textarea placeholder="Cerca al parque, frente al mercado..." {...field} rows={2} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? "Guardar Cambios" : "Crear Cliente"}
          </Button>
        </div>
      </form>
    </Form>
  );
}