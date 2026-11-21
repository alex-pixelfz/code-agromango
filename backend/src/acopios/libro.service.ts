import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AbonoCuentaAlmacenado,
  ClienteAlmacenado,
  DatosAcopio,
  DevolucionCuentaAlmacenada,
  EntregaAlmacenada,
  StorageService,
} from '../storage/storage.service.js';

type Entrada = Record<string, unknown>;
type Calidad = EntregaAlmacenada['calidad'];
type MovimientoCuenta = {
  id: number;
  tipo: 'ENTREGA' | 'ABONO' | 'DEVOLUCION';
  fecha: string;
  descripcion: string;
  montoPesos?: number;
  cantidad?: number;
  anulada: boolean;
  motivoAnulacion?: string;
};

const HOY = () => new Date().toISOString().slice(0, 10);

function esObjeto(valor: unknown): valor is Entrada {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function fechaValida(valor: unknown): valor is string {
  return (
    typeof valor === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(valor) &&
    !Number.isNaN(Date.parse(`${valor}T00:00:00.000Z`)) &&
    new Date(`${valor}T00:00:00.000Z`).toISOString().startsWith(valor)
  );
}

function montoEntrega(entrega: EntregaAlmacenada): number {
  return entrega.anuladaEn ? 0 : entrega.totalPesos;
}

function montoAbono(abono: AbonoCuentaAlmacenado): number {
  return abono.anuladaEn ? 0 : abono.montoPesos;
}

function cantidadEntrega(entrega: EntregaAlmacenada): number {
  return entrega.anuladaEn ? 0 : entrega.canastillasEntregadas;
}

function cantidadDevolucion(devolucion: DevolucionCuentaAlmacenada): number {
  return devolucion.anuladaEn ? 0 : devolucion.cantidad;
}

function saldoPesos(datos: DatosAcopio, usuarioId: number, clienteId: number) {
  const total = datos.entregas
    .filter((e) => e.usuarioId === usuarioId && e.clienteId === clienteId)
    .reduce((sum, e) => sum + montoEntrega(e), 0);
  const abonos = datos.abonosCuenta
    .filter((a) => a.usuarioId === usuarioId && a.clienteId === clienteId)
    .reduce((sum, a) => sum + montoAbono(a), 0);
  return total - abonos;
}

function saldoCanastillas(
  datos: DatosAcopio,
  usuarioId: number,
  clienteId: number,
) {
  const entregadas = datos.entregas
    .filter((e) => e.usuarioId === usuarioId && e.clienteId === clienteId)
    .reduce((sum, e) => sum + cantidadEntrega(e), 0);
  const devueltas = datos.devolucionesCuenta
    .filter((d) => d.usuarioId === usuarioId && d.clienteId === clienteId)
    .reduce((sum, d) => sum + cantidadDevolucion(d), 0);
  return entregadas - devueltas;
}

function mostrarEntrega(entrega: EntregaAlmacenada) {
  const { pesoCentiKg, ...resto } = entrega;
  return { ...resto, pesoKg: pesoCentiKg / 100 };
}

@Injectable()
export class LibroService {
  constructor(private readonly storage: StorageService) {}

  listarEntregas(usuarioId: number, clienteId?: number) {
    return this.storage
      .leer()
      .entregas.filter(
        (e) =>
          e.usuarioId === usuarioId &&
          (clienteId === undefined || e.clienteId === clienteId),
      )
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id)
      .map(mostrarEntrega);
  }

  listarAbonos(usuarioId: number, clienteId?: number) {
    return this.storage
      .leer()
      .abonosCuenta.filter(
        (a) =>
          a.usuarioId === usuarioId &&
          (clienteId === undefined || a.clienteId === clienteId),
      )
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);
  }

  listarDevoluciones(usuarioId: number, clienteId?: number) {
    return this.storage
      .leer()
      .devolucionesCuenta.filter(
        (d) =>
          d.usuarioId === usuarioId &&
          (clienteId === undefined || d.clienteId === clienteId),
      )
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);
  }

  crearEntrega(usuarioId: number, entrada: unknown) {
    const datos = this.objeto(entrada);
    const clienteId = this.entero(datos.clienteId, 1, Number.MAX_SAFE_INTEGER, 'El id del cliente debe ser válido');
    const tipoMango =
      typeof datos.tipoMango === 'string' ? datos.tipoMango.trim() : '';
    if (tipoMango.length < 2 || tipoMango.length > 40) {
      throw new BadRequestException(
        'El tipo de mango debe tener entre 2 y 40 caracteres',
      );
    }
    if (
      datos.calidad !== 'PRIMERA' &&
      datos.calidad !== 'SEGUNDA' &&
      datos.calidad !== 'TERCERA'
    ) {
      throw new BadRequestException(
        'La calidad debe ser PRIMERA, SEGUNDA o TERCERA',
      );
    }
    const pesoKg = this.decimal(datos.pesoKg, 0.01, 50_000, 'El peso debe estar entre 0,01 y 50.000 kg y tener máximo 2 decimales');
    const pesoCentiKg = Math.round(pesoKg * 100);
    const precioPorKg = this.entero(datos.precioPorKg, 1, 1_000_000, 'El precio por kilo debe ser un entero entre 1 y 1.000.000');
    const canastillasEntregadas = this.entero(datos.canastillasEntregadas, 0, 10_000, 'Las canastillas deben ser un entero entre 0 y 10.000');
    const fecha = this.fecha(datos.fecha, true);
    const totalPesos = Math.round((precioPorKg * pesoCentiKg) / 100);
    if (!Number.isSafeInteger(totalPesos)) {
      throw new BadRequestException('El total de la entrega es demasiado alto');
    }

    return this.storage.actualizar((estado) => {
      this.clienteActivo(estado, usuarioId, clienteId);
      const entrega: EntregaAlmacenada = {
        id: estado.contadores.entrega++,
        usuarioId,
        clienteId,
        fecha,
        tipoMango,
        calidad: datos.calidad as Calidad,
        pesoCentiKg,
        precioPorKg,
        canastillasEntregadas,
        totalPesos,
        registradoEn: new Date().toISOString(),
      };
      estado.entregas.push(entrega);
      return mostrarEntrega(entrega);
    });
  }

  crearAbono(usuarioId: number, entrada: unknown) {
    const datos = this.objeto(entrada);
    const clienteId = this.entero(datos.clienteId, 1, Number.MAX_SAFE_INTEGER, 'El id del cliente debe ser válido');
    const montoPesos = this.entero(datos.montoPesos, 1, Number.MAX_SAFE_INTEGER, 'El abono debe ser un entero en pesos mayor que cero');
    const fecha = this.fecha(datos.fecha, false);

    return this.storage.actualizar((estado) => {
      this.clienteActivo(estado, usuarioId, clienteId);
      const pendiente = saldoPesos(estado, usuarioId, clienteId);
      if (montoPesos > pendiente) {
        throw new ConflictException(
          `El abono no puede superar los ${pendiente} pesos que faltan por pagar`,
        );
      }
      const abono: AbonoCuentaAlmacenado = {
        id: estado.contadores.abonoCuenta++,
        usuarioId,
        clienteId,
        fecha,
        montoPesos,
        registradoEn: new Date().toISOString(),
      };
      estado.abonosCuenta.push(abono);
      return abono;
    });
  }

  crearDevolucion(usuarioId: number, entrada: unknown) {
    const datos = this.objeto(entrada);
    const clienteId = this.entero(datos.clienteId, 1, Number.MAX_SAFE_INTEGER, 'El id del cliente debe ser válido');
    const cantidad = this.entero(datos.cantidad, 1, 10_000, 'La cantidad debe ser un entero mayor que cero');
    const fecha = this.fecha(datos.fecha, false);

    return this.storage.actualizar((estado) => {
      this.clienteActivo(estado, usuarioId, clienteId);
      const pendiente = saldoCanastillas(estado, usuarioId, clienteId);
      if (cantidad > pendiente) {
        throw new ConflictException(
          `No se pueden devolver más de las ${pendiente} canastillas pendientes`,
        );
      }
      const devolucion: DevolucionCuentaAlmacenada = {
        id: estado.contadores.devolucionCuenta++,
        usuarioId,
        clienteId,
        fecha,
        cantidad,
        registradoEn: new Date().toISOString(),
      };
      estado.devolucionesCuenta.push(devolucion);
      return devolucion;
    });
  }

  anularEntrega(usuarioId: number, id: number, entrada: unknown) {
    return this.storage.actualizar((estado) => {
      const entrega = estado.entregas.find(
        (e) => e.id === id && e.usuarioId === usuarioId,
      );
      if (!entrega) throw new NotFoundException('Movimiento no encontrado');
      this.noAnulado(entrega);
      const motivo = this.motivo(entrada);
      const dineroRestante = saldoPesos(estado, usuarioId, entrega.clienteId) - entrega.totalPesos;
      const canastillasRestantes =
        saldoCanastillas(estado, usuarioId, entrega.clienteId) -
        entrega.canastillasEntregadas;
      if (dineroRestante < 0) {
        throw new ConflictException(
          'No se puede anular: primero anula los abonos que dejarían el saldo en negativo',
        );
      }
      if (canastillasRestantes < 0) {
        throw new ConflictException(
          'No se puede anular: primero anula las devoluciones que dejarían las canastillas en negativo',
        );
      }
      entrega.anuladaEn = new Date().toISOString();
      entrega.motivoAnulacion = motivo;
      return mostrarEntrega(entrega);
    });
  }

  anularAbono(usuarioId: number, id: number, entrada: unknown) {
    return this.storage.actualizar((estado) => {
      const abono = estado.abonosCuenta.find(
        (a) => a.id === id && a.usuarioId === usuarioId,
      );
      if (!abono) throw new NotFoundException('Movimiento no encontrado');
      this.noAnulado(abono);
      const motivo = this.motivo(entrada);
      abono.anuladaEn = new Date().toISOString();
      abono.motivoAnulacion = motivo;
      return abono;
    });
  }

  anularDevolucion(usuarioId: number, id: number, entrada: unknown) {
    return this.storage.actualizar((estado) => {
      const devolucion = estado.devolucionesCuenta.find(
        (d) => d.id === id && d.usuarioId === usuarioId,
      );
      if (!devolucion) throw new NotFoundException('Movimiento no encontrado');
      this.noAnulado(devolucion);
      const motivo = this.motivo(entrada);
      devolucion.anuladaEn = new Date().toISOString();
      devolucion.motivoAnulacion = motivo;
      return devolucion;
    });
  }

  cuenta(usuarioId: number, clienteId: number) {
    const datos = this.storage.leer();
    this.cliente(datos, usuarioId, clienteId);
    const entregas = datos.entregas.filter(
      (e) => e.usuarioId === usuarioId && e.clienteId === clienteId,
    );
    const abonos = datos.abonosCuenta.filter(
      (a) => a.usuarioId === usuarioId && a.clienteId === clienteId,
    );
    const devoluciones = datos.devolucionesCuenta.filter(
      (d) => d.usuarioId === usuarioId && d.clienteId === clienteId,
    );
    const totalEntregadoPesos = entregas.reduce(
      (sum, e) => sum + montoEntrega(e),
      0,
    );
    const totalAbonadoPesos = abonos.reduce(
      (sum, a) => sum + montoAbono(a),
      0,
    );
    const canastillasEntregadas = entregas.reduce(
      (sum, e) => sum + cantidadEntrega(e),
      0,
    );
    const canastillasDevueltas = devoluciones.reduce(
      (sum, d) => sum + cantidadDevolucion(d),
      0,
    );
    const movimientos: MovimientoCuenta[] = [
      ...entregas.map((e) => ({
        id: e.id,
        tipo: 'ENTREGA' as const,
        fecha: e.fecha,
        descripcion: `${e.tipoMango} ${e.calidad} · ${e.pesoCentiKg / 100} kg`,
        montoPesos: e.totalPesos,
        cantidad: e.canastillasEntregadas,
        anulada: Boolean(e.anuladaEn),
        motivoAnulacion: e.motivoAnulacion,
      })),
      ...abonos.map((a) => ({
        id: a.id,
        tipo: 'ABONO' as const,
        fecha: a.fecha,
        descripcion: 'Abono a la cuenta',
        montoPesos: a.montoPesos,
        anulada: Boolean(a.anuladaEn),
        motivoAnulacion: a.motivoAnulacion,
      })),
      ...devoluciones.map((d) => ({
        id: d.id,
        tipo: 'DEVOLUCION' as const,
        fecha: d.fecha,
        descripcion: 'Devolución de canastillas',
        cantidad: d.cantidad,
        anulada: Boolean(d.anuladaEn),
        motivoAnulacion: d.motivoAnulacion,
      })),
    ].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);
    const movimientosRecientes = movimientos.slice(0, 10);
    if (movimientos.length > 10) {
      movimientosRecientes.push({
        id: 0,
        tipo: 'ENTREGA',
        fecha: '',
        descripcion: `...y ${movimientos.length - 10} mas`,
        anulada: false,
      });
    }
    return {
      totalEntregadoPesos,
      totalAbonadoPesos,
      saldoPesos: totalEntregadoPesos - totalAbonadoPesos,
      canastillasEntregadas,
      canastillasDevueltas,
      saldoCanastillas: canastillasEntregadas - canastillasDevueltas,
      movimientos: movimientosRecientes,
    };
  }

  sugerencias(usuarioId: number, clienteId: number) {
    const datos = this.storage.leer();
    this.cliente(datos, usuarioId, clienteId);
    const ultima = datos.entregas
      .filter(
        (e) =>
          e.usuarioId === usuarioId &&
          e.clienteId === clienteId &&
          !e.anuladaEn,
      )
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id)[0];
    if (!ultima) return null;
    return {
      tipoMango: ultima.tipoMango,
      calidad: ultima.calidad,
      precioPorKg: ultima.precioPorKg,
    };
  }

  cuentas(usuarioId: number) {
    const datos = this.storage.leer();
    return datos.clientes
      .filter((c) => c.usuarioId === usuarioId)
      .map((cliente) => ({
        cliente,
        ...this.resumen(datos, usuarioId, cliente.id),
      }))
      .filter((cuenta) => cuenta.saldoPesos !== 0)
      .sort((a, b) => b.saldoPesos - a.saldoPesos);
  }

  comprobante(usuarioId: number, clienteId: number, entregaId: number) {
    const datos = this.storage.leer();
    const cliente = this.cliente(datos, usuarioId, clienteId);
    const entrega = datos.entregas.find(
      (e) =>
        e.id === entregaId &&
        e.clienteId === clienteId &&
        e.usuarioId === usuarioId,
    );
    if (!entrega) throw new NotFoundException('Movimiento no encontrado');
    const cuenta = this.cuenta(usuarioId, clienteId);
    const texto = [
      `MangoNota - Comprobante de entrega`,
      `Cliente: ${cliente.nombre}`,
      `Fecha: ${entrega.fecha}`,
      `Mango: ${entrega.tipoMango} (${entrega.calidad})`,
      `Peso: ${(entrega.pesoCentiKg / 100).toLocaleString('es-CO')} kg`,
      `Precio por kg: $${entrega.precioPorKg.toLocaleString('es-CO')}`,
      `Total de esta entrega: $${entrega.totalPesos.toLocaleString('es-CO')}`,
      `Falta por pagar: $${cuenta.saldoPesos.toLocaleString('es-CO')}`,
      `Canastillas que debe: ${cuenta.saldoCanastillas}`,
    ].join('\n');
    const destino = cliente.telefono
      ? `https://wa.me/57${cliente.telefono}?text=`
      : 'https://wa.me/?text=';
    return { texto, url: `${destino}${encodeURIComponent(texto)}` };
  }

  private resumen(datos: DatosAcopio, usuarioId: number, clienteId: number) {
    const entregas = datos.entregas.filter(
      (e) => e.usuarioId === usuarioId && e.clienteId === clienteId,
    );
    const abonos = datos.abonosCuenta.filter(
      (a) => a.usuarioId === usuarioId && a.clienteId === clienteId,
    );
    const devoluciones = datos.devolucionesCuenta.filter(
      (d) => d.usuarioId === usuarioId && d.clienteId === clienteId,
    );
    const totalEntregadoPesos = entregas.reduce((s, e) => s + montoEntrega(e), 0);
    const totalAbonadoPesos = abonos.reduce((s, a) => s + montoAbono(a), 0);
    const canastillasEntregadas = entregas.reduce(
      (s, e) => s + cantidadEntrega(e),
      0,
    );
    const canastillasDevueltas = devoluciones.reduce(
      (s, d) => s + cantidadDevolucion(d),
      0,
    );
    return {
      totalEntregadoPesos,
      totalAbonadoPesos,
      saldoPesos: totalEntregadoPesos - totalAbonadoPesos,
      canastillasEntregadas,
      canastillasDevueltas,
      saldoCanastillas: canastillasEntregadas - canastillasDevueltas,
    };
  }

  private cliente(
    datos: DatosAcopio,
    usuarioId: number,
    clienteId: number,
  ): ClienteAlmacenado {
    const cliente = datos.clientes.find(
      (c) => c.id === clienteId && c.usuarioId === usuarioId,
    );
    if (!cliente) throw new NotFoundException('Cliente no encontrado');
    return cliente;
  }

  private clienteActivo(
    datos: DatosAcopio,
    usuarioId: number,
    clienteId: number,
  ) {
    const cliente = this.cliente(datos, usuarioId, clienteId);
    if (!cliente.activo) {
      throw new ConflictException(
        'El cliente está archivado y no admite movimientos nuevos',
      );
    }
    return cliente;
  }

  private objeto(valor: unknown): Entrada {
    if (!esObjeto(valor)) {
      throw new BadRequestException('El cuerpo debe ser un objeto JSON');
    }
    return valor;
  }

  private entero(valor: unknown, min: number, max: number, mensaje: string) {
    if (
      typeof valor !== 'number' ||
      !Number.isSafeInteger(valor) ||
      valor < min ||
      valor > max
    ) {
      throw new BadRequestException(mensaje);
    }
    return valor;
  }

  private decimal(valor: unknown, min: number, max: number, mensaje: string) {
    if (typeof valor !== 'number' || !Number.isFinite(valor)) {
      throw new BadRequestException(mensaje);
    }
    const centi = Math.round(valor * 100);
    if (
      valor < min ||
      valor > max ||
      Math.abs(valor * 100 - centi) > 1e-7
    ) {
      throw new BadRequestException(mensaje);
    }
    return centi / 100;
  }

  private fecha(valor: unknown, restringida: boolean) {
    const fecha = valor === undefined || valor === '' ? HOY() : valor;
    if (!fechaValida(fecha)) {
      throw new BadRequestException('La fecha debe ser válida (AAAA-MM-DD)');
    }
    if (restringida) {
      const hoy = new Date(`${HOY()}T00:00:00.000Z`);
      const min = new Date(hoy);
      min.setUTCDate(min.getUTCDate() - 365);
      if (fecha > HOY() || fecha < min.toISOString().slice(0, 10)) {
        throw new BadRequestException(
          'La fecha no puede ser futura ni anterior a 365 días',
        );
      }
    }
    return fecha;
  }

  private motivo(valor: unknown) {
    const datos = this.objeto(valor);
    if (
      typeof datos.motivo !== 'string' ||
      datos.motivo.trim().length < 3 ||
      datos.motivo.trim().length > 200
    ) {
      throw new BadRequestException(
        'El motivo debe tener entre 3 y 200 caracteres',
      );
    }
    return datos.motivo.trim();
  }

  private noAnulado(registro: { anuladaEn?: string }) {
    if (registro.anuladaEn) {
      throw new ConflictException('Este movimiento ya está anulado');
    }
  }
}
