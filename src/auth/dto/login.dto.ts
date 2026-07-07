import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  /** username or email */
  @IsString()
  @IsNotEmpty()
  login!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsString()
  @IsNotEmpty()
  request_id!: string;
}
