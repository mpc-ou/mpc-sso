import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { ClientsController } from './clients/clients.controller';
import { ClientsService } from './clients/clients.service';
import { ClubRolesController } from './club-roles/club-roles.controller';
import { ClubRolesService } from './club-roles/club-roles.service';
import { DepartmentsController } from './departments/departments.controller';
import { DepartmentsService } from './departments/departments.service';
import { AdminSessionController } from './session/admin-session.controller';
import { AdminSessionService } from './session/admin-session.service';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';

@Module({
  imports: [CloudinaryModule],
  controllers: [
    UsersController,
    DepartmentsController,
    ClubRolesController,
    ClientsController,
    AdminSessionController,
  ],
  providers: [
    UsersService,
    DepartmentsService,
    ClubRolesService,
    ClientsService,
    AdminSessionService,
  ],
})
export class AdminModule {}
