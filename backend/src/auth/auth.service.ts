import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { hash } from 'bcryptjs';

interface UsuarioGuardado {
  id: number;
  usuario: string;
  contrasenaHash: string;
}

export interface UsuarioRegistrado {
  id: number;
  usuario: string;
}

@Injectable()
export class AuthService {
  private readonly usuarios: UsuarioGuardado[] = [];
  private siguienteId = 1;

  async register(
    datos: { usuario?: unknown; contrasena?: unknown } | null,
  ): Promise<UsuarioRegistrado> {
    if (typeof datos?.usuario !== 'string' || datos.usuario.trim() === '') {
      throw new BadRequestException('El usuario es obligatorio');
    }

    const usuario = datos.usuario.trim();
    if (usuario.length < 3) {
      throw new BadRequestException('El usuario debe tener al menos 3 caracteres');
    }

    if (typeof datos.contrasena !== 'string' || datos.contrasena.length === 0) {
      throw new BadRequestException('La contraseña es obligatoria');
    }
    if (datos.contrasena.length < 8) {
      throw new BadRequestException('La contraseña debe tener al menos 8 caracteres');
    }

    const usuarioExiste = () =>
      this.usuarios.some(
        (registro) => registro.usuario.toLowerCase() === usuario.toLowerCase(),
      );
    if (usuarioExiste()) {
      throw new ConflictException('El usuario ya existe');
    }

    const contrasenaHash = await hash(datos.contrasena, 10);
    if (usuarioExiste()) {
      throw new ConflictException('El usuario ya existe');
    }

    const registro: UsuarioGuardado = {
      id: this.siguienteId++,
      usuario,
      contrasenaHash,
    };
    this.usuarios.push(registro);

    return { id: registro.id, usuario: registro.usuario };
  }
}
