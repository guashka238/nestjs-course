import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import compression from '@fastify/compress';
import fastifyCookie from '@fastify/cookie';
import fastifyMultipart from '@fastify/multipart';
import {
  initializeTransactionalContext,
  StorageDriver,
} from 'typeorm-transactional';

import { AppModule } from './core/app/app.module';
import { ConfigService } from '@/core/config/config.service';

// Fastify's multipart plugin enforces one global fileSize cap while still
// parsing the stream (per-format limits are enforced afterwards, in
// SecureUploadService, once the actual source format is known). This is
// just the outer safety net — sized to the largest format-specific limit.
const UPLOAD_SIZE_CONFIG_KEYS = [
  'UPLOAD_MAX_SIZE_CSV_BYTES',
  'UPLOAD_MAX_SIZE_JSON_BYTES',
  'UPLOAD_MAX_SIZE_XML_BYTES',
  'UPLOAD_MAX_SIZE_YAML_BYTES',
  'UPLOAD_MAX_SIZE_PNG_BYTES',
  'UPLOAD_MAX_SIZE_JPEG_BYTES',
  'UPLOAD_MAX_SIZE_SVG_BYTES',
] as const;

async function bootstrap() {
  initializeTransactionalContext({ storageDriver: StorageDriver.AUTO });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  await app.register(compression);

  app.enableCors({
    origin: [
      'http://localhost:5174',
      'http://localhost:4200',
      'http://localhost:8080',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  const configService = app.get(ConfigService);

  await app.register(fastifyCookie, {
    secret: configService.get('COOKIE_SECRET'),
  });

  const maxUploadSizeBytes = Math.max(
    ...UPLOAD_SIZE_CONFIG_KEYS.map((key) => Number(configService.get(key))),
  );

  await app.register(fastifyMultipart, {
    limits: {
      fileSize: maxUploadSizeBytes,
      files: 1,
      fields: 10,
    },
  });

  const port = configService.get('PORT');

  await app.listen(port);
}

bootstrap();
