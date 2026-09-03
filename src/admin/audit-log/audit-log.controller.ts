import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../common/guards/admin.guard';
import { AuditLogService } from './audit-log.service';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

@Controller('admin/audit-log')
@UseGuards(AdminGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  list(@Query() query: AuditLogQueryDto) {
    return this.auditLogService.list(query);
  }
}
