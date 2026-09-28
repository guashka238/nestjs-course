import sharp from 'sharp';

import { PngToJpegStrategy } from './png-to-jpeg.strategy';

jest.mock('sharp');

describe('PngToJpegStrategy', () => {
  let sharpInstance: {
    flatten: jest.Mock;
    jpeg: jest.Mock;
    toFile: jest.Mock;
  };
  let strategy: PngToJpegStrategy;

  beforeEach(() => {
    sharpInstance = {
      flatten: jest.fn().mockReturnThis(),
      jpeg: jest.fn().mockReturnThis(),
      toFile: jest.fn().mockResolvedValue(undefined),
    };
    (sharp as unknown as jest.Mock).mockReturnValue(sharpInstance);
    strategy = new PngToJpegStrategy();
  });

  it('flattens transparency onto the default background and encodes at the default quality', async () => {
    await strategy.transform('in.png', 'out.jpeg');

    expect(sharp).toHaveBeenCalledWith('in.png');
    expect(sharpInstance.flatten).toHaveBeenCalledWith({
      background: '#ffffff',
    });
    expect(sharpInstance.jpeg).toHaveBeenCalledWith({ quality: 90 });
    expect(sharpInstance.toFile).toHaveBeenCalledWith('out.jpeg');
  });

  it('uses the requested background and quality when provided', async () => {
    await strategy.transform('in.png', 'out.jpeg', {
      background: '#000000',
      quality: 60,
    });

    expect(sharpInstance.flatten).toHaveBeenCalledWith({
      background: '#000000',
    });
    expect(sharpInstance.jpeg).toHaveBeenCalledWith({ quality: 60 });
  });
});
