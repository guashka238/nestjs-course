import { randomBytes, createHash } from 'crypto';

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Transactional } from 'typeorm-transactional';

import { MailService } from '@/modules/mail/mail.service';
import { UsersRepository } from '@/modules/users/repositories/users.repository';
import { User } from '@/modules/users/entities/user.entity';

import type { ForgotPasswordDto } from './dto/forgot-password.schema';
import { LoginDto } from './dto/login.schema';
import { RegisterDto } from './dto/register.schema';
import type { ResetPasswordDto } from './dto/reset-password.schema';
import type { VerifyEmailDto } from './dto/verify-email.schema';
import type { RefreshToken } from './entities/refresh-token.entity';
import { VerificationTokenType } from './entities/verification-token.entity';
import { RefreshTokensRepository } from './repositories/refresh-tokens.repository';
import { TokenService } from './token.service';
import { VerificationTokensRepository } from './repositories/verification-tokens.repository';

const PASSWORD_SALT_ROUNDS = 10;
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h — [confirm against spec]
const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h — [confirm against spec]

export interface LoginResult {
  user: User;
  accessToken: string;
  accessTokenTtlSeconds: number;
  refreshToken: string;
  refreshTokenTtlSeconds: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly verificationTokensRepository: VerificationTokensRepository,
    private readonly refreshTokensRepository: RefreshTokensRepository,
    private readonly mailService: MailService,
    private readonly tokenService: TokenService,
  ) {}

  async register(dto: RegisterDto): Promise<User> {
    const existingUser = await this.usersRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, PASSWORD_SALT_ROUNDS);
    const user = await this.usersRepository.create({
      email: dto.email,
      passwordHash,
    });

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    await this.verificationTokensRepository.create({
      userId: user.id,
      tokenHash,
      type: VerificationTokenType.EMAIL_VERIFICATION,
      expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
    });

    this.logger.log(`User registered: ${user.id}`);
    await this.mailService.sendVerificationEmail(user.email, rawToken);

    return user;
  }

  @Transactional()
  async verifyEmail(dto: VerifyEmailDto): Promise<User> {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const verificationToken =
      await this.verificationTokensRepository.findByTokenHash(
        tokenHash,
        VerificationTokenType.EMAIL_VERIFICATION,
      );

    if (
      !verificationToken ||
      verificationToken.usedAt !== null ||
      verificationToken.expiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('Verification token is invalid or expired');
    }

    const user = await this.usersRepository.findById(verificationToken.userId);
    if (!user) {
      throw new BadRequestException('Verification token is invalid or expired');
    }

    verificationToken.usedAt = new Date();
    await this.verificationTokensRepository.save(verificationToken);

    user.isEmailVerified = true;
    const verifiedUser = await this.usersRepository.save(user);

    this.logger.log(`Email verified: ${user.id}`);

    return verifiedUser;
  }

  async login(dto: LoginDto): Promise<LoginResult> {
    const user = await this.usersRepository.findByEmail(dto.email);
    const isPasswordValid =
      user !== null && (await bcrypt.compare(dto.password, user.passwordHash));

    if (!user || !isPasswordValid) {
      this.logger.warn(`Failed login attempt for ${dto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isEmailVerified) {
      throw new ForbiddenException('Email is not verified');
    }

    this.logger.log(`User logged in: ${user.id}`);

    return this.issueSession(user);
  }

  async refresh(rawToken: string): Promise<LoginResult> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const existingToken =
      await this.refreshTokensRepository.findByTokenHash(tokenHash);

    if (!existingToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (existingToken.revokedAt !== null) {
      // This token was already rotated out — reusing it is a signal the raw
      // value leaked. Revoke every active session for this user rather than
      // just this one token. This write must survive even though we throw
      // right after, so it deliberately runs outside rotateSession's
      // transaction — @Transactional() rolls back on a thrown error, which
      // would otherwise undo the very revocation this branch exists to do.
      this.logger.warn(
        `Reused refresh token detected for user: ${existingToken.userId}`,
      );
      await this.refreshTokensRepository.revokeAllActiveForUser(
        existingToken.userId,
      );
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (existingToken.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersRepository.findById(existingToken.userId);
    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.rotateSession(existingToken, user);
  }

  @Transactional()
  private async rotateSession(
    existingToken: RefreshToken,
    user: User,
  ): Promise<LoginResult> {
    existingToken.revokedAt = new Date();
    await this.refreshTokensRepository.save(existingToken);

    this.logger.log(`Refresh token rotated for user: ${user.id}`);

    return this.issueSession(user);
  }

  async logout(rawToken: string): Promise<void> {
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');
    const existingToken =
      await this.refreshTokensRepository.findByTokenHash(tokenHash);

    // Idempotent: a missing or already-revoked token still means "no active
    // session", which is the end state logout is trying to reach anyway.
    if (!existingToken || existingToken.revokedAt !== null) {
      return;
    }

    existingToken.revokedAt = new Date();
    await this.refreshTokensRepository.save(existingToken);

    this.logger.log(`User logged out: ${existingToken.userId}`);
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.usersRepository.findByEmail(dto.email);

    // Always behave the same regardless of whether the account exists, so
    // this endpoint can't be used to enumerate registered emails.
    if (!user) {
      this.logger.warn(
        `Password reset requested for unknown email: ${dto.email}`,
      );
      return;
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    await this.verificationTokensRepository.create({
      userId: user.id,
      tokenHash,
      type: VerificationTokenType.PASSWORD_RESET,
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
    });

    this.logger.log(`Password reset requested: ${user.id}`);
    await this.mailService.sendPasswordResetEmail(user.email, rawToken);
  }

  @Transactional()
  async resetPassword(dto: ResetPasswordDto): Promise<User> {
    const tokenHash = createHash('sha256').update(dto.token).digest('hex');
    const resetToken = await this.verificationTokensRepository.findByTokenHash(
      tokenHash,
      VerificationTokenType.PASSWORD_RESET,
    );

    if (
      !resetToken ||
      resetToken.usedAt !== null ||
      resetToken.expiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException(
        'Password reset token is invalid or expired',
      );
    }

    const user = await this.usersRepository.findById(resetToken.userId);
    if (!user) {
      throw new BadRequestException(
        'Password reset token is invalid or expired',
      );
    }

    resetToken.usedAt = new Date();
    await this.verificationTokensRepository.save(resetToken);

    user.passwordHash = await bcrypt.hash(
      dto.newPassword,
      PASSWORD_SALT_ROUNDS,
    );
    const updatedUser = await this.usersRepository.save(user);

    // A password reset is a strong signal to end every other session too.
    await this.refreshTokensRepository.revokeAllActiveForUser(user.id);

    this.logger.log(`Password reset: ${user.id}`);

    return updatedUser;
  }

  async getProfile(userId: string): Promise<User> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async issueSession(user: User): Promise<LoginResult> {
    const accessToken = await this.tokenService.signAccessToken(user);
    const { rawToken, tokenHash, expiresAt } =
      this.tokenService.generateRefreshToken();

    await this.refreshTokensRepository.create({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    return {
      user,
      accessToken,
      accessTokenTtlSeconds: this.tokenService.getAccessTokenTtlSeconds(),
      refreshToken: rawToken,
      refreshTokenTtlSeconds: this.tokenService.getRefreshTokenTtlSeconds(),
    };
  }
}
