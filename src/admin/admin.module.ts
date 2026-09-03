import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { EventsModule } from '../events/events.module';
import { AuditLogController } from './audit-log/audit-log.controller';
import { AuditLogService } from './audit-log/audit-log.service';
import { ClientsController } from './clients/clients.controller';
import { ClientsService } from './clients/clients.service';
import { ClubRolesController } from './club-roles/club-roles.controller';
import { ClubRolesService } from './club-roles/club-roles.service';
import { DashboardController } from './dashboard/dashboard.controller';
import { DashboardService } from './dashboard/dashboard.service';
import { DepartmentsController } from './departments/departments.controller';
import { DepartmentsService } from './departments/departments.service';
import { AdminSessionController } from './session/admin-session.controller';
import { AdminSessionService } from './session/admin-session.service';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';
import { WebhooksController } from './webhooks/webhooks.controller';
import { WebhooksService } from './webhooks/webhooks.service';

@Module({
  imports: [CloudinaryModule, EventsModule],
  controllers: [
    UsersController,
    DepartmentsController,
    ClubRolesController,
    ClientsController,
    AdminSessionController,
    WebhooksController,
    AuditLogController,
    DashboardController,
  ],
  providers: [
    UsersService,
    DepartmentsService,
    ClubRolesService,
    ClientsService,
    AdminSessionService,
    WebhooksService,
    AuditLogService,
    DashboardService,
  ],
})
export class AdminModule {}
