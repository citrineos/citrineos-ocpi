import { ValidateNested } from 'class-validator';
import { GeoLocation } from './GeoLocation';
import { DisplayText } from './DisplayText';
import { Type } from 'class-transformer';
import { Optional } from '../util/decorators/Optional';

export class AdditionalGeoLocation extends GeoLocation {
  @Optional()
  @Type(() => DisplayText)
  @ValidateNested()
  name?: DisplayText | null;
}
