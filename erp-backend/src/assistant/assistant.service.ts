import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AssistantContextService } from './assistant-context.service';
import { CreateAssistantThreadDto } from './dto/create-thread.dto';
import { StreamAssistantThreadDto } from './dto/stream-thread.dto';

const ASSISTANT_MODELS = [
  {
    id: 'openai-gpt-4o-mini',
    provider: 'openrouter',
    model_key: 'openai/gpt-4o-mini',
    label: 'OpenAI GPT-4o Mini',
    supports_reasoning: true,
    supports_vision: true,
    supports_streaming: true,
  },
];

const DEFAULT_MODEL_KEY = 'openai/gpt-4o-mini';

type OpenRouterUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

type AssistantAttachmentPayload = {
  id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  signed_url: string;
};

type OpenRouterAttachmentPayload = {
  filename: string;
  mime_type: string;
  size_bytes: number;
  input_url: string;
};

type OpenRouterHistoryMessage = {
  role: string;
  content: string;
  attachments?: OpenRouterAttachmentPayload[];
};

type SseEventName = 'message_start' | 'delta' | 'reasoning' | 'message_end' | 'error';

@Injectable()
export class AssistantService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AssistantService.name);
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly storageService: StorageService,
    private readonly assistantContextService: AssistantContextService,
  ) {}

  onModuleInit() {
    this.runRetentionCleanup().catch((error) => {
      this.logger.error('Assistant initial cleanup failed', error as any);
    });

    this.cleanupTimer = setInterval(() => {
      this.runRetentionCleanup().catch((error) => {
        this.logger.error('Assistant scheduled cleanup failed', error as any);
      });
    }, 24 * 60 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  async getModels() {
    return ASSISTANT_MODELS;
  }

  async listThreads(userId: string, workspaceId: string) {
    if (!workspaceId) {
      throw new BadRequestException('workspace_id is required');
    }

    await this.assertWorkspaceAccess(userId, workspaceId);

    return this.prisma.assistantThread.findMany({
      where: {
        workspace_id: workspaceId,
        user_id: userId,
      },
      orderBy: {
        updated_at: 'desc',
      },
      select: {
        id: true,
        title: true,
        model_key: true,
        provider: true,
        created_at: true,
        updated_at: true,
        last_message_at: true,
      },
      take: 50,
    });
  }

  async createThread(userId: string, dto: CreateAssistantThreadDto) {
    await this.assertWorkspaceAccess(userId, dto.workspace_id);

    const resolvedModel = this.resolveModelForWorkspace(
      userId,
      dto.workspace_id,
      dto.model_key,
    );

    const thread = await this.prisma.assistantThread.create({
      data: {
        user_id: userId,
        workspace_id: dto.workspace_id,
        title: this.buildThreadTitle(dto.title, dto.first_message),
        model_key: resolvedModel.model_key,
        provider: resolvedModel.provider,
      },
      select: {
        id: true,
        title: true,
        model_key: true,
        provider: true,
        created_at: true,
        updated_at: true,
        last_message_at: true,
      },
    });

    return thread;
  }

  async getThreadMessages(userId: string, threadId: string) {
    const thread = await this.getAuthorizedThread(userId, threadId);

    const messages = await this.prisma.assistantMessage.findMany({
      where: {
        thread_id: thread.id,
      },
      orderBy: {
        created_at: 'asc',
      },
      select: {
        id: true,
        role: true,
        content: true,
        reasoning_summary: true,
        status: true,
        provider: true,
        model_key: true,
        prompt_tokens: true,
        completion_tokens: true,
        total_tokens: true,
        created_at: true,
        attachments: {
          select: {
            file: {
              select: {
                id: true,
                filename: true,
                mime_type: true,
                size_bytes: true,
                bucket: true,
                object_key: true,
                status: true,
              },
            },
          },
        },
      },
    });

    const serializedMessages = await Promise.all(
      messages.map(async (message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        reasoning_summary: message.reasoning_summary,
        status: message.status,
        provider: message.provider,
        model_key: message.model_key,
        prompt_tokens: message.prompt_tokens,
        completion_tokens: message.completion_tokens,
        total_tokens: message.total_tokens,
        created_at: message.created_at,
        attachments: await Promise.all(
          message.attachments
            .filter((attachment) => attachment.file.status === 'ready')
            .map((attachment) =>
              this.serializeMessageAttachment({
                id: attachment.file.id,
                filename: attachment.file.filename,
                mime_type: attachment.file.mime_type,
                size_bytes: attachment.file.size_bytes,
                bucket: attachment.file.bucket,
                object_key: attachment.file.object_key,
              }),
            ),
        ),
      })),
    );

    return {
      thread: {
        id: thread.id,
        title: thread.title,
        workspace_id: thread.workspace_id,
        model_key: thread.model_key,
        provider: thread.provider,
        created_at: thread.created_at,
        updated_at: thread.updated_at,
      },
      messages: serializedMessages,
    };
  }

  async streamThreadResponse(
    userId: string,
    threadId: string,
    dto: StreamAssistantThreadDto,
    response: Response,
  ) {
    const thread = await this.getAuthorizedThread(userId, threadId);

    const resolvedModel = this.resolveModelForWorkspace(
      userId,
      thread.workspace_id,
      dto.model_key || thread.model_key,
    );

    const userPrompt = dto.prompt.trim();
    const resolvedAttachments = await this.resolveReadyAttachments(
      thread.workspace_id,
      dto.attachment_ids || [],
    );
    const runModelKey =
      resolvedAttachments.length > 0
        ? resolvedModel.supports_vision
          ? resolvedModel.model_key
          : this.getVisionModelKey()
        : resolvedModel.model_key;

    if (!userPrompt && resolvedAttachments.length === 0) {
      throw new BadRequestException('Prompt or attachment is required');
    }

    const createdUserMessage = await this.prisma.$transaction(async (tx) => {
      const message = await tx.assistantMessage.create({
        data: {
          thread_id: thread.id,
        role: 'user',
        content: userPrompt,
        provider: resolvedModel.provider,
        model_key: resolvedModel.model_key,
          status: 'completed',
        },
        select: {
          id: true,
        },
      });

      if (resolvedAttachments.length > 0) {
        await tx.assistantMessageAttachment.createMany({
          data: resolvedAttachments.map((file) => ({
            message_id: message.id,
            file_id: file.id,
          })),
        });
      }

      return message;
    });

    await this.prisma.assistantThread.update({
      where: { id: thread.id },
      data: {
        model_key: resolvedModel.model_key,
        provider: resolvedModel.provider,
        last_message_at: new Date(),
      },
    });

    this.setupSseHeaders(response);
    this.sendEvent(response, 'message_start', {
      thread_id: thread.id,
      user_message_id: createdUserMessage.id,
      model_key: runModelKey,
      provider: resolvedModel.provider,
      attachment_ids: resolvedAttachments.map((attachment) => attachment.id),
    });

    try {
      const history = await this.prisma.assistantMessage.findMany({
        where: {
          thread_id: thread.id,
        },
        orderBy: {
          created_at: 'asc',
        },
        select: {
          role: true,
          content: true,
          attachments: {
            select: {
              file: {
                select: {
                  id: true,
                  filename: true,
                  mime_type: true,
                  size_bytes: true,
                  bucket: true,
                  object_key: true,
                  status: true,
                },
              },
            },
          },
        },
      });

      const openRouterHistory = await Promise.all(
        history.map(async (message) => ({
          role: message.role,
          content: message.content,
          attachments: await Promise.all(
            message.attachments
              .filter((attachment) => attachment.file.status === 'ready')
              .map((attachment) =>
                this.serializeAttachmentForAssistantInput({
                  id: attachment.file.id,
                  filename: attachment.file.filename,
                  mime_type: attachment.file.mime_type,
                  size_bytes: attachment.file.size_bytes,
                  bucket: attachment.file.bucket,
                  object_key: attachment.file.object_key,
                }),
              ),
          ),
        })),
      );

      const workspaceContext = await this.assistantContextService.buildReadOnlyContext(
        userId,
        thread.workspace_id,
        userPrompt,
      );

      const apiResponse = await this.callOpenRouter(runModelKey, openRouterHistory, workspaceContext);

      if (!apiResponse.ok || !apiResponse.body) {
        const errorText = await apiResponse.text();
        throw new InternalServerErrorException(
          `OpenRouter request failed (${apiResponse.status}): ${errorText}`,
        );
      }

      const reader = apiResponse.body.getReader();
      const decoder = new TextDecoder('utf-8');

      let buffer = '';
      let assistantText = '';
      let reasoningText = '';
      let usage: OpenRouterUsage | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;

          const payload = trimmed.slice(5).trim();
          if (!payload || payload === '[DONE]') continue;

          let chunk: any;
          try {
            chunk = JSON.parse(payload);
          } catch {
            continue;
          }

          const delta = chunk?.choices?.[0]?.delta;
          const textDelta =
            delta?.content ||
            (Array.isArray(delta?.content)
              ? delta.content
                  .filter((part: any) => part?.type === 'text' && part?.text)
                  .map((part: any) => part.text)
                  .join('')
              : '');

          if (textDelta) {
            assistantText += textDelta;
            this.sendEvent(response, 'delta', { text: textDelta });
          }

          const reasoningDelta =
            delta?.reasoning ||
            delta?.reasoning_content ||
            (Array.isArray(delta?.reasoning)
              ? delta.reasoning.map((part: any) => part?.text || '').join('')
              : '');

          if (reasoningDelta) {
            reasoningText += reasoningDelta;
            this.sendEvent(response, 'reasoning', { text: reasoningDelta });
          }

          if (chunk?.usage) {
            usage = {
              prompt_tokens: chunk.usage.prompt_tokens,
              completion_tokens: chunk.usage.completion_tokens,
              total_tokens: chunk.usage.total_tokens,
            };
          }
        }
      }

      const finalText = assistantText.trim();
      const finalReasoning = reasoningText.trim();

      await this.prisma.assistantMessage.create({
        data: {
          thread_id: thread.id,
          role: 'assistant',
          content: finalText || 'No se obtuvo respuesta del modelo.',
          reasoning_summary: finalReasoning || null,
          provider: resolvedModel.provider,
          model_key: runModelKey,
          status: 'completed',
          prompt_tokens: usage?.prompt_tokens,
          completion_tokens: usage?.completion_tokens,
          total_tokens: usage?.total_tokens,
        },
      });

      await this.prisma.assistantThread.update({
        where: { id: thread.id },
        data: {
          updated_at: new Date(),
          last_message_at: new Date(),
          title:
            thread.title === 'Nuevo chat'
              ? this.buildThreadTitle(undefined, userPrompt)
              : undefined,
        },
      });

      this.sendEvent(response, 'message_end', {
        status: 'completed',
        usage,
      });
      response.end();
    } catch (error) {
      this.logger.error('Assistant streaming error', error as any);

      await this.prisma.assistantMessage.create({
        data: {
          thread_id: thread.id,
          role: 'assistant',
          content: 'Lo siento, hubo un error al generar la respuesta.',
          provider: resolvedModel.provider,
          model_key: runModelKey,
          status: 'error',
        },
      });

      this.sendEvent(response, 'error', {
        message: 'No se pudo completar la respuesta del asistente.',
      });
      response.end();
    }
  }

  private async callOpenRouter(
    model: string,
    history: OpenRouterHistoryMessage[],
    workspaceContext?: string,
  ) {
    const apiKey = this.configService.get<string>('OPENROUTER_API_KEY');
    const baseUrl = this.configService.get<string>('OPENROUTER_BASE_URL') || 'https://openrouter.ai/api/v1';
    const timeoutMs = Number(this.configService.get<string>('OPENROUTER_TIMEOUT_MS') || 120000);

    if (!apiKey) {
      throw new InternalServerErrorException('OPENROUTER_API_KEY is not configured');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': this.configService.get<string>('APP_URL') || 'http://localhost:3000',
          'X-Title': this.configService.get<string>('APP_NAME') || 'DonClaw',
        },
        body: JSON.stringify({
          model,
          stream: true,
          messages: [
            {
              role: 'system',
              content:
                [
                  'Eres el asistente de DonClaw. Responde en espanol de forma clara, concisa y util. Si no tienes certeza, dilo.',
                  'Usa el contexto read-only del workspace cuando exista para responder con datos reales, estado actual y links utiles.',
                  'Para enlaces internos de DonClaw usa siempre rutas relativas que empiecen con /workspaces/... Nunca devuelvas URLs absolutas como https://app.donclaw.com/...',
                  'Cuando compartas un enlace interno, escribelo como markdown clickeable, por ejemplo [Billing](/workspaces/.../billing), no como texto plano.',
                  workspaceContext ? `\n${workspaceContext}` : '',
                ]
                  .filter(Boolean)
                  .join('\n\n'),
            },
            ...history.map((message) => this.buildOpenRouterMessage(message)),
          ],
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if ((error as any)?.name === 'AbortError') {
        throw new InternalServerErrorException(
          `OpenRouter timeout after ${timeoutMs}ms. Check network connectivity or increase OPENROUTER_TIMEOUT_MS.`,
        );
      }

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async resolveReadyAttachments(workspaceId: string, attachmentIds: string[]) {
    if (attachmentIds.length === 0) {
      return [];
    }

    const files = await this.prisma.storedFile.findMany({
      where: {
        id: { in: attachmentIds },
        workspace_id: workspaceId,
        status: 'ready',
      },
    });

    if (files.length !== attachmentIds.length) {
      throw new BadRequestException('One or more attachments are not ready or do not belong to this workspace');
    }

    return attachmentIds
      .map((attachmentId) => files.find((file) => file.id === attachmentId))
      .filter((file): file is NonNullable<typeof file> => Boolean(file));
  }

  private async serializeMessageAttachment(file: {
    id: string;
    filename: string;
    mime_type: string;
    size_bytes: number;
    bucket: string;
    object_key: string;
  }): Promise<AssistantAttachmentPayload> {
    return {
      id: file.id,
      filename: file.filename,
      mime_type: file.mime_type,
      size_bytes: file.size_bytes,
      signed_url: await this.storageService.getSignedReadUrl(file),
    };
  }

  private async serializeAttachmentForAssistantInput(file: {
    id: string;
    filename: string;
    mime_type: string;
    size_bytes: number;
    bucket: string;
    object_key: string;
  }): Promise<OpenRouterAttachmentPayload> {
    return {
      filename: file.filename,
      mime_type: file.mime_type,
      size_bytes: file.size_bytes,
      input_url: await this.storageService.getObjectDataUrl(file),
    };
  }

  private buildOpenRouterMessage(message: OpenRouterHistoryMessage) {
    const parts: Array<Record<string, unknown>> = [];

    if (message.content.trim()) {
      parts.push({
        type: 'text',
        text: message.content,
      });
    }

    for (const attachment of message.attachments || []) {
      if (attachment.mime_type.startsWith('image/')) {
        parts.push({
          type: 'image_url',
          image_url: {
            url: attachment.input_url,
          },
        });
      } else {
        parts.push({
          type: 'text',
          text: `Archivo adjunto: ${attachment.filename} (${attachment.mime_type})`,
        });
      }
    }

    return {
      role: message.role,
      content: parts.length === 1 && parts[0]?.type === 'text' ? message.content : parts,
    };
  }

  private getVisionModelKey() {
    return this.configService.get<string>('OPENROUTER_VISION_MODEL')?.trim() || 'openai/gpt-4o-mini';
  }

  private setupSseHeaders(response: Response) {
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache, no-transform');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no');
    response.flushHeaders?.();
  }

  private sendEvent(response: Response, event: SseEventName, data: Record<string, unknown>) {
    response.write(`event: ${event}\n`);
    response.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  private async getAuthorizedThread(userId: string, threadId: string) {
    const thread = await this.prisma.assistantThread.findFirst({
      where: {
        id: threadId,
        user_id: userId,
      },
    });

    if (!thread) {
      throw new NotFoundException('Assistant thread not found');
    }

    await this.assertWorkspaceAccess(userId, thread.workspace_id);

    return thread;
  }

  private async assertWorkspaceAccess(userId: string, workspaceId: string) {
    const workspace = await this.prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        OR: [
          { owner_id: userId },
          {
            members: {
              some: {
                user_id: userId,
              },
            },
          },
        ],
      },
      select: { id: true },
    });

    if (!workspace) {
      throw new ForbiddenException('No tienes acceso a este workspace');
    }
  }

  private resolveModelForWorkspace(
    _userId: string,
    _workspaceId: string,
    modelKey?: string,
  ) {
    const requestedKey = modelKey || process.env.OPENROUTER_DEFAULT_MODEL?.trim() || DEFAULT_MODEL_KEY;

    const model = ASSISTANT_MODELS.find((m) => m.model_key === requestedKey);
    if (model) return model;

    return ASSISTANT_MODELS[0];
  }

  private buildThreadTitle(title?: string, firstMessage?: string) {
    const providedTitle = (title || '').trim();
    if (providedTitle) return providedTitle.slice(0, 120);

    const message = (firstMessage || '').trim();
    if (!message) return 'Nuevo chat';

    return message.length > 80 ? `${message.slice(0, 80)}...` : message;
  }

  private async runRetentionCleanup() {
    const retentionDays = 90;
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const deletedMessages = await this.prisma.assistantMessage.deleteMany({
      where: {
        created_at: {
          lt: cutoffDate,
        },
      },
    });

    const deletedThreads = await this.prisma.assistantThread.deleteMany({
      where: {
        last_message_at: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.log(
      `Assistant cleanup completed. Deleted ${deletedMessages.count} messages and ${deletedThreads.count} threads older than ${retentionDays} days.`,
    );
  }
}
