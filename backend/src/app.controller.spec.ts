import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import type { Response } from 'express';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('serves the frontend login page at the root', () => {
      let servedPath = '';
      appController.getHome({
        sendFile: (path: string) => {
          servedPath = path;
          return {} as Response;
        },
      } as unknown as Response);
      expect(servedPath).toMatch(/frontend[\\/]index\.html$/);
    });
  });
});
