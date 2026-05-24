import { Injectable } from '@nestjs/common';
// Usando Fetch API para interactuar con Resend sin SMTP

@Injectable()
export class MailService {
    private async sendEmailHttp(options: { from: string; to: string; subject: string; html: string }) {
        const apiKey = process.env.EMAIL_SMTP_PASSWORD;
        if (!apiKey) {
            console.warn('EMAIL_SMTP_PASSWORD no está configurado. No se enviará el correo.');
            return;
        }

        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: options.from,
                to: options.to,
                subject: options.subject,
                html: options.html
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Error al enviar correo con Resend API:', error);
            throw new Error(`Fallo al enviar correo: ${response.statusText}`);
        }
    }

    async sendVerificationEmail(email: string, token: string, firstName?: string) {
        const appUrl = process.env.APP_URL || 'http://localhost:3000';
        const verificationUrl = `${appUrl}/verify-email?token=${token}`;
        const from = process.env.EMAIL_FROM || 'hello@updates.wazend.net';

        await this.sendEmailHttp({
            from: `"${process.env.APP_NAME || 'SaaS Template'}" <${from}>`,
            to: email,
            subject: 'Verifica tu correo electrónico',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">¡Bienvenido a ${process.env.APP_NAME || 'SaaS Template'}!</h2>
                    <p>Hola ${firstName || 'Usuario'},</p>
                    <p>Gracias por registrarte. Por favor, verifica tu correo electrónico haciendo clic en el siguiente enlace:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${verificationUrl}" 
                           style="background-color: #6366F1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                            Verificar mi correo
                        </a>
                    </div>
                    <p>O copia y pega este enlace en tu navegador:</p>
                    <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
                    <p style="color: #999; font-size: 12px; margin-top: 30px;">
                        Este enlace expirará en 24 horas.<br>
                        Si no solicitaste este registro, puedes ignorar este correo.
                    </p>
                </div>
            `,
        });
    }

    async sendPasswordResetEmail(email: string, token: string, firstName?: string) {
        const appUrl = process.env.APP_URL || 'http://localhost:3000';
        const resetUrl = `${appUrl}/reset-password?token=${token}`;
        const from = process.env.EMAIL_FROM || 'hello@updates.wazend.net';

        await this.sendEmailHttp({
            from: `"${process.env.APP_NAME || 'SaaS Template'}" <${from}>`,
            to: email,
            subject: 'Recupera tu contraseña',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Recuperación de contraseña</h2>
                    <p>Hola ${firstName || 'Usuario'},</p>
                    <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para crear una nueva:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" 
                           style="background-color: #6366F1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                            Restablecer contraseña
                        </a>
                    </div>
                    <p>O copia y pega este enlace en tu navegador:</p>
                    <p style="word-break: break-all; color: #666;">${resetUrl}</p>
                    <p style="color: #999; font-size: 12px; margin-top: 30px;">
                        Este enlace expirará en 1 hora.<br>
                        Si no solicitaste este cambio, puedes ignorar este correo.
                    </p>
                </div>
            `,
        });
    }

    async sendInvitationEmail(email: string, workspaceName: string, inviterName: string) {
        const appUrl = process.env.APP_URL || 'http://localhost:3000';
        const workspacesUrl = `${appUrl}/workspaces`;
        const from = process.env.EMAIL_FROM || 'hello@updates.wazend.net';

        await this.sendEmailHttp({
            from: `"${process.env.APP_NAME || 'SaaS Template'}" <${from}>`,
            to: email,
            subject: `Has sido invitado a unirte a "${workspaceName}"`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">¡Nueva invitación!</h2>
                    <p>Hola,</p>
                    <p><strong>${inviterName}</strong> te ha invitado a unirte al workspace <strong>"${workspaceName}"</strong>.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${workspacesUrl}" 
                           style="background-color: #6366F1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                            Ver invitación
                        </a>
                    </div>
                    <p>Inicia sesión en ${process.env.APP_NAME || 'SaaS Template'} y visita la página de Workspaces para aceptar o rechazar esta invitación.</p>
                    <p style="color: #999; font-size: 12px; margin-top: 30px;">
                        Si no esperabas esta invitación, puedes ignorar este correo.
                    </p>
                </div>
            `,
        });
    }
}
