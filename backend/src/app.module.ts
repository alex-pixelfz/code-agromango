import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AreasModule } from './areas/areas.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ClientesModule } from './clientes/clientes.module.js';
import { StorageModule } from './storage/storage.module.js';

@Module({
  imports: [StorageModule, AreasModule, AuthModule, ClientesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
