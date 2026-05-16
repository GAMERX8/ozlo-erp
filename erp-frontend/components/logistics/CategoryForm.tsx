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
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { toast } from 'sonner';
import { createCategory, updateCategory } from '@/lib/clients-actions';

interface CategoryFormProps {
  workspaceId: string;
  onSuccess: () => void;
  initialData?: any;
}

export function CategoryForm({ workspaceId, onSuccess, initialData }: CategoryFormProps) {
  const [loading, setLoading] = useState(false);
  const form = useForm({
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
    },
  });

  const onSubmit = async (values: any) => {
    setLoading(true);
    try {
      let result;
      if (initialData) {
        result = await updateCategory(workspaceId, initialData.id, values);
      } else {
        result = await createCategory(workspaceId, values);
      }

      if (!result.success) throw new Error(result.error);

      toast.success(initialData ? 'Categoría actualizada' : 'Categoría creada');
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
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input placeholder="Ej. Electrónicos" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea placeholder="Descripción opcional" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={loading}>
            {loading ? 'Guardando...' : initialData ? 'Actualizar' : 'Crear Categoría'}
          </Button>
        </div>
      </form>
    </Form>
  );
}