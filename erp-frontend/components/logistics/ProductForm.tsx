'use client';

import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useLogistics } from '@/hooks/useLogistics';
import { Category, Warehouse } from '@/types/logistics';
import { createPresignedUpload, completeUpload, uploadFileDirectly } from '@/lib/storage-actions';
import { ImageIcon, X, UploadCloud, Loader2 } from 'lucide-react';

interface ProductFormProps {
  workspaceId: string;
  onSuccess: (stayOpen?: boolean) => void;
  initialData?: any;
}

export function ProductForm({ workspaceId, onSuccess, initialData }: ProductFormProps) {
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(
    initialData?.gallery && Array.isArray(initialData.gallery) ? initialData.gallery[0] : null
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { fetchCategories, fetchWarehouses, createProduct, updateProduct } = useLogistics(workspaceId);

  const form = useForm({
    defaultValues: {
      name: initialData?.name || '',
      sku: initialData?.sku || '',
      description: initialData?.description || '',
      price: initialData?.price || 0,
      cost: initialData?.cost || 0,
      category_id: initialData?.category_id || '',
      warehouse_id: initialData?.warehouse_id || initialData?.inventory?.[0]?.warehouse_id || '',
      unit: initialData?.unit || 'UND',
      gallery: initialData?.gallery || [],
    },
  });

  useEffect(() => {
    const loadData = async () => {
      const [cats, whs] = await Promise.all([
        fetchCategories(),
        fetchWarehouses()
      ]);
      setCategories(cats);
      setWarehouses(whs);
    };
    loadData();
  }, [fetchCategories, fetchWarehouses]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('El archivo es demasiado grande (máx 5MB)');
        return;
      }
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('workspace_id', workspaceId);
      formData.append('scope', 'product_image');

      const result = await uploadFileDirectly(formData);
      
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Error al subir la imagen');
      }

      return result.data.signed_url || result.data.public_url;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Error al subir imagen: ${error.message}`);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name || '',
        sku: initialData.sku || '',
        description: initialData.description || '',
        price: initialData.price || 0,
        cost: initialData.cost || 0,
        category_id: initialData.category_id || '',
        warehouse_id: initialData.warehouse_id || initialData.inventory?.[0]?.warehouse_id || '',
        unit: initialData.unit || 'UND',
        gallery: initialData.gallery || [],
      });
      setImagePreview(initialData.gallery?.[0] || null);
    } else {
      form.reset({
        name: '',
        sku: '',
        description: '',
        price: 0,
        cost: 0,
        category_id: '',
        warehouse_id: '',
        unit: 'UND',
        gallery: [],
      });
      setImagePreview(null);
    }
  }, [initialData, form]);

  const [continueAdding, setContinueAdding] = useState(false);

  const onSubmit = async (values: any) => {
    setLoading(true);
    try {
      let finalGallery = values.gallery;

      // Si hay un nuevo archivo seleccionado, subirlo primero
      if (selectedFile) {
        const imageUrl = await uploadFile(selectedFile);
        if (imageUrl) {
          finalGallery = [imageUrl]; // Por ahora manejamos una sola imagen principal
        } else {
          setLoading(false);
          return; // Detener si falló la subida
        }
      }

      // Convertir campos numéricos y limpiar payload para actualización
      const { warehouse_id, ...dataToProcess } = values;
      const formattedValues = {
        ...dataToProcess,
        price: Number(values.price),
        cost: Number(values.cost),
        gallery: finalGallery,
      };

      if (initialData) {
        // En la actualización no enviamos warehouse_id ni campos de inicialización
        await updateProduct(initialData.id, formattedValues);
      } else {
        // En la creación sí enviamos todo, incluyendo el warehouse_id
        await createProduct({ ...formattedValues, warehouse_id });
      }

      toast.success(initialData ? 'Producto actualizado' : 'Producto creado');
      
      if (continueAdding && !initialData) {
        // Limpiar para el siguiente pero manteniendo almacén y categoría
        form.reset({
          ...form.getValues(),
          name: '',
          sku: '',
          description: '',
          price: 0,
          cost: 0,
          gallery: [],
        });
        setImagePreview(null);
        setSelectedFile(null);
        onSuccess(true); // Informar al padre que refresque pero no cierre
      } else {
        onSuccess(false);
      }
    } catch (error: any) {
      console.error('ProductForm Error:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-h-[80vh] overflow-y-auto px-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          <FormField
            control={form.control}
            name="warehouse_id"
            render={({ field }) => (
              <FormItem className="w-full">
                <FormLabel className="text-base font-semibold">Almacén</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="h-12 w-full">
                      <SelectValue placeholder="Seleccionar almacén..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent position="popper" side="bottom">
                    {warehouses.map((wh) => (
                      <SelectItem key={wh.id} value={wh.id}>
                        {wh.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2 w-full">
            <FormLabel className="text-base font-semibold">Imagen del producto</FormLabel>
            <div className="flex items-center gap-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors bg-muted/30 relative shrink-0"
              >
                {imagePreview ? (
                  <div className="relative w-full h-full rounded-lg overflow-hidden">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                      <UploadCloud className="h-6 w-6 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <ImageIcon className="h-6 w-6" />
                    <span className="text-[10px] font-medium uppercase">Subir foto</span>
                  </div>
                )}
                {uploadingImage && (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded-lg z-10">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                )}
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>Formatos: JPG, PNG, WEBP.</p>
                <p>Máximo 5MB.</p>
                {imagePreview && (
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto text-destructive text-xs"
                    onClick={() => {
                      setImagePreview(null);
                      setSelectedFile(null);
                      form.setValue('gallery', []);
                    }}
                  >
                    Eliminar imagen
                  </Button>
                )}
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>
        </div>

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-base font-semibold">Nombre del Producto</FormLabel>
                <FormControl>
                  <Input 
                    className="h-12" 
                    placeholder="Ej. Monitor Samsung 24..." 
                    {...field} 
                    onChange={(e) => {
                      field.onChange(e);
                      const currentSku = form.getValues('sku');
                      if (!initialData && (!currentSku || currentSku.trim() === '')) {
                        const nameStr = e.target.value;
                        const cleanName = nameStr.replace(/[^a-zA-Z0-9\s]/g, '').trim().toUpperCase();
                        if (cleanName) {
                          const words = cleanName.split(/\s+/);
                          const baseSku = words.length > 1 
                            ? `${words[0].substring(0, 4)}-${words.slice(1).map(w => w.substring(0, 3)).join('').substring(0, 6)}`
                            : cleanName.substring(0, 8);
                          const randomSuffix = Math.floor(Math.random() * 100).toString().padStart(2, '0');
                          form.setValue('sku', `${baseSku}-${randomSuffix}`);
                        }
                      }
                    }}
                    value={field.value ?? ''} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel className="text-base font-semibold">SKU / Código</FormLabel>
                  <FormControl>
                    <Input 
                      className="h-9 w-full px-4" 
                      placeholder="PROD-001" 
                      {...field} 
                      value={field.value ?? ''} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel className="text-base font-semibold">Categoría</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-12 w-full px-4">
                        <SelectValue placeholder="Seleccionar categoría" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper" side="bottom">
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Detalles técnicos, características..." 
                  {...field} 
                  value={field.value ?? ''} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Precio Venta</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    {...field} 
                    value={field.value ?? ''} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Costo</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.01" 
                    {...field} 
                    value={field.value ?? ''} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
          {!initialData && (
            <Button 
              type="button"
              variant="outline"
              disabled={loading || uploadingImage}
              onClick={() => {
                setContinueAdding(true);
                form.handleSubmit(onSubmit)();
              }}
              className="w-full sm:w-auto border-primary/20 hover:bg-primary/5"
            >
              Crear y agregar otro
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={loading || uploadingImage} 
            onClick={() => setContinueAdding(false)}
            className={`w-full sm:w-auto ${!initialData ? 'bg-red-600 hover:bg-red-700' : ''}`}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {selectedFile ? 'Subiendo y Guardando...' : 'Guardando...'}
              </>
            ) : initialData ? 'Actualizar Producto' : 'Crear Producto'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
