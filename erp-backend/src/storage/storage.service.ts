import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  PutBucketCorsCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaService } from '../prisma/prisma.service';
import { CompleteUploadDto } from './dto/complete-upload.dto';
import { CreateUploadDto } from './dto/create-upload.dto';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly signedUrlTtlSeconds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.bucketName = this.configService.get<string>('S3_BUCKET') || 'donclaw-private';
    this.signedUrlTtlSeconds = Number(
      this.configService.get<string>('S3_SIGNED_URL_TTL_SECONDS') || 604800,
    );

    this.s3Client = new S3Client({
      region: this.configService.get<string>('S3_REGION') || 'us-east-1',
      endpoint: this.configService.get<string>('S3_ENDPOINT') || undefined,
      forcePathStyle: this.getBooleanEnv('S3_FORCE_PATH_STYLE', true),
      credentials: {
        accessKeyId: this.configService.get<string>('S3_ACCESS_KEY') || '',
        secretAccessKey: this.configService.get<string>('S3_SECRET_KEY') || '',
      },
      tls: this.getBooleanEnv('S3_USE_SSL', false),
    });
  }

  async onModuleInit() {
    if (!this.isConfigured()) {
      this.logger.warn('S3 storage is not fully configured. Upload endpoints will fail until env vars are set.');
      return;
    }

    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucketName }));
      this.logger.log(`Connected to S3 storage bucket ${this.bucketName}`);
    } catch {
      await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucketName }));
      this.logger.log(`Created storage bucket ${this.bucketName}`);
    }

    try {
      await this.s3Client.send(
        new PutBucketCorsCommand({
          Bucket: this.bucketName,
          CORSConfiguration: {
            CORSRules: [
              {
                AllowedHeaders: ['*'],
                AllowedMethods: ['GET', 'PUT', 'HEAD'],
                AllowedOrigins: (this.configService.get<string>('ALLOWED_ORIGINS') || 'http://localhost:3000')
                  .split(',')
                  .map((origin) => origin.trim())
                  .filter(Boolean),
                ExposeHeaders: ['ETag'],
              },
            ],
          },
        }),
      );
    } catch (corsError) {
      this.logger.warn(
        `Failed to set S3 CORS configuration: ${corsError.message || corsError}. This can happen if the bucket has B2 Native CORS rules.`,
      );
    }

    this.logger.log(`S3 storage is ready for signed uploads on bucket ${this.bucketName}`);
  }

  async createPresignedUpload(userId: string, dto: CreateUploadDto) {
    this.assertConfigured();
    await this.assertWorkspaceAccess(userId, dto.workspace_id);

    const filename = this.sanitizeFilename(dto.filename);
    const objectKey = this.buildObjectKey(dto.workspace_id, dto.scope || 'general', filename);

    const storedFile = await this.prisma.storedFile.create({
      data: {
        workspace_id: dto.workspace_id,
        uploaded_by: userId,
        bucket: this.bucketName,
        object_key: objectKey,
        filename,
        mime_type: dto.content_type,
        size_bytes: dto.size_bytes,
        scope: dto.scope || 'general',
        visibility: 'private',
        status: 'pending',
      },
    });

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: objectKey,
      ContentType: dto.content_type,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: this.signedUrlTtlSeconds,
    });

    return {
      file_id: storedFile.id,
      upload_url: uploadUrl,
      object_key: objectKey,
      public_url: await this.getPublicUrl(objectKey),
      headers: {
        'Content-Type': dto.content_type,
      },
      expires_in: this.signedUrlTtlSeconds,
    };
  }

  async completeUpload(userId: string, dto: CompleteUploadDto) {
    this.assertConfigured();

    const storedFile = await this.prisma.storedFile.findUnique({
      where: { id: dto.file_id },
    });

    if (!storedFile) {
      throw new NotFoundException('Stored file not found');
    }

    if (storedFile.workspace_id !== dto.workspace_id) {
      throw new BadRequestException('Workspace mismatch for uploaded file');
    }

    await this.assertWorkspaceAccess(userId, storedFile.workspace_id);

    const object = await this.s3Client.send(
      new HeadObjectCommand({
        Bucket: storedFile.bucket,
        Key: storedFile.object_key,
      }),
    );

    const updatedFile = await this.prisma.storedFile.update({
      where: { id: storedFile.id },
      data: {
        status: 'ready',
        etag: object.ETag?.replaceAll('"', '') || null,
        size_bytes: Number(object.ContentLength || storedFile.size_bytes),
        mime_type: object.ContentType || storedFile.mime_type,
      },
    });

    return {
      success: true,
      file: this.serializeStoredFile(updatedFile),
      signed_url: await this.getSignedReadUrl(updatedFile),
    };
  }

  async getPublicUrl(objectKey: string): Promise<string> {
    const endpoint = this.configService.get<string>('S3_ENDPOINT');
    return `${endpoint}/${this.bucketName}/${objectKey}`;
  }

  async getSignedFileUrl(userId: string, fileId: string) {
    const storedFile = await this.prisma.storedFile.findUnique({
      where: { id: fileId },
    });

    if (!storedFile || storedFile.status !== 'ready') {
      throw new NotFoundException('Stored file not found');
    }

    await this.assertWorkspaceAccess(userId, storedFile.workspace_id);

    return {
      file: this.serializeStoredFile(storedFile),
      signedUrl: await this.getSignedReadUrl(storedFile),
      expiresIn: this.signedUrlTtlSeconds,
    };
  }

  async getStoredFileById(fileId: string) {
    return this.prisma.storedFile.findUnique({
      where: { id: fileId },
    });
  }

  async getSignedReadUrl(file: {
    bucket: string;
    object_key: string;
  }) {
    this.assertConfigured();

    return getSignedUrl(
      this.s3Client,
      new GetObjectCommand({
        Bucket: file.bucket,
        Key: file.object_key,
      }),
      { expiresIn: this.signedUrlTtlSeconds },
    );
  }

  async getObjectDataUrl(file: {
    bucket: string;
    object_key: string;
    mime_type: string;
  }) {
    this.assertConfigured();

    const response = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: file.bucket,
        Key: file.object_key,
      }),
    );

    const byteArray = await response.Body?.transformToByteArray();
    if (!byteArray) {
      throw new NotFoundException('Stored file body is empty');
    }

    return `data:${file.mime_type};base64,${Buffer.from(byteArray).toString('base64')}`;
  }

  async getSignedDownloadUrl(file: {
    bucket: string;
    object_key: string;
  }) {
    this.assertConfigured();

    return getSignedUrl(
      this.s3Client,
      new GetObjectCommand({
        Bucket: file.bucket,
        Key: file.object_key,
      }),
      { expiresIn: this.signedUrlTtlSeconds },
    );
  }

  serializeStoredFile(file: {
    id: string;
    filename: string;
    mime_type: string;
    size_bytes: number;
    scope: string;
    status: string;
    created_at: Date;
  }) {
    return {
      id: file.id,
      filename: file.filename,
      mimeType: file.mime_type,
      sizeBytes: file.size_bytes,
      scope: file.scope,
      status: file.status,
      createdAt: file.created_at,
    };
  }

  private assertConfigured() {
    if (!this.isConfigured()) {
      throw new InternalServerErrorException('S3 storage is not configured');
    }
  }

  private isConfigured() {
    return Boolean(
      this.configService.get<string>('S3_ACCESS_KEY') &&
        this.configService.get<string>('S3_SECRET_KEY') &&
        this.configService.get<string>('S3_BUCKET'),
    );
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

  private sanitizeFilename(filename: string) {
    const normalized = filename.replace(/[^a-zA-Z0-9._-]/g, '-');
    return normalized.slice(0, 200) || 'file';
  }

  private buildObjectKey(workspaceId: string, scope: string, filename: string) {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const random = randomUUID();
    return `workspace/${workspaceId}/${scope}/${year}/${month}/${random}-${filename}`;
  }

  private getBooleanEnv(key: string, fallback: boolean) {
    const value = this.configService.get<string>(key);
    if (value == null) return fallback;
    return value === 'true';
  }
}
