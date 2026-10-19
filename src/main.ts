import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';

// Carga .env si existe (Node >= 20.12). En producción las variables vienen del entorno.
try {
  process.loadEnvFile();
} catch {
  // Sin archivo .env: se usan las variables ya definidas en el entorno.
}

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: true,
      routerOptions: { ignoreTrailingSlash: true },
    }),
  );

  configureApp(app);

  await app.listen({
    port: Number(process.env.PORT) || 3000,
    host: '0.0.0.0',
  });
}

void bootstrap();
