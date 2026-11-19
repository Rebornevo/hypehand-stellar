import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { collectDefaultMetrics, register } from 'prom-client';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.enableCors({
    origin: config.get('FRONTEND_ORIGIN') || 'http://localhost:3001',
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const configSwagger = new DocumentBuilder()
    .setTitle('Stellar Gifting API')
    .setDescription('API for crypto gifting platform (Stellar + Soroban)')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, configSwagger);
  SwaggerModule.setup('/api/docs', app, document);

  // Prometheus metrics endpoint (opt‑in via PROMETHEUS_ENABLED env var)
  if (config.get('PROMETHEUS_ENABLED')) {
    // Collect default metrics (process, heap, etc.)
    collectDefaultMetrics();

    // Expose /metrics endpoint
    const httpAdapter = app.getHttpAdapter();
    const expressApp = httpAdapter.getInstance();
    expressApp.get('/metrics', async (_req, res) => {
      try {
        const metrics = await register.metrics();
        res.set('Content-Type', register.contentType);
        res.send(metrics);
      } catch (ex) {
        res.status(500).end();
      }
    });
  }

  const port = config.get('PORT') || 3000;
  await app.listen((port as number) || 3000);

  Logger.log(`Server started on http://localhost:${port}`);
}
bootstrap();