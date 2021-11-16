/* eslint-disable no-param-reassign */

export function captureOutput(stdout: string, stderr: string): void {
  jest.spyOn(process.stdout, 'write').mockImplementation((v) => {
    stdout += v; // eslint-disable-line @typescript-eslint/no-unused-vars
    return true;
  });

  jest.spyOn(process.stderr, 'write').mockImplementation((v) => {
    stderr += v; // eslint-disable-line @typescript-eslint/no-unused-vars
    return true;
  });
}
