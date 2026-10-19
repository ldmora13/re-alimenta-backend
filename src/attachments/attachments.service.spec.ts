import { BadRequestException } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { describe, expect, it } from 'vitest';
import { createFakeSupabase } from '../../test/fake-supabase.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import type { AuthenticatedUser } from '../auth/current-user.decorator.js';
import type { SupabaseService } from '../supabase/supabase.service.js';
import { AttachmentsService } from './attachments.service.js';

const ORG = '11111111-1111-4111-8111-111111111111';
const RESOURCE = '22222222-2222-4222-8222-222222222222';
const USER: AuthenticatedUser = { id: 'user-1', token: 'valid-token' };

type Part = Record<string, unknown>;

function field(fieldname: string, value: string): Part {
  return { type: 'field', fieldname, value };
}

function file(mimetype = 'image/jpeg', content = 'contenido'): Part {
  return {
    type: 'file',
    mimetype,
    filename: 'foto.jpg',
    file: { resume: () => undefined },
    toBuffer: async () => Buffer.from(content),
  };
}

function request(parts: Part[]): FastifyRequest {
  return {
    isMultipart: () => true,
    parts: async function* () {
      yield* parts;
    },
  } as unknown as FastifyRequest;
}

function setup() {
  const fake = createFakeSupabase();
  const service = new AttachmentsService(
    fake.service as unknown as SupabaseService,
    new AuditLogsService(fake.service as unknown as SupabaseService),
  );
  return { fake, service };
}

describe('AttachmentsService', () => {
  it('sube el archivo con una ruta por organización y registra el adjunto', async () => {
    const { fake, service } = setup();

    const attachment = await service.upload(
      request([
        field('organization_id', ORG),
        field('resource_type', 'donation'),
        field('resource_id', RESOURCE),
        file(),
      ]),
      USER,
    );

    expect(attachment.storage_path).toMatch(
      new RegExp(`^${ORG}/donation/${RESOURCE}/[0-9a-f-]{36}\\.jpg$`),
    );
    expect(attachment.mime_type).toBe('image/jpeg');
    expect(attachment.uploaded_by).toBe(USER.id);
    expect(fake.client.tables.attachments).toHaveLength(1);
  });

  it('rechaza tipos de archivo no permitidos sin subir nada', async () => {
    const { fake, service } = setup();

    await expect(
      service.upload(
        request([
          field('organization_id', ORG),
          field('resource_type', 'donation'),
          field('resource_id', RESOURCE),
          file('text/html'),
        ]),
        USER,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(fake.client.tables.attachments ?? []).toHaveLength(0);
  });

  it('genera una URL firmada para un adjunto accesible', async () => {
    const { service } = setup();
    const attachment = await service.upload(
      request([
        field('organization_id', ORG),
        field('resource_type', 'donation'),
        field('resource_id', RESOURCE),
        file(),
      ]),
      USER,
    );

    const result = await service.signedUrl(attachment.id, USER);

    expect(result.url).toContain(attachment.storage_path);
    expect(result.expires_in).toBe(3600);
  });

  it('elimina la fila al borrar el adjunto', async () => {
    const { fake, service } = setup();
    const attachment = await service.upload(
      request([
        field('organization_id', ORG),
        field('resource_type', 'donation'),
        field('resource_id', RESOURCE),
        file(),
      ]),
      USER,
    );

    await service.remove(attachment.id, USER);

    expect(fake.client.tables.attachments).toHaveLength(0);
  });
});
