import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayUnique, IsArray, IsEmail, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class UpdateApplicantProfileDto {
  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional() @IsString() @MaxLength(30) phone?: string;

  @ApiPropertyOptional({ example: 'user@example.uz' })
  @IsOptional() @IsEmail() @MaxLength(254) email?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString() @MaxLength(1000) address?: string;
}

export class StartMediatorThreadDto {
  @ApiProperty({ description: 'Ochiq reyestrdagi faol mediator UUID si' })
  @IsUUID() mediatorRegistryId: string;

  @ApiProperty({ maxLength: 10000 })
  @IsString() @MinLength(1) @MaxLength(10000) body: string;

  @ApiPropertyOptional({ type: [String], maxItems: 10, description: 'Avval PRIVATE qilib yuklangan fayl UUIDlari' })
  @IsOptional() @IsArray() @ArrayMaxSize(10) @ArrayUnique() @IsUUID('all', { each: true }) attachmentIds?: string[];
}

export class SendThreadMessageDto {
  @ApiProperty({ maxLength: 10000 })
  @IsString() @MinLength(1) @MaxLength(10000) body: string;

  @ApiPropertyOptional({ type: [String], maxItems: 10 })
  @IsOptional() @IsArray() @ArrayMaxSize(10) @ArrayUnique() @IsUUID('all', { each: true }) attachmentIds?: string[];
}
