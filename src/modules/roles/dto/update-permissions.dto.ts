import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class UpdateRolePermissionsDto {
  @ApiProperty({
    example: ['ORGANIZATION_VIEW', 'ORGANIZATION_MANAGE', 'USER_VIEW'],
    description: 'Rolga biriktiriladigan huquqlar kodlari yoki ID lari ro\'yxati',
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'Kamida bitta huquq ko\'rsatilishi kerak' })
  @IsString({ each: true })
  permissionCodes: string[];
}
