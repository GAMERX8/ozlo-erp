"use client";

import { useState } from "react";
import { 
    Card, 
    CardContent, 
    CardDescription, 
    CardHeader, 
    CardTitle,
    CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
    MessageSquare, 
    Send, 
    Check, 
    AlertCircle, 
    Loader2, 
    Globe,
    Key,
    Phone,
    Sliders,
    ChevronDown,
    ChevronUp,
    Copy,
    LayoutTemplate
} from "lucide-react";
import { toast } from "sonner";
import { saveWppIntegration, testWppIntegration } from "@/lib/integrations-actions";

interface WppManagerProps {
    workspaceId: string;
    initialInstanceName: string;
    initialApiKey: string;
    initialInstanceUrl: string;
    initialAdminPhone: string;
    initialClientNotificationsEnabled: boolean;
    initialTemplates: Record<string, string>;
    initialIsActive: boolean;
}

const TEMPLATE_KEYS = [
  { key: 'ORDER_CREATED', label: 'Nuevo Pedido (Creado)', desc: 'Mensaje de bienvenida al registrar el pedido.' },
  { key: 'CONFIRMED', label: 'Pedido Confirmado', desc: 'Se envía cuando el pedido pasa a estado Confirmado.' },
  { key: 'PREPARING', label: 'En Preparación', desc: 'Se envía al empezar a empacar / preparar el pedido.' },
  { key: 'READY', label: 'Listo para Entrega', desc: 'Se envía al tener el pedido empacado y listo.' },
  { key: 'SHIPPED', label: 'Pedido Enviado', desc: 'Se envía cuando el courier recoge el pedido.' },
  { key: 'DELIVERED', label: 'Pedido Entregado', desc: 'Se envía al confirmarse la entrega.' },
  { key: 'CANCELLED', label: 'Pedido Cancelado', desc: 'Se envía en caso de anulación del pedido.' },
];

const DEFAULT_TEMPLATES: Record<string, string> = {
  'ORDER_CREATED': 
    `¡Hola *{clientName}*! 👋\n\n` +
    `Hemos recibido tu pedido *#{orderNumber}* con éxito. 🎉\n\n` +
    `*Resumen de tu compra:*\n{productDetails}\n\n` +
    `*Total a pagar:* S/. {totalAmount}\n` +
    `*Método de pago:* {paymentMethod}\n\n` +
    `¡Gracias por tu compra! Te notificaremos cuando haya actualizaciones en tu envío.`,
  
  'CONFIRMED': 
    `¡Hola *{clientName}*! 👋\n\n` +
    `El estado de tu pedido *#{orderNumber}* ha cambiado a: *Confirmado*.\n\n` +
    `¡Gracias por confiar en nosotros!`,
    
  'PREPARING': 
    `¡Hola *{clientName}*! 👋\n\n` +
    `El estado de tu pedido *#{orderNumber}* ha cambiado a: *En Preparación*.\n\n` +
    `¡Gracias por confiar en nosotros!`,
    
  'READY': 
    `¡Hola *{clientName}*! 👋\n\n` +
    `Tu pedido *#{orderNumber}* ya se encuentra: *Listo para Despacho / Entrega*.\n\n` +
    `¡Gracias por confiar en nosotros!`,
    
  'SHIPPED': 
    `¡Hola *{clientName}*! 🚚💨\n\n` +
    `¡Buenas noticias! Tu pedido *#{orderNumber}* ya está en camino.\n\n` +
    `*Productos enviados:*\n{productNames}\n\n` +
    `*Courier:* {courierName}\n` +
    `*Tracking:* {trackingNumber}\n` +
    `*Sigue tu envío aquí:* {trackingUrl}\n\n` +
    `¡Esperamos que lo disfrutes mucho!`,
    
  'DELIVERED': 
    `¡Hola *{clientName}*! 🎉\n\n` +
    `Tu pedido *#{orderNumber}* ha sido *Entregado* con éxito.\n\n` +
    `¡Gracias por confiar en nosotros, esperamos verte pronto!`,
    
  'CANCELLED': 
    `¡Hola *{clientName}*! 👋\n\n` +
    `Te informamos que tu pedido *#{orderNumber}* ha sido *Cancelado*.\n\n` +
    `Si tienes alguna duda, por favor contáctanos.`,
};

