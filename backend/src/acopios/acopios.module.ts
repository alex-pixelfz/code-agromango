import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AcopiosController } from './acopios.controller.js';
import { AcopiosService } from './acopios.service.js';
import { LibroController } from './libro.controller.js';
import { LibroService } from './libro.service.js';

@Module({
  imports: [AuthModule],
  controllers: [AcopiosController, LibroController],
  providers: [AcopiosService, LibroService],
})
export class AcopiosModule {}
