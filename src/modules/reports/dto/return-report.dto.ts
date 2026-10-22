import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ReturnReportDto {
  @ApiProperty({ example: 'Majburiy statistik maydonlar to\'ldirilmagan' })
  @IsNotEmpty()
  @IsString()
  reason: string;
}
