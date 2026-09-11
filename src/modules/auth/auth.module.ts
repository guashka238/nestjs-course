import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MailModule } from '@/modules/mail/mail.module';
import { UsersModule } from '@/modules/users/users.module';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { VerificationToken } from './entities/verification-token.entity';
import { RefreshTokensRepository } from './repositories/refresh-tokens.repository';
import { TokenService } from './token.service';
import { VerificationTokensRepository } from './repositories/verification-tokens.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([VerificationToken, RefreshToken]),
    JwtModule.register({}),
    // forwardRef: UsersModule needs RefreshTokensRepository (to revoke a
    // deleted user's sessions), and this module already needs UsersModule
    // (for UsersRepository) — a genuine two-way dependency.
    forwardRef(() => UsersModule),
    MailModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    VerificationTokensRepository,
    RefreshTokensRepository,
  ],
  exports: [RefreshTokensRepository],
})
export class AuthModule {}
