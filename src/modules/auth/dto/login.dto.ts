import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin', description: 'Foydalanuvchi nomi' })
  @IsNotEmpty({ message: 'Username kiritilishi shart' })
  @IsString()
  username: string;

  @ApiProperty({ example: 'Admin@12345', description: 'Parol' })
  @IsNotEmpty({ message: 'Parol kiritilishi shart' })
  @IsString()
  @MinLength(6, { message: 'Parol kamida 6 belgidan iborat bo\'lishi kerak' })
  password: string;
}
