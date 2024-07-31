import { Service } from 'typedi';
import { ILogObj, Logger } from 'tslog';
import { Env, OcpiServerConfig } from '../config/ocpi.server.config';

@Service()
export class OcpiLogger extends Logger<ILogObj> {
  constructor(ocpiServerConfig: OcpiServerConfig) {
    super({
      name: 'CitrineOS Ocpi Logger',
      minLevel: ocpiServerConfig.logLevel,
      hideLogPositionForProduction: ocpiServerConfig.env === Env.PRODUCTION,
      // Disable colors for cloud deployment as some cloud logging environments such as cloudwatch can not interpret colors
      stylePrettyLogs: ocpiServerConfig.env !== Env.DEVELOPMENT,
    });
  }
}
