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

export interface RecogidaAlmacenada {
  id: number;
  usuarioId: number;
  clienteId: number;
  fecha: string;
  canastillasEntregadas: number;
  precioPorCanastilla: number;
  registradoEn: string;
}

export interface DevolucionAlmacenada {
  id: number;
  usuarioId: number;
  clienteId: number;
  recogidaId: number;
  fecha: string;
  cantidad: number;
  registradoEn: string;
}

export interface AbonoAlmacenado {
  id: number;
  usuarioId: number;
  clienteId: number;
  recogidaId: number;
  fecha: string;
  valor: number;
  nota?: string;
  registradoEn: string;
}

export interface EntregaAlmacenada {
  id: number;
  usuarioId: number;
  clienteId: number;
  fecha: string;
  tipoMango: string;
  calidad: 'PRIMERA' | 'SEGUNDA' | 'TERCERA';
  pesoCentiKg: number;
  precioPorKg: number;
  canastillasEntregadas: number;
  totalPesos: number;
  registradoEn: string;
  anuladaEn?: string;
  motivoAnulacion?: string;
}

export interface AbonoCuentaAlmacenado {
  id: number;
  usuarioId: number;
  clienteId: number;
  fecha: string;
  montoPesos: number;
  registradoEn: string;
  anuladaEn?: string;
  motivoAnulacion?: string;
}

export interface DevolucionCuentaAlmacenada {
  id: number;
  usuarioId: number;
  clienteId: number;
  fecha: string;
  cantidad: number;
  registradoEn: string;
  anuladaEn?: string;
  motivoAnulacion?: string;
}

export interface DatosAcopio {
  version: 1;
  usuarios: UsuarioAlmacenado[];
  clientes: ClienteAlmacenado[];
  recogidas: RecogidaAlmacenada[];
  devoluciones: DevolucionAlmacenada[];
  abonos: AbonoAlmacenado[];
  entregas: EntregaAlmacenada[];
  abonosCuenta: AbonoCuentaAlmacenado[];
  devolucionesCuenta: DevolucionCuentaAlmacenada[];
  contadores: {
    usuario: number;
    cliente: number;
    recogida: number;
    devolucion: number;
    abono: number;
    entrega: number;
    abonoCuenta: number;
    devolucionCuenta: number;
  };
}

type Actualizador<T> = (datos: DatosAcopio) => T | Promise<T>;

const MENSAJE_ERROR_GUARDADO = 'No se pudo guardar. Inténtalo de nuevo.';

