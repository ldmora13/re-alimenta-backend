import { INestApplication } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { SupabaseService } from './../src/supabase/supabase.service.js';
import { createFakeSupabase } from './fake-supabase.js';

const AUTH = 'Bearer valid-token';
const ORG = {
  legal_name: 'Banco de Alimentos',
  type: 'donor',
  tax_id: 'RUC-001',
};

describe('CRUD (e2e)', () => {
  let app: INestApplication<App>;
  let fake: ReturnType<typeof createFakeSupabase>;

  beforeEach(async () => {
    fake = createFakeSupabase();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SupabaseService)
      .useValue(fake.service)
      .compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter({
        routerOptions: { ignoreTrailingSlash: true },
      }),
    );
    await configureApp(app as NestFastifyApplication);
    await app.init();
    await (app as NestFastifyApplication)
      .getHttpAdapter()
      .getInstance()
      .ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('expone el health check sin autenticación', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);
    expect(response.body).toMatchObject({ status: 'ok', database: 'up' });
  });

  it('expone la raíz de la API con barra final', async () => {
    await request(app.getHttpServer()).get('/api/').expect(200, 'Hello World!');
  });

  it('rechaza peticiones sin token', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/organizations')
      .expect(401);
    expect(response.body).toMatchObject({
      statusCode: 401,
      code: 'AUTH_TOKEN_MISSING',
    });
  });

  it('rechaza tokens inválidos', async () => {
    await request(app.getHttpServer())
      .get('/api/organizations')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  it('valida el DTO de creación', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/organizations')
      .set('Authorization', AUTH)
      .send({ legal_name: 'X' })
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      code: 'BAD_REQUEST',
    });
  });

  it('rechaza propiedades desconocidas', async () => {
    await request(app.getHttpServer())
      .post('/api/organizations')
      .set('Authorization', AUTH)
      .send({ ...ORG, id: 'inyectado' })
      .expect(400);
  });

  it('crea, consulta, lista, actualiza y elimina', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/organizations')
      .set('Authorization', AUTH)
      .send(ORG)
      .expect(201);
    expect(created.body).toMatchObject(ORG);

    const id = created.body.id as string;

    const found = await request(app.getHttpServer())
      .get(`/api/organizations/${id}`)
      .set('Authorization', AUTH)
      .expect(200);
    expect(found.body.id).toBe(id);

    const list = await request(app.getHttpServer())
      .get('/api/organizations?page=1&limit=10')
      .set('Authorization', AUTH)
      .expect(200);
    expect(list.body).toMatchObject({ page: 1, limit: 10, total: 1 });
    expect(list.body.data).toHaveLength(1);

    const patched = await request(app.getHttpServer())
      .patch(`/api/organizations/${id}`)
      .set('Authorization', AUTH)
      .send({ verification_status: 'verified' })
      .expect(200);
    expect(patched.body.verification_status).toBe('verified');

    await request(app.getHttpServer())
      .delete(`/api/organizations/${id}`)
      .set('Authorization', AUTH)
      .expect(204);
  });

  it('responde 400 con UUID inválido y 404 con inexistente', async () => {
    await request(app.getHttpServer())
      .get('/api/organizations/no-es-uuid')
      .set('Authorization', AUTH)
      .expect(400);

    const response = await request(app.getHttpServer())
      .get('/api/organizations/11111111-1111-4111-8111-111111111111')
      .set('Authorization', AUTH)
      .expect(404);
    expect(response.body).toMatchObject({ code: 'RESOURCE_NOT_FOUND' });
  });

  it('traduce conflictos de unicidad a 409', async () => {
    fake.client.nextError = { code: '23505' };

    await request(app.getHttpServer())
      .post('/api/organizations')
      .set('Authorization', AUTH)
      .send(ORG)
      .expect(409);
  });

  it('no permite escribir en audit-logs', async () => {
    await request(app.getHttpServer())
      .post('/api/audit-logs')
      .set('Authorization', AUTH)
      .send({ action: 'fake' })
      .expect(404);
  });

  it('crea organizaciones pendientes y rechaza la auto-verificación', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/organizations')
      .set('Authorization', AUTH)
      .send(ORG)
      .expect(201);
    expect(created.body.verification_status).toBe('pending');

    await request(app.getHttpServer())
      .post('/api/organizations')
      .set('Authorization', AUTH)
      .send({ ...ORG, tax_id: 'RUC-002', verification_status: 'verified' })
      .expect(400);
  });

  it('no permite modificar ni borrar delivery-events', async () => {
    const id = '11111111-1111-4111-8111-111111111111';

    await request(app.getHttpServer())
      .patch(`/api/delivery-events/${id}`)
      .set('Authorization', AUTH)
      .send({ status: 'edited' })
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/api/delivery-events/${id}`)
      .set('Authorization', AUTH)
      .expect(404);
  });

  it('filtra por un campo permitido', async () => {
    fake.client.tables.organizations = [
      { id: '1', ...ORG, verification_status: 'pending' },
      { id: '2', ...ORG, tax_id: 'RUC-002', verification_status: 'verified' },
    ];

    const response = await request(app.getHttpServer())
      .get('/api/organizations?verification_status=verified')
      .set('Authorization', AUTH)
      .expect(200);

    expect(response.body.total).toBe(1);
    expect(response.body.data[0].tax_id).toBe('RUC-002');
  });

  it('expone register/login/refresh sin token y valida sus DTO', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'no-es-email', password: '123' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'usuario@ejemplo.com', password: 'corta', full_name: 'X' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/auth/refresh')
      .send({})
      .expect(400);
  });

  it('protege logout y adjuntos sin token', async () => {
    await request(app.getHttpServer()).post('/api/auth/logout').expect(401);

    const response = await request(app.getHttpServer())
      .post('/api/attachments')
      .expect(401);
    expect(response.body).toMatchObject({ code: 'AUTH_TOKEN_MISSING' });
  });

  it('exige multipart/form-data para subir un adjunto', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/attachments')
      .set('Authorization', AUTH)
      .send({ organization_id: '11111111-1111-4111-8111-111111111111' })
      .expect(400);

    expect(response.body).toMatchObject({ code: 'INVALID_CONTENT_TYPE' });
  });
});
