import { ClubPosition } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateClubRoleDto {
  @IsString()
  userId!: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsEnum(ClubPosition)
  position!: ClubPosition;

  @IsOptional()
  @IsInt()
  term?: number;

  @IsOptional()
  @IsString()
  note?: string;

  @Type(() => Date)
  @IsDate()
  startAt!: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endAt?: Date;
}
