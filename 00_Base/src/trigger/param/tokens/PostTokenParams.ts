import { OcpiParams } from '../../util/OcpiParams';
import { TokenType } from '../../../model/TokenType';
import { IsNotEmpty, IsString, Length, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { LocationReferences } from '../../../model/LocationReferences';
import { Enum } from '../../../util/decorators/Enum';
import { Optional } from '../../../util/decorators/Optional';
import { VersionNumber } from '../../../model/VersionNumber';

export class PostTokenParams extends OcpiParams {
  @IsString()
  @IsNotEmpty()
  @Length(36, 36)
  tokenId!: string;

  @Enum(TokenType, 'TokenType')
  @IsNotEmpty()
  type?: TokenType;

  @Optional()
  @Type(() => LocationReferences)
  @ValidateNested()
  locationReferences?: LocationReferences;

  static build(
    fromCountryCode: string,
    fromPartyId: string,
    toCountryCode: string,
    toPartyId: string,
    authorization: string,
    xRequestId: string,
    xCorrelationId: string,
    version: VersionNumber,
    tokenId: string,
    type: TokenType,
    locationReferences?: LocationReferences,
  ): PostTokenParams {
    const params = new PostTokenParams();
    params.tokenId = tokenId;
    params.type = type;
    params.locationReferences = locationReferences;
    params.fromCountryCode = fromCountryCode;
    params.fromPartyId = fromPartyId;
    params.toCountryCode = toCountryCode;
    params.toPartyId = toPartyId;
    params.authorization = authorization;
    params.xRequestId = xRequestId;
    params.xCorrelationId = xCorrelationId;
    params.version = version;
    return params;
  }
}
