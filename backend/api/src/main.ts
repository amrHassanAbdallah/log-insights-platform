import { VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable versioning with URL prefix
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Enable CORS
  app.enableCors();

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap().catch((error: Error) => {
  console.error('Failed to start application:', error.message);
  process.exit(1);
});
