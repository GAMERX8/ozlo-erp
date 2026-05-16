import { Controller, Get, Param } from '@nestjs/common';
import { UbigeoService } from './ubigeo.service';

@Controller('ubigeo')
export class UbigeoController {
  constructor(private readonly ubigeoService: UbigeoService) {}

  @Get('departments')
  async getDepartments() {
    return this.ubigeoService.getDepartments();
  }

  @Get('provinces/:departmentId')
  async getProvinces(@Param('departmentId') departmentId: string) {
    return this.ubigeoService.getProvinces(departmentId);
  }

  @Get('districts/:provinceId')
  async getDistricts(@Param('provinceId') provinceId: string) {
    return this.ubigeoService.getDistricts(provinceId);
  }
}
