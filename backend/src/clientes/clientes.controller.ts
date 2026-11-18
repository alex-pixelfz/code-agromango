import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard.js';
import type { Cliente } from './clientes.service.js';
import { ClientesService } from './clientes.service.js';

type RequestAutenticado = Request & { user: { sub: number } };

function leerId(valor: string): number {
  if (!/^\d+$/.test(valor)) {
    throw new BadRequestException('El id debe ser un número entero positivo válido');
  }
  const id = Number(valor);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new BadRequestException('El id debe ser un número entero positivo válido');
  }
  return id;
}

@Controller('clientes')
@UseGuards(AuthGuard)
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Get()
  findAll(
    @Req() request: RequestAutenticado,
    @Query('buscar') buscar?: string,
    @Query('incluirInactivos') incluirInactivos?: string,
  ): Cliente[] {
    return this.clientesService.findAll(
      request.user.sub,
      buscar,
      incluirInactivos,
    );
  }

  @Get(':id')
  findOne(
    @Req() request: RequestAutenticado,
    @Param('id') id: string,
  ): Cliente {
    return this.clientesService.findOne(request.user.sub, leerId(id));
  }

  @Post()
  create(
    @Req() request: RequestAutenticado,
    @Body() datos: unknown,
  ): Cliente {
    return this.clientesService.create(request.user.sub, datos);
  }

  @Patch(':id')
  update(
    @Req() request: RequestAutenticado,
    @Param('id') id: string,
    @Body() datos: unknown,
  ): Cliente {
    return this.clientesService.update(request.user.sub, leerId(id), datos);
  }
}
