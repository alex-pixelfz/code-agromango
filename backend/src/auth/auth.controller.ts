import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { UsuarioRegistrado } from './auth.service.js';
import { AuthService, LoginBloqueadoException } from './auth.service.js';

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
  async login(
    @Body() datos: { usuario?: unknown; contrasena?: unknown } | null,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ access_token: string }> {
    try {
      const ip = request.ip ?? request.socket.remoteAddress ?? 'desconocida';
      return await this.authService.login(datos, ip);
    } catch (error) {
      if (error instanceof LoginBloqueadoException) {
        response.setHeader('Retry-After', String(error.retryAfterSeconds));
      }
      throw error;
    }
  }
}
