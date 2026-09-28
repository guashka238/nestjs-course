import sharp from 'sharp';

import { JpegToPngStrategy } from './jpeg-to-png.strategy';

jest.mock('sharp');

describe('JpegToPngStrategy', () => {
  it('encodes to PNG', async () => {
    const sharpInstance = {
      png: jest.fn().mockReturnThis(),
      toFile: jest.fn().mockResolvedValue(undefined),
    };
    (sharp as unknown as jest.Mock).mockReturnValue(sharpInstance);

    const strategy = new JpegToPngStrategy();
    await strategy.transform('in.jpeg', 'out.png');

    expect(sharp).toHaveBeenCalledWith('in.jpeg');
    expect(sharpInstance.png).toHaveBeenCalled();
    expect(sharpInstance.toFile).toHaveBeenCalledWith('out.png');
  });
});