function datosVacios(): DatosAcopio {
  return {
    version: 1,
    usuarios: [],
    clientes: [],
    recogidas: [],
    devoluciones: [],
    abonos: [],
    entregas: [],
    abonosCuenta: [],
    devolucionesCuenta: [],
    contadores: {
      usuario: 1,
      cliente: 1,
      recogida: 1,
      devolucion: 1,
      abono: 1,
      entrega: 1,
      abonoCuenta: 1,
      devolucionCuenta: 1,
    },
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
  const recogidas = (valor.recogidas ?? []) as unknown[];
  const devoluciones = (valor.devoluciones ?? []) as unknown[];
  const abonos = (valor.abonos ?? []) as unknown[];
  const entregas = (valor.entregas ?? []) as unknown[];
  const abonosCuenta = (valor.abonosCuenta ?? []) as unknown[];
  const devolucionesCuenta = (valor.devolucionesCuenta ?? []) as unknown[];
  if (
    !Array.isArray(recogidas) ||
    !Array.isArray(devoluciones) ||
    !Array.isArray(abonos) ||
    !Array.isArray(entregas) ||
    !Array.isArray(abonosCuenta) ||
    !Array.isArray(devolucionesCuenta)
  ) {
    throw new Error('Historial de movimientos inválido');
  }
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

  for (const recogida of recogidas) {
    if (
      !esObjeto(recogida) ||
      !esIdValido(recogida.id) ||
      !esIdValido(recogida.usuarioId) ||
      !esIdValido(recogida.clienteId) ||
      !esFechaValida(recogida.fecha) ||
      !Number.isSafeInteger(recogida.canastillasEntregadas) ||
      (recogida.canastillasEntregadas as number) < 1 ||
      !Number.isSafeInteger(recogida.precioPorCanastilla) ||
      (recogida.precioPorCanastilla as number) < 1 ||
      typeof recogida.registradoEn !== 'string'
    ) {
      throw new Error('Registro de recogida inválido');
    }
  }
  for (const devolucion of devoluciones) {
    if (
      !esObjeto(devolucion) ||
      !esIdValido(devolucion.id) ||
      !esIdValido(devolucion.usuarioId) ||
      !esIdValido(devolucion.clienteId) ||
      !esIdValido(devolucion.recogidaId) ||
      !esFechaValida(devolucion.fecha) ||
      !Number.isSafeInteger(devolucion.cantidad) ||
      (devolucion.cantidad as number) < 1 ||
      typeof devolucion.registradoEn !== 'string'
    ) {
      throw new Error('Registro de devolución inválido');
    }
  }
  for (const abono of abonos) {
    if (
      !esObjeto(abono) ||
      !esIdValido(abono.id) ||
      !esIdValido(abono.usuarioId) ||
      !esIdValido(abono.clienteId) ||
      !esIdValido(abono.recogidaId) ||
      !esFechaValida(abono.fecha) ||
      !Number.isSafeInteger(abono.valor) ||
      (abono.valor as number) < 1 ||
      typeof abono.registradoEn !== 'string' ||
      (abono.nota !== undefined && typeof abono.nota !== 'string')
    ) {
      throw new Error('Registro de abono inválido');
    }
  }
  for (const entrega of entregas) {
    if (
      !esObjeto(entrega) ||
      !esIdValido(entrega.id) ||
      !esIdValido(entrega.usuarioId) ||
      !esIdValido(entrega.clienteId) ||
      !esFechaValida(entrega.fecha) ||
      typeof entrega.tipoMango !== 'string' ||
      !['PRIMERA', 'SEGUNDA', 'TERCERA'].includes(String(entrega.calidad)) ||
      !Number.isSafeInteger(entrega.pesoCentiKg) ||
      (entrega.pesoCentiKg as number) < 1 ||
      (entrega.pesoCentiKg as number) > 5_000_000 ||
      !Number.isSafeInteger(entrega.precioPorKg) ||
      (entrega.precioPorKg as number) < 1 ||
      (entrega.precioPorKg as number) > 1_000_000 ||
      !Number.isSafeInteger(entrega.canastillasEntregadas) ||
      (entrega.canastillasEntregadas as number) < 0 ||
      (entrega.canastillasEntregadas as number) > 10_000 ||
      !Number.isSafeInteger(entrega.totalPesos) ||
      typeof entrega.registradoEn !== 'string' ||
      (entrega.anuladaEn !== undefined &&
        typeof entrega.anuladaEn !== 'string') ||
      (entrega.motivoAnulacion !== undefined &&
        typeof entrega.motivoAnulacion !== 'string')
    ) {
      throw new Error('Registro de entrega inválido');
    }
    const total = Math.round(
      ((entrega.precioPorKg as number) * (entrega.pesoCentiKg as number)) / 100,
    );
    if (entrega.totalPesos !== total) {
      throw new Error('Total de entrega inválido');
    }
  }
  for (const abono of abonosCuenta) {
    if (
      !esObjeto(abono) ||
      !esIdValido(abono.id) ||
      !esIdValido(abono.usuarioId) ||
      !esIdValido(abono.clienteId) ||
      !esFechaValida(abono.fecha) ||
      !Number.isSafeInteger(abono.montoPesos) ||
      (abono.montoPesos as number) < 1 ||
      typeof abono.registradoEn !== 'string' ||
      (abono.anuladaEn !== undefined &&
        typeof abono.anuladaEn !== 'string') ||
      (abono.motivoAnulacion !== undefined &&
        typeof abono.motivoAnulacion !== 'string')
    ) {
      throw new Error('Registro de abono inválido');
    }
  }
  for (const devolucion of devolucionesCuenta) {
    if (
      !esObjeto(devolucion) ||
      !esIdValido(devolucion.id) ||
      !esIdValido(devolucion.usuarioId) ||
      !esIdValido(devolucion.clienteId) ||
      !esFechaValida(devolucion.fecha) ||
      !Number.isSafeInteger(devolucion.cantidad) ||
      (devolucion.cantidad as number) < 1 ||
      typeof devolucion.registradoEn !== 'string' ||
      (devolucion.anuladaEn !== undefined &&
        typeof devolucion.anuladaEn !== 'string') ||
      (devolucion.motivoAnulacion !== undefined &&
        typeof devolucion.motivoAnulacion !== 'string')
    ) {
      throw new Error('Registro de devolución inválido');
    }
  }

  const usuariosPorId = new Map(
    usuarios.map((usuario) => [
      (usuario as UsuarioAlmacenado).id,
      usuario as UsuarioAlmacenado,
    ]),
  );
  const clientesPorId = new Map(
    clientes.map((cliente) => [
      (cliente as ClienteAlmacenado).id,
      cliente as ClienteAlmacenado,
    ]),
  );
  const recogidasPorId = new Map(
    recogidas.map((recogida) => [
      (recogida as RecogidaAlmacenada).id,
      recogida as RecogidaAlmacenada,
    ]),
  );
  const devolucionesPorId = new Map(
    devoluciones.map((devolucion) => [
      (devolucion as DevolucionAlmacenada).id,
      devolucion as DevolucionAlmacenada,
    ]),
  );
  const entregasPorId = new Map(
    entregas.map((entrega) => [
      (entrega as EntregaAlmacenada).id,
      entrega as EntregaAlmacenada,
    ]),
  );
  const abonosCuentaPorId = new Map(
    abonosCuenta.map((abono) => [
      (abono as AbonoCuentaAlmacenado).id,
      abono as AbonoCuentaAlmacenado,
    ]),
  );
  const devolucionesCuentaPorId = new Map(
    devolucionesCuenta.map((devolucion) => [
      (devolucion as DevolucionCuentaAlmacenada).id,
      devolucion as DevolucionCuentaAlmacenada,
    ]),
  );
  if (
    usuariosPorId.size !== usuarios.length ||
    clientesPorId.size !== clientes.length ||
    recogidasPorId.size !== recogidas.length ||
    devolucionesPorId.size !== devoluciones.length ||
    entregasPorId.size !== entregas.length ||
    abonosCuentaPorId.size !== abonosCuenta.length ||
    devolucionesCuentaPorId.size !== devolucionesCuenta.length
  ) {
    throw new Error('Identificadores duplicados en los datos');
  }
  for (const cliente of clientesPorId.values()) {
    if (!usuariosPorId.has(cliente.usuarioId)) {
      throw new Error('Cliente sin propietario válido');
    }
  }
  for (const recogida of recogidasPorId.values()) {
    const cliente = clientesPorId.get(recogida.clienteId);
    if (!cliente || cliente.usuarioId !== recogida.usuarioId) {
      throw new Error('Recogida sin cliente propietario válido');
    }
  }
  for (const movimiento of [
    ...entregasPorId.values(),
    ...abonosCuentaPorId.values(),
    ...devolucionesCuentaPorId.values(),
  ]) {
    const cliente = clientesPorId.get(movimiento.clienteId);
    if (!cliente || cliente.usuarioId !== movimiento.usuarioId) {
      throw new Error('Movimiento sin cliente propietario válido');
    }
  }
  const devolucionesPorRecogida = new Map<number, number>();
  for (const devolucion of devolucionesPorId.values()) {
    const recogida = recogidasPorId.get(devolucion.recogidaId);
    if (
      !recogida ||
      recogida.usuarioId !== devolucion.usuarioId ||
      recogida.clienteId !== devolucion.clienteId
    ) {
      throw new Error('Devolución sin recogida propietaria válida');
    }
    const total =
      (devolucionesPorRecogida.get(devolucion.recogidaId) ?? 0) +
      devolucion.cantidad;
    if (
      !Number.isSafeInteger(total) ||
      total > recogida.canastillasEntregadas
    ) {
      throw new Error('Total de canastillas devueltas inválido');
    }
    devolucionesPorRecogida.set(devolucion.recogidaId, total);
  }
  const abonosPorRecogida = new Map<number, number>();
  const idsAbonos = new Set<number>();
  for (const abonoValor of abonos) {
    const abono = abonoValor as AbonoAlmacenado;
    const recogida = recogidasPorId.get(abono.recogidaId);
    if (
      idsAbonos.has(abono.id) ||
      !recogida ||
      recogida.usuarioId !== abono.usuarioId ||
      recogida.clienteId !== abono.clienteId
    ) {
      throw new Error('Abono sin recogida propietaria válida');
    }
    idsAbonos.add(abono.id);
    const total = (abonosPorRecogida.get(abono.recogidaId) ?? 0) + abono.valor;
    if (!Number.isSafeInteger(total)) {
      throw new Error('Total de abonos inválido');
    }
    abonosPorRecogida.set(abono.recogidaId, total);
  }
  for (const recogida of recogidasPorId.values()) {
    const valorTotal =
      recogida.canastillasEntregadas * recogida.precioPorCanastilla;
    if (
      !Number.isSafeInteger(valorTotal) ||
      (abonosPorRecogida.get(recogida.id) ?? 0) > valorTotal
    ) {
      throw new Error('Saldo de recogida inválido');
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
  const maxRecogidaId = [...recogidasPorId.keys()].reduce(
    (maximo, id) => Math.max(maximo, id),
    0,
  );
  const maxAbonoId = [...idsAbonos].reduce(
    (maximo, id) => Math.max(maximo, id),
    0,
  );
  const maxDevolucionId = [...devolucionesPorId.keys()].reduce(
    (maximo, id) => Math.max(maximo, id),
    0,
  );
  const maxEntregaId = [...entregasPorId.keys()].reduce(
    (maximo, id) => Math.max(maximo, id),
    0,
  );
  const maxAbonoCuentaId = [...abonosCuentaPorId.keys()].reduce(
    (maximo, id) => Math.max(maximo, id),
    0,
  );
  const maxDevolucionCuentaId = [...devolucionesCuentaPorId.keys()].reduce(
    (maximo, id) => Math.max(maximo, id),
    0,
  );
  const contadores = valor.contadores as Record<string, unknown>;
  if (
    (contadores.usuario as number) <= maxUsuarioId ||
    (contadores.cliente as number) <= maxClienteId
  ) {
    throw new Error('Contadores de identificadores inválidos');
  }

  const contadorRecogida = contadores.recogida ?? maxRecogidaId + 1;
  const contadorDevolucion =
    contadores.devolucion ?? maxDevolucionId + 1;
  const contadorAbono = contadores.abono ?? maxAbonoId + 1;
  const contadorEntrega = contadores.entrega ?? maxEntregaId + 1;
  const contadorAbonoCuenta = contadores.abonoCuenta ?? maxAbonoCuentaId + 1;
  const contadorDevolucionCuenta =
    contadores.devolucionCuenta ?? maxDevolucionCuentaId + 1;
  if (
    !esIdValido(contadorRecogida) ||
    !esIdValido(contadorDevolucion) ||
    !esIdValido(contadorAbono) ||
    !esIdValido(contadorEntrega) ||
    !esIdValido(contadorAbonoCuenta) ||
    !esIdValido(contadorDevolucionCuenta) ||
    contadorRecogida <= maxRecogidaId ||
    contadorDevolucion <= maxDevolucionId ||
    contadorAbono <= maxAbonoId ||
    contadorEntrega <= maxEntregaId ||
    contadorAbonoCuenta <= maxAbonoCuentaId ||
    contadorDevolucionCuenta <= maxDevolucionCuentaId
  ) {
    throw new Error('Contadores de movimientos inválidos');
  }

  return {
    version: 1,
    usuarios: structuredClone(usuarios) as UsuarioAlmacenado[],
    clientes: structuredClone(clientes) as ClienteAlmacenado[],
    recogidas: structuredClone(recogidas) as RecogidaAlmacenada[],
    devoluciones: structuredClone(devoluciones) as DevolucionAlmacenada[],
    abonos: structuredClone(abonos) as AbonoAlmacenado[],
    entregas: structuredClone(entregas) as EntregaAlmacenada[],
    abonosCuenta: structuredClone(abonosCuenta) as AbonoCuentaAlmacenado[],
    devolucionesCuenta: structuredClone(
      devolucionesCuenta,
    ) as DevolucionCuentaAlmacenada[],
    contadores: {
      usuario: contadores.usuario as number,
      cliente: contadores.cliente as number,
      recogida: contadorRecogida,
      devolucion: contadorDevolucion,
      abono: contadorAbono,
      entrega: contadorEntrega,
      abonoCuenta: contadorAbonoCuenta,
      devolucionCuenta: contadorDevolucionCuenta,
    },
  };
}

function esFechaValida(valor: unknown): valor is string {
  return (
    typeof valor === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(valor) &&
    !Number.isNaN(Date.parse(`${valor}T00:00:00.000Z`)) &&
    new Date(`${valor}T00:00:00.000Z`).toISOString().startsWith(valor)
  );
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
