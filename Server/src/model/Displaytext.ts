import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class DisplayText {
  @MaxLength(2)
  @MinLength(2)
  @IsString()
  @IsNotEmpty()
  language!: string;

  @MaxLength(512)
  @IsString()
  @IsNotEmpty()
  text!: string;
}
