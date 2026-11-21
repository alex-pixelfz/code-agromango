import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

@Controller()
export class AppController {
  @Get()
  getHome(@Res() response: Response): void {
    const indexPath = resolve(
      dirname(fileURLToPath(import.meta.url)),
      '../../frontend/index.html',
    );
    response.sendFile(indexPath);
  }
}
