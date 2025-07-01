import { OCPPVersion } from '@citrineos/base';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
} from 'class-validator';
import 'reflect-metadata';


export class ServerUtilNetworkConnectionWebsocketServer {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  host: string;

  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  port: number;

  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  pingInterval: number;

  @IsString()
  @IsNotEmpty()
  protocol: OCPPVersion;

  @IsInt()
  @IsNotEmpty()
  @Min(0)
  @Max(3)
  securityProfile: number;

  @IsNotEmpty()
  @IsBoolean()
  allowUnknownChargingStations: boolean;

  @IsString()
  @IsOptional()
  tlsKeyFilePath?: string;

  @IsString()
  @IsOptional()
  tlsCertificateChainFilePath?: string;

  @IsString()
  @IsOptional()
  mtlsCertificateAuthorityKeyFilePath?: string;

  @IsString()
  @IsOptional()
  rootCACertificateFilePath?: string;

  @IsString()
  @IsOptional()
  accountKeyFilePath?: string;

  constructor(
    id: string,
    host: string,
    port: number,
    pingInterval: number,
    protocol: OCPPVersion,
    securityProfile: number,
    allowUnknownChargingStations: boolean,
  ) {
    this.id = id;
    this.host = host;
    this.port = port;
    this.pingInterval = pingInterval;
    this.protocol = protocol;
    this.securityProfile = securityProfile;
    this.allowUnknownChargingStations = allowUnknownChargingStations;
  }
}
