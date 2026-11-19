import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { copyFile, rename, writeFile } from 'node:fs/promises';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface UsuarioAlmacenado {
  id: number;
  usuario: string;
  usuarioNormalizado: string;
  contrasenaHash: string;
}

export interface ClienteAlmacenado {
  id: number;
  usuarioId: number;
  nombre: string;
  telefono?: string;
  vereda?: string;
  activo: boolean;
  creadoEn: string;
}

export interface DatosAcopio {
  version: 1;
  usuarios: UsuarioAlmacenado[];
  clientes: ClienteAlmacenado[];
  contadores: {
    usuario: number;
    cliente: number;
  };
}

type Actualizador<T> = (datos: DatosAcopio) => T | Promise<T>;

const MENSAJE_ERROR_GUARDADO = 'No se pudo guardar. Inténtalo de nuevo.';

function datosVacios(): DatosAcopio {
  return {
    version: 1,
    usuarios: [],
    clientes: [],
    contadores: { usuario: 1, cliente: 1 },
  };
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function esIdValido(valor: unknown): valor is number {
  return Number.isSafeInteger(valor) && (valor as number) > 0;
}

function analizarDatos(texto: string): DatosAcopio {
  const valor: unknown = JSON.parse(texto);
  if (
    !esObjeto(valor) ||
    valor.version !== 1 ||
    !Array.isArray(valor.usuarios) ||
    !Array.isArray(valor.clientes) ||
    !esObjeto(valor.contadores) ||
    !esIdValido(valor.contadores.usuario) ||
    !esIdValido(valor.contadores.cliente)
  ) {
    throw new Error('Estructura de datos inválida');
  }

  const usuarios = valor.usuarios as unknown[];
  const clientes = valor.clientes as unknown[];
  for (const usuario of usuarios) {
    if (
      !esObjeto(usuario) ||
      !esIdValido(usuario.id) ||
      typeof usuario.usuario !== 'string' ||
      typeof usuario.usuarioNormalizado !== 'string' ||
      typeof usuario.contrasenaHash !== 'string'
    ) {
      throw new Error('Registro de usuario inválido');
    }
  }
  for (const cliente of clientes) {
    if (
      !esObjeto(cliente) ||
      !esIdValido(cliente.id) ||
      !esIdValido(cliente.usuarioId) ||
      typeof cliente.nombre !== 'string' ||
      typeof cliente.activo !== 'boolean' ||
      typeof cliente.creadoEn !== 'string' ||
      (cliente.telefono !== undefined &&
        typeof cliente.telefono !== 'string') ||
      (cliente.vereda !== undefined && typeof cliente.vereda !== 'string')
    ) {
      throw new Error('Registro de cliente inválido');
    }
  }

  const maxUsuarioId = usuarios.reduce<number>(
    (maximo, usuario) => Math.max(maximo, (usuario as UsuarioAlmacenado).id),
    0,
  );
  const maxClienteId = clientes.reduce<number>(
    (maximo, cliente) => Math.max(maximo, (cliente as ClienteAlmacenado).id),
    0,
  );
  if (
    (valor.contadores.usuario as number) <= maxUsuarioId ||
    (valor.contadores.cliente as number) <= maxClienteId
  ) {
    throw new Error('Contadores de identificadores inválidos');
  }

  return structuredClone(valor) as unknown as DatosAcopio;
}

@Injectable()
export class StorageService {
  private readonly archivo = process.env.DATOS_ARCHIVO
    ? resolve(process.env.DATOS_ARCHIVO)
    : resolve(
        dirname(fileURLToPath(import.meta.url)),
        '../../data/datos_acopio.json',
      );
  private readonly respaldo = `${this.archivo}.bak`;
  private readonly archivoSecreto = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../data/jwt.secret',
  );
  private datos = datosVacios();
  private cola: Promise<void> = Promise.resolve();
  private recuperadoDesdeRespaldo = false;

  constructor() {
    this.cargarDatos();
  }

  getJwtSecret(): string {
    if (process.env.JWT_SECRET !== undefined) {
      return process.env.JWT_SECRET;
    }

    mkdirSync(dirname(this.archivoSecreto), { recursive: true });
    try {
      return readFileSync(this.archivoSecreto, 'utf8').trim();
    } catch (error) {
      if (!esErrorDeArchivo(error, 'ENOENT')) {
        throw new Error('No se pudo leer el secreto JWT guardado en disco.');
      }
    }

    const secreto = randomBytes(32).toString('hex');
    try {
      writeFileSync(this.archivoSecreto, secreto, {
        encoding: 'utf8',
        flag: 'wx',
      });
      return secreto;
    } catch (error) {
      if (!esErrorDeArchivo(error, 'EEXIST')) {
        throw new Error('No se pudo guardar el secreto JWT en disco.');
      }
      return readFileSync(this.archivoSecreto, 'utf8').trim();
    }
  }

  leer(): DatosAcopio {
    return structuredClone(this.datos);
  }

  actualizar<T>(fn: Actualizador<T>): Promise<T> {
    const operacion = this.cola.then(async () => {
      const copia = structuredClone(this.datos);
      const resultado = await fn(copia);
      try {
        await this.escribir(copia);
      } catch {
        throw new InternalServerErrorException(MENSAJE_ERROR_GUARDADO);
      }
      this.datos = copia;
      return structuredClone(resultado);
    });

    this.cola = operacion.then(
      () => undefined,
      () => undefined,
    );
    return operacion;
  }

  private cargarDatos(): void {
    mkdirSync(dirname(this.archivo), { recursive: true });

    let contenido: string;
    try {
      contenido = readFileSync(this.archivo, 'utf8');
    } catch (error) {
      if (!esErrorDeArchivo(error, 'ENOENT')) {
        throw new Error('No se pudo leer el archivo de datos.');
      }
      this.datos = datosVacios();
      const temporal = `${this.archivo}.tmp`;
      writeFileSync(temporal, `${JSON.stringify(this.datos, null, 2)}\n`, {
        encoding: 'utf8',
      });
      renameSync(temporal, this.archivo);
      return;
    }

    try {
      this.datos = analizarDatos(contenido);
      return;
    } catch {
      let contenidoRespaldo: string;
      try {
        contenidoRespaldo = readFileSync(this.respaldo, 'utf8');
      } catch {
        throw new Error(
          'El archivo de datos no contiene JSON válido y no hay una copia de respaldo disponible. No se modificó ningún archivo.',
        );
      }

      try {
        this.datos = analizarDatos(contenidoRespaldo);
        this.recuperadoDesdeRespaldo = true;
      } catch {
        throw new Error(
          'El archivo de datos y su copia de respaldo no contienen datos válidos. No se modificó ningún archivo.',
        );
      }
    }
  }

  private async escribir(datos: DatosAcopio): Promise<void> {
    const temporal = `${this.archivo}.tmp`;
    await writeFile(temporal, `${JSON.stringify(datos, null, 2)}\n`, {
      encoding: 'utf8',
    });
    if (!this.recuperadoDesdeRespaldo) {
      try {
        await copyFile(this.archivo, this.respaldo);
      } catch (error) {
        if (!esErrorDeArchivo(error, 'ENOENT')) {
          throw error;
        }
      }
    }
    await rename(temporal, this.archivo);
    this.recuperadoDesdeRespaldo = false;
  }
}

function esErrorDeArchivo(
  error: unknown,
  codigo: string,
): error is NodeJS.ErrnoException {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === codigo
  );
}
