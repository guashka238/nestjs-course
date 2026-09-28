import sharp from 'sharp';

import { ConfigService } from '@/core/config/config.service';

import { SvgToJpegStrategy } from './svg-to-jpeg.strategy';

jest.mock('sharp');

describe('SvgToJpegStrategy', () => {
  let sharpInstance: {
    flatten: jest.Mock;
    resize: jest.Mock;
    jpeg: jest.Mock;
    toFile: jest.Mock;
  };
  let strategy: SvgToJpegStrategy;

  beforeEach(() => {
    sharpInstance = {
      flatten: jest.fn().mockReturnThis(),
      resize: jest.fn().mockReturnThis(),
      jpeg: jest.fn().mockReturnThis(),
      toFile: jest.fn().mockResolvedValue(undefined),
    };
    (sharp as unknown as jest.Mock).mockReturnValue(sharpInstance);
    const configService = { get: jest.fn().mockReturnValue('1000') };
    strategy = new SvgToJpegStrategy(configService as unknown as ConfigService);
  });

  it('encodes to JPEG with the default quality when none is given', async () => {
    await strategy.transform('in.svg', 'out.jpeg');

    expect(sharpInstance.jpeg).toHaveBeenCalledWith({ quality: 90 });
    expect(sharpInstance.toFile).toHaveBeenCalledWith('out.jpeg');
  });

  it('uses the requested quality when provided', async () => {
    await strategy.transform('in.svg', 'out.jpeg', { quality: 50 });

    expect(sharpInstance.jpeg).toHaveBeenCalledWith({ quality: 50 });
  });
});
