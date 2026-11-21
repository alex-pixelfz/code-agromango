import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AbonoAlmacenado,
  DevolucionAlmacenada,
  DatosAcopio,
  RecogidaAlmacenada,
  StorageService,
} from '../storage/storage.service.js';

type DatosMovimiento = Record<string, unknown>;

export interface RecogidaConSaldo extends RecogidaAlmacenada {
  valorTotal: number;
  totalAbonos: number;
  deuda: number;
  canastillasDevueltas: number;
  saldoCanastillas: number;
  abonos: AbonoAlmacenado[];
  devoluciones: DevolucionAlmacenada[];
}

export interface ResumenCliente {
  canastillasEntregadas: number;
  canastillasDevueltas: number;
  saldoCanastillas: number;
  valorTotal: number;
  totalAbonos: number;
  deuda: number;
}

export interface EstadoMovimientos {
  recogidas: RecogidaConSaldo[];
  resumen: ResumenCliente;
}

function tieneCampo(datos: DatosMovimiento, campo: string): boolean {
  return Object.prototype.hasOwnProperty.call(datos, campo);
}

function esFechaValida(fecha: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(fecha) &&
    !Number.isNaN(Date.parse(`${fecha}T00:00:00.000Z`)) &&
    new Date(`${fecha}T00:00:00.000Z`).toISOString().startsWith(fecha)
  );
}

@Injectable()
export class AcopiosService {
  constructor(private readonly storageService: StorageService) {}

  findForClient(usuarioId: number, clienteId: number): EstadoMovimientos {
    const datos = this.storageService.leer();
    this.validarPropietario(datos, usuarioId, clienteId);

    const abonosPorRecogida = new Map<number, AbonoAlmacenado[]>();
    for (const abono of datos.abonos) {
      if (abono.usuarioId !== usuarioId || abono.clienteId !== clienteId) {
        continue;
      }
      const lista = abonosPorRecogida.get(abono.recogidaId) ?? [];
      lista.push(abono);
      abonosPorRecogida.set(abono.recogidaId, lista);
    }
    const devolucionesPorRecogida = new Map<number, DevolucionAlmacenada[]>();
    for (const devolucion of datos.devoluciones) {
      if (
        devolucion.usuarioId !== usuarioId ||
        devolucion.clienteId !== clienteId
      ) {
        continue;
      }
      const lista =
        devolucionesPorRecogida.get(devolucion.recogidaId) ?? [];
      lista.push(devolucion);
      devolucionesPorRecogida.set(devolucion.recogidaId, lista);
    }

    const recogidas = datos.recogidas
      .filter(
        (recogida) =>
          recogida.usuarioId === usuarioId &&
          recogida.clienteId === clienteId,
      )
      .sort(
        (a, b) =>
          b.fecha.localeCompare(a.fecha) ||
          b.id - a.id,
      )
      .map((recogida) => {
        const abonos = (abonosPorRecogida.get(recogida.id) ?? []).sort(
          (a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id,
        );
        const valorTotal =
          recogida.canastillasEntregadas * recogida.precioPorCanastilla;
        const totalAbonos = abonos.reduce((total, abono) => total + abono.valor, 0);
        const devoluciones = (
          devolucionesPorRecogida.get(recogida.id) ?? []
        ).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);
        const canastillasDevueltas = devoluciones.reduce(
          (total, devolucion) => total + devolucion.cantidad,
          0,
        );
        return {
          ...recogida,
          valorTotal,
          totalAbonos,
          deuda: valorTotal - totalAbonos,
          canastillasDevueltas,
          saldoCanastillas: recogida.canastillasEntregadas - canastillasDevueltas,
          abonos,
          devoluciones,
        };
      });

    return {
      recogidas,
      resumen: recogidas.reduce<ResumenCliente>(
        (resumen, recogida) => ({
          canastillasEntregadas:
            resumen.canastillasEntregadas + recogida.canastillasEntregadas,
          canastillasDevueltas:
            resumen.canastillasDevueltas + recogida.canastillasDevueltas,
          saldoCanastillas: resumen.saldoCanastillas + recogida.saldoCanastillas,
          valorTotal: resumen.valorTotal + recogida.valorTotal,
          totalAbonos: resumen.totalAbonos + recogida.totalAbonos,
          deuda: resumen.deuda + recogida.deuda,
        }),
        {
          canastillasEntregadas: 0,
          canastillasDevueltas: 0,
          saldoCanastillas: 0,
          valorTotal: 0,
          totalAbonos: 0,
          deuda: 0,
        },
      ),
    };
  }

  createRecogida(
    usuarioId: number,
    clienteId: number,
    entrada: unknown,
  ): Promise<RecogidaAlmacenada> {
    const datos = this.validarObjeto(entrada);
    const fecha = this.validarFecha(datos.fecha);
    const canastillasEntregadas = this.validarEntero(
      datos.canastillasEntregadas,
      'La cantidad de canastillas recogidas debe ser un entero mayor que cero',
      1,
    );
    const precioPorCanastilla = this.validarEntero(
      datos.precioPorCanastilla,
      'El precio por canastilla debe ser un entero en pesos mayor que cero',
      1,
    );
    if (!Number.isSafeInteger(canastillasEntregadas * precioPorCanastilla)) {
      throw new BadRequestException('El valor total de la recogida es demasiado alto');
    }

    return this.storageService.actualizar((estado) => {
      this.validarPropietario(estado, usuarioId, clienteId, true);
      const recogida: RecogidaAlmacenada = {
        id: estado.contadores.recogida++,
        usuarioId,
        clienteId,
        fecha,
        canastillasEntregadas,
        precioPorCanastilla,
        registradoEn: new Date().toISOString(),
      };
      estado.recogidas.push(recogida);
      return recogida;
    });
  }

