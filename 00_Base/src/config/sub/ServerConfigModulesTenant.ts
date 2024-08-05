import { Service } from 'typedi';
import 'reflect-metadata';
import { EndpointPrefixHostPort } from './EndpointPrefixHostPort';

@Service()
export class ServerConfigModulesTenant extends EndpointPrefixHostPort {
  constructor() {
    super('/tenant');
  }
}
