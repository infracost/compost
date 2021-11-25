export declare class OutputMock {
    stdout: string;
    stderr: string;
    constructor();
}
export declare function suppressOutput(): void;
export declare function captureOutput(out: OutputMock): void;
