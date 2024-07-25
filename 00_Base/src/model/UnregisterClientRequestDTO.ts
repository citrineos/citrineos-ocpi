import { Column, DataType } from 'sequelize-typescript';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class UnregisterClientRequestDTO {
  @Column(DataType.STRING(3))
  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  serverPartyId!: string;

  @Column(DataType.STRING(2))
  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  serverCountryCode!: string;

  @Column(DataType.STRING(3))
  @IsString()
  @IsNotEmpty()
  @Length(3, 3)
  clientPartyId!: string;

  @Column(DataType.STRING(2))
  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  clientCountryCode!: string;
}
