import { Detector, DetectorOptions, PlatformName } from '../types';
declare type DetectorConfig = {
    displayName: string;
    supportedPlatforms: PlatformName[];
    factory: (opts?: DetectorOptions) => Detector;
};
declare type DetectorRegistry = DetectorConfig[];
export declare const detectorRegistry: DetectorRegistry;
export {};
