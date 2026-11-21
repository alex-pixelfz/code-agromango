import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AcopiosModule } from './acopios/acopios.module.js';
import { AreasModule } from './areas/areas.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ClientesModule } from './clientes/clientes.module.js';
import { StorageModule } from './storage/storage.module.js';

@Module({
  imports: [StorageModule, AreasModule, AuthModule, ClientesModule, AcopiosModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
