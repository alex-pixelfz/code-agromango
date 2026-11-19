import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { StorageModule } from '../storage/storage.module.js';
import { StorageService } from '../storage/storage.service.js';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';

@Module({
  imports: [
    StorageModule,
    JwtModule.registerAsync({
      imports: [StorageModule],
      inject: [StorageService],
      useFactory: (storageService: StorageService) => ({
        secret: storageService.getJwtSecret(),
        signOptions: { expiresIn: '1h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthGuard, AuthService],
  exports: [AuthGuard, JwtModule],
})
export class AuthModule {}
