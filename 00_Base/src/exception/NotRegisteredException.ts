export class NotRegisteredException extends Error {
  constructor() {
    super('Not registered');
    this.name = 'NotRegisteredException';
  }
}
