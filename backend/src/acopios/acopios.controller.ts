import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard.js';
import { AcopiosService } from './acopios.service.js';
import type { EstadoMovimientos } from './acopios.service.js';
import type {
  AbonoAlmacenado,
  DevolucionAlmacenada,
  RecogidaAlmacenada,
} from '../storage/storage.service.js';

type RequestAutenticado = Request & { user: { sub: number } };

function leerId(valor: string, campo: string): number {
  if (!/^\d+$/.test(valor)) {
    throw new BadRequestException(`${campo} debe ser un número entero positivo`);
  }
  const id = Number(valor);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new BadRequestException(`${campo} debe ser un número entero positivo`);
  }
  return id;
}

@Controller('clientes/:clienteId/movimientos')
@UseGuards(AuthGuard)
export class AcopiosController {
  constructor(private readonly acopiosService: AcopiosService) {}

  @Get()
  findForClient(
    @Req() request: RequestAutenticado,
    @Param('clienteId') clienteId: string,
  ): EstadoMovimientos {
    return this.acopiosService.findForClient(
      request.user.sub,
      leerId(clienteId, 'El id del cliente'),
    );
  }

  @Post('recogidas')
  createRecogida(
    @Req() request: RequestAutenticado,
    @Param('clienteId') clienteId: string,
    @Body() datos: unknown,
  ): Promise<RecogidaAlmacenada> {
    return this.acopiosService.createRecogida(
      request.user.sub,
      leerId(clienteId, 'El id del cliente'),
      datos,
    );
  }

  @Post('recogidas/:recogidaId/abonos')
  createAbono(
    @Req() request: RequestAutenticado,
    @Param('clienteId') clienteId: string,
    @Param('recogidaId') recogidaId: string,
    @Body() datos: unknown,
  ): Promise<AbonoAlmacenado> {
    return this.acopiosService.createAbono(
      request.user.sub,
      leerId(clienteId, 'El id del cliente'),
      leerId(recogidaId, 'El id de la recogida'),
      datos,
    );
  }

  @Post('recogidas/:recogidaId/devoluciones')
  createDevolucion(
    @Req() request: RequestAutenticado,
    @Param('clienteId') clienteId: string,
    @Param('recogidaId') recogidaId: string,
    @Body() datos: unknown,
  ): Promise<DevolucionAlmacenada> {
    return this.acopiosService.createDevolucion(
      request.user.sub,
      leerId(clienteId, 'El id del cliente'),
      leerId(recogidaId, 'El id de la recogida'),
      datos,
    );
  }
}
