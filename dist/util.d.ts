import { PrettyPrintableError } from '@oclif/errors';
export interface Logger {
    debug(message?: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
}
export declare type ErrorHandler = (input: string | Error, options?: {
    code?: string;
    exit: false;
} & PrettyPrintableError) => void | never;
export declare class NullLogger implements Logger {
    debug(): void;
    info(): void;
    warn(): void;
}
export declare function defaultErrorHandler(err: Error): never;
export declare function stripMarkdownTag(body: string): string;
export declare function markdownTag(s: string): string;
export declare function addMarkdownTag(s: string, tag?: string): string;
