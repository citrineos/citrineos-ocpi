import {OcpiResponse} from './ocpi.response';
import {IsNotEmpty} from 'class-validator';
import {Enum} from '../util/decorators/enum';

export enum ChargingPreferencesResponseType {
  ACCEPTED = 'ACCEPTED',
  DEPARTURE_REQUIRED = 'DEPARTURE_REQUIRED',
  ENERGY_NEED_REQUIRED = 'ENERGY_NEED_REQUIRED',
  NOT_POSSIBLE = 'NOT_POSSIBLE',
  PROFILE_TYPE_NOT_SUPPORTED = 'PROFILE_TYPE_NOT_SUPPORTED',
}

export class ChargingPreferencesResponse extends OcpiResponse<ChargingPreferencesResponseType> {
  @IsNotEmpty()
  @Enum(ChargingPreferencesResponseType, 'ChargingPreferencesResponseType')
  data!: ChargingPreferencesResponseType;
}
