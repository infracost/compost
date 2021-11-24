import { DetectError } from '.';
import { DetectorOptions, DetectResult, TargetType } from '../types';
import { Logger, NullLogger } from '../util';

export abstract class BaseDetector {
  protected targetType?: TargetType;

  protected logger: Logger;

  constructor(opts?: DetectorOptions) {
    this.targetType = opts?.targetType;
    this.logger = opts?.logger ?? new NullLogger();
  }

  abstract detect(): DetectResult | null;

  protected shouldDetectTargetType(targetType: TargetType): boolean {
    return !this.targetType || this.targetType === targetType;
  }

  private static sanitizeValue(value: string, isSecret?: boolean): string {
    if (isSecret) {
      return '************';
    }
    return value;
  }

  // Checks and logs if the env variable exists and returns the value if it does
  protected checkEnvVarExists(
    name: string,
    isSecret?: boolean
  ): string | never {
    const value = process.env[name];
    if (value === undefined) {
      throw new DetectError(`${name} environment variable is not set`);
    }

    this.logger.debug(
      `${name} is set to ${BaseDetector.sanitizeValue(value, isSecret)}`
    );

    return value;
  }

  // Checks and logs if the env variable equals the expected value
  protected checkEnvVarValue(
    name: string,
    expected: string,
    isSecret?: boolean
  ): void | never {
    const value = this.checkEnvVarExists(name);

    if (value !== expected) {
      throw new DetectError(
        `${name} environment variable is set to ${BaseDetector.sanitizeValue(
          value,
          isSecret
        )}, not ${expected}`
      );
    }
  }
}
