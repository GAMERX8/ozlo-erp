import { Injectable } from '@nestjs/common';
import {
  DEPARTMENTS,
  PROVINCES,
  DISTRICTS,
  DEPARTMENT_MAP,
  PROVINCE_MAP,
  DISTRICT_MAP,
} from './ubigeo-data';

@Injectable()
export class UbigeoService {
  async getDepartments() {
    return DEPARTMENTS;
  }

  async getProvinces(departmentId: string) {
    return PROVINCES.filter((p) => p.department_id === departmentId);
  }

  async getDistricts(provinceId: string) {
    return DISTRICTS.filter((d) => d.province_id === provinceId);
  }

  /** Resolve full location name from a district id: "District, Province, Department" */
  resolveLocation(districtId: string | null | undefined): string | null {
    if (!districtId) return null;
    const district = DISTRICT_MAP.get(districtId);
    if (!district) return null;
    const province = PROVINCE_MAP.get(district.province_id);
    const department = province ? DEPARTMENT_MAP.get(province.department_id) : null;
    const parts = [district.name, province?.name, department?.name].filter(Boolean);
    return parts.join(', ');
  }

  /** Resolve structured location from a district id */
  resolveLocationFull(districtId: string | null | undefined) {
    if (!districtId) return null;
    const district = DISTRICT_MAP.get(districtId);
    if (!district) return null;
    const province = PROVINCE_MAP.get(district.province_id);
    const department = province ? DEPARTMENT_MAP.get(province.department_id) : null;
    return {
      district: { id: district.id, name: district.name },
      province: province ? { id: province.id, name: province.name } : null,
      department: department ? { id: department.id, name: department.name } : null,
    };
  }
}