import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import type { UsuarioRegistrado } from './auth.service.js';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(
    @Body() datos: { usuario?: unknown; contrasena?: unknown } | null,
  ): Promise<UsuarioRegistrado> {
    return this.authService.register(datos);
  }

  @Post('login')
  @HttpCode(200)
  login(
    @Body() datos: { usuario?: unknown; contrasena?: unknown } | null,
  ): Promise<{ access_token: string }> {
    return this.authService.login(datos);
  }
}
