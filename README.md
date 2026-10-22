# «Nizolarni muqobil hal etish» elektron platformasi
## Backend REST API (ADM va AUTH modullari)

Ushbu loyiha «Nizolarni muqobil hal etish» axborot tizimining **1-bosqich: Administrator paneli (ADM)** va **Tizimga kirish, foydalanuvchilar va rollar (AUTH)** modullari texnik topshiriqlari (TZ v0.2) asosida ishlab chiqilgan to'liq funksional Backend REST API tizimidir.

---

## 🛠 Texnologiyalar steki

- **Platforma**: [NestJS](https://nestjs.com/) (Node.js / TypeScript)
- **Ma'lumotlar bazasi**: [PostgreSQL 18+](https://www.postgresql.org/)
- **ORM / Ma'lumotlar qatlami**: [Prisma ORM](https://www.prisma.io/)
- **Xavfsizlik & Autentifikatsiya**: Passport-JWT, Bcrypt, ONE ID, E-IMZO, Mobil ID adapterlari
- **Validatsiya**: Class-Validator, Class-Transformer
- **API Hujjatlari**: OpenAPI / Swagger UI

---

## 📌 Modul imkoniyatlari va Funksional talablar

### 1. AUTH Moduli (Tizimga kirish, foydalanuvchilar va rollar)
- **FT-AUTH-01 / AUTH-01**: ONE ID, E-imzo yoki Mobil ID orqali xavfsiz kirish (parolsiz identifikatsiya).
- **FT-AUTH-02, FT-AUTH-03 / AUTH-02**: Reyestr maqomiga mos kabinetni avtomatik ochish:
  - Mediator bo'lmagan shaxs -> **Talabgor kabineti** (`APPLICANT`)
  - Reyestrdagi mediator -> **Mediator kabineti** (`MEDIATOR`)
  - Hakamlik sudyasi -> **Hakamlik sudyasi kabineti** (`ARBITRATION_JUDGE`)
  - Arbitr -> **Arbitr kabineti** (`ARBITRATOR`)
- **FT-AUTH-04 / AUTH-03 (RBAC)**: 9 ta tizim roli (`ADMIN`, `MINISTRY_STAFF`, `REGIONAL_STAFF`, `COMMISSION`, `MEDIATOR`, `ARBITRATION_JUDGE`, `ARBITRATOR`, `TALABGOR`, `OPERATOR`). Hududiy xodim faqat o'z hududidagi ma'lumotni ko'radi. Ruxsatsiz kirish urinishlarida 403 xatosi qaytadi va Audit jurnaliga yoziladi.
- **FT-AUTH-05 / AUTH-04**: Shaxsiy ma'lumotlar (Obyektivka):
  - Tashqi tizimdan (ONE ID / IIV) olingan maydonlar (`pinfl`, `passportSeriesNumber`, `fullName`, `birthDate` va h.k.) o'zgarmas (read-only).
  - Ruxsat etilgan maydonlar (`phone`, `email`, `address`) foydalanuvchi tomonidan tahrirlanadi va har bir o'zgarish auditga yoziladi.
- **FT-AUTH-06 / AUTH-05**: Seans xavfsizligi. Faolsizlik muddati sozlanadi (standart: 30 daqiqa); muddat tugasa avtomatik tizimdan chiqariladi. Refresh token va chiqish (`logout`).

### 2. ADM Moduli (Administrator paneli)
- **FT-ADM-01 / ADM-01**: Tashkilotlar boshqaruvi va bo'ysunish ierarxiyasi (daraxt ko'rinishida).
- **FT-ADM-02, FT-ADM-03 / ADM-02**: Foydalanuvchilar va rollarni boshqarish, huquqlarni (permissions) sozlash.
- **FT-ADM-05 / ADM-03**: Spravochniklar boshqaruvi (hududlar, ixtisosliklar, jazo turlari, ish holatlari). Faolsizlantirilgan yozuvlar arxivda saqlanadi.
- **FT-ADM-06 / ADM-04**: Audit jurnali (o'zgarmas / immutable, foydalanuvchi, sana va amal bo'yicha filtr).
- **FT-ADM-07 / ADM-05**: Tizim sozlamalari (taymerlar, fayl cheklovlari, xabar shablonlari).
- **FT-ADM-04 / ADM-06**: Kontent boshqaruvi (ko'p tilli yangiliklar, huquqiy baza, namunalar, FAQ, e'lonlar, nashr qilish).

---

## 🔌 API Endpoints (AUTH va ADM)

