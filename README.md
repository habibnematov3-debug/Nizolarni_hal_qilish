# «Nizolarni muqobil hal etish» elektron platformasi
## Administrator paneli (ADM) moduli — Backend REST API

Ushbu loyiha «Nizolarni muqobil hal etish» axborot tizimining **1-bosqich: Administrator paneli (ADM)** moduli texnik topshirig'i (TZ v0.2) asosida ishlab chiqilgan to'liq funksional Backend REST API tizimidir.

---

## 🛠 Texnologiyalar steki

- **Platforma**: [NestJS](https://nestjs.com/) (Node.js / TypeScript)
- **Ma'lumotlar bazasi**: [PostgreSQL 18+](https://www.postgresql.org/)
- **ORM / Ma'lumotlar qatlami**: [Prisma ORM](https://www.prisma.io/)
- **Xavfsizlik & Autentifikatsiya**: Passport-JWT, Bcrypt
- **Validatsiya**: Class-Validator, Class-Transformer
- **API Hujjatlari**: OpenAPI / Swagger UI

---

## 📌 Modul imkoniyatlari va Funksional talablar

| Talab kodi | Nomi | Izoh |
| :--- | :--- | :--- |
| **FT-ADM-01 / ADM-01** | **Tashkilotlar boshqaruvi** | Vazirlik, hududiy boshqarmalar va o'quv markazlari ierarxiyasi (daraxt ko'rinishida), tahrirlash va holat boshqaruvi. |
| **FT-ADM-02, FT-ADM-03 / ADM-02** | **Foydalanuvchilar va rollar** | Foydalanuvchilarni qo'shish, tashkilot va rollarga biriktirish, rollar huquqlarini (permissions) sozlash. Rol o'zgarishi audit jurnaliga yoziladi. |
| **FT-ADM-05 / ADM-03** | **Spravochniklar boshqaruvi** | Hududlar, ixtisosliklar, jazo turlari, ish holatlari, shartnoma namunalari, imtihon savollarini boshqarish. Faolsizlantirilgan qiymat eski yozuvlarda saqlanadi. |
| **FT-ADM-06 / ADM-04** | **Audit jurnali (Audit Log)** | Muhim amallar (LOGIN, CREATE, UPDATE, STATUS_CHANGE, ROLE_ASSIGN, DELETE, PUBLISH) bo'yicha o'zgarmas (immutable) arxiv. Foydalanuvchi, sana va amal bo'yicha filtrlash. |
| **FT-ADM-07 / ADM-05** | **Tizim sozlamalari** | Taymer muddatlari, fayl hajmi va formati cheklovlari, SMS/Email shablonlari. O'zgarishlar auditga yoziladi. |
| **FT-ADM-04 / ADM-06** | **Kontent boshqaruvi** | Yangiliklar, huquqiy baza, namunalar, ko'p beriladigan savollar (FAQ), qo'llanma va e'lonlarni ko'p tillilikda (UZ, RU, EN) boshqarish va nashr qilish. |

---

## 🔌 API Endpoints (20 ta rasmiy API + Auth)

### 1. Autentifikatsiya (AUTH)
- `POST /auth/login` — Tizimga kirish va JWT token olish
- `GET /auth/me` — Joriy kirgan foydalanuvchi ma'lumotlari, rollari va huquqlari

### 2. Tashkilotlar boshqaruvi (FT-ADM-01)
- `GET /admin/organizations` — Tashkilotlar ro'yxati (yoki `?asTree=true` ierarxiya daraxti)
- `POST /admin/organizations` — Yangi tashkilot qo'shish
- `GET /admin/organizations/{id}` — Tashkilot tafsiloti (sub-tashkilotlari bilan)
- `PATCH /admin/organizations/{id}` — Tashkilotni tahrirlash / faolsizlantirish

### 3. Foydalanuvchilar va rollar (FT-ADM-02, FT-ADM-03)
- `GET /admin/users` — Foydalanuvchilar ro'yxati (tashkilot, rol, holat filtrlari)
- `POST /admin/users` — Foydalanuvchi yaratish va tashkilot/rollarga biriktirish
- `PATCH /admin/users/{id}` — Foydalanuvchini tahrirlash
- `PUT /admin/users/{id}/roles` — Foydalanuvchini rollarga biriktirish (Audit log yoziladi)
- `GET /admin/roles` — Rollar ro'yxati va ularning huquqlari
- `GET /admin/roles/permissions` — Tizimdagi mavjud barcha huquqlar spravochnigi
- `PUT /admin/roles/{id}/permissions` — Rol huquqlarini (permissions) sozlash

