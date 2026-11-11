import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AreasController } from './areas.controller.js';
import { AreasService } from './areas.service.js';

@Module({
  imports: [AuthModule],
  controllers: [AreasController],
  providers: [AreasService],
})
export class AreasModule {}