const VARIABLES = [
  { name: '{clientName}', desc: 'Nombre del cliente' },
  { name: '{orderNumber}', desc: 'Código corto de pedido' },
  { name: '{totalAmount}', desc: 'Monto total (S/.)' },
  { name: '{paymentMethod}', desc: 'Método de pago' },
  { name: '{courierName}', desc: 'Nombre del courier (Olva/Shalom)' },
  { name: '{trackingNumber}', desc: 'Código de seguimiento' },
  { name: '{trackingUrl}', desc: 'Enlace para ver ruta del paquete' },
  { name: '{status}', desc: 'Nombre de estado legible' },
  { name: '{productNames}', desc: 'Nombres de los productos (separados por coma)' },
  { name: '{productDetails}', desc: 'Lista de productos con cantidades' },
];

export function WppManager({ 
    workspaceId, 
    initialInstanceName, 
    initialApiKey, 
    initialInstanceUrl,
    initialAdminPhone, 
    initialClientNotificationsEnabled,
    initialTemplates,
    initialIsActive 
}: WppManagerProps) {
    const [instanceName, setInstanceName] = useState(initialInstanceName);
    const [apiKey, setApiKey] = useState(initialApiKey);
    const [instanceUrl, setInstanceUrl] = useState(initialInstanceUrl || "https://api2.wazend.net");
    const [adminPhone, setAdminPhone] = useState(initialAdminPhone);
    const [clientNotificationsEnabled, setClientNotificationsEnabled] = useState(initialClientNotificationsEnabled);
    const [templates, setTemplates] = useState<Record<string, string>>(initialTemplates || {});
    const [isActive, setIsActive] = useState(initialIsActive);
    
    const [showTemplates, setShowTemplates] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleSave = async () => {
        if (isActive) {
            if (!instanceName.trim()) {
                toast.error("El nombre de la instancia es obligatorio para activar la integración.");
                return;
            }
            if (!apiKey.trim()) {
                toast.error("La clave API Key es obligatoria para activar la integración.");
                return;
            }
        }

        if (instanceUrl.trim()) {
            try {
                new URL(instanceUrl.trim());
            } catch (e) {
                toast.error("Por favor, introduce una URL de instancia válida.");
                return;
            }
        }

        // Limpiar plantillas vacías para no sobrecargar el JSON
        const cleanedTemplates: Record<string, string> = {};
        Object.entries(templates).forEach(([key, val]) => {
            if (val && val.trim()) {
                cleanedTemplates[key] = val.trim();
            }
        });

        setIsSaving(true);
        setTestResult(null);
        const result = await saveWppIntegration(workspaceId, { 
            instanceName: instanceName.trim(),
            apiKey: apiKey.trim(),
            instanceUrl: instanceUrl.trim() || "https://api2.wazend.net",
            adminPhone: adminPhone.trim(),
            clientNotificationsEnabled,
            templates: cleanedTemplates,
            is_active: isActive 
        });
        setIsSaving(false);

        if (result.error) {
            toast.error(result.error);
        } else if (result.data) {
            setInstanceName(result.data.instanceName);
            setApiKey(result.data.apiKey);
            setInstanceUrl(result.data.instanceUrl);
            setAdminPhone(result.data.adminPhone);
            setClientNotificationsEnabled(result.data.clientNotificationsEnabled);
            setTemplates(result.data.templates || {});
            setIsActive(result.data.is_active);
            toast.success("Configuración de WhatsApp guardada correctamente");
        }
    };

    const handleTest = async () => {
        if (!instanceName.trim() || !apiKey.trim()) {
            toast.error("Por favor, introduce la instancia y clave API Key antes de probar.");
            return;
        }

        if (!adminPhone.trim()) {
            toast.error("Por favor, configura un número de teléfono de administrador para recibir la prueba.");
            return;
        }

        setIsTesting(true);
        setTestResult(null);
        
        // Primero guardamos para asegurar que el backend use los credenciales de Wazend correctos
        const saveResult = await saveWppIntegration(workspaceId, { 
            instanceName: instanceName.trim(),
            apiKey: apiKey.trim(),
            instanceUrl: instanceUrl.trim() || "https://api2.wazend.net",
            adminPhone: adminPhone.trim(),
            clientNotificationsEnabled,
            templates,
            is_active: isActive 
        });

        if (saveResult.error) {
            setIsTesting(false);
            toast.error(`Error al guardar configuración temporal: ${saveResult.error}`);
            return;
        }

        const result = await testWppIntegration(workspaceId);
        setIsTesting(false);

        if (result.error) {
            setTestResult({
                success: false,
                message: result.error
            });
            toast.error("La prueba de envío ha fallado.");
        } else {
            setTestResult({
                success: true,
                message: "¡Mensaje de prueba enviado! Revisa el WhatsApp del administrador."
            });
            toast.success("¡Mensaje de prueba enviado con éxito!");
        }
    };

    const copyVariable = (varName: string) => {
        navigator.clipboard.writeText(varName);
        toast.success(`Copiado: ${varName}`);
    };

    return (
        <Card className="border border-muted-foreground/10 overflow-hidden shadow-md">
            <CardHeader className="bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-transparent pb-6">
                <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                        <MessageSquare className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col">
                        <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                            Integración WhatsApp con Wazend
                        </CardTitle>
                        <CardDescription className="text-sm text-muted-foreground mt-0.5">
                            Envía mensajes automáticos por WhatsApp directamente desde tu ERP usando Wazend API.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
                <div className="p-4 bg-muted/40 border rounded-lg text-sm text-muted-foreground flex flex-col gap-2">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <Globe className="w-4 h-4 text-emerald-500" /> ¿Cómo funciona Wazend?
                    </span>
                    <p>
                        Wazend es una pasarela que conecta tu línea de WhatsApp para enviar mensajes programáticos. 
                        Al activar la integración, el ERP notificará automáticamente a tus clientes y/o administradores:
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-1 text-xs">
                        <li><strong className="text-foreground">Nuevo Pedido:</strong> Notificación instantánea al administrador con los detalles de la venta y al cliente dándole la bienvenida.</li>
                        <li><strong className="text-foreground">Cambios de Estado:</strong> Notificaciones directas al cliente cuando su pedido cambia de estado.</li>
                    </ul>
                </div>

                <div className="flex items-center justify-between p-4 bg-background border rounded-lg shadow-sm">
                    <div className="flex flex-col gap-0.5">
                        <Label htmlFor="wpp-active" className="text-sm font-semibold cursor-pointer">
                            Activar Notificaciones
                        </Label>
                        <span className="text-xs text-muted-foreground">
                            Habilita el envío automático de WhatsApps para eventos de pedidos.
                        </span>
                    </div>
                    <Switch
                        id="wpp-active"
                        checked={isActive}
                        onCheckedChange={setIsActive}
                        className="data-[state=checked]:bg-emerald-500"
                    />
                </div>

                <div className="space-y-2 border-t pt-4">
                    <Label htmlFor="wpp-url" className="text-sm font-semibold flex items-center gap-1.5">
                        <Globe className="w-4 h-4 text-muted-foreground" /> Wazend API URL / Instance URL
                    </Label>
                    <Input
                        id="wpp-url"
                        placeholder="https://api2.wazend.net"
                        value={instanceUrl}
                        onChange={(e) => setInstanceUrl(e.target.value)}
                        className="focus-visible:ring-emerald-500 text-sm font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground">
                        La URL base de la API de Wazend (por defecto: https://api2.wazend.net).
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="wpp-instance" className="text-sm font-semibold flex items-center gap-1.5">
                            <Sliders className="w-4 h-4 text-muted-foreground" /> Wazend Instance Name
                        </Label>
                        <Input
                            id="wpp-instance"
                            placeholder="Ej. mi-instancia"
                            value={instanceName}
                            onChange={(e) => setInstanceName(e.target.value)}
                            className="focus-visible:ring-emerald-500 text-sm"
                        />
                        <p className="text-[10px] text-muted-foreground">
                            El nombre de la instancia en la URL de Wazend.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="wpp-apikey" className="text-sm font-semibold flex items-center gap-1.5">
                            <Key className="w-4 h-4 text-muted-foreground" /> Wazend API Key / Token
                        </Label>
                        <Input
                            id="wpp-apikey"
                            type="password"
                            placeholder="apiKey de Wazend"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="focus-visible:ring-emerald-500 text-sm font-mono"
                        />
                        <p className="text-[10px] text-muted-foreground">
                            El token secreto para autenticar peticiones.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="wpp-admin" className="text-sm font-semibold flex items-center gap-1.5">
                            <Phone className="w-4 h-4 text-muted-foreground" /> Teléfono Administrador (Alertas de Tienda)
                        </Label>
                        <Input
                            id="wpp-admin"
                            placeholder="Ej. 51924079147"
                            value={adminPhone}
                            onChange={(e) => setAdminPhone(e.target.value)}
                            className="focus-visible:ring-emerald-500 text-sm font-mono"
                        />
                        <p className="text-[10px] text-muted-foreground">
                            Número con código de país para alertas de nuevos pedidos.
                        </p>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted/20 border rounded-lg self-end h-[42px] mb-[2px]">
                        <Label htmlFor="wpp-clients" className="text-xs font-semibold cursor-pointer">
                            Notificar a Clientes
                        </Label>
                        <Switch
                            id="wpp-clients"
                            checked={clientNotificationsEnabled}
                            onCheckedChange={setClientNotificationsEnabled}
                            className="data-[state=checked]:bg-emerald-500"
                        />
                    </div>
                </div>

                {/* SECCIÓN DE PLANTILLAS PERSONALIZADAS */}
                <div className="border-t pt-4">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setShowTemplates(!showTemplates)}
                        className="w-full flex items-center justify-between px-4 py-2 border rounded-lg hover:bg-muted/40 font-semibold text-sm"
                    >
                        <span className="flex items-center gap-2">
                            <LayoutTemplate className="w-4 h-4 text-emerald-500" />
                            Personalizar Plantillas de Mensajes
                        </span>
                        {showTemplates ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>

                    {showTemplates && (
                        <div className="mt-4 space-y-6 animate-in slide-in-from-top duration-200">
                            <div className="p-4 bg-muted/20 border rounded-lg">
                                <span className="text-xs font-bold text-foreground block mb-2">
                                    Variables Disponibles:
                                </span>
                                <p className="text-[10px] text-muted-foreground mb-3">
                                    Haz clic en cualquiera de las variables a continuación para copiarla e insértala en tu plantilla.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {VARIABLES.map((v) => (
                                        <Badge
                                            key={v.name}
                                            variant="outline"
                                            onClick={() => copyVariable(v.name)}
                                            className="cursor-pointer hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all font-mono py-1 px-2 text-[10px] flex items-center gap-1 select-none"
                                            title={v.desc}
                                        >
                                            <code>{v.name}</code>
                                            <Copy className="w-2.5 h-2.5 text-muted-foreground opacity-60" />
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                {TEMPLATE_KEYS.map((item) => (
                                    <div key={item.key} className="space-y-1.5 p-3 border rounded-lg bg-background shadow-sm">
                                        <div className="flex justify-between items-center">
                                            <Label htmlFor={`tpl-${item.key}`} className="text-xs font-bold text-foreground">
                                                {item.label}
                                            </Label>
                                            <span className="text-[9px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded border">
                                                {item.key}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                            {item.desc}
                                        </p>
                                        <Textarea
                                            id={`tpl-${item.key}`}
                                            placeholder={DEFAULT_TEMPLATES[item.key]}
                                            value={templates[item.key] || ""}
                                            onChange={(e) => setTemplates({ ...templates, [item.key]: e.target.value })}
                                            className="min-h-[90px] text-xs font-mono focus-visible:ring-emerald-500 bg-muted/10"
                                        />
                                        <span className="text-[9px] text-muted-foreground block text-right">
                                            {templates[item.key] ? "✓ Plantilla personalizada activa" : "ℹ Usando mensaje por defecto"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {testResult && (
                    <div className={`p-4 rounded-lg border text-sm flex gap-3 items-start animate-in fade-in duration-200 ${
                        testResult.success 
                            ? "bg-emerald-500/5 border-emerald-500/25 text-emerald-800 dark:text-emerald-300" 
                            : "bg-destructive/5 border-destructive/25 text-destructive"
                    }`}>
                        {testResult.success ? (
                            <Check className="w-5 h-5 mt-0.5 shrink-0 text-emerald-500" />
                        ) : (
                            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-destructive" />
                        )}
                        <div className="flex flex-col gap-0.5">
                            <span className="font-semibold">
                                {testResult.success ? "Conexión Exitosa" : "Error de Envío"}
                            </span>
                            <span className="text-xs opacity-90">{testResult.message}</span>
                        </div>
                    </div>
                )}
            </CardContent>
            <CardFooter className="bg-muted/15 border-t px-6 py-4 flex flex-col sm:flex-row gap-3 sm:justify-between items-stretch sm:items-center">
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleTest}
                    disabled={isTesting || isSaving || !instanceName || !apiKey || !adminPhone}
                    className="flex items-center gap-1.5 border-muted-foreground/20 text-muted-foreground hover:text-foreground font-medium"
                >
                    {isTesting ? (
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                    ) : (
                        <Send className="w-4 h-4 text-emerald-500" />
                    )}
                    Enviar WhatsApp de Prueba
                </Button>
                <Button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving || isTesting}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium shadow-md shadow-emerald-500/10"
                >
                    {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    ) : null}
                    Guardar Configuración
                </Button>
            </CardFooter>
        </Card>
    );
}
