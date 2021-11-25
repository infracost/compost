import { TargetType, CommentHandlerOptions, Platform, PlatformName } from '../types';
export declare type AutoDetectOptions = CommentHandlerOptions & {
    platform?: PlatformName;
    targetType?: TargetType;
};
export declare function autodetect(opts?: AutoDetectOptions): Platform | null | never;
