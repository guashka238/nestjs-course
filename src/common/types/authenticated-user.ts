import { Role } from '@/modules/users/entities/user.entity';

export interface AuthenticatedUser {
  id: string;
  role: Role;
}
