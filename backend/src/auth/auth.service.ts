import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'node:crypto';
import { compare, hash } from 'bcryptjs';

interface UsuarioGuardado {
  id: number;
  usuario: string;
  contrasenaHash: string;
}

interface IntentosInicioSesion {
  fallidos: number;
  bloqueadoHasta?: number;
  actualizadoEn: number;
}

export interface UsuarioRegistrado {
  id: number;
  usuario: string;
}

function leerLimite(nombre: string, valorPorDefecto: number): number {
  const valor = Number(process.env[nombre] ?? valorPorDefecto);
  if (!Number.isSafeInteger(valor) || valor < 1) {
    throw new Error(`${nombre} debe ser un número entero mayor que cero`);
  }
  return valor;
}

const LOGIN_MAX_INTENTOS = leerLimite('LOGIN_MAX_INTENTOS', 5);
const LOGIN_BLOQUEO_SEGUNDOS = leerLimite('LOGIN_BLOQUEO_SEGUNDOS', 300);
const LOGIN_BLOQUEO_MS = LOGIN_BLOQUEO_SEGUNDOS * 1000;

export class LoginBloqueadoException extends HttpException {
  constructor(
    mensaje: string,
    readonly retryAfterSeconds: number,
  ) {
    super(mensaje, HttpStatus.TOO_MANY_REQUESTS);
  }
}

@Injectable()
export class AuthService {
  private readonly usuarios: UsuarioGuardado[] = [];
  private siguienteId = 1;
  private readonly hashFalso = hash(randomBytes(32).toString('hex'), 10);
  private readonly intentosInicioSesion = new Map<string, IntentosInicioSesion>();

  constructor(private readonly jwtService: JwtService) {}

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

  async login(
    datos: { usuario?: unknown; contrasena?: unknown } | null,
    ip: string,
  ): Promise<{ access_token: string }> {
    if (typeof datos?.usuario !== 'string' || datos.usuario.trim() === '') {
      throw new BadRequestException('El usuario es obligatorio');
    }
    if (typeof datos.contrasena !== 'string' || datos.contrasena.length === 0) {
      throw new BadRequestException('La contraseña es obligatoria');
    }

    const usuario = datos.usuario.trim();
    const claveIntentos = JSON.stringify([ip, usuario.toLowerCase()]);
    const ahora = Date.now();
    this.limpiarIntentosAntiguos(ahora);
    let intentos = this.intentosInicioSesion.get(claveIntentos);

    if (intentos?.bloqueadoHasta && intentos.bloqueadoHasta > ahora) {
      throw this.errorDeBloqueo(intentos.bloqueadoHasta - ahora);
    }

    const registro = this.usuarios.find(
      (item) => item.usuario.toLowerCase() === usuario.toLowerCase(),
    );
    const contrasenaValida = await compare(
      datos.contrasena,
      registro?.contrasenaHash ?? (await this.hashFalso),
    );

    intentos = this.intentosInicioSesion.get(claveIntentos);
    if (intentos?.bloqueadoHasta && intentos.bloqueadoHasta > Date.now()) {
      throw this.errorDeBloqueo(intentos.bloqueadoHasta - Date.now());
    }

    if (!registro || !contrasenaValida) {
      const fallidos = Math.min((intentos?.fallidos ?? 0) + 1, LOGIN_MAX_INTENTOS);
      const actualizadoEn = Date.now();
      const nuevoIntento: IntentosInicioSesion = { fallidos, actualizadoEn };

      if (fallidos === LOGIN_MAX_INTENTOS) {
        nuevoIntento.bloqueadoHasta = actualizadoEn + LOGIN_BLOQUEO_MS;
      }

      this.intentosInicioSesion.set(claveIntentos, nuevoIntento);
      const restantes = LOGIN_MAX_INTENTOS - fallidos;
      const oportunidad = restantes === 1 ? 'oportunidad' : 'oportunidades';
      throw new UnauthorizedException(
        restantes > 0
          ? `Usuario o contraseña incorrectos. Te quedan ${restantes} ${oportunidad}.`
          : 'Usuario o contraseña incorrectos. No te quedan oportunidades.',
      );
    }

    this.intentosInicioSesion.delete(claveIntentos);
    const access_token = await this.jwtService.signAsync({
      sub: registro.id,
      usuario: registro.usuario,
    });
    return { access_token };
  }

  private limpiarIntentosAntiguos(ahora: number): void {
    for (const [clave, intentos] of this.intentosInicioSesion) {
      const bloqueoVencido =
        intentos.bloqueadoHasta !== undefined && intentos.bloqueadoHasta <= ahora;
      const inactivoPorMuchoTiempo = ahora - intentos.actualizadoEn >= LOGIN_BLOQUEO_MS;
      if (bloqueoVencido || inactivoPorMuchoTiempo) {
        this.intentosInicioSesion.delete(clave);
      }
    }
  }

  private errorDeBloqueo(milisegundosRestantes: number): LoginBloqueadoException {
    const minutosRestantes = Math.max(1, Math.ceil(milisegundosRestantes / 60000));
    const segundosRestantes = Math.max(1, Math.ceil(milisegundosRestantes / 1000));
    const unidadTiempo = minutosRestantes === 1 ? 'minuto' : 'minutos';
    return new LoginBloqueadoException(
      `Demasiados intentos fallidos. Espera ${minutosRestantes} ${unidadTiempo} e inténtalo de nuevo`,
      segundosRestantes,
    );
  }
}
