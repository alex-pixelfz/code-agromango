import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AppModule } from './../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let temporaryDirectory: string;
  const previousDataFile = process.env.DATOS_ARCHIVO;
  const previousJwtSecret = process.env.JWT_SECRET;

  beforeAll(() => {
    temporaryDirectory = mkdtempSync(join(tmpdir(), 'mangonota-app-'));
    process.env.DATOS_ARCHIVO = join(temporaryDirectory, 'datos.json');
    process.env.JWT_SECRET = randomBytes(32).toString('hex');
  });

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Content-Type', /html/)
      .expect(/MangoNota/);
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(() => {
    if (previousDataFile === undefined) delete process.env.DATOS_ARCHIVO;
    else process.env.DATOS_ARCHIVO = previousDataFile;
    if (previousJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousJwtSecret;
    rmSync(temporaryDirectory, { recursive: true, force: true });
  });
});
