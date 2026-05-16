"use client";

import { useForm } from "react-hook-form";
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
import { PhoneInput } from "@/components/ui/phone-input";
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
  name: z.string().min(2, "Mínimo 2 caracteres"),
  document_type: z.enum(["DNI", "RUC", "CE", "PASSPORT"]),
  document_number: z.string().optional().default(""),
  phone: z.string().optional(),
  address: z.string().optional(),
  district_id: z.string().optional(),
  reference: z.string().optional(),
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
    resolver: zodResolver(clientSchema),
    defaultValues: initialData 
      ? {
          name: initialData.name || "",
          document_type: initialData.document_type || "DNI",
          document_number: initialData.document_number || "",
          phone: initialData.phone || "",
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
                <Input placeholder="Nombre del cliente" {...field} />
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
                  <Input placeholder="12345678" {...field} />
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
                <PhoneInput
                  placeholder="+51 999 999 999"
                  value={field.value}
                  onChange={field.onChange}
                  defaultCountry="PE"
                />
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