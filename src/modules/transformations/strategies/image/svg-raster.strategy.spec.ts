import sharp from 'sharp';

import { ConfigService } from '@/core/config/config.service';
import { SourceFormat } from '@/modules/uploads/upload-format';

import { SvgRasterStrategy } from './svg-raster.strategy';

jest.mock('sharp');

class TestSvgRasterStrategy extends SvgRasterStrategy {
  readonly targetFormat = SourceFormat.PNG;

  protected encode(image: sharp.Sharp) {
    return image.png();
  }
}

describe('SvgRasterStrategy', () => {
  let strategy: TestSvgRasterStrategy;
  let configService: { get: jest.Mock };
  let sharpInstance: {
    flatten: jest.Mock;
    resize: jest.Mock;
    png: jest.Mock;
    toFile: jest.Mock;
  };

  beforeEach(() => {
    sharpInstance = {
      flatten: jest.fn().mockReturnThis(),
      resize: jest.fn().mockReturnThis(),
      png: jest.fn().mockReturnThis(),
      toFile: jest.fn().mockResolvedValue(undefined),
    };
    (sharp as unknown as jest.Mock).mockReturnValue(sharpInstance);

    configService = {
      get: jest.fn((key: string) =>
        key === 'MAX_RASTER_WIDTH' ? '2000' : '1000',
      ),
    };
    strategy = new TestSvgRasterStrategy(
      configService as unknown as ConfigService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('flattens onto the default background when none is provided', async () => {
    await strategy.transform('in.svg', 'out.png');

    expect(sharp).toHaveBeenCalledWith('in.svg');
    expect(sharpInstance.flatten).toHaveBeenCalledWith({
      background: '#ffffff',
    });
    expect(sharpInstance.toFile).toHaveBeenCalledWith('out.png');
  });

  it('flattens onto a custom background when provided', async () => {
    await strategy.transform('in.svg', 'out.png', { background: '#000000' });

    expect(sharpInstance.flatten).toHaveBeenCalledWith({
      background: '#000000',
    });
  });

  it('resizes to the exact requested dimensions when width/height are given', async () => {
    await strategy.transform('in.svg', 'out.png', { width: 300, height: 150 });

    expect(sharpInstance.resize).toHaveBeenCalledWith(300, 150, {
      fit: 'fill',
    });
  });

  it('caps to the configured max dimensions without enlarging when no size is given', async () => {
    await strategy.transform('in.svg', 'out.png');

    expect(sharpInstance.resize).toHaveBeenCalledWith(2000, 1000, {
      fit: 'inside',
      withoutEnlargement: true,
    });
  });

  it('delegates final encoding to the subclass and writes to outputPath', async () => {
    await strategy.transform('in.svg', 'out.png');

    expect(sharpInstance.png).toHaveBeenCalled();
    expect(sharpInstance.toFile).toHaveBeenCalledWith('out.png');
  });
});
