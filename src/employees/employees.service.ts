import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Employee } from '@prisma/client';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Employee[]> {
    return this.prisma.employee.findMany({ orderBy: { nachname: 'asc' } });
  }

  async findOne(id: string): Promise<Employee> {
    const emp = await this.prisma.employee.findUnique({ where: { id } });
    if (!emp) throw new NotFoundException(`Employee ${id} not found`);
    return emp;
  }
}
