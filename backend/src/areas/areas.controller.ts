import { Body, Controller, Get, Post } from '@nestjs/common';
import type { Area } from './areas.service.js';
import { AreasService } from './areas.service.js';

@Controller('areas')
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
