import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import type { Area } from './areas.service.js';
import { AreasService } from './areas.service.js';

@Controller('areas')
@UseGuards(AuthGuard)
export class AreasController {
  constructor(private readonly areasService: AreasService) {}

  @Get()
  findAll(): Area[] {
    return this.areasService.findAll();
  }

  @Post()
  create(@Body() datos: { nombre?: string; activa?: boolean }): Area {
    return this.areasService.create(datos);
  }
}
