import {
  IsBoolean,
  IsDate,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

export class OcpiLocationDTO {
  @IsInt()
  evseId!: number;

  @IsString()
  stationId!: string;

  @IsString()
  @IsOptional()
  physicalReference?: string;

  @IsBoolean()
  @IsOptional()
  removed?: boolean;

  @IsDate()
  lastUpdated!: Date;
}
