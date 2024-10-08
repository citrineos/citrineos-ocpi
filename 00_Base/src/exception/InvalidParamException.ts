export class InvalidParamException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidParam';
  }
}
