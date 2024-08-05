import { Service } from 'typedi';
import 'reflect-metadata';
import { EndpointPrefixHostPort } from './EndpointPrefixHostPort';

@Service()
export class ServerConfigModulesMonitoring extends EndpointPrefixHostPort {
  constructor() {
    super('/monitoring');
  }
}
