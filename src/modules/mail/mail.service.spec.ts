import { Test, TestingModule } from '@nestjs/testing';
import nodemailer from 'nodemailer';

import { ConfigService } from '@/core/config/config.service';

import { MailService } from './mail.service';

jest.mock('nodemailer');

describe('MailService', () => {
  let service: MailService;
  let sendMail: jest.Mock;
  let close: jest.Mock;
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    sendMail = jest.fn().mockResolvedValue(undefined);
    close = jest.fn();
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail,
      close,
    });

    configService = {
      get: jest.fn((key: string) =>
        key === 'SMTP_URL'
          ? 'smtp://user:pass@smtp.example.com:587'
          : 'App Name',
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates a transport from SMTP_URL on construction', () => {
    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      'smtp://user:pass@smtp.example.com:587',
    );
  });

  describe('sendVerificationEmail', () => {
    it('sends an email containing the token to the given address', async () => {
      await service.sendVerificationEmail('user@example.com', 'raw-token');

      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'App Name',
          to: 'user@example.com',
          subject: expect.any(String) as string,
          text: expect.stringContaining('raw-token') as string,
        }),
      );
    });

    it('combines the display name with the SMTP account address when the username is an email', async () => {
      configService.get.mockImplementation((key: string) =>
        key === 'SMTP_URL'
          ? 'smtp://user%40gmail.com:pass@smtp.example.com:587'
          : 'App Name',
      );
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MailService,
          { provide: ConfigService, useValue: configService },
        ],
      }).compile();
      const emailService = module.get<MailService>(MailService);

      await emailService.sendVerificationEmail('user@example.com', 'raw-token');

      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ from: '"App Name" <user@gmail.com>' }),
      );
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('sends an email containing the token to the given address', async () => {
      await service.sendPasswordResetEmail('user@example.com', 'raw-token');

      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'App Name',
          to: 'user@example.com',
          subject: expect.any(String) as string,
          text: expect.stringContaining('raw-token') as string,
        }),
      );
    });
  });

  describe('onModuleDestroy', () => {
    it('closes the transporter', () => {
      service.onModuleDestroy();

      expect(close).toHaveBeenCalled();
    });
  });
});
