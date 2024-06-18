export class AlreadyRegisteredException extends Error {
  constructor() {
    super('Already registered');
    this.name = 'AlreadyRegisteredException';
  }
}