import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UsePipes,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import type { AuthenticatedUser } from '@/common/types/authenticated-user';
import { ConfigService } from '@/core/config/config.service';
import { toUserResponse } from '@/modules/users/user-response.mapper';

import { AuthService, LoginResult } from './auth.service';
import { forgotPasswordSchema } from './dto/forgot-password.schema';
import type { ForgotPasswordDto } from './dto/forgot-password.schema';
import { loginSchema } from './dto/login.schema';
import type { LoginDto } from './dto/login.schema';
import { registerSchema } from './dto/register.schema';
import type { RegisterDto } from './dto/register.schema';
import { resetPasswordSchema } from './dto/reset-password.schema';
import type { ResetPasswordDto } from './dto/reset-password.schema';
import { verifyEmailSchema } from './dto/verify-email.schema';
import type { VerifyEmailDto } from './dto/verify-email.schema';
import { JoiValidationPipe } from '@/common/pipes/joi-validation.pipe';

const COOKIE_PATH = '/';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UsePipes(new JoiValidationPipe(registerSchema))
  async register(@Body() dto: RegisterDto) {
    console.log(dto);
    const user = await this.authService.register(dto);

    return toUserResponse(user);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UsePipes(new JoiValidationPipe(verifyEmailSchema))
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    const user = await this.authService.verifyEmail(dto);

    return toUserResponse(user);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UsePipes(new JoiValidationPipe(loginSchema))
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.authService.login(dto);

    this.setAuthCookies(reply, result);

    return toUserResponse(result.user);
  }

  @Get('me')
  async me(@CurrentUser() currentUser: AuthenticatedUser) {
    const user = await this.authService.getProfile(currentUser.id);

    return toUserResponse(user);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async refresh(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const refreshToken = request.cookies?.refresh_token;
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }

    const result = await this.authService.refresh(refreshToken);

    this.setAuthCookies(reply, result);

    return toUserResponse(result.user);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async logout(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const refreshToken = request.cookies?.refresh_token;
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    this.clearAuthCookies(reply);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UsePipes(new JoiValidationPipe(forgotPasswordSchema))
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto);

    return {
      message:
        'If an account exists for that email, a password reset link has been sent.',
    };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UsePipes(new JoiValidationPipe(resetPasswordSchema))
  async resetPassword(@Body() dto: ResetPasswordDto) {
    const user = await this.authService.resetPassword(dto);

    return toUserResponse(user);
  }

  private setAuthCookies(reply: FastifyReply, result: LoginResult): void {
    const secure = this.configService.get('NODE_ENV') === 'production';

    reply.setCookie('access_token', result.accessToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: COOKIE_PATH,
      maxAge: result.accessTokenTtlSeconds,
    });
    reply.setCookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: COOKIE_PATH,
      maxAge: result.refreshTokenTtlSeconds,
    });
  }

  private clearAuthCookies(reply: FastifyReply): void {
    reply.clearCookie('access_token', { path: COOKIE_PATH });
    reply.clearCookie('refresh_token', { path: COOKIE_PATH });
  }
}
