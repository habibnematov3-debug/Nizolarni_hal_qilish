# Ma'lumotlar bazasi migratsiyalari

Bu papkada Prisma migratsiya fayllari va qo'lda yozilgan SQL skriptlar saqlanadi.

## Foydalanish

```bash
# Yangi migratsiya yaratish
npx prisma migrate dev --name migration_name

# Migratsiyalarni ishga tushirish (prod)
npx prisma migrate deploy

# DB holatini tekshirish
npx prisma migrate status
```
