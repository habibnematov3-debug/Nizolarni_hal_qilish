import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Avval berilgan Refresh token',
  })
  @IsNotEmpty({ message: 'Refresh token kiritilishi shart' })
  @IsString()
  refreshToken: string;
}
