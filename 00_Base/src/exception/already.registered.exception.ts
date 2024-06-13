import { IRestResponse } from 'typed-rest-client';

export class AlreadyRegisteredException extends Error {

  constructor() {
    super("Already registered");
    this.name = 'AlreadyRegisteredException';
  }
}
