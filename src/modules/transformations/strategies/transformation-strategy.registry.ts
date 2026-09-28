import { Inject, Injectable, NotImplementedException } from '@nestjs/common';

import { SourceFormat } from '@/modules/uploads/upload-format';

import { TransformationStrategy } from './transformation-strategy';

export const TRANSFORMATION_STRATEGIES = Symbol('TRANSFORMATION_STRATEGIES');

@Injectable()
export class TransformationStrategyRegistry {
  private readonly strategies = new Map<string, TransformationStrategy>();

  constructor(
    @Inject(TRANSFORMATION_STRATEGIES) strategies: TransformationStrategy[],
  ) {
    for (const strategy of strategies) {
      this.strategies.set(
        TransformationStrategyRegistry.key(
          strategy.sourceFormat,
          strategy.targetFormat,
        ),
        strategy,
      );
    }
  }

  resolve(source: SourceFormat, target: SourceFormat): TransformationStrategy {
    const strategy = this.strategies.get(
      TransformationStrategyRegistry.key(source, target),
    );

    if (!strategy) {
      throw new NotImplementedException(
        `No transformation strategy registered for ${source} -> ${target}`,
      );
    }

    return strategy;
  }

  private static key(source: SourceFormat, target: SourceFormat): string {
    return `${source}->${target}`;
  }
}
