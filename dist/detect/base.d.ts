import { DetectorOptions, DetectResult, TargetType } from '../types';
import { Logger } from '../util';
export declare abstract class BaseDetector {
    protected targetType?: TargetType;
    protected logger: Logger;
    constructor(opts?: DetectorOptions);
    abstract detect(): DetectResult | null;
    protected shouldDetectTargetType(targetType: TargetType): boolean;
    private static sanitizeValue;
    protected checkEnvVarExists(name: string, isSecret?: boolean): string | never;
    protected checkEnvVarValue(name: string, expected: string, isSecret?: boolean): void | never;
}
