import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

export interface Cliente {
  id: number;
  usuarioId: number;
  nombre: string;
  telefono?: string;
  vereda?: string;
  activo: boolean;
  creadoEn: string;
}

type DatosCliente = Record<string, unknown>;

function tieneCampo(datos: DatosCliente, campo: string): boolean {
  return Object.prototype.hasOwnProperty.call(datos, campo);
}

function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es');
}

@Injectable()
export class ClientesService {
  private readonly clientes: Cliente[] = [];
  private siguienteId = 1;

  findAll(
    usuarioId: number,
    buscar?: string,
    incluirInactivos?: string,
  ): Cliente[] {
    const termino = buscar?.trim() ? normalizarTexto(buscar.trim()) : undefined;
    const mostrarInactivos = incluirInactivos?.toLowerCase() === 'true';

    return this.clientes.filter((cliente) => {
      if (cliente.usuarioId !== usuarioId) {
        return false;
      }
      if (!mostrarInactivos && !cliente.activo) {
        return false;
      }
      return !termino || normalizarTexto(cliente.nombre).includes(termino);
    });
  }

  findOne(usuarioId: number, id: number): Cliente {
    const cliente = this.clientes.find(
      (item) => item.id === id && item.usuarioId === usuarioId,
    );
    if (!cliente) {
      throw new NotFoundException('Cliente no encontrado');
    }
    return cliente;
  }

  create(usuarioId: number, entrada: unknown): Cliente {
    const datos = this.validarObjeto(entrada);
    const nombre = this.validarNombre(datos.nombre);
    const activo = tieneCampo(datos, 'activo') ? this.validarActivo(datos.activo) : true;
    const telefono = tieneCampo(datos, 'telefono')
      ? this.validarTelefono(datos.telefono)
      : undefined;
    const vereda = tieneCampo(datos, 'vereda')
      ? this.validarVereda(datos.vereda)
      : undefined;
    const cliente: Cliente = {
      id: this.siguienteId,
      usuarioId,
      nombre,
      activo,
      creadoEn: new Date().toISOString(),
    };

    if (telefono !== undefined) cliente.telefono = telefono;
    if (vereda !== undefined) cliente.vereda = vereda;
    this.clientes.push(cliente);
    this.siguienteId++;
    return cliente;
  }

  update(usuarioId: number, id: number, entrada: unknown): Cliente {
    const cliente = this.findOne(usuarioId, id);
    const datos = this.validarObjeto(entrada);
    const cambios: Partial<Pick<Cliente, 'nombre' | 'telefono' | 'vereda' | 'activo'>> = {};

    if (tieneCampo(datos, 'nombre')) {
      cambios.nombre = this.validarNombre(datos.nombre);
    }
    if (tieneCampo(datos, 'telefono')) {
      cambios.telefono = this.validarTelefono(datos.telefono);
    }
    if (tieneCampo(datos, 'vereda')) {
      cambios.vereda = this.validarVereda(datos.vereda);
    }
    if (tieneCampo(datos, 'activo')) {
      cambios.activo = this.validarActivo(datos.activo);
    }

    Object.assign(cliente, cambios);
    return cliente;
  }

  private validarObjeto(entrada: unknown): DatosCliente {
    if (
      typeof entrada !== 'object' ||
      entrada === null ||
      Array.isArray(entrada)
    ) {
      throw new BadRequestException('El cuerpo debe ser un objeto JSON');
    }
    return entrada as DatosCliente;
  }

  private validarNombre(valor: unknown): string {
    if (typeof valor !== 'string' || valor.trim() === '') {
      throw new BadRequestException('El nombre es obligatorio');
    }
    const nombre = valor.trim();
    if (nombre.length < 2 || nombre.length > 80) {
      throw new BadRequestException('El nombre debe tener entre 2 y 80 caracteres');
    }
    return nombre;
  }

  private validarTelefono(valor: unknown): string {
    if (typeof valor !== 'string') {
      throw new BadRequestException(
        'El teléfono debe ser un celular colombiano de 10 dígitos que empiece por 3',
      );
    }
    const telefono = valor.replace(/[ -]/g, '');
    if (!/^3\d{9}$/.test(telefono)) {
      throw new BadRequestException(
        'El teléfono debe ser un celular colombiano de 10 dígitos que empiece por 3',
      );
    }
    return telefono;
  }

  private validarVereda(valor: unknown): string {
    if (typeof valor !== 'string') {
      throw new BadRequestException('La vereda debe ser un texto de máximo 60 caracteres');
    }
    const vereda = valor.trim();
    if (vereda.length > 60) {
      throw new BadRequestException('La vereda no puede superar los 60 caracteres');
    }
    return vereda;
  }

  private validarActivo(valor: unknown): boolean {
    if (typeof valor !== 'boolean') {
      throw new BadRequestException('El campo activo debe ser verdadero o falso');
    }
    return valor;
  }
}
