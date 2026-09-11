import { User } from './entities/user.entity';

export interface UserResponse {
  id: string;
  email: string;
  role: User['role'];
  isEmailVerified: boolean;
  createdAt: Date;
}

export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt,
  };
}
