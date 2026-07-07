import { IsNotEmpty, IsString } from 'class-validator';

export class AdminLoginDto {
  /** username or email */
  @IsString()
  @IsNotEmpty()
  login!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
