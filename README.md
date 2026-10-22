# «Nizolarni muqobil hal etish» elektron platformasi
## Backend REST API (ADM, AUTH va BIL modullari)

Ushbu loyiha «Nizolarni muqobil hal etish» axborot tizimining **1-bosqich** doirasidagi quyidagi asosiy modullar texnik topshiriqlari (TZ v0.2) asosida ishlab chiqilgan yagona integratsiyalashgan Backend REST API tizimidir:
1. **ADM** — Administrator paneli
2. **AUTH** — Tizimga kirish, foydalanuvchilar va rollar
3. **BIL** — Xabarlar va taymerlar

---

## 🛠 Texnologiyalar steki

- **Platforma**: [NestJS](https://nestjs.com/) (Node.js / TypeScript)
- **Ma'lumotlar bazasi**: [PostgreSQL 18+](https://www.postgresql.org/)
- **ORM / Ma'lumotlar qatlami**: [Prisma ORM](https://www.prisma.io/)
- **Xavfsizlik & Autentifikatsiya**: Passport-JWT, Bcrypt, ONE ID, E-IMZO, Mobil ID adapterlari
- **Xabarnomalar**: Markaziy shablonlar injini, SMS Gateway adapteri (asinxron navbat, retry va idempotentlik)
- **Taymerlar va Rejalashtiruvchi**: Central Scheduler (distributed lock qulfi bilan)
- **Validatsiya**: Class-Validator, Class-Transformer
- **API Hujjatlari**: OpenAPI / Swagger UI

---

## 📌 Modullar imkoniyatlari va Funksional talablar

### 1. BIL Moduli (Xabarlar va taymerlar)
- **FT-BIL-01 / BIL-01**: Bildirishnoma xizmati:
  - Shaxsiy kabinet ichida bildirishnoma ko'rsatiladi.
  - SMS xabarnomalar asinxron navbat orqali yuboriladi, xato yuz berganda qayta urinish (retry) mexanizmi mavjud.
  - Idempotentlik (`idempotencyKey`): ayni bir xabar ikki marta yuborilmaydi.
- **FT-BIL-02, FT-BIL-03 / BIL-02**: Xabar shablonlari:
  - Tizimda quyidagi 8 ta asosiy holat uchun shablonlar mavjud:
    1. `APPLICATION_STATUS` — Ariza holati (qabul qilingan, rad etilgan, jarayonda)
    2. `EXAM_INVITATION` — Malaka imtihoniga taklifnoma
    3. `EXAM_RESULT` — Imtihon natijalari e'lon qilinishi
    4. `CONTRACT_STATUS` — Shartnoma va mediatsiya kelishuvi holati
    5. `REPORT_SUBMISSION_DEADLINE` — Davriy hisobot topshirish muddati
    6. `QUALIFICATION_UPGRADE_REMINDER` — Malaka oshirish muddati (1 oy oldin ogohlantirish)
    7. `OBLIGATION_EXECUTION_DEADLINE` — Kelishuv majburiyatini bajarish muddati
    8. `CALENDAR_EVENT` — Kalendar tadbiri / uchrashuv eslatmasi
  - Shablonlar `{{fullName}}`, `{{caseNumber}}`, `{{deadline}}` kabi dinamik o'zgaruvchilarni va ko'p tillilikni (UZ, RU) qo'llab-quvvatlaydi. Administrator matnlarni kodga tegmasdan o'zgartira oladi.
- **FT-BIL-05 / BIL-03**: Markaziy rejalashtiruvchi (Central Scheduler) va taymerlar:
  - Barcha modullardagi taymerlar (ariza ro'yxatga olish, mediator tayinlash, jarayon davomiyligi, hisobot topshirish, seans faolsizligi) bir joydan boshqariladi.
  - Bir vaqtda bitta faol nusxa ishlaydi (qulf bilan).
  - Muddat qiymatlarini administrator boshqara oladi.
- **FT-BIL-04 / BIL-04**: Bildirishnomalar tarixi:
  - Foydalanuvchining shaxsiy kabinetida yuborilgan barcha xabarlar tarixi saqlanadi.
  - Holatlar: `PENDING`, `SENT`, `DELIVERED`, `FAILED`, `READ`.
  - Xabarni o'qilgan deb belgilash yoki barchasini o'qish imkoniyati.
- **Hodisalar integratsiyasi (Section 8)**:
  - `ArizaYuborildi`, `ArizaQabulQilindi`, `ImtihonNatijasiTasdiqlandi`, `ShartnomaImzolandi`, `KelishuvImzolandi`, `MajburiyatMuddatiYaqin`, `HisobotYuborildi` va boshqa hodisalar avtomatik xabarnoma jo'natish mexanizmiga ulangan.

### 2. AUTH Moduli (Tizimga kirish, foydalanuvchilar va rollar)
- **FT-AUTH-01 / AUTH-01**: ONE ID, E-imzo yoki Mobil ID orqali xavfsiz parolsiz kirish.
- **FT-AUTH-02, FT-AUTH-03 / AUTH-02**: Reyestr maqomiga mos kabinetni ochish:
  - Talabgor -> `APPLICANT`
  - Mediator -> `MEDIATOR`
  - Hakamlik sudyasi -> `ARBITRATION_JUDGE`
  - Arbitr -> `ARBITRATOR`
- **FT-AUTH-04 / AUTH-03 (RBAC)**: 9 ta tizim roli (`ADMIN`, `MINISTRY_STAFF`, `REGIONAL_STAFF`, `COMMISSION`, `MEDIATOR`, `ARBITRATION_JUDGE`, `ARBITRATOR`, `TALABGOR`, `OPERATOR`). 403 urinishlarida audit yozuvi shakllanadi.
- **FT-AUTH-05 / AUTH-04**: Obyektivka: davlat tizimlaridan olingan o'zgarmas maydonlar himoyasi; aloqa ma'lumotlarini tahrirlash.
- **FT-AUTH-06 / AUTH-05**: Seans xavfsizligi va faolsizlik taymeri.

### 3. ADM Moduli (Administrator paneli)
- **FT-ADM-01 / ADM-01**: Tashkilotlar boshqaruvi va bo'ysunish ierarxiyasi.
- **FT-ADM-02, FT-ADM-03 / ADM-02**: Foydalanuvchilar va rollarni boshqarish, huquqlarni sozlash.
- **FT-ADM-05 / ADM-03**: Spravochniklar boshqaruvi (faolsizlantirish arxivi bilan).
- **FT-ADM-06 / ADM-04**: Audit jurnali (o'zgarmas / immutable arxiv).
- **FT-ADM-07 / ADM-05**: Tizim sozlamalari (taymerlar, fayl cheklovlari).
- **FT-ADM-04 / ADM-06**: Kontent boshqaruvi (ko'p tilli nashrlar).

---

## 🔌 API Endpoints (BIL, AUTH, ADM)

### 1. BIL Moduli API lari (6 ta rasmiy API + Hodisalar)
| Metod | Yo'l | Vazifasi | Kim ishlatadi |
| :--- | :--- | :--- | :--- |
| `GET` | `/cabinet/notifications` | Xabarlar ro'yxati (filtrlash, unreadCount) | Talabgor, Mediator, Sudya, Arbitr |
| `PATCH` | `/cabinet/notifications/{id}/read` | Xabarni o'qilgan deb belgilash | Talabgor, Mediator, Sudya, Arbitr |
| `POST` | `/cabinet/notifications/read-all` | Barcha xabarlarni o'qilgan qilish | Talabgor, Mediator, Sudya, Arbitr |
| `GET` | `/admin/notification-templates` | Xabar shablonlari ro'yxati | Admin |
| `PUT` | `/admin/notification-templates/{id}` | Shablonni yangilash (Audit) | Admin |
| `GET` | `/admin/timers` | Markaziy taymer sozlamalari | Admin |
| `PUT` | `/admin/timers/{key}` | Taymer muddatini o'zgartirish (Audit) | Admin |
| `POST` | `/admin/notifications/send` | Xabar yuborish (Kabinet + SMS) | Admin, Vazirlik xodimi |
| `POST` | `/events/emit` | Tizim hodisasi (Event dispatch) | Modullararo / Tizim |

### 2. AUTH Moduli API lari (8 ta rasmiy API)
| Metod | Yo'l | Vazifasi | Kim ishlatadi |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/oneid/login` | ONE ID orqali kirish (kodni almashtirish) | Ochiq (kirishsiz) |
| `POST` | `/auth/esign/login` | E-imzo orqali kirish (PKCS#7) | Ochiq (kirishsiz) |
| `POST` | `/auth/mobile-id/login` | Mobil ID orqali kirish (SMS kod) | Ochiq (kirishsiz) |
| `POST` | `/auth/refresh` | Seansni yangilash (Refresh token) | Barcha kabinetlar |
| `POST` | `/auth/logout` | Tizimdan chiqish (seansni yopish) | Barcha kabinetlar |
| `GET` | `/auth/me` | Joriy foydalanuvchi, rollari va kabinet turi | Barcha kabinetlar |
| `GET` | `/users/me` | Shaxsiy ma'lumotlarni (obyektivka) olish | Barcha kabinetlar |
| `PATCH` | `/users/me` | Ruxsat etilgan maydonlarni tahrirlash | Barcha kabinetlar |

### 3. ADM Moduli API lari (20 ta rasmiy API)
- Tashkilotlar: `GET /admin/organizations`, `POST /admin/organizations`, `GET /admin/organizations/{id}`, `PATCH /admin/organizations/{id}`
- Foydalanuvchilar: `GET /admin/users`, `POST /admin/users`, `PATCH /admin/users/{id}`, `PUT /admin/users/{id}/roles`
- Rollar: `GET /admin/roles`, `PUT /admin/roles/{id}/permissions`
- Spravochniklar: `GET /admin/dictionaries/{name}`, `POST /admin/dictionaries/{name}`, `PATCH /admin/dictionaries/{name}/{id}`
- Audit: `GET /admin/audit-log`
- Sozlamalar: `GET /admin/settings`, `PUT /admin/settings`
- Kontent: `POST /admin/content/{type}`, `PUT /admin/content/{type}/{id}`, `DELETE /admin/content/{type}/{id}`, `POST /admin/content/{type}/{id}/publish`

---

## 🚀 Ishga tushirish va Avtomatlashtirilgan testlar

### 1. Migratsiya va dastlabki ma'lumotlarni yuklash (Seed)
```bash
# Bazani sinxronlashtirish
npx prisma db push

# Barcha dastlabki ma'lumotlar (9 ta rol, shablonlar, taymerlar, spravochniklar)
npm run prisma:seed
```

### 2. Serverni ishga tushirish
```bash
npm run start:dev
```

### 3. Har bir modul bo'yicha testlarni ishga tushirish
```bash
# 1. BIL moduli (6 ta API, hodisalar, idempotency, SMS, kabinet):
npx ts-node test/test-bil-apis.ts

# 2. AUTH moduli (8 ta API, OneID, E-imzo, Mobil ID, Obyektivka):
npx ts-node test/test-auth-apis.ts

# 3. ADM moduli (20 ta API, tashkilotlar, rollar, audit):
npx ts-node test/test-all-apis.ts

# 4. ENT integratsiya adapterlari va kiruvchi API contract testi:
npm run test:ent
```

---

## 📖 Swagger / OpenAPI Hujjatlari

Server ishga tushgandan so'ng, interaktiv API hujjatlari:
👉 **`http://localhost:3000/api/docs`**