  createDevolucion(
    usuarioId: number,
    clienteId: number,
    recogidaId: number,
    entrada: unknown,
  ): Promise<DevolucionAlmacenada> {
    const datos = this.validarObjeto(entrada);
    const fecha = this.validarFecha(datos.fecha);
    const cantidad = this.validarEntero(
      datos.cantidad,
      'La cantidad devuelta debe ser un entero mayor que cero',
      1,
    );

    return this.storageService.actualizar((estado) => {
      this.validarPropietario(estado, usuarioId, clienteId, true);
      const recogida = estado.recogidas.find(
        (item) =>
          item.id === recogidaId &&
          item.clienteId === clienteId &&
          item.usuarioId === usuarioId,
      );
      if (!recogida) {
        throw new NotFoundException('Recogida no encontrada');
      }
      const totalDevuelto = estado.devoluciones
        .filter((devolucion) => devolucion.recogidaId === recogidaId)
        .reduce((total, devolucion) => total + devolucion.cantidad, 0);
      const pendiente =
        recogida.canastillasEntregadas - totalDevuelto;
      if (cantidad > pendiente) {
        throw new BadRequestException(
          `La devolución no puede superar las ${pendiente} canastillas pendientes`,
        );
      }

      const devolucion: DevolucionAlmacenada = {
        id: estado.contadores.devolucion++,
        usuarioId,
        clienteId,
        recogidaId,
        fecha,
        cantidad,
        registradoEn: new Date().toISOString(),
      };
      estado.devoluciones.push(devolucion);
      return devolucion;
    });
  }

  createAbono(
    usuarioId: number,
    clienteId: number,
    recogidaId: number,
    entrada: unknown,
  ): Promise<AbonoAlmacenado> {
    const datos = this.validarObjeto(entrada);
    const fecha = this.validarFecha(datos.fecha);
    const valor = this.validarEntero(
      datos.valor,
      'El valor del abono debe ser un entero en pesos mayor que cero',
      1,
    );
    const nota = tieneCampo(datos, 'nota')
      ? this.validarNota(datos.nota)
      : undefined;

    return this.storageService.actualizar((estado) => {
      this.validarPropietario(estado, usuarioId, clienteId, true);
      const recogida = estado.recogidas.find(
        (item) =>
          item.id === recogidaId &&
          item.clienteId === clienteId &&
          item.usuarioId === usuarioId,
      );
      if (!recogida) {
        throw new NotFoundException('Recogida no encontrada');
      }
      const totalAbonado = estado.abonos
        .filter((abono) => abono.recogidaId === recogidaId)
        .reduce((total, abono) => total + abono.valor, 0);
      const deudaActual =
        recogida.canastillasEntregadas * recogida.precioPorCanastilla -
        totalAbonado;
      if (valor > deudaActual) {
        throw new BadRequestException(
          `El abono no puede superar la deuda pendiente de ${deudaActual} pesos`,
        );
      }

      const abono: AbonoAlmacenado = {
        id: estado.contadores.abono++,
        usuarioId,
        clienteId,
        recogidaId,
        fecha,
        valor,
        registradoEn: new Date().toISOString(),
      };
      if (nota !== undefined) abono.nota = nota;
      estado.abonos.push(abono);
      return abono;
    });
  }

  private validarPropietario(
    datos: DatosAcopio,
    usuarioId: number,
    clienteId: number,
    exigirActivo = false,
  ): void {
    const cliente = datos.clientes.find(
      (item) => item.id === clienteId && item.usuarioId === usuarioId,
    );
    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }
    if (exigirActivo && !cliente.activo) {
      throw new ConflictException(
        'El cliente está archivado y no admite movimientos nuevos',
      );
    }
  }

  private validarObjeto(entrada: unknown): DatosMovimiento {
    if (
      typeof entrada !== 'object' ||
      entrada === null ||
      Array.isArray(entrada)
    ) {
      throw new BadRequestException('El cuerpo debe ser un objeto JSON');
    }
    return entrada as DatosMovimiento;
  }

  private validarFecha(valor: unknown): string {
    if (typeof valor !== 'string' || !esFechaValida(valor)) {
      throw new BadRequestException('La fecha debe ser una fecha válida (AAAA-MM-DD)');
    }
    return valor;
  }

  private validarEntero(
    valor: unknown,
    mensaje: string,
    minimo: number,
  ): number {
    if (
      typeof valor !== 'number' ||
      !Number.isSafeInteger(valor) ||
      valor < minimo
    ) {
      throw new BadRequestException(mensaje);
    }
    return valor;
  }

  private validarNota(valor: unknown): string {
    if (typeof valor !== 'string' || valor.trim().length > 200) {
      throw new BadRequestException('La nota no puede superar los 200 caracteres');
    }
    return valor.trim();
  }
}
