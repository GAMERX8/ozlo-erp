'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { toast } from 'sonner';
import { createWarehouse, updateWarehouse } from '@/lib/clients-actions';

interface WarehouseFormProps {
  workspaceId: string;
  onSuccess: () => void;
  initialData?: any;
}

export function WarehouseForm({ workspaceId, onSuccess, initialData }: WarehouseFormProps) {
  const [loading, setLoading] = useState(false);
  const form = useForm({
    defaultValues: {
      name: initialData?.name || '',
      address: initialData?.address || '',
    },
  });

  const onSubmit = async (values: any) => {
    setLoading(true);
    try {
      let result;
      if (initialData) {
        result = await updateWarehouse(workspaceId, initialData.id, values);
      } else {
        result = await createWarehouse(workspaceId, values);
      }

      if (!result.success) throw new Error(result.error);

      toast.success(initialData ? 'Almacén actualizado' : 'Almacén creado');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Almacén</FormLabel>
              <FormControl>
                <Input placeholder="Ej. Almacén Central" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dirección</FormLabel>
              <FormControl>
                <Input placeholder="Ej. Av. Principal 123" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={loading}>
            {loading ? 'Guardando...' : initialData ? 'Actualizar' : 'Crear Almacén'}
          </Button>
        </div>
      </form>
    </Form>
  );
}