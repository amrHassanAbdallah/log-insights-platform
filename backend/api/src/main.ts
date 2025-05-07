import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CustomLogger } from './common/services/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new CustomLogger('Application'),
  });
  const port = process.env.PORT ?? 8000;

  // Enable CORS with specific configuration
  app.enableCors({
    origin: ['*'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
    credentials: true,
  });

  await app.listen(port);
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      context: 'Application',
      message: `🚀 Server is running on port ${port} on ${process.env.NODE_ENV} mode`,
    }),
  );
}

bootstrap().catch((error: Error) => {
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      context: 'Application',
      message: 'Failed to start application',
      metadata: {
        error: error.message,
        stack: error.stack,
      },
    }),
  );
  process.exit(1);
});
