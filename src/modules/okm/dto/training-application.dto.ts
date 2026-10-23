import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class TrainingApplicationDto {
  @ApiProperty({ example: 'TRAIN_YMOM', description: 'O\'quv markazi kodi' })
  @IsString()
  @IsNotEmpty()
  trainingCenterCode: string;

  @ApiProperty({ example: 'Mediatorlar malakasini oshirish kursi' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  courseName: string;

  @ApiPropertyOptional({ example: 'Kechki guruhda qatnashish imkoniyati' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}
