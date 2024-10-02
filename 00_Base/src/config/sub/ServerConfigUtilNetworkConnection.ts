import { IsArray, Validate, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import 'reflect-metadata';
import { ServerUtilNetworkConnectionWebsocketServer } from './ServerUtilNetworkConnectionWebsocketServer';

export class ServerConfigUtilNetworkConnection {
  @IsArray()
  @Type(() => ServerUtilNetworkConnectionWebsocketServer)
  @ValidateNested({ each: true })
  @Validate((array: ServerUtilNetworkConnectionWebsocketServer[]) => {
    const idsSeen = new Set<string>();
    return array.filter((obj) => {
      if (idsSeen.has(obj.id)) {
        return false;
      } else {
        switch (obj.securityProfile) {
          case 0: // No security
          case 1: // Basic Auth
            idsSeen.add(obj.id);
            return true;
          case 2: // Basic Auth + TLS
            return obj.tlsKeyFilePath && obj.tlsCertificateChainFilePath;
          case 3: // mTLS
            return (
              obj.tlsCertificateChainFilePath &&
              obj.tlsKeyFilePath &&
              obj.mtlsCertificateAuthorityKeyFilePath
            );
          default:
            return false;
        }
      }
    });
  })
  websocketServers: ServerUtilNetworkConnectionWebsocketServer[];

  constructor() {
    this.websocketServers = [
      new ServerUtilNetworkConnectionWebsocketServer(
        '0',
        '0.0.0.0',
        8081,
        60,
        'ocpp2.0.1',
        0,
        true,
      ),
      new ServerUtilNetworkConnectionWebsocketServer(
        '1',
        '0.0.0.0',
        8082,
        60,
        'ocpp2.0.1',
        1,
        false,
      ),
    ];
  }
}
