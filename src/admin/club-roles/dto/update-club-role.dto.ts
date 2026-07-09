import { ClubPosition } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateClubRoleDto {
  @IsOptional()
  @IsString()
  departmentId?: string | null;

  @IsOptional()
  @IsEnum(ClubPosition)
  position?: ClubPosition;

  @IsOptional()
  @IsInt()
  term?: number | null;

  @IsOptional()
  @IsString()
  note?: string | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endAt?: Date | null;
}
