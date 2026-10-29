import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class AssignUserRolesDto {
  @ApiProperty({
    example: ['ADMIN', 'MINISTRY_STAFF'],
    description: 'Foydalanuvchiga beriladigan rollar nomlari yoki ID lari ro\'yxati',
  })
  @IsArray()
  @IsString({ each: true })
  roles: string[];
}
