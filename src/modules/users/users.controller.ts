import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
} from '@nestjs/common';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RequirePermissions } from '@/common/decorators/require-permissions.decorator';
import type { AuthenticatedUser } from '@/common/types/authenticated-user';
import { JoiValidationPipe } from '@/common/pipes/joi-validation.pipe';
import { uuidParamSchema } from '@/common/validation/schemas/uuid-param.schema';

import { queryUsersSchema } from './dto/query-users.schema';
import type { QueryUsersDto } from './dto/query-users.schema';
import { updateUserSchema } from './dto/update-user.schema';
import type { UpdateUserDto } from './dto/update-user.schema';
import { toUserResponse } from './user-response.mapper';
import { UsersService } from './users.service';

// No @Roles() here on purpose: access is governed entirely by the dynamic
// users:* permissions (seeded for admin, but assignable to any role via the
// /permissions API without a redeploy).
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @RequirePermissions('users:list')
  @Get()
  async findAll(
    @Query(new JoiValidationPipe(queryUsersSchema)) query: QueryUsersDto,
  ) {
    const result = await this.usersService.listUsers(query);
    return { ...result, items: result.items.map(toUserResponse) };
  }

  // Declared before ':id' so it isn't matched as a uuid param, and has no
  // permission requirement since any authenticated user may read their own profile.
  @Get('me')
  async me(@CurrentUser() currentUser: AuthenticatedUser) {
    const user = await this.usersService.getUser(currentUser.id);
    return toUserResponse(user);
  }

  @RequirePermissions('users:read')
  @Get(':id')
  async findOne(
    @Param('id', new JoiValidationPipe(uuidParamSchema)) id: string,
  ) {
    const user = await this.usersService.getUser(id);
    return toUserResponse(user);
  }

  @RequirePermissions('users:update')
  @Patch(':id')
  async update(
    @Param('id', new JoiValidationPipe(uuidParamSchema)) id: string,
    @Body(new JoiValidationPipe(updateUserSchema)) dto: UpdateUserDto,
  ) {
    const user = await this.usersService.updateUser(id, dto);
    return toUserResponse(user);
  }

  @RequirePermissions('users:delete')
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', new JoiValidationPipe(uuidParamSchema)) id: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    await this.usersService.deleteUser(id, currentUser.id);
  }
}
