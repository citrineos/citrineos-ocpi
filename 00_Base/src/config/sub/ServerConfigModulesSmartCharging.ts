import { Service } from 'typedi';
import 'reflect-metadata';
import { EndpointPrefixHostPort } from './EndpointPrefixHostPort';

@Service()
export class ServerConfigModulesSmartCharging extends EndpointPrefixHostPort {
  constructor() {
    super('/smartcharging');
  }
}
