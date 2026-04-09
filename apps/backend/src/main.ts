import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') ?? 3001;
  const frontendUrl = configService.get<string>('frontendUrl') ?? 'http://localhost:3000';

  // ── CORS ──────────────────────────────────────
  app.enableCors({
    origin: frontendUrl,
    methods: ['GET'],
    allowedHeaders: ['Content-Type', 'Accept'],
  });

  // ── Préfixe global ────────────────────────────
  app.setGlobalPrefix('api');

  // ── Validation des DTOs ───────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Swagger / OpenAPI ─────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('API Entreprises')
    .setDescription(
      'API pour explorer les récentes ouvertures d\'entreprises françaises' +
      '\n\nSource de données : data.gouv.fr (SIRENE, API Recherche d\'entreprises)',
    )
    .setVersion('1.0.0')
    .addTag('Entreprises', 'Opérations sur les entreprises')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  logger.log(`Serveur démarré sur http://localhost:${port}`);
  logger.log(`Documentation Swagger : http://localhost:${port}/api/docs`);
}

bootstrap();
