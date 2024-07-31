import { IsNotEmpty, IsString, Length } from 'class-validator';

export class UnregisterClientRequestDTO {
  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  serverPartyId!: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  serverCountryCode!: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  clientPartyId!: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  clientCountryCode!: string;
}
