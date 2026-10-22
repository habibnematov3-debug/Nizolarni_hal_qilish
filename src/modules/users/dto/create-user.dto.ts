import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';
import { IsArray, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'alisher_yusupov', description: 'Foydalanuvchi nomi (login)' })
  @IsNotEmpty({ message: 'Username kiritilishi shart' })
  @IsString()
  username: string;

  @ApiProperty({ example: 'Alisher Yusupov Akromovich', description: 'Foydalanuvchi to\'liq ismi' })
  @IsNotEmpty({ message: 'F.I.SH. kiritilishi shart' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: 'Secret@2026', description: 'Parol' })
  @IsNotEmpty({ message: 'Parol kiritilishi shart' })
  @IsString()
  @MinLength(6, { message: 'Parol kamida 6 belgidan iborat bo\'lishi kerak' })
  password: string;

  @ApiPropertyOptional({ example: 'alisher@adliya.uz', description: 'Elektron pochta' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+998901234567', description: 'Telefon raqami' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '31201901230045', description: 'JShShIR (PINFL)' })
  @IsOptional()
  @IsString()
  pinfl?: string;

  @ApiPropertyOptional({ example: 'Bosh mutaxassis', description: 'Lavozimi' })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({ description: 'Tashkilot ID si' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({
    example: ['MINISTRY_STAFF'],
    description: 'Biriktiriladigan rollar nomlari yoki ID lari',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleNames?: string[];

  @ApiPropertyOptional({ enum: UserStatus, default: UserStatus.ACTIVE })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
