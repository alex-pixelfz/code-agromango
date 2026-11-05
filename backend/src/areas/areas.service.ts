import { BadRequestException, Injectable } from '@nestjs/common';

export interface Area {
  id: number;
  nombre: string;
  activa: boolean;
}

@Injectable()
export class AreasService {
  private readonly areas: Area[] = [];
  private siguienteId = 1;

  findAll(): Area[] {
    return this.areas;
  }

  create(datos: { nombre?: string; activa?: boolean }): Area {
    if (typeof datos.nombre !== 'string' || datos.nombre.trim() === '') {
      throw new BadRequestException('El nombre es obligatorio');
    }

    const area: Area = {
      id: this.siguienteId++,
      nombre: datos.nombre.trim(),
      activa: datos.activa ?? true,
    };

    this.areas.push(area);
    return area;
  }
}
