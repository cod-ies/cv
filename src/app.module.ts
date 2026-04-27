import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { DatabaseModule } from './database/database.module';
import { EmployeesModule } from './employees/employees.module';
import { JobsModule } from './jobs/jobs.module';
import { ApiModule } from './api/api.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      validationOptions: { allowUnknown: true },
    }),
    DatabaseModule,
    EmployeesModule,
    JobsModule,
    ApiModule,
  ],
})
export class AppModule {}
