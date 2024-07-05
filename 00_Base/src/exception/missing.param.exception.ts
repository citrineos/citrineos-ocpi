export class MissingParamException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'missingParam';
  }
}
