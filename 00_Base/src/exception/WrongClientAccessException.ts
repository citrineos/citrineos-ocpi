export class WrongClientAccessException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WrongClientAccess';
  }
}
