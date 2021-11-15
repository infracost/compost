import { DetectorOptions, DetectResult, TargetType } from '../types';
import { Logger, NullLogger } from '../util';

export class DetectError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export abstract class BaseDetector {
  protected targetTypes?: TargetType[];

  protected logger: Logger;

  constructor(opts?: DetectorOptions) {
    this.targetTypes = opts?.targetTypes;
    this.logger = opts?.logger ?? new NullLogger();
  }

  abstract detect(): DetectResult | null;

  protected supportsTargetType(targetType: TargetType): boolean {
    return (
      this.targetTypes === undefined || this.targetTypes.includes(targetType)
    );
  }

  // Checks and logs if the env variable exists and returns the value if it does
  protected checkEnvVarExists(name: string): string | never {
    const value = process.env[name];
    if (value === undefined) {
      throw new DetectError(`${name} environment variable is not set`);
    }

    this.logger.debug(`${name} is set to ${value}`);

    return value;
  }

  // Checks and logs if the env variable equals the expected value
  protected checkEnvVarValue(name: string, expected: string): void | never {
    const value = this.checkEnvVarExists(name);

    if (value !== expected) {
      throw new DetectError(
        `${name} environment variable is set to ${value}, not ${expected}`
      );
    }
  }
}
