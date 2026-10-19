import { ValidationPipe } from '@nestjs/common';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import multipart from '@fastify/multipart';
import { apiReference } from '@scalar/nestjs-api-reference';
import { ATTACHMENT_MAX_BYTES } from './attachments/attachments.constants.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';

/**
 * Configuración compartida entre `main.ts` y las pruebas end-to-end para que
 * ambos arranquen con el mismo prefijo, validación, filtros y documentación.
 */
export async function configureApp(app: NestFastifyApplication): Promise<void> {
  await app.register(multipart, {
    limits: { fileSize: ATTACHMENT_MAX_BYTES, files: 1, fields: 10 },
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const origins = (process.env.CORS_ORIGIN ?? 'http://localhost:3001')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins });

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Re-Alimenta API')
      .setDescription('Backend CRUD de Re-Alimenta sobre Supabase')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
      .build(),
  );
  app.use('/api/docs', apiReference({ content: document, withFastify: true }));
}
