export class UnknownTokenException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnknownToken';
  }
}
