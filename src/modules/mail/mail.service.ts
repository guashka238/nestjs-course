import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';

import { ConfigService } from '@/core/config/config.service';

@Injectable()
export class MailService implements OnModuleDestroy {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const smtpUrl = this.configService.get('SMTP_URL');

    this.transporter = nodemailer.createTransport(smtpUrl);
    this.from = MailService.buildFromAddress(
      this.configService.get('MAIL_FROM'),
      smtpUrl,
    );
  }

  // MAIL_FROM is only a display name; combine it with the authenticated SMTP
  // account's address so the envelope sender isn't empty (hurts deliverability
  // — SPF/DMARC checks and spam filters expect a real return-path address).
  private static buildFromAddress(
    displayName: string,
    smtpUrl: string,
  ): string {
    const username = decodeURIComponent(new URL(smtpUrl).username);

    return username.includes('@')
      ? `"${displayName}" <${username}>`
      : displayName;
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: 'Verify your email',
      text: `Your email verification token is: ${token}\n\nSubmit it to POST /auth/verify-email to confirm your account.`,
    });

    this.logger.log(`Verification email sent to ${to}`);
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: 'Reset your password',
      text: `Your password reset token is: ${token}\n\nSubmit it to POST /auth/reset-password along with a new password to reset your account. If you didn't request this, you can safely ignore this email.`,
    });

    this.logger.log(`Password reset email sent to ${to}`);
  }

  onModuleDestroy(): void {
    this.transporter.close();
  }
}
