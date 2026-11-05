import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AreasModule } from './areas/areas.module.js';
import { AuthModule } from './auth/auth.module.js';

@Module({
  imports: [AreasModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
