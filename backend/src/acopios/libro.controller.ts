import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import type { Response } from 'express';
import { AuthGuard } from '../auth/auth.guard.js';
import { LibroService } from './libro.service.js';

type RequestAutenticado = Request & { user: { sub: number } };

function leerId(valor: string | undefined, campo = 'El id'): number {
  if (!valor || !/^\d+$/.test(valor)) {
    throw new BadRequestException(
      `${campo} debe ser un número entero positivo válido`,
    );
  }
  const id = Number(valor);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new BadRequestException(
      `${campo} debe ser un número entero positivo válido`,
    );
  }
  return id;
}

@Controller()
@UseGuards(AuthGuard)
export class LibroController {
  constructor(private readonly libro: LibroService) {}

  @Get('entregas')
  entregas(
    @Req() request: RequestAutenticado,
    @Query('clienteId') clienteId?: string,
  ) {
    return this.libro.listarEntregas(
      request.user.sub,
      clienteId ? leerId(clienteId, 'El id del cliente') : undefined,
    );
  }

  @Post('entregas')
  crearEntrega(@Req() request: RequestAutenticado, @Body() datos: unknown) {
    return this.libro.crearEntrega(request.user.sub, datos);
  }

  @Post('entregas/:id/anular')
  anularEntrega(
    @Req() request: RequestAutenticado,
    @Param('id') id: string,
    @Body() datos: unknown,
  ) {
    return this.libro.anularEntrega(request.user.sub, leerId(id), datos);
  }

  @Get('abonos')
  abonos(
    @Req() request: RequestAutenticado,
    @Query('clienteId') clienteId?: string,
  ) {
    return this.libro.listarAbonos(
      request.user.sub,
      clienteId ? leerId(clienteId, 'El id del cliente') : undefined,
    );
  }

  @Post('abonos')
  crearAbono(@Req() request: RequestAutenticado, @Body() datos: unknown) {
    return this.libro.crearAbono(request.user.sub, datos);
  }

  @Post('abonos/:id/anular')
  anularAbono(
    @Req() request: RequestAutenticado,
    @Param('id') id: string,
    @Body() datos: unknown,
  ) {
    return this.libro.anularAbono(request.user.sub, leerId(id), datos);
  }

  @Get('devoluciones')
  devoluciones(
    @Req() request: RequestAutenticado,
    @Query('clienteId') clienteId?: string,
  ) {
    return this.libro.listarDevoluciones(
      request.user.sub,
      clienteId ? leerId(clienteId, 'El id del cliente') : undefined,
    );
  }

  @Post('devoluciones')
  crearDevolucion(
    @Req() request: RequestAutenticado,
    @Body() datos: unknown,
  ) {
    return this.libro.crearDevolucion(request.user.sub, datos);
  }

  @Post('devoluciones/:id/anular')
  anularDevolucion(
    @Req() request: RequestAutenticado,
    @Param('id') id: string,
    @Body() datos: unknown,
  ) {
    return this.libro.anularDevolucion(request.user.sub, leerId(id), datos);
  }

  @Get('clientes/:clienteId/cuenta')
  cuenta(
    @Req() request: RequestAutenticado,
    @Param('clienteId') clienteId: string,
  ) {
    return this.libro.cuenta(
      request.user.sub,
      leerId(clienteId, 'El id del cliente'),
    );
  }

  @Get('clientes/:clienteId/sugerencias')
  sugerencias(
    @Req() request: RequestAutenticado,
    @Param('clienteId') clienteId: string,
    @Res() response: Response,
  ) {
    response.json(
      this.libro.sugerencias(
        request.user.sub,
        leerId(clienteId, 'El id del cliente'),
      ),
    );
  }

  @Get('clientes/:clienteId/comprobante')
  comprobante(
    @Req() request: RequestAutenticado,
    @Param('clienteId') clienteId: string,
    @Query('entregaId') entregaId?: string,
  ) {
    return this.libro.comprobante(
      request.user.sub,
      leerId(clienteId, 'El id del cliente'),
      leerId(entregaId, 'El id de la entrega'),
    );
  }

  @Get('cuentas')
  cuentas(@Req() request: RequestAutenticado) {
    return this.libro.cuentas(request.user.sub);
  }
}