### 1. AUTH Moduli API lari (8 ta rasmiy API)
| Metod | Yo'l | Vazifasi | Kim ishlatadi |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/oneid/login` | ONE ID orqali kirish (kodni almashtirish) | Ochiq (kirishsiz) |
| `POST` | `/auth/esign/login` | E-imzo orqali kirish (PKCS#7) | Ochiq (kirishsiz) |
| `POST` | `/auth/mobile-id/login` | Mobil ID orqali kirish (SMS kod) | Ochiq (kirishsiz) |
| `POST` | `/auth/refresh` | Seansni yangilash (Refresh token) | Barcha kabinetlar |
| `POST` | `/auth/logout` | Tizimdan chiqish (seansni yopish) | Barcha kabinetlar |
| `GET` | `/auth/me` | Joriy foydalanuvchi, rollari va kabinet turi | Barcha kabinetlar |
| `GET` | `/users/me` | Shaxsiy ma'lumotlarni (obyektivka) olish | Barcha kabinetlar |
| `PATCH` | `/users/me` | Ruxsat etilgan maydonlarni tahrirlash (phone, email, address) | Barcha kabinetlar |

### 2. ADM Moduli API lari (20 ta rasmiy API)
| Metod | Yo'l | Vazifasi | Ruxsat |
| :--- | :--- | :--- | :--- |
| `GET` | `/admin/organizations` | Tashkilotlar ro'yxati (yoki `?asTree=true`) | Admin |
| `POST` | `/admin/organizations` | Tashkilot qo'shish | Admin |
| `GET` | `/admin/organizations/{id}` | Tashkilot tafsiloti (ierarxiya bilan) | Admin |
| `PATCH` | `/admin/organizations/{id}` | Tashkilotni tahrirlash / faolsizlantirish | Admin |
| `GET` | `/admin/users` | Foydalanuvchilar ro'yxati | Admin |
| `POST` | `/admin/users` | Foydalanuvchi qo'shish | Admin |
| `PATCH` | `/admin/users/{id}` | Foydalanuvchini tahrirlash | Admin |
| `PUT` | `/admin/users/{id}/roles` | Foydalanuvchini rollarga biriktirish | Admin |
| `GET` | `/admin/roles` | Rollar ro'yxati | Admin |
| `PUT` | `/admin/roles/{id}/permissions` | Rol huquqlarini sozlash | Admin |
| `GET` | `/admin/dictionaries/{name}` | Spravochnik qiymatlari | Admin |
| `POST` | `/admin/dictionaries/{name}` | Spravochnikka qiymat qo'shish | Admin |
| `PATCH` | `/admin/dictionaries/{name}/{id}` | Qiymatni tahrirlash yoki faolsizlantirish | Admin |
| `GET` | `/admin/audit-log` | Audit jurnali (o'zgarmas, filtrlash) | Admin |
| `GET` | `/admin/settings` | Tizim sozlamalari | Admin |
| `PUT` | `/admin/settings` | Sozlamalarni saqlash | Admin |
| `POST` | `/admin/content/{type}` | Kontent qo'shish | Admin, Vazirlik xodimi |
| `PUT` | `/admin/content/{type}/{id}` | Kontentni tahrirlash | Admin, Vazirlik xodimi |
| `DELETE` | `/admin/content/{type}/{id}` | Kontentni olib tashlash | Admin, Vazirlik xodimi |
| `POST` | `/admin/content/{type}/{id}/publish` | Kontentni nashr qilish | Admin, Vazirlik xodimi |

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
JWT_EXPIRES_IN="1h"
SESSION_INACTIVITY_MINUTES="30"
```

### 3. Migratsiya va dastlabki ma'lumotlarni yuklash (Seed)
```bash
# Bazani sinxronlashtirish
npx prisma db push

# 9 ta rol, test foydalanuvchilar va spravochniklarni kiritish
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

### 5. Avtomatlashtirilgan testlarni ishga tushirish
```bash
# ADM modulining barcha 20 ta API testi:
npx ts-node test/test-all-apis.ts

# AUTH modulining barcha 8 ta API va qabul mezonlari testi:
npx ts-node test/test-auth-apis.ts
```

---

## 🔑 Dastlabki test foydalanuvchilari (9 ta rol va kabinetlar)

| Login / Test PINFL | Rol | Ochiladigan kabinet | Tashkilot / Tavsif |
| :--- | :--- | :--- | :--- |
| `admin` | **ADMIN** | `ADMIN` (Admin paneli) | Bosh administrator |
| `vazirlik` | **MINISTRY_STAFF** | `MINISTRY_STAFF` | Adliya vazirligi mas'ul xodimi |
| `hudud_toshkent` | **REGIONAL_STAFF** | `REGIONAL_STAFF` | Toshkent shahar adliya boshqarmasi |
| `komissiya_azosi` | **COMMISSION** | `COMMISSION` | Malaka komissiyasi |
| `mediator_karim` (`31201851230011`) | **MEDIATOR** | `MEDIATOR` | Reyestrdagi professional mediator |
| `sudya_akrom` (`31201851230022`) | **ARBITRATION_JUDGE** | `ARBITRATION_JUDGE` | Hakamlik sudyasi |
| `arbitr_dilshod` (`31201851230033`) | **ARBITRATOR** | `ARBITRATOR` | Arbitr |
| `talabgor_nodir` (`31201851230044`) | **TALABGOR** | `APPLICANT` (Talabgor kabineti) | Nizo ishtirokchisi (ONE ID orqali kirgan) |
| `operator_aziz` | **OPERATOR** | `OPERATOR` | Texnik operator |

---

## 📖 Swagger / OpenAPI Hujjatlari

Server ishga tushgandan so'ng, brauzerda quyidagi manzilni oching:
👉 **`http://localhost:3000/api/docs`**
