import { createHash } from 'crypto';

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { MailService } from '@/modules/mail/mail.service';
import { User, Role } from '@/modules/users/entities/user.entity';
import { UsersRepository } from '@/modules/users/repositories/users.repository';

import { AuthService } from './auth.service';
import { RefreshToken } from './entities/refresh-token.entity';
import {
  VerificationToken,
  VerificationTokenType,
} from './entities/verification-token.entity';
import { RefreshTokensRepository } from './repositories/refresh-tokens.repository';
import { TokenService } from './token.service';
import { VerificationTokensRepository } from './repositories/verification-tokens.repository';

jest.mock('bcrypt');
// @Transactional() requires a real registered DataSource, which pure unit
// tests (mocked repositories, no DB) never have. No-op it here so this test
// exercises business logic in isolation — real transactional behavior is an
// integration/e2e concern, verified against actual Postgres there instead.
jest.mock('typeorm-transactional', () => ({
  Transactional:
    () =>
    (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor) =>
      descriptor,
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: {
    findByEmail: jest.Mock;
    create: jest.Mock;
    findById: jest.Mock;
    save: jest.Mock;
  };
  let verificationTokensRepository: {
    create: jest.Mock;
    findByTokenHash: jest.Mock;
    save: jest.Mock;
  };
  let refreshTokensRepository: {
    create: jest.Mock;
    findByTokenHash: jest.Mock;
    save: jest.Mock;
    revokeAllActiveForUser: jest.Mock;
  };
  let mailService: {
    sendVerificationEmail: jest.Mock;
    sendPasswordResetEmail: jest.Mock;
  };
  let tokenService: {
    signAccessToken: jest.Mock;
    generateRefreshToken: jest.Mock;
    getAccessTokenTtlSeconds: jest.Mock;
    getRefreshTokenTtlSeconds: jest.Mock;
  };

  const existingUser: User = {
    id: 'user-1',
    email: 'user@example.com',
    passwordHash: 'hashed',
    role: Role.USER,
    isEmailVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    usersRepository = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
    };
    verificationTokensRepository = {
      create: jest.fn(),
      findByTokenHash: jest.fn(),
      save: jest.fn(),
    };
    refreshTokensRepository = {
      create: jest.fn(),
      findByTokenHash: jest.fn(),
      save: jest.fn(),
      revokeAllActiveForUser: jest.fn(),
    };
    mailService = {
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    };
    tokenService = {
      signAccessToken: jest.fn().mockResolvedValue('access-jwt'),
      generateRefreshToken: jest.fn().mockReturnValue({
        rawToken: 'raw-refresh-token',
        tokenHash: 'refresh-token-hash',
        expiresAt: new Date(Date.now() + 604800 * 1000),
      }),
      getAccessTokenTtlSeconds: jest.fn().mockReturnValue(900),
      getRefreshTokenTtlSeconds: jest.fn().mockReturnValue(604800),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersRepository, useValue: usersRepository },
        {
          provide: VerificationTokensRepository,
          useValue: verificationTokensRepository,
        },
        { provide: RefreshTokensRepository, useValue: refreshTokensRepository },
        { provide: MailService, useValue: mailService },
        { provide: TokenService, useValue: tokenService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('throws ConflictException when the email is already registered', async () => {
      usersRepository.findByEmail.mockResolvedValue(existingUser);

      await expect(
        service.register({ email: existingUser.email, password: 'Password1' }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(usersRepository.create).not.toHaveBeenCalled();
      expect(verificationTokensRepository.create).not.toHaveBeenCalled();
    });

    it('creates a user with a hashed password and a verification token', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);
      usersRepository.create.mockResolvedValue(existingUser);

      const result = await service.register({
        email: existingUser.email,
        password: 'Password1',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('Password1', expect.any(Number));
      expect(usersRepository.create).toHaveBeenCalledWith({
        email: existingUser.email,
        passwordHash: 'hashed-password',
      });
      expect(verificationTokensRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: existingUser.id,
          type: 'email_verification',
        }),
      );
      expect(mailService.sendVerificationEmail).toHaveBeenCalledWith(
        existingUser.email,
        expect.any(String) as string,
      );
      expect(result).toBe(existingUser);
    });
  });

  describe('verifyEmail', () => {
    const rawToken = 'a'.repeat(64);
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const validToken: VerificationToken = {
      id: 'token-1',
      userId: existingUser.id,
      tokenHash,
      type: VerificationTokenType.EMAIL_VERIFICATION,
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      createdAt: new Date(),
    };

    it('throws BadRequestException when no matching token exists', async () => {
      verificationTokensRepository.findByTokenHash.mockResolvedValue(null);

      await expect(
        service.verifyEmail({ token: rawToken }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws BadRequestException when the token is already used', async () => {
      verificationTokensRepository.findByTokenHash.mockResolvedValue({
        ...validToken,
        usedAt: new Date(),
      });

      await expect(
        service.verifyEmail({ token: rawToken }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(usersRepository.save).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the token is expired', async () => {
      verificationTokensRepository.findByTokenHash.mockResolvedValue({
        ...validToken,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        service.verifyEmail({ token: rawToken }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(usersRepository.save).not.toHaveBeenCalled();
    });

    it('marks the token used and the user verified', async () => {
      verificationTokensRepository.findByTokenHash.mockResolvedValue({
        ...validToken,
      });
      usersRepository.findById.mockResolvedValue({ ...existingUser });
      usersRepository.save.mockImplementation((user: User) =>
        Promise.resolve(user),
      );

      const result = await service.verifyEmail({ token: rawToken });

      expect(verificationTokensRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ usedAt: expect.any(Date) as Date }),
      );
      expect(usersRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ isEmailVerified: true }),
      );
      expect(result.isEmailVerified).toBe(true);
    });
  });

  describe('login', () => {
    const verifiedUser: User = { ...existingUser, isEmailVerified: true };

    it('throws UnauthorizedException when no user has that email', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: verifiedUser.email, password: 'Password1' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(refreshTokensRepository.create).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when the password does not match', async () => {
      usersRepository.findByEmail.mockResolvedValue(verifiedUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({
          email: verifiedUser.email,
          password: 'wrong-password',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(refreshTokensRepository.create).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when the email is not verified', async () => {
      usersRepository.findByEmail.mockResolvedValue({
        ...verifiedUser,
        isEmailVerified: false,
      });

      await expect(
        service.login({ email: verifiedUser.email, password: 'Password1' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(refreshTokensRepository.create).not.toHaveBeenCalled();
    });

    it('issues an access token and persists a hashed refresh token on success', async () => {
      usersRepository.findByEmail.mockResolvedValue(verifiedUser);

      const result = await service.login({
        email: verifiedUser.email,
        password: 'Password1',
      });

      expect(bcrypt.compare).toHaveBeenCalledWith(
        'Password1',
        verifiedUser.passwordHash,
      );
      expect(tokenService.signAccessToken).toHaveBeenCalledWith(verifiedUser);
      expect(refreshTokensRepository.create).toHaveBeenCalledWith({
        userId: verifiedUser.id,
        tokenHash: 'refresh-token-hash',
        expiresAt: expect.any(Date) as Date,
      });
      expect(result).toEqual({
        user: verifiedUser,
        accessToken: 'access-jwt',
        accessTokenTtlSeconds: 900,
        refreshToken: 'raw-refresh-token',
        refreshTokenTtlSeconds: 604800,
      });
    });
  });

  describe('refresh', () => {
    const verifiedUser: User = { ...existingUser, isEmailVerified: true };
    const rawToken = 'b'.repeat(64);
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const activeToken: RefreshToken = {
      id: 'refresh-1',
      userId: verifiedUser.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      createdAt: new Date(),
    };

    it('throws UnauthorizedException when no matching token exists', async () => {
      refreshTokensRepository.findByTokenHash.mockResolvedValue(null);

      await expect(service.refresh(rawToken)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(
        refreshTokensRepository.revokeAllActiveForUser,
      ).not.toHaveBeenCalled();
    });

    it('revokes all active tokens for the user and throws when a revoked token is reused', async () => {
      refreshTokensRepository.findByTokenHash.mockResolvedValue({
        ...activeToken,
        revokedAt: new Date(),
      });

      await expect(service.refresh(rawToken)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(
        refreshTokensRepository.revokeAllActiveForUser,
      ).toHaveBeenCalledWith(verifiedUser.id);
    });

    it('throws UnauthorizedException when the token is expired', async () => {
      refreshTokensRepository.findByTokenHash.mockResolvedValue({
        ...activeToken,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.refresh(rawToken)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rotates the token and issues a new session on success', async () => {
      refreshTokensRepository.findByTokenHash.mockResolvedValue({
        ...activeToken,
      });
      usersRepository.findById.mockResolvedValue(verifiedUser);

      const result = await service.refresh(rawToken);

      expect(refreshTokensRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ revokedAt: expect.any(Date) as Date }),
      );
      expect(tokenService.signAccessToken).toHaveBeenCalledWith(verifiedUser);
      expect(refreshTokensRepository.create).toHaveBeenCalledWith({
        userId: verifiedUser.id,
        tokenHash: 'refresh-token-hash',
        expiresAt: expect.any(Date) as Date,
      });
      expect(result.refreshToken).toBe('raw-refresh-token');
    });
  });

  describe('logout', () => {
    const rawToken = 'c'.repeat(64);
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const activeToken: RefreshToken = {
      id: 'refresh-1',
      userId: existingUser.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      createdAt: new Date(),
    };

    it('does nothing when no matching token exists', async () => {
      refreshTokensRepository.findByTokenHash.mockResolvedValue(null);

      await service.logout(rawToken);

      expect(refreshTokensRepository.save).not.toHaveBeenCalled();
    });

    it('does nothing when the token is already revoked', async () => {
      refreshTokensRepository.findByTokenHash.mockResolvedValue({
        ...activeToken,
        revokedAt: new Date(),
      });

      await service.logout(rawToken);

      expect(refreshTokensRepository.save).not.toHaveBeenCalled();
    });

    it('revokes the token when active', async () => {
      refreshTokensRepository.findByTokenHash.mockResolvedValue({
        ...activeToken,
      });

      await service.logout(rawToken);

      expect(refreshTokensRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ revokedAt: expect.any(Date) as Date }),
      );
    });
  });

  describe('forgotPassword', () => {
    it('does nothing (and does not leak whether the email exists) when no user has that email', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);

      await service.forgotPassword({ email: 'nobody@example.com' });

      expect(verificationTokensRepository.create).not.toHaveBeenCalled();
      expect(mailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('creates a password reset token and emails it when the user exists', async () => {
      usersRepository.findByEmail.mockResolvedValue(existingUser);

      await service.forgotPassword({ email: existingUser.email });

      expect(verificationTokensRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: existingUser.id,
          type: 'password_reset',
        }),
      );
      expect(mailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        existingUser.email,
        expect.any(String) as string,
      );
    });
  });

  describe('resetPassword', () => {
    const rawToken = 'd'.repeat(64);
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const validToken: VerificationToken = {
      id: 'reset-token-1',
      userId: existingUser.id,
      tokenHash,
      type: VerificationTokenType.PASSWORD_RESET,
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      createdAt: new Date(),
    };

    it('throws BadRequestException when no matching token exists', async () => {
      verificationTokensRepository.findByTokenHash.mockResolvedValue(null);

      await expect(
        service.resetPassword({ token: rawToken, newPassword: 'NewPassword1' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(usersRepository.save).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the token is already used', async () => {
      verificationTokensRepository.findByTokenHash.mockResolvedValue({
        ...validToken,
        usedAt: new Date(),
      });

      await expect(
        service.resetPassword({ token: rawToken, newPassword: 'NewPassword1' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(usersRepository.save).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the token is expired', async () => {
      verificationTokensRepository.findByTokenHash.mockResolvedValue({
        ...validToken,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        service.resetPassword({ token: rawToken, newPassword: 'NewPassword1' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(usersRepository.save).not.toHaveBeenCalled();
    });

    it('updates the password, marks the token used, and revokes all sessions on success', async () => {
      verificationTokensRepository.findByTokenHash.mockResolvedValue({
        ...validToken,
      });
      usersRepository.findById.mockResolvedValue({ ...existingUser });
      usersRepository.save.mockImplementation((user: User) =>
        Promise.resolve(user),
      );

      const result = await service.resetPassword({
        token: rawToken,
        newPassword: 'NewPassword1',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith(
        'NewPassword1',
        expect.any(Number),
      );
      expect(verificationTokensRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ usedAt: expect.any(Date) as Date }),
      );
      expect(usersRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ passwordHash: 'hashed-password' }),
      );
      expect(
        refreshTokensRepository.revokeAllActiveForUser,
      ).toHaveBeenCalledWith(existingUser.id);
      expect(result.passwordHash).toBe('hashed-password');
    });
  });
});
