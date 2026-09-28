import sharp from 'sharp';

import { ConfigService } from '@/core/config/config.service';

import { SvgToPngStrategy } from './svg-to-png.strategy';

jest.mock('sharp');

describe('SvgToPngStrategy', () => {
  it('encodes to PNG', async () => {
    const sharpInstance = {
      flatten: jest.fn().mockReturnThis(),
      resize: jest.fn().mockReturnThis(),
      png: jest.fn().mockReturnThis(),
      toFile: jest.fn().mockResolvedValue(undefined),
    };
    (sharp as unknown as jest.Mock).mockReturnValue(sharpInstance);
    const configService = { get: jest.fn().mockReturnValue('1000') };

    const strategy = new SvgToPngStrategy(
      configService as unknown as ConfigService,
    );
    await strategy.transform('in.svg', 'out.png');

    expect(sharpInstance.png).toHaveBeenCalled();
    expect(sharpInstance.toFile).toHaveBeenCalledWith('out.png');
  });
});
