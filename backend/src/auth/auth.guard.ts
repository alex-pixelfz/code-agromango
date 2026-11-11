import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

interface AuthPayload {
  sub: number;
  usuario: string;
  iat?: number;
  exp?: number;
}

type AuthenticatedRequest = Request & { user?: AuthPayload };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const tokenMatch = authorization?.match(/^Bearer\s+(\S+)$/i);

    if (!tokenMatch) {
      throw new UnauthorizedException('Token requerido o inválido');
    }

    try {
      request.user = await this.jwtService.verifyAsync<AuthPayload>(tokenMatch[1]);
    } catch {
      throw new UnauthorizedException('Token requerido o inválido');
    }

    return true;
  }
}
