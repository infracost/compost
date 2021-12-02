export class OutputMock {
  public stdout = '';

  public stderr = '';

  constructor() {}
}

export function suppressOutput(): void {
  jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
}

/* eslint-disable no-param-reassign */
export function captureOutput(out: OutputMock): void {
  jest.spyOn(process.stdout, 'write').mockImplementation((v) => {
    out.stdout += v.toString();
    return true;
  });

  jest.spyOn(process.stderr, 'write').mockImplementation((v) => {
    out.stderr += v;
    return true;
  });

  jest.spyOn(console, 'error').mockImplementation((v) => {
    out.stderr += v;
    return true;
  });
}
/* eslint-enable no-param-reassign */
