import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';

import { Roles } from '@/common/decorators/roles.decorator';
import { JoiValidationPipe } from '@/common/pipes/joi-validation.pipe';
import { uuidParamSchema } from '@/common/validation/schemas/uuid-param.schema';
import { Role } from '@/modules/users/entities/user.entity';

import { assignPermissionSchema } from './dto/assign-permission.schema';
import type { AssignPermissionDto } from './dto/assign-permission.schema';
import { createPermissionSchema } from './dto/create-permission.schema';
import type { CreatePermissionDto } from './dto/create-permission.schema';
import { roleParamSchema } from './dto/role-param.schema';
import { PermissionsService } from './permissions.service';

// Managing permissions is restricted to admins — matches ARCHITECTURE.md's
// "admin-managed, dynamic roles" description of this feature.
@Roles(Role.ADMIN)
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(new JoiValidationPipe(createPermissionSchema))
    dto: CreatePermissionDto,
  ) {
    return this.permissionsService.createPermission(dto);
  }

  @Get()
  findAll() {
    return this.permissionsService.listPermissions();
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', new JoiValidationPipe(uuidParamSchema)) id: string) {
    return this.permissionsService.deletePermission(id);
  }

  @Get('roles/:role')
  findForRole(
    @Param('role', new JoiValidationPipe(roleParamSchema)) role: Role,
  ) {
    return this.permissionsService.getPermissionsForRole(role);
  }

  @Post('roles/:role/assign')
  @HttpCode(HttpStatus.OK)
  assign(
    @Param('role', new JoiValidationPipe(roleParamSchema)) role: Role,
    @Body(new JoiValidationPipe(assignPermissionSchema))
    dto: AssignPermissionDto,
  ) {
    return this.permissionsService.assignPermissionToRole(
      role,
      dto.permissionId,
    );
  }

  @Post('roles/:role/revoke')
  @HttpCode(HttpStatus.OK)
  revoke(
    @Param('role', new JoiValidationPipe(roleParamSchema)) role: Role,
    @Body(new JoiValidationPipe(assignPermissionSchema))
    dto: AssignPermissionDto,
  ) {
    return this.permissionsService.revokePermissionFromRole(
      role,
      dto.permissionId,
    );
  }
}
