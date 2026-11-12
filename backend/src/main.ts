import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const frontendPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../frontend');
  app.useStaticAssets(frontendPath);
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
