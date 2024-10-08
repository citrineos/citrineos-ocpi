import { OcpiResponse } from './OcpiResponse';
import { IsNotEmpty } from 'class-validator';
import { Enum } from '../util/decorators/Enum';
import { Optional } from '../util/decorators/Optional';

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
  @Optional(false)
  data!: ChargingPreferencesResponseType;
}
