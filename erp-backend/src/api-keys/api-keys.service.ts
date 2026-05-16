import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';
import { AuditService, AuditActions } from '../audit/audit.service';

@Injectable()
export class ApiKeysService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditService,
    ) {}

    async create(userId: string, workspaceId: string, name: string, expiresAt?: Date) {
        const fs = require('fs');
        const path = require('path');
        const logPath = path.resolve(process.cwd(), 'auth.log');
        const log = (msg: string) => fs.appendFileSync(logPath, `${new Date().toISOString()} - ${msg}\n`);
        
        try {
            log(`STP 1: Intentando crear API Key. User: ${userId}, Workspace: ${workspaceId}, Name: ${name}`);
            
            // Generar una clave aleatoria segura
            const rawKey = `ak_erp_${crypto.randomBytes(24).toString('hex')}`;
            const keyPrefix = rawKey.substring(0, 10);
            const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

            log(`STP 2: Datos generados. Hash: ${keyHash.substring(0, 10)}...`);

            const apiKey = await this.prisma.apiKey.create({
                data: {
                    name,
                    key_prefix: `${keyPrefix}****`,
                    key_hash: keyHash,
                    user: { connect: { id: userId } },
                    workspace: { connect: { id: workspaceId } },
                    expires_at: expiresAt,
                },
            });

            log(`STP 3: API Key insertada en BD: ${apiKey.id}`);

            try {
                log(`STP 4: Intentando registrar Auditoría...`);
                await this.audit.log({
                    action: 'API_KEY_CREATED',
                    entityType: 'api_key',
                    entityId: apiKey.id,
                    actorId: userId,
                    workspaceId: workspaceId,
                    metadata: { name },
                });
                log(`STP 5: Auditoría registrada.`);
            } catch (auditError: any) {
                log(`WARN: Error en Auditoría (no crítico): ${auditError.message}`);
            }

            return {
                ...apiKey,
                raw_key: rawKey,
            };
        } catch (error: any) {
            log(`FATAL ERROR en ApiKeysService.create: ${error.message}`);
            if (error.stack) log(error.stack);
            throw error;
        }
    }

    async findAll(workspaceId: string) {
        return this.prisma.apiKey.findMany({
            where: {
                workspace_id: workspaceId,
                status: 'active',
            },
            select: {
                id: true,
                name: true,
                key_prefix: true,
                status: true,
                last_used: true,
                expires_at: true,
                created_at: true,
            },
            orderBy: {
                created_at: 'desc',
            },
        });
    }

    async remove(id: string, userId: string, workspaceId: string) {
        const apiKey = await this.prisma.apiKey.findFirst({
            where: { id, workspace_id: workspaceId },
        });

        if (!apiKey) {
            throw new NotFoundException('API Key no encontrada');
        }

        await this.prisma.apiKey.update({
            where: { id },
            data: { status: 'revoked' },
        });

        await this.audit.log({
            action: 'API_KEY_REVOKED',
            entityType: 'api_key',
            entityId: id,
            actorId: userId,
            workspaceId: workspaceId,
            metadata: { name: apiKey.name },
        });

        return { success: true };
    }

    async regenerate(id: string, userId: string, workspaceId: string) {
        const apiKeyEntry = await this.prisma.apiKey.findFirst({
            where: { id, workspace_id: workspaceId },
        });

        if (!apiKeyEntry) {
            throw new NotFoundException('API Key no encontrada');
        }

        // Generar una nueva clave aleatoria segura
        const rawKey = `ak_erp_${crypto.randomBytes(24).toString('hex')}`;
        const keyPrefix = rawKey.substring(0, 10);
        const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

        const updatedKey = await this.prisma.apiKey.update({
            where: { id },
            data: {
                key_prefix: `${keyPrefix}****`,
                key_hash: keyHash,
                status: 'active', // Aseguramos que esté activa si estaba revocada (opcional)
            },
        });

        await this.audit.log({
            action: 'API_KEY_REGENERATED',
            entityType: 'api_key',
            entityId: id,
            actorId: userId,
            workspaceId: workspaceId,
            metadata: { name: apiKeyEntry.name },
        });

        return {
            ...updatedKey,
            raw_key: rawKey,
        };
    }

    async validateKey(rawKey: string) {
        const keyHash = this.hashKey(rawKey);

        const apiKey = await this.prisma.apiKey.findUnique({
            where: { key_hash: keyHash },
            include: {
                user: true,
                workspace: true,
            },
        });

        if (!apiKey || apiKey.status !== 'active') {
            return null;
        }

        if (apiKey.expires_at && apiKey.expires_at < new Date()) {
            // Podríamos marcarla como expirada aquí si quisiéramos
            return null;
        }

        // Actualizar último uso (sin esperar para no bloquear)
        this.prisma.apiKey.update({
            where: { id: apiKey.id },
            data: { last_used: new Date() },
        }).catch(() => {});

        return {
            user: apiKey.user,
            workspace: apiKey.workspace,
        };
    }

    private hashKey(key: string): string {
        return crypto.createHash('sha256').update(key).digest('hex');
    }
}
