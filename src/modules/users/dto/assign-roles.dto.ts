import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class AssignUserRolesDto {
  @ApiProperty({
    example: ['ADMIN', 'MINISTRY_STAFF'],
    description: 'Foydalanuvchiga beriladigan rollar nomlari yoki ID lari ro\'yxati',
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'Kamida bitta rol tanlanishi kerak' })
  @IsString({ each: true })
  roles: string[];
}
