export class ResponseValidationError extends Error {
  constructor(message: string) {
    super(`Response validation error message: "${message}"`);
    this.name = 'ResponseValidationError';
  }
}