### 4. Spravochniklar (FT-ADM-05)
- `GET /admin/dictionaries` — Barcha spravochnik toifalari ro'yxati
- `GET /admin/dictionaries/{name}` — Ko'rsatilgan spravochnik elementlari (`regions`, `specializations`, `penalty_types`, `case_statuses`, va h.k.)
- `POST /admin/dictionaries/{name}` — Spravochnikka yangi qiymat qo'shish
- `PATCH /admin/dictionaries/{name}/{id}` — Qiymatni tahrirlash yoki faolsizlantirish (`isActive: false`)

### 5. Audit jurnali (FT-ADM-06)
- `GET /admin/audit-log` — Audit jurnali (o'chirish/tahrirlash imkonsiz; sana, foydalanuvchi, amal bo'yicha filtr)

### 6. Tizim sozlamalari (FT-ADM-07)
- `GET /admin/settings` — Taymer muddatlari, fayl cheklovlari va bildirishnoma sozlamalari
- `PUT /admin/settings` — Tizim sozlamalarini yangilash (Audit log yoziladi)

### 7. Kontent boshqaruvi (FT-ADM-04)
- `GET /admin/content/{type}` — Kontentlar ro'yxati (`news`, `legal_framework`, `templates`, `faq`, `manuals`, `announcements`)
- `GET /admin/content/{type}/{id}` — Bitta kontent tafsiloti
- `POST /admin/content/{type}` — Yangi kontent qo'shish (ko'p tilli)
- `PUT /admin/content/{type}/{id}` — Kontentni tahrirlash
- `DELETE /admin/content/{type}/{id}` — Kontentni o'chirish
- `POST /admin/content/{type}/{id}/publish` — Kontentni nashr qilish (`PUBLISHED`)

---

## 🚀 Ishga tushirish bo'yicha qo'llanma

### 1. Bog'liqliklarni o'rnatish
```bash
npm install
```

### 2. Ma'lumotlar bazasini sozlash (.env)
PostgreSQL server ishlayotganligini tekshiring va `.env` faylini sozlang:
```env
PORT=3000
DATABASE_URL="postgresql://postgres@localhost:5432/nizolar_admin_db?schema=public"
JWT_SECRET="nizolarni_hal_qilish_secret_key_2026_adliya"
JWT_EXPIRES_IN="7d"
```

### 3. Migratsiya va dastlabki ma'lumotlarni yuklash (Seed)
```bash
# Bazani sinxronlashtirish
npx prisma db push

# Dastlabki ma'lumotlarni kiritish (Vazirlik, Boshqarmalar, Rollar, Spravochniklar, Admin foydalanuvchi)
npm run prisma:seed
```

### 4. Serverni ishga tushirish
```bash
# Dasturlash (development) rejimida:
npm run start:dev

# Ishlab chiqarish (production) rejimida:
npm run build
npm run start:prod
```

### 5. Testlarni ishga tushirish
Loyiha ichida barcha 20 ta API endpointlarini avtomatik tekshiruvchi test mavjud:
```bash
npx ts-node test/test-all-apis.ts
```

---

## 🔑 Dastlabki test foydalanuvchilari (Seed Data)

| Foydalanuvchi (login) | Parol | Rol | Tashkilot |
| :--- | :--- | :--- | :--- |
| `admin` | `Admin@12345` | **ADMIN** (Super Administrator) | O'zbekiston Respublikasi Adliya vazirligi |
| `vazirlik` | `Vazirlik@12345` | **MINISTRY_STAFF** (Vazirlik xodimi) | O'zbekiston Respublikasi Adliya vazirligi |

---

## 📖 Swagger / OpenAPI Hujjatlari

Server ishga tushgandan so'ng, brauzerda quyidagi manzilni oching:
👉 **`http://localhost:3000/api/docs`**

Swagger interfeysi orqali:
1. `POST /auth/login` orqali `admin` foydalanuvchi bilan kiring.
2. Qaytgan `accessToken` ni nusxalang.
3. Yuqori o'ng burchakdagi **"Authorize"** tugmasini bosib, tokenni joylashtiring (`Bearer <token>`).
4. Barcha 20 ta endpointni to'g'ridan-to'g'ri interaktiv sinab ko'ring!
