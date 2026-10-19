import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  PayloadTooLargeException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { isUUID } from 'class-validator';
import type { FastifyRequest } from 'fastify';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { AuthenticatedUser } from '../auth/current-user.decorator.js';
import { CrudService } from '../common/crud.service.js';
import { Attachment } from '../supabase/supabase.types.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import {
  ATTACHMENT_EXTENSIONS,
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MIME_TYPES,
  ATTACHMENT_URL_TTL_SECONDS,
  DEFAULT_ATTACHMENT_BUCKET,
} from './attachments.constants.js';

interface AttachmentInput {
  organization_id: string;
  resource_type: string;
  resource_id: string;
  storage_path: string;
  mime_type: string;
}

interface UploadedFile {
  buffer: Buffer;
  mimetype: string;
}

interface StorageErrorLike {
  message?: string;
  statusCode?: number | string;
}

/**
 * Adjuntos en Supabase Storage. El objeto se sube y se borra con el JWT del
 * usuario, por lo que las políticas de `storage.objects` aplican además de la
 * RLS de la tabla `attachments`.
 */
@Injectable()
export class AttachmentsService extends CrudService<
  Attachment,
  AttachmentInput,
  never
> {
  private readonly logger = new Logger(AttachmentsService.name);
  private readonly bucket =
    process.env.SUPABASE_STORAGE_BUCKET?.trim() || DEFAULT_ATTACHMENT_BUCKET;

  protected readonly table = 'attachments';
  protected readonly sortable = ['created_at', 'updated_at', 'resource_type'];
  protected readonly filterable = [
    'organization_id',
    'resource_type',
    'resource_id',
    'uploaded_by',
  ];

  constructor(supabase: SupabaseService, auditLogs: AuditLogsService) {
    super(supabase, auditLogs);
  }

  /** El cargador siempre es el usuario autenticado. */
  protected override toCreate(dto: AttachmentInput, user: AuthenticatedUser) {
    return { ...dto, uploaded_by: user.id };
  }

  async upload(
    request: FastifyRequest,
    user: AuthenticatedUser,
  ): Promise<Attachment> {
    if (!request.isMultipart()) {
      throw new BadRequestException({
        message: 'Expected multipart/form-data',
        code: 'INVALID_CONTENT_TYPE',
      });
    }

    const fields: Record<string, string> = {};
    let file: UploadedFile | undefined;

    try {
      for await (const part of request.parts()) {
        if (part.type === 'file') {
          if (file) {
            part.file.resume();
            throw new BadRequestException({
              message: 'Only one file per request',
              code: 'ONLY_ONE_FILE',
            });
          }
          if (
            !(ATTACHMENT_MIME_TYPES as readonly string[]).includes(part.mimetype)
          ) {
            part.file.resume();
            throw new BadRequestException({
              message: `Allowed types: ${ATTACHMENT_MIME_TYPES.join(', ')}`,
              code: 'INVALID_FILE_TYPE',
            });
          }
          file = { buffer: await part.toBuffer(), mimetype: part.mimetype };
        } else {
          fields[part.fieldname] = String(part.value);
        }
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw uploadError(error);
    }

    const organizationId = requiredUuid(fields.organization_id, 'organization_id');
    const resourceId = requiredUuid(fields.resource_id, 'resource_id');
    const resourceType = requiredResourceType(fields.resource_type);

    if (!file) {
      throw new BadRequestException({
        message: 'Missing file field',
        code: 'MISSING_FILE',
      });
    }

    const extension = ATTACHMENT_EXTENSIONS[file.mimetype];
    const storagePath = `${organizationId}/${resourceType}/${resourceId}/${randomUUID()}.${extension}`;
    const storage = this.supabase.forUser(user.token).storage.from(this.bucket);

    const { error: uploadErrorResult } = await storage.upload(
      storagePath,
      file.buffer,
      { contentType: file.mimetype, upsert: false },
    );
    if (uploadErrorResult) throw storageError(uploadErrorResult);

    try {
      return await this.create(
        {
          organization_id: organizationId,
          resource_type: resourceType,
          resource_id: resourceId,
          storage_path: storagePath,
          mime_type: file.mimetype,
        },
        user,
      );
    } catch (error) {
      // Si la fila no se puede crear (p. ej. RLS), no dejar el objeto huérfano.
      try {
        const { error: cleanupError } = await storage.remove([storagePath]);
        if (cleanupError) {
          this.logger.warn(
            `No se pudo limpiar el objeto ${storagePath}: ${cleanupError.message}`,
          );
        }
      } catch (cleanupError) {
        this.logger.warn(
          `No se pudo limpiar el objeto ${storagePath}: ${String(cleanupError)}`,
        );
      }
      throw error;
    }
  }

  async signedUrl(
    id: string,
    user: AuthenticatedUser,
  ): Promise<{ url: string; expires_in: number }> {
    const attachment = await this.findOne(id, user);
    const { data, error } = await this.supabase
      .forUser(user.token)
      .storage.from(this.bucket)
      .createSignedUrl(attachment.storage_path, ATTACHMENT_URL_TTL_SECONDS);

    if (error || !data) throw storageError(error);

    return { url: data.signedUrl, expires_in: ATTACHMENT_URL_TTL_SECONDS };
  }

  override async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const attachment = await this.findOne(id, user);
    await super.remove(id, user);

    const { error } = await this.supabase
      .forUser(user.token)
      .storage.from(this.bucket)
      .remove([attachment.storage_path]);

    // ponytail: best-effort; si el objeto queda huérfano, limpiarlo por job.
    if (error) {
      this.logger.warn(
        `No se pudo borrar el objeto ${attachment.storage_path}: ${error.message}`,
      );
    }
  }
}

function requiredUuid(value: string | undefined, field: string): string {
  if (!value || !isUUID(value)) {
    throw new BadRequestException({
      message: `Invalid or missing ${field}`,
      code: 'INVALID_FIELD',
    });
  }
  return value;
}

function requiredResourceType(value: string | undefined): string {
  if (!value || !/^[a-z][a-z0-9_-]{0,49}$/.test(value)) {
    throw new BadRequestException({
      message: 'resource_type must match ^[a-z][a-z0-9_-]{0,49}$',
      code: 'INVALID_FIELD',
    });
  }
  return value;
}

function uploadError(error: unknown): never {
  if ((error as { code?: string }).code === 'FST_REQ_FILE_TOO_LARGE') {
    throw new PayloadTooLargeException({
      message: `File exceeds ${ATTACHMENT_MAX_BYTES} bytes`,
      code: 'FILE_TOO_LARGE',
    });
  }
  throw new BadRequestException({
    message: 'Invalid multipart payload',
    code: 'INVALID_MULTIPART',
  });
}

function storageError(error: StorageErrorLike | null): never {
  const status = Number(error?.statusCode);
  if (
    status === 403 ||
    /row-level security|not authorized|permission/i.test(error?.message ?? '')
  ) {
    throw new ForbiddenException({
      message: 'Not allowed to access this storage object',
      code: 'STORAGE_FORBIDDEN',
    });
  }
  throw new HttpException(
    { message: 'Storage operation failed', code: 'STORAGE_ERROR' },
    HttpStatus.BAD_GATEWAY,
  );
}
