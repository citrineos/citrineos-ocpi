import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class ResponseUrl {
  @IsString()
  @IsUrl({ require_tld: false })
  @IsNotEmpty()
  response_url!: string;
}
