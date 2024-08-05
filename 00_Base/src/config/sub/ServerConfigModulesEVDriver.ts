import { Service } from 'typedi';
import 'reflect-metadata';
import { EndpointPrefixHostPort } from './EndpointPrefixHostPort';

@Service()
export class ServerConfigModulesEVDriver extends EndpointPrefixHostPort {
  constructor() {
    super('/evdriver');
  }
}
