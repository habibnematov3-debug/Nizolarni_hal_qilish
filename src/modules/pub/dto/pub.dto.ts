import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class PublicContentQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() language?: string;
  @IsOptional() page?: number;
  @IsOptional() limit?: number;
}

export class PublicPreferenceDto {
  @IsOptional() @IsIn(['uz', 'ru', 'en']) language?: string;
  @IsOptional() @IsBoolean() largeText?: boolean;
  @IsOptional() @IsBoolean() highContrast?: boolean;
  @IsOptional() @IsBoolean() keyboardNav?: boolean;
}
