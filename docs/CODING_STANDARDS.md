# Kod Yozish Qoidalari (Coding Standards)

## 1. TypeScript qoidalari

### 1.1 Tip annotatsiyalar

```typescript
// ✅ To'g'ri — aniq tiplar
function getUser(id: string): Promise<User> { ... }

// ❌ Noto'g'ri — any ishlatish
function getUser(id: any): any { ... }
```

### 1.2 Interface va Type

```typescript
// Servis interfeysi uchun I-prefiksi
interface IUserService {
  findById(id: string): Promise<User>;
  create(dto: CreateUserDto): Promise<User>;
}

// DTO uchun class (class-validator bilan)
class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username: string;
}
```

### 1.3 Enum

```typescript
// String enum ishlatish (debug osonroq)
enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BLOCKED = 'BLOCKED',
}
```

---

## 2. NestJS qoidalari

### 2.1 Modul tuzilmasi

Har bir modul quyidagi fayllardan iborat bo'lishi kerak:

```
module-name/
├── dto/
│   ├── create-*.dto.ts
│   └── update-*.dto.ts
├── module-name.controller.ts
├── module-name.service.ts
└── module-name.module.ts
```

### 2.2 Controller

```typescript
@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Foydalanuvchini ID bo\'yicha olish' })
  @ApiResponse({ status: 200, description: 'Muvaffaqiyatli' })
  @ApiResponse({ status: 404, description: 'Topilmadi' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }
}
```

### 2.3 Service

```typescript
@Injectable()
export class UsersService implements IUserService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    return user;
  }
}
```

### 2.4 DTO validatsiya

```typescript
import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'john_doe', description: 'Foydalanuvchi nomi' })
  @IsString()
  @MinLength(3)
  username: string;

  @ApiProperty({ required: false })
  @IsEmail()
  @IsOptional()
  email?: string;
}
```

---

## 3. Swagger hujjatlari

Barcha controller va DTO-lar uchun Swagger dekoratorlari majburiy:

```typescript
// Controller darajasida
@ApiTags('module-name')

// Endpoint darajasida
@ApiOperation({ summary: 'Qisqa tavsif' })
@ApiResponse({ status: 200, description: 'Muvaffaqiyatli', type: ResponseDto })
@ApiResponse({ status: 400, description: 'Noto\'g\'ri so\'rov' })
@ApiResponse({ status: 401, description: 'Avtorizatsiya kerak' })
@ApiResponse({ status: 403, description: 'Ruxsat yo\'q' })
@ApiResponse({ status: 404, description: 'Topilmadi' })

// Parametr darajasida
@ApiParam({ name: 'id', description: 'UUID format' })
@ApiQuery({ name: 'page', required: false })
```

---

## 4. Xatolarni boshqarish

```typescript
// NestJS built-in exception-lardan foydalanish
throw new NotFoundException('Resurs topilmadi');
throw new BadRequestException('Noto\'g\'ri ma\'lumot');
throw new ForbiddenException('Ruxsat yo\'q');
throw new UnauthorizedException('Avtorizatsiya kerak');
throw new ConflictException('Allaqachon mavjud');

// Custom exception filter orqali barcha xatolarni ushlash
// Global filter: main.ts da app.useGlobalFilters() bilan
```

---

## 5. Nomi berish konventsiyalari

| Narsa             | Konventsiya           | Misol                      |
|-------------------|-----------------------|----------------------------|
| Fayl              | kebab-case            | `user-profile.service.ts`  |
| Class             | PascalCase            | `UserProfileService`       |
| Metod/funksiya    | camelCase             | `getUserProfile()`         |
| O'zgaruvchi       | camelCase             | `userId`                   |
| Konstanta         | SCREAMING_SNAKE_CASE  | `MAX_FILE_SIZE`            |
| Interface         | I + PascalCase        | `IUserService`             |
| Enum              | PascalCase            | `UserStatus`               |
| DTO               | PascalCase + Dto      | `CreateUserDto`            |

---

## 6. Loglash qoidalari

```typescript
// NestJS Logger ishlatish
private readonly logger = new Logger(UsersService.name);

this.logger.log('Foydalanuvchi topildi');
this.logger.warn('Shubhali faoliyat aniqlandi');
this.logger.error('Xato yuz berdi', error.stack);

// ❌ console.log ISHLATMA — faqat Logger
```

---

## 7. Audit loglash

Barcha CRUD operatsiyalar audit log yozishi shart:

```typescript
// Har bir muhim operatsiyadan keyin
await this.auditService.log({
  userId: currentUser.id,
  action: 'CREATE',
  entityType: 'USER',
  entityId: newUser.id,
  newValues: newUser,
  ipAddress: request.ip,
});
```

---

## 8. Xavfsizlik qoidalari

- Hech qachon `password`, `hash`, `secret`, `token` ni log-ga yozma
- Barcha foydalanuvchi inputlari `class-validator` orqali tekshirilsin
- SQL injection uchun faqat Prisma ORM ishlatilsin (raw query taqiqlangan)
- Fayl yuklashda MIME type va hajm tekshirilsin
- Sezimliligi yuqori API-lar `@Roles()` dekoratoru bilan himoyalangan bo'lsin
