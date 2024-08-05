import { Service } from 'typedi';
import 'reflect-metadata';
import { EndpointPrefixHostPort } from './EndpointPrefixHostPort';

@Service()
export class ServerConfigModulesCertificates extends EndpointPrefixHostPort {
  constructor() {
    super('/certificates');
  }
}
