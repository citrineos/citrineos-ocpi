import {Service} from 'typedi';
import {ILogObj, Logger} from 'tslog';
import {OcpiEnv, OcpiServerConfig} from '../config/ocpi.server.config';

@Service()
export class OcpiLogger extends Logger<ILogObj> {

  constructor(ocpiServerConfig: OcpiServerConfig) {
    super({
      name: 'CitrineOS Ocpi Logger',
      minLevel: ocpiServerConfig.logLevel,
      hideLogPositionForProduction: ocpiServerConfig.env === OcpiEnv.PRODUCTION,
      // Disable colors for cloud deployment as some cloude logging environments such as cloudwatch can not interpret colors
      stylePrettyLogs: ocpiServerConfig.env !== OcpiEnv.DEVELOPMENT,
    });
  }
}
