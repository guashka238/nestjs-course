import { NotImplementedException } from '@nestjs/common';

import { SourceFormat } from '@/modules/uploads/upload-format';

import { TransformationStrategy } from './transformation-strategy';
import { TransformationStrategyRegistry } from './transformation-strategy.registry';

class FakeStrategy extends TransformationStrategy {
  readonly sourceFormat = SourceFormat.CSV;
  readonly targetFormat = SourceFormat.JSON;

  transform(): Promise<void> {
    return Promise.resolve();
  }
}

describe('TransformationStrategyRegistry', () => {
  it('resolves a registered strategy for its source/target pair', () => {
    const strategy = new FakeStrategy();
    const registry = new TransformationStrategyRegistry([strategy]);

    expect(registry.resolve(SourceFormat.CSV, SourceFormat.JSON)).toBe(
      strategy,
    );
  });

  it('throws NotImplementedException when no strategy is registered', () => {
    const registry = new TransformationStrategyRegistry([]);

    expect(() => registry.resolve(SourceFormat.CSV, SourceFormat.JSON)).toThrow(
      NotImplementedException,
    );
  });

  it('does not match a strategy for the reverse direction', () => {
    const registry = new TransformationStrategyRegistry([new FakeStrategy()]);

    expect(() => registry.resolve(SourceFormat.JSON, SourceFormat.CSV)).toThrow(
      NotImplementedException,
    );
  });
});
